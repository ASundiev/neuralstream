import React, { useEffect, useState } from 'react';

interface NeuralDNAProps {
    totalSignals: number;
    maxSignals?: number;
}

export const NeuralDNA: React.FC<NeuralDNAProps> = ({ totalSignals, maxSignals = 100 }) => {
    const [animatedValue, setAnimatedValue] = useState(0);
    const segments = 40;
    const filledSegments = Math.min(segments, Math.floor((totalSignals / maxSignals) * segments));

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedValue(filledSegments);
        }, 100);
        return () => clearTimeout(timer);
    }, [filledSegments]);

    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 animate-pulse shadow-[0_0_8px_#00f5ff]"></div>
                    <span className="font-mono italic font-[800] text-[9px] leading-[14px] tracking-[0.9px] text-[#64748B] uppercase">Neural_DNA_Completeness</span>
                </div>
                <div className="font-mono italic font-[800] text-[10px] leading-[15px] tracking-[-0.25px] uppercase">
                    <span className="text-cyan-400">{Math.min(100, Math.floor((totalSignals / maxSignals) * 100))}%</span>
                    <span className="mx-2 text-slate-800">/</span>
                    <span className="text-white">{totalSignals} SIGNALS</span>
                </div>
            </div>

            <div className="h-6 flex items-center gap-[2px] bg-black/40 p-1 border border-white/5 tech-chipped relative group overflow-hidden">
                {/* Scanning line effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent w-full -translate-x-full group-hover:animate-scan-slow pointer-events-none"></div>

                {Array.from({ length: segments }).map((_, i) => {
                    const isFilled = i < animatedValue;
                    return (
                        <div
                            key={i}
                            className={`flex-1 h-full transition-all duration-700 ease-out ${isFilled
                                ? 'bg-cyan-500 shadow-[0_0_10px_rgba(0,245,255,0.5)]'
                                : 'bg-slate-800/30'
                                }`}
                            style={{
                                transitionDelay: `${i * 30}ms`,
                                opacity: isFilled ? 1 : 0.4
                            }}
                        ></div>
                    );
                })}
            </div>

            <div className="flex justify-between items-start px-1">
                <div className="font-mono italic text-[8px] leading-3 tracking-[0.8px] text-[#475569] uppercase">Helix_Sequence_v4</div>
                <div className="font-mono italic text-[8px] leading-3 tracking-[0.8px] text-[#475569] uppercase">Matrix_Density::{totalSignals >= maxSignals ? 'STABLE' : 'EVOLVING'}</div>
            </div>
        </div>
    );
};
