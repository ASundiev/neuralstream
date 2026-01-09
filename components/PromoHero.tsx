import React from 'react';
import logo from '../assets/Logo.svg';

interface PromoHeroProps {
  onTryNow: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  isFlipped: boolean;
}

export const PromoHero: React.FC<PromoHeroProps> = ({ onTryNow, onLogin, onSignUp, isFlipped }) => {
  return (
    <div className="relative w-full tech-border bg-slate-900/10 backdrop-blur-[4px] overflow-hidden py-6 md:py-12 px-4 md:px-12 flex flex-col items-center justify-center min-h-[350px] md:min-h-[450px] animate-expand-hero tech-chipped">
      {/* HUD Background elements */}
      <div className="scanline opacity-10"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,255,0.08)_0%,transparent_70%)] pointer-events-none"></div>

      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(0,245,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.1)_1px,transparent_1px)] bg-[size:60px_60px]"></div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-12">
        <div className="space-y-10">
          <div className="flex flex-col items-center space-y-8">
            <div className="flex items-center gap-4 animate-slide-fade-blur [animation-delay:1000ms]">
              <img src={logo} alt="NEURALSTREAM" className="h-[18px] w-auto" />
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl md:text-[96px] font-thin leading-[0.89] text-white uppercase tracking-[-2px] font-heading cyber-headline italic animate-slide-fade-blur [animation-delay:1100ms]">
                Decode Your <br />
                Cinematic <span className="text-cyan-400">DNA_</span>
              </h1>
              <div className="flex items-center justify-center gap-4 animate-slide-fade-blur [animation-delay:1200ms]">
                <p className="font-mono text-[10px] md:text-xs text-[#8195b1] max-w-2xl leading-relaxed font-medium italic tracking-[0.1em] uppercase mono-medium-italic">
                  Uplink your IMDB ratings matrix. Our neural engine maps recommendations synthesized from your unique viewer profile.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 min-h-[80px] animate-slide-fade-blur [animation-delay:1300ms]">
            {!isFlipped ? (
              <button
                onClick={onTryNow}
                className="px-24 py-6 bg-cyan-500 text-black font-mono font-extrabold italic text-sm uppercase tracking-[0.4em] hover:bg-white transition-all shadow-[0_0_50px_rgba(0,245,255,0.3)] hover:shadow-cyan-400/60 relative group/btn tech-chipped overflow-hidden active:scale-95"
              >
                {/* Internal shine effect */}
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out pointer-events-none"></div>

                <span className="relative z-10 font-mono italic text-[20px] font-extrabold mono-extrabold-italic">TRY_NOW</span>
              </button>
            ) : (
              <div className="flex items-center gap-8">
                <button
                  onClick={onLogin}
                  className="px-6 md:px-14 py-4 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-mono font-extrabold italic text-xs uppercase tracking-[0.2em] hover:bg-cyan-500 hover:text-black transition-all tech-chipped whitespace-nowrap mono-extrabold-italic"
                >
                  [ LOG IN ]
                </button>
                <button
                  onClick={onSignUp}
                  className="font-mono text-xs font-extrabold italic uppercase tracking-widest text-[#8195b1] hover:text-white transition-colors whitespace-nowrap mono-extrabold-italic"
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