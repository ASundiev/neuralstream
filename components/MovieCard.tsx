import React, { useState, useEffect, useRef } from 'react';
import { Movie, Feedback, ContentType } from '../types';
import { editMoviePoster, generateNeuralPoster } from '../services/imageService';

interface MovieCardProps {
  movie: Movie;
  index?: number;
  isRecommendation?: boolean;
  onLikeSimilar?: (movie: Movie) => void;
  onMarkWatched?: (movie: Movie) => void;
  onFeedback?: (movie: Movie, feedback: Feedback) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ 
  movie, 
  index = 0,
  isRecommendation, 
  onLikeSimilar, 
  onMarkWatched,
  onFeedback 
}) => {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isSynthesizingPoster, setIsSynthesizingPoster] = useState(false);
  const [editedPoster, setEditedPoster] = useState<string | null>(null);
  const [neuralPoster, setNeuralPoster] = useState<string | null>(null);
  
  const [tempFeedback, setTempFeedback] = useState<'like' | 'dislike' | null>(null);
  const [reason, setReason] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-generate poster if missing
  useEffect(() => {
    const checkAndGenerate = async () => {
      const pUrl = movie.posterUrl;
      const isLost = !pUrl || pUrl.includes('[SIGNAL_LOST]') || pUrl === 'null' || pUrl === 'undefined';
      
      if (isLost && !neuralPoster && !isSynthesizingPoster) {
        setIsSynthesizingPoster(true);
        const result = await generateNeuralPoster(movie.title, movie.description);
        if (result) setNeuralPoster(result);
        setIsSynthesizingPoster(false);
      }
    };
    
    if (isInView) checkAndGenerate();
  }, [isInView, movie.posterUrl, movie.title, movie.description, neuralPoster, isSynthesizingPoster]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  const handleVote = (type: 'like' | 'dislike') => {
    setTempFeedback(type);
    setShowReasonInput(true);
  };

  const submitFeedback = () => {
    if (tempFeedback && onFeedback) {
      onFeedback(movie, { type: tempFeedback, reason: reason.trim() || undefined });
      setShowReasonInput(false);
      setReason('');
    }
  };

  const handleNeuralEdit = async () => {
    if (!editPrompt.trim()) return;
    const sourceUrl = editedPoster || neuralPoster || movie.posterUrl;
    if (!sourceUrl) return;
    
    setIsProcessingEdit(true);
    try {
      const result = await editMoviePoster(sourceUrl, editPrompt);
      if (result) {
        setEditedPoster(result);
        setShowEditInput(false);
      }
    } catch (err) {
      alert("EDIT_FAILURE: Unable to synthesize neural modification. This may be due to CORS restrictions on the source image.");
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const handleImageError = () => {
    setHasError(true);
  };

  const pUrl = editedPoster || neuralPoster || movie.posterUrl;
  const isLost = !pUrl || pUrl.includes('[SIGNAL_LOST]') || pUrl === 'null' || pUrl === 'undefined';
  const isValidUrl = !isLost && (pUrl.startsWith('http') || pUrl.startsWith('data:image'));
  const isNeuralGenerated = !!(neuralPoster || editedPoster);

  const tmdbUrl = movie.tmdbId 
    ? `https://www.themoviedb.org/${movie.type === ContentType.SERIES ? 'tv' : 'movie'}/${movie.tmdbId}`
    : null;

  const CardHeader = () => (
    <div className="h-1 w-full bg-cyan-500/10 group-hover:bg-cyan-500/40 transition-colors"></div>
  );

  const PosterContent = () => (
    <div className="aspect-[2/3] w-full overflow-hidden relative shrink-0 bg-slate-950">
      {(isSynthesizingPoster || isProcessingEdit) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-40 backdrop-blur-sm">
           <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
              <div className="mono text-[9px] text-cyan-500 uppercase font-black animate-pulse tracking-widest">
                {isSynthesizingPoster ? 'Generating_Illustration...' : 'Synthesizing_Pixels...'}
              </div>
           </div>
        </div>
      )}

      {(!hasError && isValidUrl) ? (
        <div className="relative w-full h-full overflow-hidden">
          {isNeuralGenerated && (
            <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
               <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"></div>
               <div className="absolute inset-0 scanline opacity-20"></div>
            </div>
          )}
          <img 
            src={pUrl} 
            alt={movie.title}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            loading="lazy"
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isNeuralGenerated ? 'grayscale-[0.4] group-hover:grayscale-0 contrast-125' : 'grayscale-[0.2] group-hover:grayscale-0'}`}
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center relative bg-gradient-to-br from-slate-950 via-slate-900 to-black border-b border-cyan-500/10">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#00f5ff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="relative mb-4">
              <div className="w-14 h-14 rounded-full border border-cyan-500/20 flex items-center justify-center bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors">
                <i className="fa-solid fa-satellite-dish text-cyan-500/30 text-xl group-hover:text-cyan-400 group-hover:animate-pulse transition-all"></i>
              </div>
              <div className="absolute inset-[-4px] rounded-full border border-cyan-500/5 animate-[ping_3s_infinite]"></div>
            </div>
            
            <h4 className="text-sm font-black text-white uppercase leading-tight tracking-tight drop-shadow-[0_0_10px_rgba(0,245,255,0.2)] group-hover:text-cyan-400 transition-colors px-2 mb-2 line-clamp-2">
              {movie.title}
            </h4>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="h-[1px] w-6 bg-cyan-500/20"></div>
              <span className="mono text-xs text-slate-500 uppercase tracking-widest font-bold">{movie.year}</span>
              <div className="h-[1px] w-6 bg-cyan-500/20"></div>
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 mono text-[9px] text-slate-800 uppercase tracking-[0.5em] font-bold">Neural_Override_Active</div>
        </div>
      )}
      
      {isNeuralGenerated && (
        <div className="absolute bottom-2 left-2 z-20">
          <div className="mono text-[8px] bg-cyan-500 text-black px-1.5 py-0.5 font-black uppercase tracking-tighter shadow-[0_0_10px_rgba(0,245,255,0.4)]">NEURAL_ILLUSTRATION</div>
        </div>
      )}

      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none z-20">
        <div className="flex flex-wrap gap-1">
           {movie.providers?.slice(0, 3).map(p => (
             <img 
               key={p.provider_id} 
               src={`https://image.tmdb.org/t/p/original${p.logo_path}`} 
               alt={p.provider_name}
               className="w-6 h-6 rounded-sm border border-white/20 shadow-lg pointer-events-auto"
               title={`Available on ${p.provider_name}`}
             />
           ))}
        </div>
        <div className="mono text-xs bg-cyan-500 text-black px-1.5 py-0.5 font-bold shadow-lg shadow-cyan-500/40">
          {movie.rating ? movie.rating.toFixed(1) : '8.0'}
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={cardRef}
      style={{ 
        animationDelay: `${(index % 8) * 100}ms`
      }}
      className={`group relative tech-border bg-slate-900/40 overflow-hidden transition-all duration-300 hover:bg-slate-900/60 border-cyan-500/10 flex flex-col h-full shadow-lg ${isInView ? 'animate-card-entrance' : 'opacity-[0.01]'}`}
    >
      <CardHeader />
      
      {tmdbUrl ? (
        <a href={tmdbUrl} target="_blank" rel="noopener noreferrer" className="block relative focus:outline-none focus:ring-2 focus:ring-cyan-500 z-10">
          <PosterContent />
        </a>
      ) : (
        <PosterContent />
      )}
      
      <div className="p-3 space-y-3 flex flex-col flex-1 relative bg-slate-900/40">
        <div>
          {tmdbUrl ? (
            <a href={tmdbUrl} target="_blank" rel="noopener noreferrer" className="block focus:outline-none focus:ring-1 focus:ring-cyan-500/50">
              <h3 className="text-sm font-black uppercase tracking-tight line-clamp-1 hover:text-cyan-400 transition-colors cursor-pointer">{movie.title}</h3>
            </a>
          ) : (
            <h3 className="text-sm font-black uppercase tracking-tight line-clamp-1 group-hover:text-cyan-400 transition-colors">{movie.title}</h3>
          )}
          <p className="mono text-xs text-slate-500 uppercase mt-0.5">{movie.year} // {movie.type}</p>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {movie.genres.slice(0, 2).map((genre: string) => (
            <span key={genre} className="mono text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-white/5 uppercase font-bold">
              {genre}
            </span>
          ))}
        </div>

        {isRecommendation ? (
          <div className="pt-2 border-t border-white/5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="relative h-24 overflow-y-auto custom-scrollbar pr-1">
              <i className="fa-solid fa-quote-left absolute -left-2 -top-1 text-cyan-500/10 text-sm"></i>
              <p className="text-xs text-slate-400 leading-relaxed font-light italic pl-1">
                {movie.reason}
              </p>
            </div>

            <div className="space-y-2 pt-2 relative z-20">
              {showReasonInput ? (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <input 
                    autoFocus
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitFeedback()}
                    placeholder="WHY? (OPTIONAL)"
                    className="w-full bg-black/60 border border-cyan-500/30 p-2 mono text-xs text-white outline-none uppercase placeholder-slate-700"
                  />
                  <div className="flex gap-1">
                    <button 
                      onClick={submitFeedback}
                      className="flex-1 py-1.5 bg-cyan-500 text-black mono text-xs font-bold uppercase"
                    >
                      [ CONFIRM ]
                    </button>
                    <button 
                      onClick={() => setShowReasonInput(false)}
                      className="px-3 py-1.5 bg-white/5 text-slate-500 mono text-xs font-bold uppercase"
                    >
                      [ X ]
                    </button>
                  </div>
                </div>
              ) : showEditInput ? (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <input 
                    autoFocus
                    type="text"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNeuralEdit()}
                    placeholder="TYPE_EDIT_PROMPT..."
                    className="w-full bg-black/60 border border-cyan-500/30 p-2 mono text-xs text-white outline-none uppercase placeholder-slate-700"
                  />
                  <div className="flex gap-1">
                    <button 
                      onClick={handleNeuralEdit}
                      disabled={isProcessingEdit}
                      className="flex-1 py-1.5 bg-cyan-500 text-black mono text-xs font-bold uppercase flex items-center justify-center gap-2"
                    >
                      {isProcessingEdit ? <i className="fa-solid fa-microchip animate-spin"></i> : '[ SYNTHESIZE ]'}
                    </button>
                    <button 
                      onClick={() => setShowEditInput(false)}
                      className="px-3 py-1.5 bg-white/5 text-slate-500 mono text-xs font-bold uppercase"
                    >
                      [ X ]
                    </button>
                  </div>
                </div>
              ) : movie.feedback ? (
                <div className="py-2 border border-white/5 bg-white/5 flex items-center justify-center gap-2">
                  <i className={`fa-solid ${movie.feedback.type === 'like' ? 'fa-thumbs-up text-cyan-500' : 'fa-thumbs-down text-red-500'} text-xs`}></i>
                  <span className="mono text-[10px] text-slate-400 uppercase tracking-widest">Feedback_Stored</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  <button 
                    onClick={() => handleVote('like')}
                    className="py-2 border border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-500/60 hover:text-cyan-400 mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-1"
                  >
                    [ <i className="fa-solid fa-thumbs-up"></i> LIKE ]
                  </button>
                  <button 
                    onClick={() => handleVote('dislike')}
                    className="py-2 border border-red-500/10 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 mono text-xs uppercase font-bold transition-all flex items-center justify-center gap-1"
                  >
                    [ <i className="fa-solid fa-thumbs-down"></i> NO ]
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1">
                <button 
                  onClick={() => onLikeSimilar?.(movie)}
                  className="py-2 border border-cyan-500/10 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400 mono text-[10px] uppercase font-bold tracking-widest transition-all"
                >
                  [ SIMILAR ]
                </button>
                <button 
                  onClick={() => onMarkWatched?.(movie)}
                  className="py-2 border border-white/5 hover:bg-white/5 text-slate-600 hover:text-slate-300 mono text-[10px] uppercase font-bold tracking-widest transition-all"
                >
                  [ WATCHED ]
                </button>
              </div>

              {!showEditInput && !showReasonInput && !isProcessingEdit && (
                <button 
                  onClick={() => setShowEditInput(true)}
                  className="w-full py-2 bg-cyan-500/5 border border-cyan-500/20 text-cyan-500/80 hover:text-cyan-400 hover:border-cyan-400 mono text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  [ NEURAL_EDIT_POSTER ]
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1 opacity-60 mt-auto">
            <div className="h-1 flex-1 bg-slate-800">
               <div className="h-full bg-cyan-500/20" style={{ width: `${(movie.userRating || 8) * 10}%` }}></div>
            </div>
            <span className="mono text-[10px] text-slate-500 uppercase tracking-tighter">DATA_NODE</span>
          </div>
        )}
      </div>
    </div>
  );
};