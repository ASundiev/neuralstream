
import React from 'react';

interface PromoHeroProps {
  onLogin: () => void;
  onSignUp: () => void;
}

export const PromoHero: React.FC<PromoHeroProps> = ({ onLogin, onSignUp }) => {
  return (
    <div className="relative w-full tech-border bg-slate-900/10 overflow-hidden py-12 md:py-20 px-6 md:px-12 group flex items-center justify-center min-h-[450px] md:min-h-[550px] backdrop-blur-[2px]">
      {/* HUD Background elements */}
      <div className="scanline opacity-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,255,0.08)_0%,transparent_70%)]"></div>
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(0,245,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

      {/* Central Scanning Element */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <div className="w-[600px] h-[600px] rounded-full border border-cyan-500/10 animate-orbit flex items-center justify-center">
          <div className="w-[400px] h-[400px] rounded-full border border-cyan-500/5 animate-orbit-rev"></div>
        </div>
      </div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-8">
        <div className="space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-cyan-500/20 bg-cyan-500/5 mono text-[10px] text-cyan-400 uppercase tracking-[0.4em] animate-pulse rounded-full">
              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
              Neural_Protocol_Active
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.85] drop-shadow-[0_0_20px_rgba(0,245,255,0.2)]">
                Decode Your <br />
                Cinematic <span className="text-cyan-400">DNA</span>
              </h1>
              <p className="mono text-xs md:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed uppercase font-light tracking-wide">
                Uplink your IMDB profile to synthesize a custom recommendation matrix. 
                Our neural engine maps thousands of data points from your ratings to find your next obsession.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 md:gap-10">
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-10 py-4 bg-cyan-500 text-black mono font-black text-sm uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_40px_rgba(0,245,255,0.3)] hover:shadow-cyan-400/60 relative overflow-hidden group/btn"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
              [ LOGIN ]
            </button>
            <button 
              onClick={onSignUp}
              className="mono text-sm text-slate-400 hover:text-cyan-400 transition-all uppercase font-bold tracking-widest border-b border-transparent hover:border-cyan-500/50 pb-1 flex items-center gap-2 group/signup"
            >
              [ SIGN UP ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
