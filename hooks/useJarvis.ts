import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, TranscriptItem } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

// Constants
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

export const useJarvis = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [volume, setVolume] = useState<number>(0); // 0 to 100
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  
  // Refs for audio context and processing
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Refs for transcript handling to avoid stale closures in callbacks
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');
  
  // Update transcripts state safely
  const updateTranscripts = useCallback((newTranscript: TranscriptItem) => {
    setTranscripts(prev => {
      // Check if we need to update an existing item or add a new one
      const index = prev.findIndex(t => t.id === newTranscript.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = newTranscript;
        return updated;
      }
      return [...prev, newTranscript];
    });
  }, []);

  // Initialize Audio Contexts upfront
  const ensureAudioContexts = useCallback(() => {
     if (!inputAudioContextRef.current) {
         inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
     }
     if (!outputAudioContextRef.current) {
         outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
     }
  }, []);

  const connect = useCallback(async () => {
    try {
      // Stop wake word recognition if running
      if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
      }

      setConnectionState(ConnectionState.CONNECTING);
      
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey });

      ensureAudioContexts();
      
      // Resume contexts if suspended
      if (inputAudioContextRef.current?.state === 'suspended') {
        await inputAudioContextRef.current.resume();
      }
      if (outputAudioContextRef.current?.state === 'suspended') {
        await outputAudioContextRef.current.resume();
      }

      if (outputAudioContextRef.current && !outputNodeRef.current) {
          outputNodeRef.current = outputAudioContextRef.current.createGain();
          outputNodeRef.current.connect(outputAudioContextRef.current.destination);
      }

      // Get Microphone Stream
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Establish Live Connection
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are Jarvis, a highly intelligent and sophisticated AI assistant. 
          Your tone is polite, slightly formal, efficient, and precise, reminiscent of a helpful butler. 
          
          GUIDELINES:
          1. **Conciseness**: Keep verbal responses concise and to the point.
          2. **Complex Answers**: For complex topics or long answers, provide a brief summary first. Then ask if the user wants more details.
          3. **Lists**: Do not read long lists. Summarize the items.
          4. **Facts**: Use the Google Search tool for factual queries and current events.
          
          Always maintain a helpful demeanor. Do not hallucinate capabilities you do not have.`,
          tools: [{ googleSearch: {} }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log('Jarvis Connected');
            setConnectionState(ConnectionState.CONNECTED);
            
            // Start Audio Input Streaming
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            inputSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(100, rms * 1000)); 

              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            inputSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
              const ctx = outputAudioContextRef.current;
              setVolume(Math.random() * 60 + 20); 

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                OUTPUT_SAMPLE_RATE,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              
              source.onended = () => {
                  audioSourcesRef.current = audioSourcesRef.current.filter(s => s !== source);
              };
              audioSourcesRef.current.push(source);
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }

            // Handle Transcriptions
            const outputTrans = message.serverContent?.outputTranscription;
            const inputTrans = message.serverContent?.inputTranscription;

            if (outputTrans) {
              currentOutputTranscriptionRef.current += outputTrans.text;
              updateTranscripts({
                id: 'current-jarvis',
                sender: 'jarvis',
                text: currentOutputTranscriptionRef.current,
                isComplete: false,
                timestamp: new Date()
              });
            }

            if (inputTrans) {
              currentInputTranscriptionRef.current += inputTrans.text;
              updateTranscripts({
                id: 'current-user',
                sender: 'user',
                text: currentInputTranscriptionRef.current,
                isComplete: false,
                timestamp: new Date()
              });
            }

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscriptionRef.current) {
                 const finalUser: TranscriptItem = {
                    id: Date.now() + '-user',
                    sender: 'user',
                    text: currentInputTranscriptionRef.current,
                    isComplete: true,
                    timestamp: new Date()
                 };
                 setTranscripts(prev => [...prev.filter(t => t.id !== 'current-user'), finalUser]);
                 currentInputTranscriptionRef.current = '';
              }
              
              if (currentOutputTranscriptionRef.current) {
                const finalJarvis: TranscriptItem = {
                    id: Date.now() + '-jarvis',
                    sender: 'jarvis',
                    text: currentOutputTranscriptionRef.current,
                    isComplete: true,
                    timestamp: new Date()
                 };
                 setTranscripts(prev => [...prev.filter(t => t.id !== 'current-jarvis'), finalJarvis]);
                 currentOutputTranscriptionRef.current = '';
                 setTimeout(() => setVolume(0), 500);
              }
            }
          },
          onclose: () => {
            console.log('Jarvis Connection Closed');
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error('Jarvis Connection Error', err);
            setConnectionState(ConnectionState.ERROR);
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [updateTranscripts, ensureAudioContexts]);

  const stopSpeaking = useCallback(() => {
      audioSourcesRef.current.forEach(source => {
          try { source.stop(); } catch(e) {}
      });
      audioSourcesRef.current = [];
      if (outputAudioContextRef.current) {
          nextStartTimeRef.current = outputAudioContextRef.current.currentTime;
      }
  }, []);

  const disconnect = useCallback(async () => {
    stopSpeaking();
    if (sessionPromiseRef.current) {
      // Cleanup Audio
      if (inputAudioContextRef.current) {
        await inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
      }
      if (outputAudioContextRef.current) {
        await outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setConnectionState(ConnectionState.DISCONNECTED);
      setVolume(0);
      sessionPromiseRef.current = null;
    }
  }, [stopSpeaking]);

  // Toggle System (Wake Word Logic)
  const toggleSystem = useCallback(() => {
      if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
          disconnect();
          setIsWakeWordEnabled(false);
          setConnectionState(ConnectionState.DISCONNECTED);
      } else {
          // Start Wake Word Mode
          setIsWakeWordEnabled(true);
          ensureAudioContexts(); 
          setConnectionState(ConnectionState.WAITING_FOR_WAKE_WORD);
      }
  }, [connectionState, disconnect, ensureAudioContexts]);


  // Wake Word Effect
  useEffect(() => {
      if (connectionState === ConnectionState.WAITING_FOR_WAKE_WORD && isWakeWordEnabled) {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          
          if (!SpeechRecognition) {
              console.warn("Speech Recognition not supported in this browser.");
              return;
          }

          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true; 
          recognition.lang = 'en-US';

          recognition.onresult = (event: any) => {
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                  const transcript = event.results[i][0].transcript.toLowerCase();
                  if (transcript.includes('jarvis')) {
                      console.log("Wake Word Detected!");
                      recognition.stop();
                      connect(); 
                      return;
                  }
              }
          };

          recognition.onend = () => {
              if (connectionState === ConnectionState.WAITING_FOR_WAKE_WORD && isWakeWordEnabled) {
                   try {
                       recognition.start();
                   } catch(e) {
                       console.error("Failed to restart recognition", e);
                   }
              }
          };

          try {
              recognition.start();
              recognitionRef.current = recognition;
          } catch(e) {
              console.error("Recognition start error", e);
          }

          return () => {
              if (recognitionRef.current) {
                  recognitionRef.current.stop();
                  recognitionRef.current = null;
              }
          };
      }
  }, [connectionState, isWakeWordEnabled, connect]);

  return {
    connectionState,
    toggleSystem,
    volume,
    transcripts,
    stopSpeaking
  };
};