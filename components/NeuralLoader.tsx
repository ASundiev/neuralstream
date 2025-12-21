
import React, { useState, useEffect } from 'react';

const LOG_MESSAGES = [
  "ESTABLISHING_NEURAL_LINK...",
  "PARSING_HISTORY_NODES...",
  "QUERYING_GLOBAL_DATABASE...",
  "FILTERING_GENRE_FREQUENCIES...",
  "SYNTHESIZING_AFFECTIVE_MAPPING...",
  "DECODING_VISUAL_SIGNALS...",
  "SATELLITE_HANDSHAKE_INITIALIZED...",
  "VERIFYING_METADATA_INTEGRITY...",
  "NEURAL_SYNAPSE_MAPPING_ACTIVE...",
  "APPLYING_MOOD_HEURISTICS...",
  "OPTIMIZING_RECOMMENDATION_OUTPUT..."
];

export const NeuralLoader: React.FC = () => {
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev + 1) % LOG_MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-slate-900/10 tech-border relative overflow-hidden group">
      <div className="scanline opacity-20"></div>
      
      {/* HUD Background elements */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-[600px] h-[600px] border border-cyan-500 rounded-full animate-orbit"></div>
        <div className="absolute w-[400px] h-[400px] border border-cyan-500/50 rounded-full animate-orbit-rev"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Central Core Animation */}
        <div className="relative w-48 h-48 mb-12">
          {/* Animated SVG HUD */}
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Outer rotating ring */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="10 5" className="text-cyan-500/30 animate-orbit" />
            {/* Inner rotating dash ring */}
            <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5 15" className="text-cyan-400/50 animate-orbit-rev" />
            {/* Central Pulsating Core */}
            <circle cx="50" cy="50" r="15" fill="currentColor" className="text-cyan-500 animate-pulse-glow" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500 animate-ping opacity-20" />
            
            {/* Geometric accents */}
            <path d="M50 5 L55 15 L45 15 Z" fill="currentColor" className="text-cyan-500" transform="rotate(0 50 50)" />
            <path d="M50 5 L55 15 L45 15 Z" fill="currentColor" className="text-cyan-500" transform="rotate(120 50 50)" />
            <path d="M50 5 L55 15 L45 15 Z" fill="currentColor" className="text-cyan-500" transform="rotate(240 50 50)" />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="fa-solid fa-microchip text-black text-xl z-20"></i>
          </div>
        </div>

        <div className="space-y-6 text-center max-w-md">
          <div className="space-y-2">
            <div className="mono text-xs text-cyan-500 uppercase tracking-[0.5em] font-black animate-pulse">
              [ PROCESSING_DATA_STREAMS ]
            </div>
            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              NEURAL_MATRIC_SYNTHESIS
            </h3>
          </div>

          <div className="h-1 w-64 bg-white/5 mx-auto relative overflow-hidden">
             <div className="absolute inset-0 bg-cyan-500/50 w-1/3 animate-[shimmer_1.5s_infinite]"></div>
          </div>

          <div className="mono text-sm space-y-2 bg-black/40 p-4 border border-white/5 tech-border min-w-[320px]">
            <div className="flex justify-between text-slate-600 text-[10px] mb-2 border-b border-white/5 pb-2 uppercase">
              <span>Status_Log</span>
              <span>Ver_1.0.9</span>
            </div>
            {/* Log display with cycling messages */}
            <div className="h-6 overflow-hidden">
               <div className="text-cyan-400 font-bold uppercase transition-transform duration-500 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-cyan-500 animate-pulse"></span>
                 {LOG_MESSAGES[logIndex]}
               </div>
            </div>
            <div className="text-slate-500 text-[10px] uppercase text-left">
              Memory_Buffer_Allocation::Verified<br/>
              Neural_Pathways::Synced<br/>
              Awaiting_Model_Output...
            </div>
          </div>
        </div>
      </div>

      {/* Corners decorative */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-500/30"></div>
      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-500/30"></div>
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-500/30"></div>
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-500/30"></div>
    </div>
  );
};
