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

interface NeuralLoaderProps {
  variant?: 'full' | 'compact';
  progress?: number;
}

export const NeuralLoader: React.FC<NeuralLoaderProps> = ({ variant = 'full', progress }) => {
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex((prev) => (prev + 1) % LOG_MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  if (variant === 'compact') {
    return (
      <div className="w-full py-2 mt-2 relative overflow-hidden group">
        <style>
          {`
            @keyframes glitch-color-split {
              0% { transform: translate(0); opacity: 0; }
              5% { transform: translate(-2px, 1px); opacity: 0.8; }
              10% { transform: translate(2px, -1px); opacity: 0.8; }
              11% { transform: translate(0); opacity: 0; }
              100% { transform: translate(0); opacity: 0; }
            }
            @keyframes glitch-slice {
              0% { clip-path: inset(0 0 0 0); }
              2% { clip-path: inset(20% 0 50% 0); transform: translateX(-5px); }
              4% { clip-path: inset(80% 0 10% 0); transform: translateX(5px); }
              6% { clip-path: inset(0 0 0 0); transform: translateX(0); }
              100% { clip-path: inset(0 0 0 0); }
            }
            @keyframes glitch-flicker-intense {
              0% { opacity: 1; transform: skew(0); }
              2% { opacity: 0.5; transform: skew(5deg); }
              4% { opacity: 1; transform: skew(0); }
              50% { opacity: 1; transform: translateX(0); }
              51% { opacity: 0.3; transform: translateX(4px); }
              52% { opacity: 1; transform: translateX(0); }
            }
            @keyframes scan-fast {
              0% { transform: translateX(-100%); }
              30% { transform: translateX(100%); }
              100% { transform: translateX(100%); }
            }
          `}
        </style>

        <div className="w-full">
          {/* Glitch Progress Bar Container */}
          <div className="space-y-3 flex flex-col justify-center w-full">
            <div className="flex justify-between items-end mono text-[10px] uppercase tracking-widest font-black">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-cyan-500/40 text-[8px]">
                  <i className="fa-solid fa-microchip animate-spin"></i>
                  NEURAL_MATRIX_SYNTHESIS_V1.2
                </div>
                <div className="text-cyan-400 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(0,245,255,0.6)] text-xs md:text-sm animate-[glitch-flicker-intense_4s_infinite]">
                  <span className="w-2 h-2 bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(0,245,255,1)]"></span>
                  {LOG_MESSAGES[logIndex]}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-cyan-500/40 text-[8px]">SYNTHESIS_COMPLETION</div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-sm">{progress !== undefined ? `${progress}%` : '0%'}</span>
                  <div className="w-1.5 h-1.5 bg-greenAcc-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(46,213,115,1)]"></div>
                </div>
              </div>
            </div>

            <div className="h-6 md:h-8 bg-slate-900/80 relative border border-cyan-500/20 overflow-hidden tech-border group-hover:border-cyan-500/40 transition-colors shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              {/* Background Grid - more visible */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.2) 1px, transparent 1px)', backgroundSize: '5% 100%' }}></div>

              {/* Multi-layered Glitch Bar */}
              <div
                className="absolute inset-0 origin-left transition-transform duration-700 ease-out"
                style={{ transform: `scaleX(${(progress ?? 0) / 100})` }}
              >
                {/* Ghost Layers for Color Splitting */}
                <div className="absolute inset-0 bg-magenta-500/30 animate-[glitch-color-split_3s_infinite] mix-blend-screen"></div>
                <div className="absolute inset-0 bg-cyan-500/30 animate-[glitch-color-split_3s_infinite_reverse] mix-blend-screen"></div>

                {/* Main Bar with Slice Glitch */}
                <div className="absolute inset-0 bg-cyan-500 shadow-[0_0_30px_rgba(0,245,255,0.5)] animate-[glitch-slice_4s_infinite,glitch-flicker-intense_5s_infinite]">
                  {/* Scanline inside bar */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-[scan-fast_1.2s_linear_infinite]"></div>

                  {/* Digital Noise pattern */}
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.4) 1px, rgba(0,0,0,0.4) 2px)', backgroundSize: '100% 2px' }}></div>
                </div>
              </div>

              {/* Overlaid Static/Flicker Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-cyan-500/5 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-slate-900/10 tech-border relative overflow-hidden group">
      <div className="scanline opacity-20"></div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-48 h-48 mb-12">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#00f5ff" strokeWidth="0.5" strokeDasharray="10 5" className="opacity-30" />
            <circle cx="50" cy="50" r="35" fill="none" stroke="#e0f603" strokeWidth="1" strokeDasharray="5 15" className="opacity-50" />
            <circle cx="50" cy="50" r="15" fill="#00f5ff" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="#00f5ff" strokeWidth="2" className="animate-ping opacity-20" />

            <path d="M50 5 L55 15 L45 15 Z" fill="#00f5ff" transform="rotate(0 50 50)" />
            <path d="M50 5 L55 15 L45 15 Z" fill="#e0f603" transform="rotate(120 50 50)" />
            <path d="M50 5 L55 15 L45 15 Z" fill="#00f5ff" transform="rotate(240 50 50)" />
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
              NEURAL_MATRIX_SYNTHESIS
            </h3>
          </div>

          <div className="h-1 w-64 bg-white/5 mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-cyan-500 to-greenAcc-500 w-full"></div>
          </div>

          <div className="mono text-sm space-y-2 bg-black/40 p-4 border border-white/5 tech-border min-w-[320px]">
            <div className="flex justify-between text-slate-600 text-[10px] mb-2 border-b border-white/5 pb-2 uppercase">
              <span>Status_Log</span>
              <span>Ver_1.1.0</span>
            </div>
            <div className="h-6 overflow-hidden">
              <div className="text-cyan-400 font-bold uppercase transition-transform duration-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-500 animate-pulse"></span>
                {LOG_MESSAGES[logIndex]}
              </div>
            </div>
            <div className="text-slate-500 text-[10px] uppercase text-left">
              Memory_Buffer_Allocation::Verified<br />
              Neural_Pathways::Synced<br />
              <span className="text-cyan-500/60">Awaiting_Model_Output...</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-500/30"></div>
      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-500/30"></div>
      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-greenAcc-500/30"></div>
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-500/30"></div>
    </div>
  );
};