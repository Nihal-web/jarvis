import React from 'react';
import { ConnectionState } from '../types';

interface ReactorProps {
  connectionState: ConnectionState;
  volume: number; // 0-100
}

const Reactor: React.FC<ReactorProps> = ({ connectionState, volume }) => {
  const isSpeaking = connectionState === ConnectionState.SPEAKING;
  const isListening = connectionState === ConnectionState.LISTENING;
  const isProcessing = connectionState === ConnectionState.PROCESSING;
  const isStandby = connectionState === ConnectionState.STANDBY;
  
  // Map volume to scale and opacity effects
  const scale = 1 + (volume / 200); 
  
  let glowIntensity = 0.2;
  let color = '100, 116, 139'; // Slate (Disconnected)
  let spinDuration = '10s';

  if (isStandby) {
      color = '255, 165, 0'; // Amber
      glowIntensity = 0.4 + (Math.sin(Date.now() / 1000) * 0.1);
  }
  if (isListening) {
      color = '0, 255, 0'; // Green
      glowIntensity = 0.5 + (volume / 100);
      spinDuration = '2s';
  }
  if (isProcessing) {
      color = '147, 51, 234'; // Purple
      glowIntensity = 0.8;
      spinDuration = '0.5s';
  }
  if (isSpeaking) {
      color = '0, 255, 255'; // Cyan
      glowIntensity = 0.5 + (volume / 80);
      spinDuration = '4s';
  }

  const borderClass = `border-[rgba(${color},0.5)]`;
  const shadowColor = `rgba(${color},${glowIntensity})`;

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96">
      {/* Outer Ring */}
      <div 
        className={`absolute w-full h-full rounded-full border-4 transition-all duration-500`}
        style={{ 
            borderColor: `rgba(${color}, 0.3)`,
            boxShadow: `0 0 ${20 * scale}px ${shadowColor}`,
            animation: `spin ${spinDuration} linear infinite`
        }}
      >
         {/* Decorative ticks */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-white/20"></div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-white/20"></div>
         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-1 bg-white/20"></div>
         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-1 bg-white/20"></div>
      </div>

      {/* Inner Rotating Ring */}
      <div 
        className={`absolute w-[85%] h-[85%] rounded-full border-2 border-dashed transition-all duration-500`}
        style={{ 
            borderColor: `rgba(${color}, 0.2)`,
            animation: `spin ${parseInt(spinDuration)*1.5}s linear infinite reverse` 
        }}
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
        className={`relative z-10 w-[50%] h-[50%] rounded-full flex items-center justify-center shadow-inner border transition-colors duration-500`}
        style={{
            borderColor: `rgba(${color}, 0.5)`,
            background: `radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)`,
            backgroundColor: `rgba(${color}, 0.1)`
        }}
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
      <div className={`absolute bottom-[-60px] text-center font-tech tracking-widest transition-colors duration-300`} style={{ color: `rgb(${color})` }}>
        {connectionState === 'DISCONNECTED' ? 'SYSTEM OFFLINE' : 
         connectionState === 'STANDBY' ? 'PASSIVE MONITORING' :
         connectionState === 'LISTENING' ? 'LISTENING...' :
         connectionState === 'PROCESSING' ? 'COMPUTING...' :
         'VOCALIZATION ACTIVE'}
      </div>
    </div>
  );
};

export default Reactor;
