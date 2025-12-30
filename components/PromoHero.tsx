import React from 'react';

interface PromoHeroProps {
  onTryNow: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  isFlipped: boolean;
}

export const PromoHero: React.FC<PromoHeroProps> = ({ onTryNow, onLogin, onSignUp, isFlipped }) => {
  return (
    <div className="relative w-full tech-border bg-slate-900/10 overflow-hidden py-16 md:py-16 px-6 md:px-12 flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px] animate-neural-reveal tech-chipped">
      {/* HUD Background elements */}
      <div className="scanline opacity-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,255,0.08)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Decorative corners */}
      <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-cyan-500/40"></div>
      <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-cyan-500/40"></div>

      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(0,245,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-12">
        <div className="space-y-10">
          <div className="flex flex-col items-center space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center bg-cyan-500 shadow-[0_0_15px_rgba(0,245,255,0.4)] tech-chipped">
                  <i className="fa-solid fa-dna text-sm text-black"></i>
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tighter uppercase italic leading-tight text-white drop-shadow-[0_0:10px_rgba(0,245,255,0.1)] mono">
                  NeuralStream
              </span>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white leading-[0.85] drop-shadow-[0_0_20px_rgba(0,245,255,0.2)]">
                Decode Your <br />
                Cinematic <span className="text-cyan-400">DNA_</span>
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-[1px] w-12 bg-cyan-500/30"></div>
                <p className="mono text-[10px] md:text-xs text-slate-400 max-w-2xl leading-relaxed uppercase font-light tracking-[0.2em]">
                  Uplink your IMDB ratings matrix. Our neural engine maps recommendations synthesized from your unique viewer profile.
                </p>
                <div className="h-[1px] w-12 bg-cyan-500/30"></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 min-h-[64px]">
            {!isFlipped ? (
              <button 
                onClick={onTryNow}
                className="px-20 py-6 bg-cyan-500 text-black mono font-black text-sm uppercase tracking-[0.4em] hover:bg-white transition-all shadow-[0_0_40px_rgba(0,245,255,0.3)] hover:shadow-cyan-400/60 relative group/btn tech-chipped"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
                TRY_NOW
              </button>
            ) : (
              <div className="flex items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
                <button 
                  onClick={onLogin}
                  className="px-14 py-4 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 mono font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-500 hover:text-black transition-all tech-chipped"
                >
                  [ LOG IN ]
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