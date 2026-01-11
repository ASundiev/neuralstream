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

  // ActionButtons component handles the layout for interaction buttons
  const ActionButtons = () => {
    // If input is active, show it centered at the bottom
    if (showReasonInput) {
      return (
        <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 flex gap-[6px] items-center z-30">
          <div className="flex gap-[6px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <input
              autoFocus
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitFeedback()}
              placeholder="MODIFIER..."
              className="w-24 bg-[rgba(0,0,0,0.64)] backdrop-blur-[2px] border border-[rgba(255,255,255,0.1)] px-3 py-[11px] mono text-[10px] text-white outline-none uppercase placeholder-slate-600"
              onClick={(e) => e.preventDefault()}
            />
            <button
              onClick={(e) => { e.preventDefault(); submitFeedback(); }}
              className="bg-[rgba(0,0,0,0.64)] backdrop-blur-[2px] border border-[rgba(255,255,255,0.1)] px-[17px] py-[11px] text-white hover:text-cyan-400 transition-colors"
            >
              <i className="fa-solid fa-check text-[12px]"></i>
            </button>
            <button
              onClick={(e) => { e.preventDefault(); setShowReasonInput(false); }}
              className="bg-[rgba(0,0,0,0.64)] backdrop-blur-[2px] border border-[rgba(255,255,255,0.1)] px-[17px] py-[11px] text-white hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-[12px]"></i>
            </button>
          </div>
        </div>
      );
    }

    // Default state: Only Kebab Menu at Bottom Right
    return (
      <div className="absolute bottom-[8px] right-[8px] z-30">
        <div className="relative">
          <button
            onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
            className={`bg-[rgba(0,0,0,0.64)] backdrop-blur-[2px] border border-[rgba(255,255,255,0.1)] w-12 h-12 md:w-auto md:h-auto md:px-[17px] md:py-[11px] flex items-center justify-center transition-all ${showMenu ? 'text-cyan-400 border-cyan-500/50' : 'text-white hover:text-cyan-400'}`}
          >
            <i className="fa-solid fa-ellipsis-vertical text-[12px]"></i>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-[55]" onClick={(e) => { e.preventDefault(); setShowMenu(false); }}></div>
              <div className="absolute bottom-full right-0 mb-2 w-40 bg-slate-900 border border-white/10 shadow-2xl z-[60] py-1 animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-sm">

                {/* Feedback Actions */}
                <div className="flex border-b border-white/5">
                  <button
                    onClick={(e) => { e.preventDefault(); handleVote('like'); setShowMenu(false); }}
                    className={`flex-1 px-3 py-2 text-center hover:bg-white/5 transition-colors ${movie.feedback?.type === 'like' ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-400'}`}
                  >
                    <i className="fa-solid fa-thumbs-up text-[12px]"></i>
                  </button>
                  <div className="w-px bg-white/5"></div>
                  <button
                    onClick={(e) => { e.preventDefault(); handleVote('dislike'); setShowMenu(false); }}
                    className={`flex-1 px-3 py-2 text-center hover:bg-white/5 transition-colors ${movie.feedback?.type === 'dislike' ? 'text-red-400' : 'text-slate-500 hover:text-red-400'}`}
                  >
                    <i className="fa-solid fa-thumbs-down text-[12px]"></i>
                  </button>
                </div>

                {isRecommendation && (
                  <button
                    onClick={(e) => { e.preventDefault(); setShowDescription(!showDescription); setShowMenu(false); }}
                    className={`w-full text-left px-3 py-2 mono text-[9px] uppercase font-black transition-colors ${showDescription ? 'text-cyan-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                  >
                    [ WHY THIS? ]
                  </button>
                )}

                <button
                  onClick={(e) => { e.preventDefault(); onLikeSimilar?.(movie); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 mono text-[9px] uppercase font-black text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-colors"
                >
                  [ SIMILAR ]
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); onMarkWatched?.(movie); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 mono text-[9px] uppercase font-black text-slate-500 hover:text-greenAcc-400 hover:bg-white/5 transition-colors"
                >
                  [ WATCHED ]
                </button>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    if (isSynthesizingPoster) return;
                    let finalPoster = neuralPoster;
                    if (!finalPoster) {
                      setIsSynthesizingPoster(true);
                      try {
                        finalPoster = await generateNeuralPoster(movie.title, movie.description);
                        if (finalPoster) setNeuralPoster(finalPoster);
                      } catch (err) {
                        console.error("WATCHLIST_SYNTHESIS_ERROR", err);
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
    );
  };

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

          {/* Dark gradient overlay at bottom for button contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[60%] to-[rgba(0,0,0,0.9)] pointer-events-none z-20" />

          {/* Saturation overlay like Figma design */}
          <div className="absolute inset-0 bg-[rgba(255,255,255,0.2)] mix-blend-saturation pointer-events-none" />
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
            <p className="font-sans italic text-white text-[14px] leading-relaxed">
              {movie.reason}
            </p>
          </div>
        </div>
      )}

      {/* Action buttons overlay */}
      <ActionButtons />
    </div>
  );

  return (
    <div
      ref={cardRef}
      style={{ animationDelay: `${(index % 8) * 100}ms` }}
      className={`group relative overflow-visible transition-all duration-300 flex flex-col h-full ${isInView ? 'animate-card-entrance' : 'opacity-[0.01]'}`}
    >
      {/* Hover Background Glow - hidden on mobile (rendered externally to avoid scroll clipping) */}
      <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] aspect-square z-0 opacity-0 group-hover:opacity-90 transition-opacity duration-700 pointer-events-none blur-[170px]">
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

      {/* Card container - no fill/border, just backdrop blur for readability on glow */}
      <div className="relative z-10 flex flex-col h-full backdrop-blur-[2px] transition-all duration-300">
        {/* Poster section - no padding */}
        <div className="relative">
          {imdbUrl ? (
            <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="block relative focus:outline-none focus:ring-2 focus:ring-cyan-500 z-10">
              <PosterContent />
            </a>
          ) : (
            <PosterContent />
          )}
        </div>

        {/* Title and metadata section */}
        <div className="flex flex-col flex-1 relative text-center pt-6 pb-4">
          <div className="flex flex-col items-center justify-center gap-[4px]">
            {imdbUrl ? (
              <a href={imdbUrl} target="_blank" rel="noopener noreferrer" className="block focus:outline-none">
                <h3 className="movie-card-title text-[20px] leading-[1.5] tracking-[-0.325px] hover:text-cyan-400 transition-colors">{movie.title}</h3>
              </a>
            ) : (
              <h3 className="movie-card-title text-[20px] leading-[1.5] tracking-[-0.325px] group-hover:text-cyan-400 transition-colors">{movie.title}</h3>
            )}
            {/* Metadata row with integrated rating */}
            <p className="font-mono text-[12px] text-[#8195b1] italic leading-[15px]">
              <span>{movie.year} // {movie.type} // ★ </span>
              <span className="font-extrabold italic">{movie.rating ? movie.rating.toFixed(1) : '8.0'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};