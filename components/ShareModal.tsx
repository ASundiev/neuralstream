import React, { useState } from 'react';

interface ShareModalProps {
  url: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Manual copy failed:", err);
      // Fallback for extremely restrictive environments
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-md w-full tech-border bg-slate-900 p-8 shadow-[0_0_50px_rgba(0,245,255,0.1)] relative overflow-hidden">
        <div className="scanline opacity-10"></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white px-2 transition-colors z-30"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="relative z-20 space-y-8 text-center">
          <div className="space-y-2">
            <div className="mono text-[10px] text-cyan-500 uppercase tracking-[0.4em] font-black animate-pulse">Uplink_Complete</div>
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Feed_Broadcasting</h2>
          </div>

          <div className="space-y-4">
            <p className="mono text-[10px] text-slate-400 uppercase leading-relaxed">
              Your neural stream has been synchronized to the public grid. Use the following access vector to share your matrix.
            </p>
            
            <div className="relative group">
              <div className="absolute -inset-1 bg-cyan-500/10 blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-black/60 border border-white/10 p-4 mono text-[10px] text-cyan-400 break-all select-all font-bold">
                {url}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <button 
              onClick={handleCopy}
              className={`w-full py-4 mono font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 ${
                copied 
                  ? 'bg-green-500 text-black' 
                  : 'bg-cyan-500 text-black hover:bg-white shadow-[0_0_20px_rgba(0,245,255,0.2)]'
              }`}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              {copied ? 'DATA_COPIED_TO_CLIPBOARD' : '[ EXECUTE_COPY_COMMAND ]'}
            </button>
            
            <div className="flex justify-between items-center opacity-30">
               <div className="h-[1px] flex-1 bg-white/10"></div>
               <span className="mono text-[8px] px-4 text-slate-500 uppercase font-bold">Encrypted_Packet_Vector</span>
               <div className="h-[1px] flex-1 bg-white/10"></div>
            </div>

            <button 
              onClick={onClose}
              className="mono text-[9px] text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              DISMISS_MODAL
            </button>
          </div>
        </div>

        {/* Decorative corner markers */}
        <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-cyan-500/40"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-cyan-500/40"></div>
      </div>
    </div>
  );
};