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

const GlitchLogo: React.FC = () => {
  return (
    <div className="relative w-48 h-14 md:w-56 md:h-16">
      <style>
        {`
          @keyframes glitch-cyan {
            0% { transform: translate(0); opacity: 0; }
            5% { transform: translate(-8px, 2px); opacity: 0.8; }
            10% { transform: translate(0); opacity: 0; }
            15% { transform: translate(-3px, -1px); opacity: 0.5; }
            20% { transform: translate(0); opacity: 0; }
            45% { transform: translate(0); opacity: 0; }
            50% { transform: translate(-12px, 3px); opacity: 0.9; }
            55% { transform: translate(0); opacity: 0; }
            80% { transform: translate(-4px, -2px); opacity: 0.6; }
            85% { transform: translate(0); opacity: 0; }
            100% { transform: translate(0); opacity: 0; }
          }
          @keyframes glitch-magenta {
            0% { transform: translate(0); opacity: 0; }
            7% { transform: translate(8px, -2px); opacity: 0.8; }
            12% { transform: translate(0); opacity: 0; }
            17% { transform: translate(4px, 1px); opacity: 0.5; }
            22% { transform: translate(0); opacity: 0; }
            47% { transform: translate(0); opacity: 0; }
            52% { transform: translate(12px, -3px); opacity: 0.9; }
            57% { transform: translate(0); opacity: 0; }
            82% { transform: translate(5px, 2px); opacity: 0.6; }
            87% { transform: translate(0); opacity: 0; }
            100% { transform: translate(0); opacity: 0; }
          }
          @keyframes glitch-slice-main {
            0% { clip-path: inset(0 0 0 0); transform: translateX(0); }
            2% { clip-path: inset(20% 0 70% 0); transform: translateX(-15px); }
            4% { clip-path: inset(80% 0 10% 0); transform: translateX(15px); }
            6% { clip-path: inset(40% 0 40% 0); transform: translateX(-5px); }
            8% { clip-path: inset(0 0 0 0); transform: translateX(0); }
            15% { clip-path: inset(10% 0 80% 0); transform: translateX(20px); }
            17% { clip-path: inset(0 0 0 0); transform: translateX(0); }
            45% { clip-path: inset(0 0 0 0); transform: translateX(0); }
            47% { clip-path: inset(60% 0 20% 0); transform: translateX(-25px); }
            49% { clip-path: inset(0 0 0 0); transform: translateX(0); }
            70% { clip-path: inset(30% 0 60% 0); transform: translateX(10px); }
            72% { clip-path: inset(0 0 0 0); transform: translateX(0); }
            100% { clip-path: inset(0 0 0 0); transform: translateX(0); }
          }
          @keyframes glitch-flicker-logo {
            0% { opacity: 1; filter: brightness(1) contrast(1.2) drop-shadow(0 0 5px rgba(0, 245, 255, 0.4)); }
            1% { opacity: 0.6; filter: brightness(2); }
            2% { opacity: 1; filter: brightness(1); }
            15% { transform: skewX(0); }
            16% { transform: skewX(-15deg); filter: hue-rotate(90deg); }
            17% { transform: skewX(0); filter: hue-rotate(0); }
            50% { opacity: 1; }
            51% { opacity: 0.4; }
            52% { opacity: 1; }
            80% { transform: translateX(0); }
            81% { transform: translateX(10px); }
            82% { transform: translateX(0); }
            100% { opacity: 1; }
          }
          .animate-glitch-flicker {
            animation: glitch-flicker-logo 3s infinite;
            will-change: transform, opacity, filter;
          }
          .animate-glitch-cyan {
            animation: glitch-cyan 2s infinite;
            will-change: transform, opacity;
          }
          .animate-glitch-magenta {
            animation: glitch-magenta 2.2s infinite;
            will-change: transform, opacity;
          }
          .animate-glitch-slice {
            animation: glitch-slice-main 3.5s infinite;
            will-change: clip-path, transform;
          }
          .glitch-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          .glitch-svg {
            width: 100%;
            height: 100%;
            display: block;
          }
        `}
      </style>

      {/* Base Layer with original colors */}
      <div className="glitch-layer animate-glitch-flicker">
        <LogoSVG />
      </div>

      {/* Cyan Glitch Overlay */}
      <div className="glitch-layer animate-glitch-cyan mix-blend-screen overflow-visible">
        <LogoSVG colorCyan="#00ffff" colorLime="#00ffff" className="opacity-80" />
      </div>

      {/* Magenta Glitch Overlay */}
      <div className="glitch-layer animate-glitch-magenta mix-blend-screen overflow-visible">
        <LogoSVG colorCyan="#ff00ff" colorLime="#ff00ff" className="opacity-80" />
      </div>

      {/* Sliced Overlay */}
      <div className="glitch-layer animate-glitch-slice opacity-80">
        <LogoSVG />
      </div>
    </div>
  );
};

const LogoSVG: React.FC<{ colorCyan?: string; colorLime?: string; className?: string }> = ({
  colorCyan = "#67E8F9",
  colorLime = "#E0F603",
  className
}) => (
  <svg viewBox="0 0 96 30" className={`glitch-svg ${className}`} xmlns="http://www.w3.org/2000/svg">
    <path d="M34.3586 28.8964L24.4136 15.2888H41.8174L42.0764 15.7091L42.2318 15.2888H55.181L51.3998 27.1101C51.1581 27.8106 50.7092 28.4761 50.0531 29.1065C49.4315 29.702 48.7236 29.9997 47.9294 29.9997H36.7931C36.4132 29.9997 35.9298 29.8946 35.3428 29.6845C34.7903 29.4393 34.4622 29.1766 34.3586 28.8964ZM5.55954 29.9997C4.59266 29.9997 3.71211 29.8596 2.91789 29.5794C2.15821 29.2992 1.53664 28.9139 1.05320 28.4235C0.569767 27.8981 0.241719 27.2852 0.0690626 26.5847C-0.0690626 25.8841 2.14398e-08 25.1136 0.276250 24.273L3.17688 15.2888H16.1261L14.9866 18.8615C14.296 20.963 14.9693 22.0138 17.0067 22.0138H21.1504C21.5993 22.0138 22.0655 22.2415 22.5489 22.6968C23.0669 23.1171 23.464 23.5199 23.7403 23.9052L26.7445 28.4235C26.8135 28.4936 26.8826 28.6512 26.9517 28.8964C27.0553 29.1065 27.0898 29.2466 27.0553 29.3167C26.9862 29.5969 26.8308 29.7895 26.5891 29.8946C26.3819 29.9647 26.1402 29.9997 25.8639 29.9997H5.55954ZM5.55954 7.88083L6.28469 5.51658H35.291L36.8967 7.88083H5.55954ZM32.5457 2.25917C33.0982 2.78456 33.7198 3.46757 34.4104 4.30819H6.69907C7.00985 3.50259 7.40696 2.81959 7.89040 2.25917H32.5457ZM24.2064 15.0261L22.031 12.0314H39.6419L41.662 15.0261H24.2064ZM20.0109 9.24684C19.8382 9.10674 19.631 8.94912 19.3893 8.77399H37.4664L39.2793 11.4535H21.6166L20.0109 9.24684ZM42.3354 15.0261L43.2677 12.0314H56.2169L55.2846 15.0261H42.3354ZM3.28047 15.0261L4.21282 12.0314H17.162L16.2297 15.0261H3.28047ZM43.4749 11.4535L44.3036 8.77399H57.2529L56.4241 11.4535H43.4749ZM4.42000 11.4535L5.24876 8.77399H18.198L17.3692 11.4535H4.42000ZM44.6144 7.88083L45.3396 5.51658H58.2888L57.5637 7.88083H44.6144ZM59.1694 2.78456L58.7032 4.30819H45.754L46.1165 3.09979L46.2719 2.67948C46.3065 2.53938 46.3755 2.39928 46.4791 2.25917H59.273C59.2039 2.60943 59.1694 2.78456 59.1694 2.78456ZM26.2265 0C27.5387 0 28.8336 0.245182 30.1113 0.735544H9.75509C10.722 0.245182 11.8615 0 13.1737 0H26.2265ZM57.5119 0C58.0989 0 58.5478 0.245182 58.8586 0.735544H47.6704C48.2575 0.245182 48.8963 0 49.5869 0H57.5119Z" fill={colorCyan} />
    <path d="M91.442 15.289C91.4765 15.6392 91.459 15.9722 91.39 16.2873C91.3554 16.5674 91.3037 16.8475 91.2347 17.1275L88.9037 24.2728C88.6274 25.1133 88.1958 25.884 87.6089 26.5845C87.0219 27.285 86.3139 27.8983 85.4851 28.4237C84.6909 28.914 83.8104 29.2993 82.8436 29.5795C81.9113 29.8597 80.9616 30 79.9948 30H53.105C53.5272 29.4164 53.874 28.7758 54.116 28.0745C54.1232 28.0535 54.1303 28.0323 54.137 28.0111L56.055 22.0138H74.0899C74.884 22.0138 75.4881 21.8559 75.9025 21.5407C76.3513 21.2255 76.6621 20.8054 76.8347 20.2801C77.0074 19.8248 77.0073 19.387 76.8347 18.9667C76.6621 18.5464 76.144 18.3361 75.2807 18.3361H57.231L57.9076 16.2218C57.9529 16.1194 57.9952 16.0144 58.0291 15.9054L58.2209 15.289H91.442Z" fill={colorLime} />
    <path d="M89.1109 12.0317C90.492 12.7322 91.2693 13.7302 91.442 15.026H58.3031L58.9614 12.9103C58.9797 12.8514 58.9953 12.7917 59.0099 12.7322C59.072 12.6028 59.1266 12.4678 59.17 12.3274L59.2614 12.0317H89.1109Z" fill={colorLime} />
    <path d="M65.6988 8.77365C65.5261 9.08889 65.3878 9.38705 65.2843 9.66726C65.0771 10.3327 65.0945 10.7882 65.3362 11.0333C65.6125 11.2784 66.1308 11.401 66.8903 11.401H85.9509C86.1236 11.401 86.2967 11.4187 86.4694 11.4538H59.4405L59.999 9.64802C60.0364 9.52735 60.064 9.4046 60.0855 9.28174C60.1719 9.12151 60.2464 8.95215 60.3032 8.77365H65.6988Z" fill={colorLime} />
    <path d="M94.8085 5.88405C94.6704 6.33938 94.3422 6.76007 93.8243 7.14536C93.3409 7.49558 92.8402 7.74067 92.3222 7.88076H60.5779L61.0367 6.38429C61.0908 6.20778 61.1267 6.02739 61.147 5.84699C61.2116 5.74138 61.2701 5.63095 61.3219 5.51634H94.9118L94.8085 5.88405Z" fill={colorLime} />
    <path d="M95.3263 4.30848H61.716L61.9177 3.65003C61.9471 3.55391 61.972 3.45584 61.9914 3.35715C62.1322 2.64164 62.1504 2.44977 62.1502 2.25903H96L95.3263 4.30848Z" fill={colorLime} />
    <path d="M94.342 7.62939e-05C94.9981 7.62939e-05 95.482 0.245121 95.7928 0.735483H61.7336C61.7336 0.498594 61.7042 0.262429 61.6479 0.0314309C61.9104 0.0107298 62.1729 7.62939e-05 62.4355 7.62939e-05H94.342Z" fill={colorLime} />
  </svg>
);

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
            @keyframes glitch-slice-mini {
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
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, rgba(0,245,255,0.2) 1px, transparent 1px)', backgroundSize: '5% 100%' }}></div>
              <div
                className="absolute inset-0 origin-left transition-transform duration-700 ease-out"
                style={{ transform: `scaleX(${(progress ?? 0) / 100})` }}
              >
                <div className="absolute inset-0 bg-magenta-500/30 animate-[glitch-color-split_3s_infinite] mix-blend-screen"></div>
                <div className="absolute inset-0 bg-cyan-500/30 animate-[glitch-color-split_3s_infinite_reverse] mix-blend-screen"></div>
                <div className="absolute inset-0 bg-cyan-500 shadow-[0_0_30px_rgba(0,245,255,0.5)] animate-[glitch-slice-mini_4s_infinite,glitch-flicker-intense_5s_infinite]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full -translate-x-full animate-[scan-fast_1.2s_linear_infinite]"></div>
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.4) 1px, rgba(0,0,0,0.4) 2px)', backgroundSize: '100% 2px' }}></div>
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none bg-cyan-500/5 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden">
      {/* Heavy vignette overlay */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[4px] z-0"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.85)_100%)] pointer-events-none z-0"></div>

      <div className="scanline opacity-10"></div>
      <div className="relative z-10 flex flex-col items-center scale-90 md:scale-100">
        <GlitchLogo />
      </div>
    </div>
  );
};