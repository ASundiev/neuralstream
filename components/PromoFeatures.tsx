import React, { useState, useRef, useEffect, useMemo } from 'react';

// ============================================================================
// Shared Components & Hooks
// ============================================================================

const useInView = (threshold = 0.5, rootMargin = '0px 0px -200px 0px') => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return [ref, isInView] as const;
};

const SectionHeader: React.FC<{ label: string; title: string; subtitle?: string; centered?: boolean }> = ({ label, title, subtitle, centered }) => (
  <div className={`mb-12 md:mb-20 space-y-4 ${centered ? 'flex flex-col items-center text-center' : ''}`}>
    <div className="flex items-center gap-3">
      <div className="w-12 h-[1px] bg-cyan-500/30" />
      <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-[0.4em] font-black">{label}</span>
      {centered && <div className="w-12 h-[1px] bg-cyan-500/30" />}
    </div>
    <div className="space-y-2">
      <h2 className="text-4xl md:text-6xl font-heading italic font-thin text-white uppercase tracking-tight leading-none">
        {title.split(' ').map((word, i) => {
          const isYour = word.toUpperCase() === 'YOUR';
          return (
            <span
              key={i}
              className={i % 2 !== 0 ? 'text-cyan-400' : ''}
              style={isYour ? { textShadow: '-4px 4px 0px #c8206b' } : undefined}
            >
              {word}{' '}
            </span>
          );
        })}
      </h2>
      {subtitle && (
        <p className="font-mono text-xs text-[#8195b1] uppercase tracking-widest max-w-xl mx-auto">{subtitle}</p>
      )}
    </div>
  </div>
);

const InfoTooltip: React.FC<{ text: string; tooltip: string }> = ({ text, tooltip }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        onClick={() => setShow(!show)}
        className="text-cyan-400 underline decoration-cyan-500/30 underline-offset-4 hover:text-white transition-colors cursor-help"
      >
        {text}
      </button>
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 p-4 bg-slate-900 border border-cyan-500/30 tech-chipped shadow-[0_0_30px_rgba(0,245,255,0.2)] transition-all duration-300 z-50 pointer-events-auto ${show ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-2 invisible'}`}>
        <div className="absolute inset-0 scanline opacity-5" />
        <div className="relative font-mono text-[10px] leading-relaxed text-[#8195b1] uppercase tracking-wider">
          <div className="flex items-center gap-2 mb-2 text-cyan-400 font-black">
            <span>[ PROTOCOL_GUIDE ]</span>
          </div>
          {tooltip}
        </div>
        {/* Pointer */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
      </div>
    </span>
  );
};

// ============================================================================
// Section 1: How It Works - Sticky Scroll Orchestration
// ============================================================================

const IngestionVisual = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <circle cx="100" cy="100" r="80" className="stroke-cyan-500/20 fill-none" strokeWidth="0.5" strokeDasharray="4 4" />
    <g className="animate-spin-slow origin-center">
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
        <rect key={angle} x="98" y="20" width="4" height="20" className="fill-cyan-400/50" transform={`rotate(${angle} 100 100)`} />
      ))}
    </g>
    <path d="M100 60 L100 140 M60 100 L140 100" className="stroke-cyan-500 animate-pulse" strokeWidth="1" />
    <circle cx="100" cy="100" r="30" className="fill-cyan-500/20 stroke-cyan-400" strokeWidth="2" />
    <rect x="85" y="85" width="30" height="30" className="fill-cyan-400 animate-bounce" style={{ animationDuration: '3s' }} />
  </svg>
);

const EngineVisual = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <g className="animate-pulse">
      <path d="M40 100 Q100 20 160 100 T40 100" className="fill-none stroke-cyan-500/40" strokeWidth="1" strokeDasharray="10 5" />
      <path d="M40 100 Q100 180 160 100 T40 100" className="fill-none stroke-cyan-400/20" strokeWidth="1" strokeDasharray="5 10" />
    </g>
    <circle cx="100" cy="100" r="100" className="fill-none stroke-cyan-500/10" strokeWidth="0.5" />
    <circle cx="100" cy="100" r="40" className="fill-slate-900 stroke-cyan-500" strokeWidth="3" />
    <circle cx="100" cy="100" r="20" className="fill-cyan-500 shadow-[0_0_20px_rgba(0,245,255,1)]" >
      <animate attributeName="r" values="18;22;18" dur="2s" repeatCount="indefinite" />
    </circle>
    {/* Orbiting particles */}
    <g className="animate-spin-slow origin-center" style={{ animationDuration: '10s' }}>
      <circle cx="100" cy="20" r="3" className="fill-cyan-400" />
      <circle cx="100" cy="180" r="2" className="fill-cyan-500" />
    </g>
  </svg>
);

const ResultVisual = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full">
    <g>
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x={60 + i * 20} y={150 - (i % 2 === 0 ? 60 : 40)} width="10" height={i % 2 === 0 ? 60 : 40} className="fill-cyan-500/40">
          <animate attributeName="height" values="20;80;20" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
        </rect>
      ))}
    </g>
    <path d="M20 150 L180 150" className="stroke-cyan-500/40" strokeWidth="2" />
    <circle cx="100" cy="60" r="15" className="fill-cyan-400">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <path d="M100 60 L60 120 M100 60 L140 120" className="stroke-cyan-500" strokeWidth="1" strokeDasharray="2 2" />
  </svg>
);

const steps = [
  {
    num: "01",
    title: "Uplink Matrix",
    desc: (
      <>
        Upload your{" "}
        <InfoTooltip
          text="IMDB RATINGS EXPORT"
          tooltip="Go to IMDb on desktop, sign in, open “Your Ratings” from the user menu, click the 'Export' on the top right."
        />
        . We carefully ingest every node of preference, from cult classics to contemporary blockbusters.
      </>
    ),
    illustration: <IngestionVisual />
  },
  {
    num: "02",
    title: "Neural Synthesis",
    desc: "Our neural engine identifies the invisible patterns in your ratings, building your unique cinematic DNA.",
    illustration: <EngineVisual />
  },
  {
    num: "03",
    title: "Signal Extraction",
    desc: "Like, dislike, or mark as watched to evolve your profile and sharpen your personalized recommendations.",
    illustration: <ResultVisual />
  }
];

const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setActiveStep(index);
          }
        });
      },
      { threshold: 0.3, rootMargin: '-20% 0px -20% 0px' }
    );

    const elements = containerRef.current?.querySelectorAll('.step-text-block');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 md:py-40">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <SectionHeader
          label="Operational_Protocol"
          title="Synthesize Your Taste"
          centered
        />
      </div>

      <div ref={containerRef} className="flex flex-col md:flex-row relative">
        {/* Left Side: Sticky Illustration */}
        <div className="w-full md:w-1/2 h-[300px] md:h-[60vh] sticky top-[20vh] z-20 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-64 md:w-[450px] md:h-[450px]">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-cyan-500/5 blur-[100px] rounded-full animate-pulse" />
            <div className="absolute inset-0 bg-pink-500/5 blur-[120px] rounded-full animate-pulse delay-700 mix-blend-screen" />

            {/* Transitioning Illustrations */}
            {steps.map((step, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${activeStep === i
                  ? 'opacity-100 scale-100 blur-0 translate-y-0'
                  : 'opacity-0 scale-90 blur-xl translate-y-10'
                  }`}
              >
                {step.illustration}
              </div>
            ))}

            {/* Orbital HUD Ring (Static) */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
              <circle cx="100" cy="100" r="98" className="stroke-cyan-500 fill-none" strokeWidth="0.25" strokeDasharray="2 4" />
              <circle cx="100" cy="100" r="90" className="stroke-cyan-400 fill-none" strokeWidth="0.1" strokeDasharray="10 20" />
            </svg>
          </div>
        </div>

        {/* Right Side: Scrollable Text */}
        <div className="w-full md:w-1/2 relative z-10">
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-[1px] bg-cyan-500/10" />

          {steps.map((step, i) => (
            <div
              key={i}
              data-index={i}
              className="step-text-block min-h-[40vh] md:min-h-[60vh] flex flex-col justify-center px-4 md:px-16 py-20 md:py-0 group"
            >
              <div className={`space-y-8 transition-all duration-1000 ${activeStep === i ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-8'}`}>
                <div className="flex items-center gap-6">
                  <span className={`text-6xl md:text-9xl font-black italic font-heading tracking-tighter transition-colors ${activeStep === i ? 'text-cyan-500/20' : 'text-white/5'}`}>
                    {step.num}
                  </span>
                  <h3 className="text-3xl md:text-5xl font-heading italic font-black text-white uppercase tracking-tight leading-none group-hover:text-cyan-400 transition-colors">
                    {step.title}
                  </h3>
                </div>
                <p className="font-mono text-base md:text-xl text-[#8195b1] leading-relaxed italic uppercase mono-medium-italic max-w-lg">
                  {step.desc}
                </p>

                {/* Visual Connector for better rhythm */}
                <div className={`h-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent transition-all duration-1000 ${activeStep === i ? 'w-32' : 'w-0'}`} />
              </div>
            </div>
          ))}

          {/* Bottom spacer to allow the last item to scroll into view and trigger sticky end */}
          <div className="h-[30vh] md:h-[40vh]" />
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// Section 2: Why NeuralStream - Alternating Hero Layouts
// ============================================================================

const ShowcaseSection: React.FC<{
  label: string;
  title: string;
  desc: string;
  illustration: React.ReactNode;
  reverse?: boolean;
}> = ({ label, title, desc, illustration, reverse }) => {
  const [ref, inView] = useInView(0.3);
  const active = inView;

  return (
    <div ref={ref} className={`flex flex-col md:flex-row items-center gap-16 md:gap-32 py-16 md:py-24 ${reverse ? 'md:flex-row-reverse' : ''}`}>
      {/* Visual */}
      <div className={`md:w-3/5 transition-all duration-1000 ${active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'}`}>
        <div className="relative aspect-video bg-slate-900/40 tech-border border-cyan-500/10 tech-chipped overflow-hidden p-8 flex items-center justify-center">
          <div className="absolute inset-0 scanline opacity-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,245,255,0.05)_0%,transparent_70%)]" />
          <div className="relative w-full h-full max-w-lg max-h-lg">
            {illustration}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={`md:w-2/5 space-y-8 transition-all duration-1000 delay-300 ${active ? 'opacity-100 translate-x-0' : (reverse ? 'opacity-0 -translate-x-12' : 'opacity-0 translate-x-12')}`}>
        <div className="space-y-4">
          <span className="font-mono text-[10px] text-cyan-500/60 uppercase tracking-[0.4em] font-black">{label}</span>
          <h3 className="text-3xl md:text-5xl font-heading italic font-[900] text-white uppercase tracking-tight leading-tight">
            {title}
          </h3>
        </div>
        <p className="font-mono text-sm text-[#8195b1] leading-relaxed uppercase tracking-wider">
          {desc}
        </p>
        <div className="pt-4">
          <div className="h-[2px] w-24 bg-cyan-500/20" />
        </div>
      </div>
    </div>
  );
};

// Rich Illustrations for Showcase
const AlgorithmIllustration = () => (
  <svg viewBox="0 0 400 240" className="w-full h-full">
    <defs>
      <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="50%" stopColor="#00f5ff" />
        <stop offset="100%" stopColor="transparent" />
      </linearGradient>
    </defs>
    {/* Background Grid */}
    <g className="stroke-white/5" strokeWidth="0.5">
      {[...Array(10)].map((_, i) => <line key={i} x1="0" y1={i * 24} x2="400" y2={i * 24} />)}
      {[...Array(10)].map((_, i) => <line key={i} x1={i * 40} y1="0" x2={i * 40} y2="240" />)}
    </g>
    {/* Floating Data Points */}
    {[...Array(20)].map((_, i) => (
      <circle key={i} cx={Math.random() * 400} cy={Math.random() * 240} r="1.5" className="fill-cyan-500/30">
        <animate attributeName="opacity" values="0.2;1;0.2" dur={`${2 + Math.random() * 3}s`} repeatCount="indefinite" />
      </circle>
    ))}
    {/* The "Golden" Path */}
    <path d="M0 120 C 100 20, 300 220, 400 120" className="fill-none stroke-cyan-400/50" strokeWidth="2" strokeDasharray="400" strokeDashoffset="400" opacity="0.5">
      <animate attributeName="stroke-dashoffset" from="400" to="0" dur="3s" repeatCount="indefinite" />
    </path>
    <path d="M0 120 C 100 20, 300 220, 400 120" className="fill-none stroke-pink-500 shadow-pink-500" strokeWidth="2.5" strokeDasharray="400" strokeDashoffset="400">
      <animate attributeName="stroke-dashoffset" from="400" to="0" dur="3s" repeatCount="indefinite" begin="1.5s" />
    </path>
    <circle r="4" className="fill-pink-400 shadow-[0_0_15px_rgba(255,19,136,1)]">
      <animateMotion path="M0 120 C 100 20, 300 220, 400 120" dur="3s" repeatCount="indefinite" begin="1.5s" />
    </circle>
  </svg>
);

const GenreIllustration = () => (
  <svg viewBox="0 0 400 240" className="w-full h-full">
    {/* Concentric circles */}
    {[80, 60, 40].map((r, i) => (
      <circle key={i} cx="200" cy="120" r={r} className={`fill-none ${i === 2 ? 'stroke-cyan-500' : 'stroke-cyan-500/20'}`} strokeWidth={i === 2 ? 2 : 1} strokeDasharray={i === 0 ? "5 5" : "0"} />
    ))}
    {/* Radiating lines */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
      <line key={angle} x1="200" y1="120" x2={200 + Math.cos(angle * Math.PI / 180) * 110} y2={120 + Math.sin(angle * Math.PI / 180) * 110} className={angle % 90 === 0 ? "stroke-pink-500/20" : "stroke-cyan-500/10"} strokeWidth="1" />
    ))}
    {/* Overlapping Polygons */}
    <polygon points="150,100 250,80 220,160 180,150" className="fill-cyan-500/10 stroke-cyan-400" strokeWidth="1" />
    <polygon points="200,60 260,140 140,140" className="fill-none stroke-pink-500/40" strokeWidth="1" strokeDasharray="4 2" />
  </svg>
);

const SemanticSearchIllustration = () => (
  <svg viewBox="0 0 400 240" className="w-full h-full">
    {/* Typewriter-like effect blocks */}
    <g transform="translate(50, 60)">
      {[0, 1, 2].map(i => (
        <rect key={i} x="0" y={i * 30} width={200 + (Math.sin(i) * 50)} height="12" className="fill-cyan-500/10" rx="2" />
      ))}
      {/* Active "Neural" highlight */}
      <rect x="0" y="30" width="120" height="12" className="fill-pink-500/20" rx="2" />
      <rect x="125" y="30" width="80" height="12" className="fill-cyan-500/20" rx="2" />
    </g>

    {/* Floating HUD elements */}
    <g className="animate-pulse">
      <circle cx="320" cy="120" r="40" className="fill-none stroke-cyan-500/40" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="320" cy="120" r="25" className="fill-cyan-500/10 stroke-cyan-400" strokeWidth="2" />
      <path d="M320 100 L320 140 M300 120 L340 120" className="stroke-cyan-500" strokeWidth="1" />
    </g>

    {/* Connecting "Thought" Line */}
    <path d="M220 100 Q 270 100, 295 120" className="fill-none stroke-cyan-400/30" strokeWidth="1" strokeDasharray="5 5" />

    {/* Text Cursor */}
    <rect x="50" y="150" width="15" height="2" className="fill-cyan-400 animate-pulse" />
    <text x="75" y="155" className="fill-[#8195b1] font-mono text-[8px] uppercase tracking-widest italic opacity-60">Synthesizing_Query...</text>
  </svg>
);

const FeatureShowcase: React.FC = () => {
  return (
    <section className="space-y-0">
      <ShowcaseSection
        label="Natural_Interface"
        title="Describe Your Vibe in Any Language"
        desc="Ditch the rigid filters. Our neural engine understands natural language, allowing you to search for super-nuanced requests—from meditative arthouse to high-octane spectacle—in any language you speak."
        illustration={<SemanticSearchIllustration />}
      />
      <ShowcaseSection
        label="Superior_Analysis"
        title="Find Hidden Gems, Not Popular Picks"
        desc="Most platforms optimize for the average. We optimize for the unique. Our engine digs through deep metadata to surface the 1% you actually care about."
        illustration={<AlgorithmIllustration />}
        reverse
      />
      <ShowcaseSection
        label="Nuanced_Patterning"
        title="Your Taste Isn't One-Dimensional"
        desc="Mapping correlations across director signatures, thematic resonance, and visual language. We identify your vibe across any genre boundary."
        illustration={<GenreIllustration />}
      />
    </section>
  );
};

// ============================================================================
// Section 3: Call to Action
// ============================================================================

const CTASection: React.FC<{ onGetStarted?: () => void }> = ({ onGetStarted }) => {
  const [ref, inView] = useInView(0.1);

  return (
    <div ref={ref} className="py-24 md:py-48 flex items-center justify-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-cyan-900/5 pointer-events-none" />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-cyan-500/5 rounded-full transition-all duration-1000 ${inView ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 border border-cyan-500/10 rounded-full border-dashed transition-all duration-1000 delay-300 ${inView ? 'scale-100 opacity-100 animate-spin-slow' : 'scale-50 opacity-0'}`} />

      <div className={`relative z-10 text-center space-y-12 transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        <div className="space-y-6">
          <SectionHeader
            label="Initiate_Uplink"
            title="Ready to Decode Your Cinematic DNA?"
            centered
          />
          <p className="font-mono text-sm md:text-lg text-[#8195b1] uppercase tracking-[0.2em] max-w-2xl mx-auto italic">
            Upload your IMDB ratings matrix and access matches<br className="hidden md:block" /> synthesized for your unique organic signature.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <button
            onClick={onGetStarted}
            className="group px-16 md:px-32 py-6 md:py-8 bg-cyan-500 text-black font-mono font-extrabold italic text-xl md:text-2xl uppercase tracking-[0.4em] hover:bg-white transition-all shadow-[0_0_80px_rgba(0,245,255,0.4)] hover:shadow-[0_0_100px_rgba(255,19,136,0.6)] relative overflow-hidden tech-chipped active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />
            <span className="relative z-10 flex items-center gap-4">
              [ START_STREAM ]
            </span>
          </button>
          <p className="font-mono text-[9px] text-[#64748B] uppercase tracking-[0.5em] animate-pulse">Waiting_For_Access_Signal...</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Export
// ============================================================================

interface PromoFeaturesProps {
  onGetStarted?: () => void;
}

export const PromoFeatures: React.FC<PromoFeaturesProps> = ({ onGetStarted }) => {
  return (
    <div className="space-y-0">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <HowItWorksSection />
      </div>

      {/* Darker background for showcase to break the rhythm */}
      <div className="bg-slate-950/40 border-y border-cyan-500/5">
        <div className="max-w-7xl mx-auto px-4 md:px-20">
          <FeatureShowcase />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <CTASection onGetStarted={onGetStarted} />
      </div>

      {/* Footer-like bottom spacer */}
      <div className="h-24 md:h-48 border-t border-cyan-500/5 opacity-10" />
    </div>
  );
};