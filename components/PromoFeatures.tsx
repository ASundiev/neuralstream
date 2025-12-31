import React, { useState, useRef } from 'react';

interface FeatureItemProps {
  iconType: 'synthesis' | 'dna' | 'tuning';
  title: string;
  desc: string;
  showBorder: boolean;
}

const Illustration: React.FC<{ type: 'synthesis' | 'dna' | 'tuning' }> = ({ type }) => {
  if (type === 'synthesis') {
    // Metaphor: Isometric Data Ingestion / Processing Hub
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-1">
        {/* Background Grid for depth */}
        <path d="M20 50 L50 35 L80 50 L50 65 Z" className="fill-cyan-500/5 stroke-cyan-500/10" strokeWidth="0.5" />

        {/* Central Processing Cube */}
        <path d="M42 45 L50 40 L58 45 L50 50 Z" className="fill-cyan-400 stroke-cyan-300" strokeWidth="0.5" />
        <path d="M42 45 L42 55 L50 60 L50 50 Z" className="fill-cyan-600 stroke-cyan-500" strokeWidth="0.5" />
        <path d="M50 50 L50 60 L58 55 L58 45 Z" className="fill-cyan-700 stroke-cyan-600" strokeWidth="0.5" />

        {/* Floating Data Nodes being synthesized */}
        <g className="stroke-cyan-500/40" strokeWidth="0.5">
          <line x1="25" y1="35" x2="45" y2="45" />
          <line x1="75" y1="35" x2="55" y2="45" />
          <line x1="25" y1="75" x2="45" y2="55" />
          <line x1="75" y1="75" x2="55" y2="55" />
        </g>

        {/* Metadata detail lines */}
        <rect x="24" y="34" width="2" height="1" className="fill-cyan-400" />
        <rect x="74" y="34" width="2" height="1" className="fill-cyan-400" />
        <circle cx="50" cy="50" r="18" className="fill-none stroke-cyan-500/20" strokeWidth="0.5" strokeDasharray="1 3" />
      </svg>
    );
  }
  if (type === 'dna') {
    // Metaphor: Pattern Correlation / Overlapping Taste Geometries
    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-1">
        {/* Two Overlapping Profile Geometries */}
        <path d="M30 30 L70 40 L60 80 L20 70 Z" className="fill-none stroke-cyan-500/20" strokeWidth="1" />
        <path d="M40 20 L80 30 L70 70 L30 60 Z" className="fill-none stroke-cyan-400/40" strokeWidth="1" />

        {/* The "Sweet Spot" Intersection Grid */}
        <g className="stroke-cyan-400" strokeWidth="0.5">
          <line x1="45" y1="40" x2="65" y2="40" strokeDasharray="1 2" />
          <line x1="45" y1="50" x2="65" y2="50" strokeDasharray="1 2" />
          <line x1="45" y1="60" x2="65" y2="60" strokeDasharray="1 2" />
          <line x1="50" y1="35" x2="50" y2="65" strokeDasharray="1 2" />
          <line x1="60" y1="35" x2="60" y2="65" strokeDasharray="1 2" />
        </g>

        {/* Identified "Gems" as highlighted points */}
        <circle cx="55" cy="45" r="2.5" className="fill-cyan-400 shadow-[0_0_10px_rgba(0,245,255,0.8)]" />
        <circle cx="48" cy="58" r="1.5" className="fill-cyan-500/60" />
        <circle cx="62" cy="38" r="1.5" className="fill-cyan-500/60" />

        {/* Decorative axis markers */}
        <text x="5" y="15" className="fill-cyan-500/30 mono text-[5px]">SIG_A</text>
        <text x="80" y="90" className="fill-cyan-500/30 mono text-[5px]">SIG_B</text>
      </svg>
    );
  }
  // type === 'tuning'
  // Metaphor: Precision Affective Console / Multi-Parameter Sliders
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full p-1">
      {/* Precision Frame */}
      <rect x="10" y="15" width="80" height="70" className="fill-none stroke-white/10" strokeWidth="0.5" />

      {/* Three Detailed Sliders */}
      {[25, 50, 75].map((x, i) => (
        <g key={i}>
          {/* Vertical track */}
          <line x1={x} y1="25" x2={x} y2="75" className="stroke-white/5" strokeWidth="4" strokeLinecap="round" />
          <line x1={x} y1="25" x2={x} y2="75" className="stroke-cyan-500/10" strokeWidth="1" />

          {/* Tic marks */}
          {[30, 40, 50, 60, 70].map(y => (
            <line key={y} x1={x - 4} y1={y} x2={x + 4} y2={y} className="stroke-white/10" strokeWidth="0.5" />
          ))}

          {/* Slider Thumb with detailed "glow" and value marker */}
          {/* Varying positions for static realism */}
          {(() => {
            const yPos = [35, 65, 45][i];
            return (
              <g>
                <rect x={x - 6} y={yPos - 2} width="12" height="4" className="fill-cyan-500 shadow-xl" />
                <line x1={x - 8} y1={yPos} x2={x + 8} y2={yPos} className="stroke-cyan-300" strokeWidth="0.5" />
                <rect x={x - 12} y={yPos - 1} width="4" height="2" className="fill-cyan-500/40" />
                <text x={x} y="85" className="fill-cyan-500 mono text-[5px]" textAnchor="middle">{['MOOD', 'GENRE', 'INTENS'][i]}</text>
              </g>
            );
          })()}
        </g>
      ))}

    </svg>
  );
};

const FeatureItem: React.FC<FeatureItemProps> = ({ iconType, title, desc, showBorder }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`p-4 md:p-8 pt-6 pb-10 space-y-8 flex flex-col relative overflow-hidden transition-colors duration-500 ${isHovered ? 'bg-cyan-500/[0.02]' : ''} ${showBorder ? 'border-b md:border-b-0 md:border-r border-cyan-500/10' : ''}`}
    >
      {/* Flashlight Effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(0, 245, 255, 0.08) 0%, transparent 60%)`
        }}
      />

      <div className="relative z-10 w-20 h-20 flex items-center justify-center bg-cyan-500/5 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors rounded-sm">
        <Illustration type={iconType} />
      </div>
      <div className="relative z-10 space-y-3">
        <h4 className="mono text-[11px] font-black text-white uppercase tracking-widest">{title}</h4>
        <p className="mono text-[9px] text-slate-500 uppercase leading-relaxed font-light">
          {desc}
        </p>
      </div>
    </div>
  );
};

export const PromoFeatures: React.FC = () => {
  const features = [
    {
      iconType: "synthesis" as const,
      title: "NEURAL_SYNTHESIS",
      desc: "ANALYZING THOUSANDS OF DATA POINTS FROM YOUR RATINGS (7+) TO MAP YOUR TASTE PROFILE."
    },
    {
      iconType: "dna" as const,
      title: "TASTE_DNA_MAPPING",
      desc: "ADVANCED CROSS-GENRE CORRELATION TO FIND HIDDEN GEMS YOU'D OTHERWISE MISS."
    },
    {
      iconType: "tuning" as const,
      title: "AFFECTIVE_TUNING",
      desc: "ADJUST RECOMMENDATIONS BASED ON YOUR CURRENT MOOD AND SPECIFIC GENRE AXIS."
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
      {features.map((f, i) => (
        <FeatureItem
          key={i}
          iconType={f.iconType}
          title={f.title}
          desc={f.desc}
          showBorder={i !== features.length - 1}
        />
      ))}
    </div>
  );
};