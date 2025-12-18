import React, { useEffect, useRef } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptProps {
  items: TranscriptItem[];
}

const Transcript: React.FC<TranscriptProps> = ({ items }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className="absolute top-0 right-0 h-full w-full md:w-1/3 bg-black/80 backdrop-blur-sm border-l border-cyan-900/30 p-6 overflow-y-auto scrollbar-hide z-20 pointer-events-auto"
    >
      <h3 className="font-tech text-cyan-500 mb-6 text-xl tracking-widest border-b border-cyan-900/50 pb-2">
        > TRANSCRIPT_LOG
      </h3>
      <div className="space-y-6">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-xs text-gray-500 mb-1 font-mono uppercase">
              {item.sender === 'user' ? '>> COMMAND' : '>> RESPONSE'}
            </span>
            <div 
              className={`max-w-[85%] p-3 rounded-sm border-l-2 ${
                item.sender === 'user' 
                  ? 'bg-cyan-900/10 border-cyan-500 text-cyan-100' 
                  : 'bg-slate-900/10 border-orange-500 text-orange-100'
              }`}
            >
              <p className="font-sans leading-relaxed text-sm md:text-base">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transcript;
