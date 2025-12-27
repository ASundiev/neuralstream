
import React from 'react';

interface PromoHeroProps {
  onTryNow: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  isFlipped: boolean;
}

export const PromoHero: React.FC<PromoHeroProps> = ({ onTryNow, onLogin, onSignUp, isFlipped }) => {
  return (
    <div className="relative w-full tech-border bg-slate-900/10 overflow-hidden py-16 md:py-16 px-6 md:px-12 flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px] animate-neural-reveal">
      {/* HUD Background elements */}
      <div className="scanline opacity-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,255,0.08)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(0,245,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-12">
        <div className="space-y-10">
          <div className="flex flex-col items-center space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-cyan-500/20 bg-cyan-500/5 mono text-[10px] text-cyan-400 uppercase tracking-[0.4em] animate-pulse rounded-full">
              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
              Neural_Protocol_Active
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.85] drop-shadow-[0_0_20px_rgba(0,245,255,0.2)]">
                Decode Your <br />
                Cinematic <span className="text-cyan-400">DNA</span>
              </h1>
              <p className="mono text-xs md:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed uppercase font-light tracking-wide">
                Uplink your IMDB ratings matrix. Our neural engine maps recommendations <br className="hidden md:block" />
                synthesized from your unique viewer profile.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 min-h-[64px]">
            {!isFlipped ? (
              <button 
                onClick={onTryNow}
                className="px-16 py-5 bg-cyan-500 text-black mono font-black text-sm uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_40px_rgba(0,245,255,0.3)] hover:shadow-cyan-400/60 relative overflow-hidden group/btn"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
                TRY NOW
              </button>
            ) : (
              <div className="flex items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
                <button 
                  onClick={onLogin}
                  className="px-12 py-4 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 mono font-black text-xs uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                >
                  [ LOGIN ]
                </button>
                <button 
                  onClick={onSignUp}
                  className="mono text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                >
                  [ SIGN UP ]
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
