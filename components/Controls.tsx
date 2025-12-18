import React from 'react';
import { ConnectionState } from '../types';

interface ControlsProps {
  connectionState: ConnectionState;
  toggleSystem: () => void;
  toggleTranscript: () => void;
  showTranscript: boolean;
  stopSpeaking: () => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  connectionState, 
  toggleSystem,
  toggleTranscript,
  showTranscript,
  stopSpeaking
}) => {
  const isDisconnected = connectionState === ConnectionState.DISCONNECTED;
  const isSpeaking = connectionState === ConnectionState.SPEAKING;

  // Color logic
  let mainBtnColor = 'border-cyan-500/50 text-cyan-500';
  let mainBtnBg = 'bg-cyan-500';
  
  if (!isDisconnected) {
      mainBtnColor = 'border-red-500/50 text-red-500';
      mainBtnBg = 'bg-red-500';
  }

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30">
        
      {/* Transcript Toggle */}
      <button
        onClick={toggleTranscript}
        className={`
            p-4 rounded-full border border-cyan-900/50 bg-black/40 backdrop-blur-sm
            text-cyan-500 hover:text-cyan-300 hover:border-cyan-500 transition-all
            ${showTranscript ? 'bg-cyan-900/20 text-cyan-300' : ''}
        `}
        title="Toggle Logs"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </button>

        {/* Main Power/Connect Button */}
      <button
        onClick={toggleSystem}
        className={`
          relative group flex items-center justify-center w-20 h-20 rounded-full border-2 
          transition-all duration-300 ${mainBtnColor} hover:bg-white/5
        `}
      >
        <div className={`
          absolute inset-0 rounded-full blur-md opacity-20 transition-opacity duration-300
          ${mainBtnBg}
          group-hover:opacity-40
        `}></div>
        
        <svg 
            className={`w-8 h-8 transition-colors`} 
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
            {!isDisconnected ? (
                // Power Off
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
                // Power On
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            )}
        </svg>
      </button>

      {/* Stop Speaking Button (Visible only when Speaking) */}
      <div className={`transition-all duration-300 ${isSpeaking ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
         <button
            onClick={stopSpeaking}
            className={`
                p-4 rounded-full border border-orange-900/50 bg-black/40 backdrop-blur-sm
                text-orange-500 hover:text-orange-300 hover:border-orange-500 transition-all
            `}
            title="Silence"
         >
           <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
           </svg>
         </button>
      </div>
      
    </div>
  );
};

export default Controls;
