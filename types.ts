export interface TranscriptItem {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  isComplete: boolean;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  STANDBY = 'STANDBY', // Waiting for wake word or button press
  LISTENING = 'LISTENING', // Actively recording user command
  PROCESSING = 'PROCESSING', // Thinking/Matching command
  SPEAKING = 'SPEAKING', // TTS is active
  ERROR = 'ERROR',
}
