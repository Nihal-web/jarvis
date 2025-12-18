export interface TranscriptItem {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  isComplete: boolean;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  WAITING_FOR_WAKE_WORD = 'WAITING_FOR_WAKE_WORD',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
