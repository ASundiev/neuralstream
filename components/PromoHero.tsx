
import React from 'react';

interface PromoHeroProps {
  onLogin: () => void;
}

export const PromoHero: React.FC<PromoHeroProps> = ({ onLogin }) => {
  return (
    <div className="relative w-full tech-border bg-slate-900/20 overflow-hidden py-12 md:py-24 px-6 md:px-12 group">
      <div className="scanline opacity-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,255,0.05)_0%,transparent_70%)]"></div>
      
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(0,245,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-12 max-w-6xl mx-auto">
        <div className="flex-1 space-y-8 text-center md:text-left">
          <div className="inline-flex items-center gap-3 px-3 py-1 border border-cyan-500/20 bg-cyan-500/5 mono text-[10px] text-cyan-400 uppercase tracking-[0.3em] animate-pulse">
            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
            Neural_Protocol_Active
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-[0.9]">
              Decode Your <br />
              Cinematic <span className="text-cyan-400">DNA</span>
            </h1>
            <p className="mono text-xs md:text-sm text-slate-400 max-w-lg leading-relaxed uppercase">
              Uplink your IMDB profile to synthesize a custom recommendation matrix. 
              Our neural engine maps thousands of data points from your ratings to find your next obsession.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 bg-cyan-500 text-black mono font-black text-sm uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_30px_rgba(0,245,255,0.3)] hover:shadow-cyan-400/50"
            >
              [ INITIALIZE_UPLINK ]
            </button>
            <div className="mono text-[10px] text-slate-600 uppercase">
              Connection_Secured // Encrypted_Sync
            </div>
          </div>
        </div>

        {/* Visual Matrix Component */}
        <div className="flex-1 relative w-64 h-64 md:w-96 md:h-96">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Pulsating Neural Hub */}
            <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border border-cyan-500/10 flex items-center justify-center bg-cyan-500/5 animate-pulse-glow">
               <svg viewBox="0 0 100 100" className="w-full h-full p-4">
                  <path 
                    d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1" 
                    className="text-cyan-400 animate-orbit"
                  />
                  <circle cx="50" cy="50" r="5" fill="currentColor" className="text-cyan-500" />
               </svg>
            </div>
            {/* Rotating Orbits */}
            <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-orbit"></div>
            <div className="absolute inset-10 border border-white/5 rounded-full animate-orbit-rev"></div>
            
            {/* Data Nodes */}
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="absolute w-2 h-2 bg-cyan-500/40 rounded-full"
                style={{
                  top: `${50 + 40 * Math.sin((i * 60 * Math.PI) / 180)}%`,
                  left: `${50 + 40 * Math.cos((i * 60 * Math.PI) / 180)}%`,
                  boxShadow: '0 0 10px rgba(0,245,255,0.5)'
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom Data Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-10 border-t border-white/5 bg-black/40 flex items-center px-8 justify-between">
         <div className="flex gap-8">
            <div className="mono text-[9px] text-slate-600 uppercase">Latency::0.04ms</div>
            <div className="mono text-[9px] text-slate-600 uppercase">Cluster::Neural_09</div>
         </div>
         <div className="mono text-[9px] text-cyan-500/50 uppercase tracking-widest animate-pulse">Awaiting_Neural_Input_Signal...</div>
      </div>
    </div>
  );
};
