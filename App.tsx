import React, { useState } from 'react';
import { useJarvis } from './hooks/useJarvis';
import Reactor from './components/Reactor';
import Controls from './components/Controls';
import Transcript from './components/Transcript';
import { ConnectionState } from './types';

const App: React.FC = () => {
  const { connectionState, toggleSystem, volume, transcripts, stopSpeaking } = useJarvis();
  const [showTranscript, setShowTranscript] = useState(false);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isWaiting = connectionState === ConnectionState.WAITING_FOR_WAKE_WORD;

  let statusColor = 'text-cyan-700';
  let indicatorColor = 'bg-red-500';
  
  if (isConnected) {
      statusColor = 'text-green-500';
      indicatorColor = 'bg-green-500 shadow-[0_0_10px_#22c55e]';
  } else if (isWaiting) {
      statusColor = 'text-amber-500';
      indicatorColor = 'bg-amber-500 shadow-[0_0_10px_#f59e0b] animate-pulse';
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      {/* Background Grid & Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      <div className="absolute inset-0 bg-radial-gradient from-cyan-900/20 via-black to-black"></div>

      {/* Header */}
      <div className="absolute top-6 left-6 z-20">
        <h1 className="font-tech text-3xl text-cyan-500 tracking-wider">J.A.R.V.I.S</h1>
        <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${indicatorColor}`}></div>
            <span className={`text-xs font-mono tracking-widest uppercase ${statusColor}`}>
                {connectionState.replace(/_/g, ' ')}
            </span>
        </div>
      </div>

      {/* Visualizer Core */}
      <div className={`transition-all duration-700 ${showTranscript ? 'md:-translate-x-1/4' : ''}`}>
        <Reactor connectionState={connectionState} volume={volume} />
      </div>

      {/* Side Panel for Transcript */}
      {showTranscript && (
          <div className="animate-slide-in-right">
             <Transcript items={transcripts} />
          </div>
      )}

      {/* Controls */}
      <Controls 
        connectionState={connectionState}
        toggleSystem={toggleSystem}
        toggleTranscript={() => setShowTranscript(!showTranscript)}
        showTranscript={showTranscript}
        stopSpeaking={stopSpeaking}
      />
      
      {/* Error Toast */}
      {connectionState === ConnectionState.ERROR && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-900/80 border border-red-500 text-red-200 px-6 py-3 rounded-sm backdrop-blur-md z-50 font-mono text-sm">
             (!) CONNECTION FAILED. CHECK API KEY OR NETWORK.
          </div>
      )}
    </div>
  );
};

export default App;