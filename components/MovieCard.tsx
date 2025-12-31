import React, { useState, useEffect, useRef } from 'react';
import { Movie, Feedback, ContentType } from '../types';
import { generateNeuralPoster } from '../services/imageService';

interface MovieCardProps {
  movie: Movie;
  index?: number;
  isRecommendation?: boolean;
  onLikeSimilar?: (movie: Movie) => void;
  onMarkWatched?: (movie: Movie) => void;
  onFeedback?: (movie: Movie, feedback: Feedback) => void;
  onAddToWatchlist?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  index = 0,
  isRecommendation,
  onLikeSimilar,
  onMarkWatched,
  onFeedback,
  onAddToWatchlist
}) => {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSynthesizingPoster, setIsSynthesizingPoster] = useState(false);
  const [neuralPoster, setNeuralPoster] = useState<string | null>(null);

  const [tempFeedback, setTempFeedback] = useState<'like' | 'dislike' | null>(null);
  const [reason, setReason] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const triggerSynthesis = async () => {
      if (!neuralPoster && !isSynthesizingPoster) {
        setIsSynthesizingPoster(true);
        try {
          const result = await generateNeuralPoster(movie.title, movie.description);
          if (result) setNeuralPoster(result);
        } catch (e) {
          console.error("NEURAL_POSTER_SYNTHESIS_ERROR", e);
        } finally {
          setIsSynthesizingPoster(false);
        }
      }
    };

    if (isInView) triggerSynthesis();
  }, [isInView, movie.title, movie.description, neuralPoster, isSynthesizingPoster]);

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

  const handleImageError = () => {
    setHasError(true);
  };

  const pUrl = neuralPoster || movie.posterUrl;
  const isLost = !pUrl || pUrl.includes('[SIGNAL_LOST]') || pUrl === 'null' || pUrl === 'undefined';
  const isValidUrl = !isLost && (pUrl.startsWith('http') || pUrl.startsWith('data:image'));
  const isNeuralGenerated = !!neuralPoster;

  const tmdbUrl = movie.tmdbId
    ? `https://www.themoviedb.org/${movie.type === ContentType.SERIES ? 'tv' : 'movie'}/${movie.tmdbId}`
    : null;

  const CardHeader = () => (
    <div className="h-1.5 w-full flex bg-cyan-500/5 group-hover:bg-cyan-500/20 transition-colors relative overflow-hidden">
      <div className="absolute inset-0 tech-hatch opacity-30"></div>
    </div>
  );

  const PosterContent = () => (
    <div className="aspect-[2/3] w-full overflow-hidden relative shrink-0 bg-slate-950">
      {isSynthesizingPoster && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin tech-chipped"></div>
            <div className="mono text-[9px] text-cyan-500 uppercase font-black animate-pulse tracking-widest">
              SYNTHESIZING_POSTER...
            </div>
          </div>
        </div>
      )}

      {(!hasError && isValidUrl) ? (
        <div className="relative w-full h-full overflow-hidden">
          {isNeuralGenerated && (
            <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-cyan-500/10 to-transparent"></div>
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
              <div className="w-14 h-14 rounded-full border border-cyan-500/20 flex items-center justify-center bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-colors tech-chipped">
                <i className="fa-solid fa-satellite-dish text-cyan-500/30 text-xl group-hover:text-cyan-400 group-hover:animate-pulse transition-all"></i>
              </div>
            </div>

            <h4 className="text-sm font-black text-white uppercase leading-tight tracking-tight group-hover:text-cyan-400 transition-colors px-2 mb-2 line-clamp-2">
              {movie.title}
            </h4>
          </div>
        </div>
      )}

      <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none z-20">
        <div className="flex flex-wrap gap-1">
          {movie.providers?.slice(0, 3).map(p => (
            <img
              key={p.provider_id}
              src={`https://image.tmdb.org/t/p/original${p.logo_path}`}
              alt={p.provider_name}
              className="w-6 h-6 border border-white/20 shadow-lg pointer-events-auto tech-chipped"
            />
          ))}
        </div>
        <div className="mono text-xs bg-greenAcc-500 text-black px-2 py-0.5 font-bold tech-chipped shadow-lg">
          {movie.rating ? movie.rating.toFixed(1) : '8.0'}
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={cardRef}
      style={{ animationDelay: `${(index % 8) * 100}ms` }}
      className={`group relative tech-border bg-slate-900/40 overflow-hidden transition-all duration-300 hover:bg-slate-900/60 border-cyan-500/10 flex flex-col h-full shadow-lg tech-chipped ${isInView ? 'animate-card-entrance' : 'opacity-[0.01]'}`}
    >
      <CardHeader />

      {tmdbUrl ? (
        <a href={tmdbUrl} target="_blank" rel="noopener noreferrer" className="block relative focus:outline-none focus:ring-2 focus:ring-cyan-500 z-10">
          <PosterContent />
        </a>
      ) : (
        <PosterContent />
      )}

      <div className="p-4 space-y-4 flex flex-col flex-1 relative bg-slate-900/40">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            {tmdbUrl ? (
              <a href={tmdbUrl} target="_blank" rel="noopener noreferrer" className="block focus:outline-none">
                <h3 className="text-[13px] font-black uppercase tracking-tight line-clamp-1 hover:text-cyan-400 transition-colors">{movie.title}</h3>
              </a>
            ) : (
              <h3 className="text-[13px] font-black uppercase tracking-tight line-clamp-1 group-hover:text-cyan-400 transition-colors">{movie.title}</h3>
            )}
            <p className="mono text-[10px] text-slate-500 uppercase">{movie.year} // {movie.type}</p>
          </div>
          <div className="w-4 h-4 bg-cyan-500/10 flex items-center justify-center tech-chipped">
            <div className="w-1.5 h-1.5 bg-cyan-400"></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {movie.genres.slice(0, 2).map((genre: string) => (
            <span key={genre} className="mono text-[9px] px-2 py-1 bg-slate-800 text-slate-400 border border-white/5 uppercase font-bold tech-chipped">
              {genre}
            </span>
          ))}
        </div>

        {isRecommendation ? (
          <div className="pt-3 border-t border-white/5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="relative h-20 overflow-y-auto custom-scrollbar pr-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <p className="text-[11px] text-slate-400 leading-relaxed font-light italic">
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
                    placeholder="ENTER_MODIFIER..."
                    className="w-full bg-black/60 border border-white/10 p-3 mono text-[10px] text-white outline-none uppercase placeholder-slate-700 tech-chipped"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={submitFeedback}
                      className="flex-1 py-2 bg-white text-black mono text-[10px] font-black uppercase hover:bg-cyan-400 transition-colors tech-chipped"
                    >
                      [ CONFIRM ]
                    </button>
                    <button
                      onClick={() => setShowReasonInput(false)}
                      className="px-4 py-2 bg-white/5 border border-white/5 text-slate-500 hover:text-white mono text-[10px] font-black uppercase transition-all tech-chipped"
                    >
                      [ X ]
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    {movie.feedback ? (
                      <div className="h-full py-2 border border-white/10 bg-white/5 flex items-center justify-center gap-2 tech-chipped">
                        <i className={`fa-solid ${movie.feedback.type === 'like' ? 'fa-thumbs-up text-cyan-500' : 'fa-thumbs-down text-red-500'} text-xs`}></i>
                        <span className="mono text-[9px] text-slate-400 uppercase tracking-widest">RECORDED</span>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 h-full">
                        <button
                          onClick={() => handleVote('like')}
                          className="flex-1 py-2.5 border border-white/10 bg-white/5 hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all flex items-center justify-center tech-chipped"
                        >
                          <i className="fa-solid fa-thumbs-up text-xs"></i>
                        </button>
                        <button
                          onClick={() => handleVote('dislike')}
                          className="flex-1 py-2.5 border border-white/10 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all flex items-center justify-center tech-chipped"
                        >
                          <i className="fa-solid fa-thumbs-down text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="px-4 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all flex items-center justify-center tech-chipped h-full"
                    >
                      <i className="fa-solid fa-ellipsis-vertical text-xs"></i>
                    </button>
                    {showMenu && (
                      <>
                        <div className="fixed inset-0 z-[55]" onClick={() => setShowMenu(false)}></div>
                        <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-900 border border-white/10 shadow-2xl z-[60] py-1 animate-in fade-in slide-in-from-bottom-2 duration-200 tech-chipped">
                          <button
                            onClick={() => { onLikeSimilar?.(movie); setShowMenu(false); }}
                            className="w-full text-left px-3 py-2 mono text-[9px] uppercase font-black text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                          >
                            [ SIMILAR ]
                          </button>
                          <button
                            onClick={() => { onMarkWatched?.(movie); setShowMenu(false); }}
                            className="w-full text-left px-3 py-2 mono text-[9px] uppercase font-black text-slate-500 hover:text-greenAcc-400 hover:bg-white/5 transition-colors"
                          >
                            [ WATCHED ]
                          </button>
                          <button
                            onClick={async () => {
                              if (isSynthesizingPoster) {
                                // Wait for synthesis to complete if user clicks while it's working
                                return;
                              }
                              let finalPoster = neuralPoster;
                              if (!finalPoster) {
                                setIsSynthesizingPoster(true);
                                try {
                                  finalPoster = await generateNeuralPoster(movie.title, movie.description);
                                  if (finalPoster) setNeuralPoster(finalPoster);
                                } catch (e) {
                                  console.error("WATCHLIST_SYNTHESIS_ERROR", e);
                                } finally {
                                  setIsSynthesizingPoster(false);
                                }
                              }
                              onAddToWatchlist?.({ ...movie, posterUrl: finalPoster || '[SIGNAL_LOST]' });
                              setShowMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 mono text-[9px] uppercase font-black text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-colors border-t border-white/5"
                            disabled={isSynthesizingPoster}
                          >
                            {isSynthesizingPoster ? '[ SYNTHESIZING... ]' : '[ + WATCHLIST ]'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-2 opacity-40 mt-auto group-hover:opacity-100 transition-opacity">
            <div className="h-1 flex-1 bg-slate-800 relative overflow-hidden">
              <div className="h-full bg-cyan-500/40" style={{ width: `${(movie.userRating || 8) * 10}%` }}></div>
            </div>
            <span className="mono text-[8px] text-slate-500 uppercase tracking-tighter">NODE_SYNCS_OK</span>
          </div>
        )}
      </div>
    </div>
  );
};