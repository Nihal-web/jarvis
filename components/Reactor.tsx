import React from 'react';
import { ConnectionState } from '../types';

interface ReactorProps {
  connectionState: ConnectionState;
  volume: number; // 0-100
}

const Reactor: React.FC<ReactorProps> = ({ connectionState, volume }) => {
  const isActive = connectionState === ConnectionState.CONNECTED;
  const isWaiting = connectionState === ConnectionState.WAITING_FOR_WAKE_WORD;
  
  // Map volume to scale and opacity effects
  const scale = 1 + (volume / 200); 
  
  let glowIntensity = 0.2;
  if (isActive) glowIntensity = 0.5 + (volume / 100);
  if (isWaiting) glowIntensity = 0.4 + (Math.sin(Date.now() / 500) * 0.1); // Pulse effect
  
  // Color determination
  let color = '100, 116, 139'; // Slate (Disconnected)
  if (isActive) color = '0, 255, 255'; // Cyan (Active)
  if (isWaiting) color = '255, 165, 0'; // Amber (Waiting)
  if (connectionState === ConnectionState.CONNECTING) color = '0, 255, 0'; // Green

  const colorClass = isActive ? 'text-cyan-500' : isWaiting ? 'text-amber-500' : 'text-slate-500';
  const borderClass = isActive ? 'border-cyan-900/50' : isWaiting ? 'border-amber-900/50' : 'border-slate-800/50';

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96">
      {/* Outer Ring */}
      <div 
        className={`absolute w-full h-full rounded-full border-4 ${borderClass} animate-[spin_10s_linear_infinite]`}
        style={{ boxShadow: `0 0 ${20 * scale}px rgba(${color}, ${glowIntensity * 0.5})` }}
      >
         <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-4 ${isActive ? 'bg-cyan-500/50' : 'bg-slate-500/20'}`}></div>
         <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-4 ${isActive ? 'bg-cyan-500/50' : 'bg-slate-500/20'}`}></div>
         <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-4 h-2 ${isActive ? 'bg-cyan-500/50' : 'bg-slate-500/20'}`}></div>
         <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-2 ${isActive ? 'bg-cyan-500/50' : 'bg-slate-500/20'}`}></div>
      </div>

      {/* Inner Rotating Ring */}
      <div 
        className={`absolute w-[85%] h-[85%] rounded-full border-2 ${isActive ? 'border-cyan-500/30' : 'border-slate-500/10'} animate-[spin_4s_linear_infinite_reverse]`}
      >
      </div>

      {/* Core Glow */}
      <div 
        className={`absolute w-[60%] h-[60%] rounded-full blur-2xl transition-all duration-75`}
        style={{ 
          backgroundColor: `rgb(${color})`,
          opacity: glowIntensity,
          transform: `scale(${scale})`
        }}
      />

      {/* Solid Core */}
      <div 
        className={`relative z-10 w-[50%] h-[50%] rounded-full flex items-center justify-center shadow-inner border transition-colors duration-500
          ${isActive ? 'bg-gradient-to-tr from-cyan-900 to-cyan-100 border-cyan-200' : 
            isWaiting ? 'bg-gradient-to-tr from-amber-900 to-amber-100 border-amber-200' : 
            'bg-slate-900 border-slate-700'}
        `}
      >
        <div className="w-[80%] h-[80%] rounded-full bg-black flex items-center justify-center">
            <div 
                className="w-[90%] h-[90%] rounded-full flex items-center justify-center transition-colors duration-300"
                style={{
                    background: `radial-gradient(circle, rgba(${color},${glowIntensity}) 0%, rgba(0,0,0,1) 100%)`
                }}
            >
            </div>
        </div>
      </div>
      
      {/* Text Overlay */}
      <div className={`absolute bottom-[-60px] text-center font-tech tracking-widest ${colorClass}`}>
        {isActive ? 'JARVIS SYSTEM ONLINE' : 
         isWaiting ? 'LISTENING FOR "JARVIS"' : 
         connectionState === ConnectionState.CONNECTING ? 'INITIALIZING...' : 'SYSTEM STANDBY'}
      </div>
    </div>
  );
};

export default Reactor;
