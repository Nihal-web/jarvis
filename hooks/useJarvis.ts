import { useState, useRef, useCallback, useEffect } from 'react';
import { ConnectionState, TranscriptItem } from '../types';
import { 
  playConnectChime, 
  playDisconnectChime, 
  playWakeWordDetected, 
  playSystemStart 
} from '../utils/soundEffects';

export const useJarvis = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [volume, setVolume] = useState<number>(0);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // --- 1. Transcript Helper ---
  const addTranscript = useCallback((text: string, sender: 'user' | 'jarvis') => {
    setTranscripts(prev => [...prev, {
        id: Date.now().toString() + sender,
        sender,
        text,
        isComplete: true,
        timestamp: new Date()
    }]);
  }, []);

  // --- 2. The "Brain" (Offline Command Processor) ---
  const processCommand = useCallback((command: string) => {
    setConnectionState(ConnectionState.PROCESSING);
    const lower = command.toLowerCase();
    let response = "";

    // Simple Rule-Based Logic
    if (lower.includes('time')) {
        response = `It is currently ${new Date().toLocaleTimeString()}.`;
    } else if (lower.includes('date') || lower.includes('day')) {
        response = `Today is ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}.`;
    } else if (lower.includes('who are you') || lower.includes('identify')) {
        response = "I am Jarvis. A browser-native offline assistant running on your local machine.";
    } else if (lower.includes('hello') || lower.includes('hi')) {
        response = "Greetings. All systems are nominal.";
    } else if (lower.includes('search for')) {
        const query = lower.split('search for')[1].trim();
        response = `Searching the web for ${query}.`;
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    } else if (lower.includes('open youtube')) {
        response = "Opening YouTube.";
        window.open('https://www.youtube.com', '_blank');
    } else if (lower.includes('stop') || lower.includes('cancel')) {
        response = "Cancelling.";
    } else {
        const fallback = [
            "I am limited to offline commands, sir.",
            "I didn't catch that. Could you repeat?",
            "My processing is local only. I cannot answer complex queries."
        ];
        response = fallback[Math.floor(Math.random() * fallback.length)];
    }

    // Add to transcript and Speak
    addTranscript(response, 'jarvis');
    speakResponse(response);
  }, [addTranscript]);

  // --- 3. Text To Speech (TTS) ---
  const speakResponse = (text: string) => {
    if (synthRef.current.speaking) {
        synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to find a good voice
    const voices = synthRef.current.getVoices();
    // Prefer Google US English or a generic English voice
    const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US');
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.pitch = 0.9; // Slightly lower for Jarvis feel
    utterance.rate = 1.0;

    utterance.onstart = () => {
        setConnectionState(ConnectionState.SPEAKING);
        simulateSpeakingVolume(); // Visualizer for TTS
    };

    utterance.onend = () => {
        setConnectionState(ConnectionState.STANDBY);
        setVolume(0);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        
        // Restart listening for wake word/commands loop
        startListening(); 
    };

    synthRef.current.speak(utterance);
  };

  // Fake volume visualizer for when the computer is speaking
  const simulateSpeakingVolume = () => {
      const animate = () => {
          // Random fluctuation between 20 and 80
          const val = Math.random() * 60 + 20;
          setVolume(val);
          animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
  };

  // --- 4. Speech Recognition Setup ---
  const startListening = useCallback(() => {
    // Safety check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addTranscript("Speech Recognition not supported in this browser.", 'jarvis');
        return;
    }

    // If already running, stop to reset
    if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // We want single commands
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        // If we were just Disconnected, we are now Standing By
        // If we actively triggered it, we might want to go straight to Listening
        // For now, let's assume this is the "Passive Listening" loop
    };

    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Heard:", transcript);

        // Simple Wake Word Logic Check
        // If we are in STANDBY, we look for "Jarvis"
        // If we are actively LISTENING (triggered by button), we take everything.
        
        const lower = transcript.toLowerCase();
        
        // Check state inside callback (using ref or functional update if needed, 
        // but here we just process everything for simplicity or check wake word)
        if (lower.includes('jarvis')) {
            playWakeWordDetected();
            const command = lower.replace('jarvis', '').trim();
            if (command.length > 0) {
                // He said "Jarvis [Command]"
                addTranscript(transcript, 'user');
                processCommand(command);
            } else {
                // He just said "Jarvis"
                playWakeWordDetected();
                addTranscript(transcript, 'user');
                speakResponse("Yes?");
            }
        } else {
            // Did not hear Jarvis.
            // If manual mode was implemented we'd process it, but for this loop:
            // Just ignore and restart (handled by onend)
        }
    };

    recognition.onerror = (event: any) => {
        console.error("Speech Error", event.error);
        if (event.error === 'not-allowed') {
            setConnectionState(ConnectionState.ERROR);
        }
    };

    recognition.onend = () => {
        // Auto-restart loop if we are connected and not speaking/processing
        // We use a timeout to prevent rapid-fire loops
        setTimeout(() => {
             // We access the *current* state via a ref check or checking synth
             if (!synthRef.current.speaking && connectionState !== ConnectionState.DISCONNECTED) {
                 try { recognition.start(); } catch(e) {}
             }
        }, 100);
    };

    recognitionRef.current = recognition;
    try {
        recognition.start();
        setConnectionState(ConnectionState.STANDBY);
    } catch(e) {
        console.error("Failed to start recognition", e);
    }

  }, [addTranscript, processCommand, connectionState]);

  // --- 5. Manual Activation (Button) ---
  const activateListening = useCallback(() => {
     // Stop current loop
     if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
     if (synthRef.current.speaking) synthRef.current.cancel();

     const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
     const recognition = new SpeechRecognition();
     recognition.continuous = false;
     recognition.lang = 'en-US';

     recognition.onstart = () => {
         setConnectionState(ConnectionState.LISTENING);
         playConnectChime();
         setupMicrophoneVisualizer(); // Visualizer for User Voice
     };

     recognition.onresult = (event: any) => {
         const transcript = event.results[0][0].transcript;
         addTranscript(transcript, 'user');
         processCommand(transcript);
     };

     recognition.onend = () => {
         cleanupMicrophoneVisualizer();
         // Don't auto-restart here, processCommand will handle the next step (Speaking) which eventually leads back to Standby
     };

     recognitionRef.current = recognition;
     recognition.start();

  }, [addTranscript, processCommand]);

  // --- 6. Microphone Visualizer Helpers ---
  const setupMicrophoneVisualizer = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          microphoneStreamRef.current = stream;
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;
          
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const updateVolume = () => {
              if (!analyserRef.current) return;
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for(let i=0; i < bufferLength; i++) { sum += dataArray[i]; }
              const average = sum / bufferLength;
              setVolume(average * 2); // Boost a bit
              animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
      } catch (err) {
          console.error("Mic access denied for visualizer", err);
      }
  };

  const cleanupMicrophoneVisualizer = () => {
      if (microphoneStreamRef.current) {
          microphoneStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
      }
      setVolume(0);
  };

  // --- 7. Main Lifecycle Toggle ---
  const toggleSystem = useCallback(() => {
    if (connectionState !== ConnectionState.DISCONNECTED) {
        // Turn Off
        setConnectionState(ConnectionState.DISCONNECTED);
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch(e) {}
        if (synthRef.current.speaking) synthRef.current.cancel();
        cleanupMicrophoneVisualizer();
        playDisconnectChime();
    } else {
        // Turn On
        playSystemStart();
        // We go to STANDBY (Passive listening for "Jarvis")
        startListening(); 
    }
  }, [connectionState, startListening]);

  const stopSpeaking = () => {
      if (synthRef.current.speaking) {
          synthRef.current.cancel();
          setConnectionState(ConnectionState.STANDBY);
          setVolume(0);
      }
  };

  return {
    connectionState,
    toggleSystem,
    volume,
    transcripts,
    stopSpeaking,
    activateListening // Expose this if we want a specific "Listen Now" button interaction
  };
};
