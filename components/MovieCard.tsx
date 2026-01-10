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
  const [showDescription, setShowDescription] = useState(false);
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

  const imdbUrl = `https://www.imdb.com/find?q=${encodeURIComponent(`${movie.title} ${movie.year}`)}&s=tt`;

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
          {/* Glitch Layers - RGB Split */}
          <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none mix-blend-hard-light">
            <img
              src={pUrl || ''}
              className="absolute inset-0 w-full h-full object-cover glitch-effect-1 transition-transform duration-700 group-hover:scale-110 opacity-75"
              style={{ filter: 'grayscale(100%) brightness(0.8) sepia(100%) saturate(400%) hue-rotate(120deg) contrast(1.2)' }}
              alt=""
            />
            <img
              src={pUrl || ''}
              className="absolute inset-0 w-full h-full object-cover glitch-effect-2 transition-transform duration-700 group-hover:scale-110 opacity-75"
              style={{ filter: 'grayscale(100%) brightness(0.8) sepia(100%) saturate(400%) hue-rotate(280deg) contrast(1.2)' }}
              alt=""
            />
            <img
              src={pUrl || ''}
              className="absolute inset-0 w-full h-full object-cover glitch-flash transition-transform duration-700 group-hover:scale-110 opacity-0 mix-blend-screen"
              style={{ filter: 'brightness(2) contrast(2)' }}
              alt=""
            />
          </div>

          <img
            src={pUrl || ''}
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

      {/* Description Overlay */}
      {isRecommendation && showDescription && (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end p-6 backdrop-blur-md bg-black/80 animate-in fade-in transition-all duration-300 pointer-events-auto"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDescription(false);
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="mono text-[9px] text-cyan-400 uppercase tracking-widest font-black">
                [ NEURAL_GENESIS ]
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDescription(false);
                }}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p className="movie-card-ai-quote text-[12px] leading-relaxed">
              {movie.reason}
            </p>
          </div>
        </div>
      )}

      <div className="absolute top-2 left-2 right-2 flex justify-end items-start pointer-events-none z-20">
        <div className="font-mono italic font-bold text-[13.5px] leading-4 bg-greenAcc-500 text-black px-2 py-1 shadow-[0px_11.25px_16.875px_-3.375px_rgba(0,0,0,0.1),0px_4.5px_6.75px_-4.5px_rgba(0,0,0,0.1)] border-[1.125px] border-[rgba(0,245,255,0.2)]">
          {movie.rating ? movie.rating.toFixed(1) : '8.0'}
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={cardRef}
      style={{ animationDelay: `${(index % 8) * 100}ms` }}
      className={`group relative overflow-visible transition-all duration-300 flex flex-col h-full ${isInView ? 'animate-card-entrance' : 'opacity-[0.01]'}`}
    >
      {/* Hover Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square z-0 opacity-0 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none blur-[150px]">
        {isValidUrl ? (
          <img
            src={pUrl || ''}
            className="w-full h-full object-cover rounded-full"
            alt=""
            aria-hidden="true"
          />
        ) : (
          <div className="w-full h-full bg-cyan-500 rounded-full" />
        )}
      </div>

      <div className="relative z-10 flex flex-col h-full bg-[rgba(17,21,35,0.48)] border border-white/10 backdrop-blur-[2px] p-4 transition-all duration-300 group-hover:bg-[rgba(17,21,35,0.6)]">
        {imdbUrl ? (
          <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="block relative focus:outline-none focus:ring-2 focus:ring-cyan-500 z-10 mb-6">
            <PosterContent />
          </a>
        ) : (
          <div className="mb-6">
            <PosterContent />
          </div>
        )}

        <div className="flex flex-col flex-1 relative text-center">
          <div className="flex flex-col items-center justify-center mb-6">
            {imdbUrl ? (
              <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="block focus:outline-none">
                <h3 className="movie-card-title text-[15px] leading-[22px] tracking-[-0.025em] hover:text-cyan-400 transition-colors">{movie.title}</h3>
              </a>
            ) : (
              <h3 className="movie-card-title text-[15px] leading-[22px] tracking-[-0.025em] group-hover:text-cyan-400 transition-colors">{movie.title}</h3>
            )}
            <p className="font-mono text-[10px] text-[#8195b1] uppercase italic mono-italic tracking-wider mt-1">{movie.year} // {movie.type}</p>
          </div>

          <div className="mt-auto relative z-20">
            {showReasonInput ? (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  autoFocus
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitFeedback()}
                  placeholder="ENTER_MODIFIER..."
                  className="w-full bg-black/60 border border-white/10 p-3 mono text-[10px] text-white outline-none uppercase placeholder-slate-700 rounded-sm"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={submitFeedback}
                    className="flex-1 py-2 bg-white text-black mono text-[10px] font-black uppercase hover:bg-cyan-400 transition-colors rounded-sm"
                  >
                    [ CONFIRM ]
                  </button>
                  <button
                    onClick={() => setShowReasonInput(false)}
                    className="px-4 py-2 bg-white/5 border border-white/5 text-slate-500 hover:text-white mono text-[10px] font-black uppercase transition-all rounded-sm"
                  >
                    [ X ]
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <div className="flex-1">
                  {movie.feedback ? (
                    <div className="h-full py-2 border border-white/10 bg-white/5 flex items-center justify-center gap-2 rounded-sm">
                      <i className={`fa-solid ${movie.feedback.type === 'like' ? 'fa-thumbs-up text-cyan-500' : 'fa-thumbs-down text-red-500'} text-xs`}></i>
                      <span className="mono text-[9px] text-slate-400 uppercase tracking-widest">RECORDED</span>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 h-full">
                      <button
                        onClick={() => handleVote('like')}
                        className="flex-1 py-2.5 border border-white/10 bg-white/5 hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-400 transition-all flex items-center justify-center rounded-sm"
                      >
                        <i className="fa-solid fa-thumbs-up text-xs"></i>
                      </button>
                      <button
                        onClick={() => handleVote('dislike')}
                        className="flex-1 py-2.5 border border-white/10 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all flex items-center justify-center rounded-sm"
                      >
                        <i className="fa-solid fa-thumbs-down text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>

                {isRecommendation && (
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className={`px-4 py-2.5 border transition-all flex items-center justify-center rounded-sm h-full ${showDescription ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-white/10 bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                  >
                    <i className="fa-solid fa-question text-xs"></i>
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="px-4 py-2.5 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all flex items-center justify-center rounded-sm h-full"
                  >
                    <i className="fa-solid fa-ellipsis-vertical text-xs"></i>
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-[55]" onClick={() => setShowMenu(false)}></div>
                      <div className="absolute bottom-full right-0 mb-2 w-32 bg-slate-900 border border-white/10 shadow-2xl z-[60] py-1 animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-sm">
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
                            if (isSynthesizingPoster) return;
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
      </div>
    </div>
  );
};