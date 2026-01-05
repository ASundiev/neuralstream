import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ContentType, Movie, AppState, Feedback, SearchHistoryItem } from './types';
import logo from './assets/Logo.svg';
import headerLogo from './assets/HeaderLogo.svg';
import { GENRES, MOODS, CONTENT_TYPES } from './constants';
import { getRecommendations } from './services/geminiService';
import { MovieCard } from './components/MovieCard';
import { NeuralLoader } from './components/NeuralLoader';
import { PromoHero } from './components/PromoHero';
import { PromoFeatures } from './components/PromoFeatures';
import { MosaicBackground } from './components/MosaicBackground';
import { NeuralDNA } from './components/NeuralDNA';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vplgyzzwgbgwudbtdgfk.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbGd5enp3Z2Jnd3VkYnRkZ2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzM0ODksImV4cCI6MjA4MTc0OTQ4OX0.90zVerWUdgekP_MWRiViKC80bDy46UkZau6MZ6ANrKE';

let supabase: any = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error("CRITICAL_CONFIG_ERROR: Supabase client initialization failed.", e);
}

const INITIAL_FILTERS = {
  type: ContentType.BOTH,
  genre: '',
  mood: '',
  query: ''
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [verificationSent, setVerificationSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE'>('IDLE');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState<'SIGNALS' | 'SEARCHES' | 'WATCHLIST'>('SIGNALS');
  const [tuningVisible, setTuningVisible] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    userMovies: [],
    watchlist: [],
    feedbackHistory: [],
    searchHistory: [],
    recommendations: [],
    isLoading: true,
    isRecsLoading: false,
    filters: INITIAL_FILTERS,
    sources: [],
    guestSearchUsed: !!localStorage.getItem('neural_guest_search'),
    isMoreLoading: false
  });

  const [minLoadingComplete, setMinLoadingComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinLoadingComplete(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const skipSync = useRef(false);
  const tuningRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showUploadScreen = !!user && state.userMovies.length === 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTuningVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '100px' }
    );

    if (tuningRef.current) {
      observer.observe(tuningRef.current);
    }

    const fallbackTimer = setTimeout(() => setTuningVisible(true), 2000);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [user, state.userMovies]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [state.filters.query]);

  const handleLogout = async () => {
    if (window.confirm("TERMINATE_NEURAL_UPLINK? ANY UNSYNCED LOCAL CACHE WILL BE FLUSHED.")) {
      await supabase.auth.signOut();
      setShowStatsModal(false);
      setIsFlipped(false);
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!user || !supabase) {
      if (!user) {
        // We still wait for the 3s timer even for guests
      }
      return;
    }

    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('state, is_approved')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setIsApproved(data.is_approved === true);
        if (data.state) {
          skipSync.current = true;
          setState({
            ...data.state,
            filters: { ...INITIAL_FILTERS, ...(data.state.filters || {}) },
            searchHistory: data.state.searchHistory || [],
            watchlist: data.state.watchlist || [],
            isLoggedIn: true,
            isLoading: false, // This will be combined with minLoadingComplete
            isRecsLoading: false,
            guestSearchUsed: true
          });
        } else {
          setState((s) => ({ ...s, isLoggedIn: true, isLoading: false, isRecsLoading: false, guestSearchUsed: true }));
        }
      } else {
        setState((s) => ({ ...s, isLoggedIn: true, isLoading: false, isRecsLoading: false, guestSearchUsed: true }));
      }
    } catch (err) {
      console.error("Hydration Failure:", err);
      setIsApproved(false);
      setState((s) => ({ ...s, isLoggedIn: true, isLoading: false, isRecsLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    const initApp = async () => {
      if (!supabase) {
        setState((s) => ({ ...s, isLoading: false }));
        setSyncStatus('OFFLINE');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!session) {
        setState((s) => ({ ...s, isLoading: false }));
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        setUser(session?.user ?? null);
        if (session) {
          setShowAuthModal(false);
        } else {
          setState((s) => ({ ...s, isLoggedIn: true, isLoading: false, isRecsLoading: false }));
        }
      });

      return () => subscription.unsubscribe();
    };
    initApp();
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!user || !supabase || state.isLoading || isApproved === false) return;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    const syncToCloud = async () => {
      setSyncStatus('SYNCING');
      const { isLoading, isRecsLoading, ...persistableState } = state;
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, state: persistableState, updated_at: new Date().toISOString() });
      setSyncStatus(error ? 'ERROR' : 'IDLE');
    };
    const debounceTimer = setTimeout(syncToCloud, 2000);
    return () => clearTimeout(debounceTimer);
  }, [state, user, isApproved]);

  const openAuth = (signUp: boolean = true) => {
    setIsSignUp(signUp);
    setShowAuthModal(true);
  };

  const gateInteraction = (callback: () => void) => {
    if (user) callback();
    else openAuth(true);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthLoading(true);
    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
        : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) throw error;
      if (isSignUp) setVerificationSent(true);
      else setShowAuthModal(false);
    } catch (err: any) {
      alert(`AUTH_FAILURE: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchRecommendations = useCallback(async (seed?: Movie, isMore: boolean = false) => {
    if (!user && state.guestSearchUsed && !isMore) {
      openAuth(true);
      return;
    }

    const effectiveQuery = state.filters.query || "";

    const parts: string[] = [];
    if (state.filters.genre) parts.push(state.filters.genre.toUpperCase());
    if (state.filters.mood) parts.push(state.filters.mood.toUpperCase());
    if (state.filters.type !== ContentType.BOTH) parts.push(state.filters.type.toUpperCase());
    const filterLabel = parts.join(' ');
    const searchLabel = effectiveQuery || (filterLabel.length > 0 ? filterLabel : "NEURAL_SWEEP");

    if (isMore) {
      setState((prev) => ({ ...prev, isMoreLoading: true }));
    } else {
      setState((prev) => ({ ...prev, isRecsLoading: true, progress: 0 }));
    }

    try {
      const { movies, sources: newSources } = await getRecommendations({
        watchedHistory: state.userMovies,
        feedbackHistory: state.feedbackHistory,
        targetType: state.filters.type,
        genre: state.filters.genre,
        mood: state.filters.mood,
        seedMovie: seed,
        naturalLanguageQuery: effectiveQuery,
        isGuest: !user,
        limit: 4,
        excludeTitles: isMore ? state.recommendations.map(m => m.title) : [],
        onProgress: (p) => setState(prev => ({ ...prev, progress: p }))
      });
      if (!user) localStorage.setItem('neural_guest_search', 'true');
      setState((prev) => ({
        ...prev,
        recommendations: isMore ? [...prev.recommendations, ...movies] : movies,
        sources: isMore ? [...prev.sources, ...newSources] : newSources,
        guestSearchUsed: !user ? true : prev.guestSearchUsed,
        isMoreLoading: false,
        isRecsLoading: false,
        searchHistory: isMore ? prev.searchHistory : [
          {
            id: Math.random().toString(36).substr(2, 9),
            query: searchLabel,
            timestamp: new Date().toISOString(),
            recommendations: movies,
            filters: { ...prev.filters, query: effectiveQuery }
          },
          ...(prev.searchHistory || [])
        ].slice(0, 50)
      }));
    } catch (error) {
      alert("ENGINE_FAILURE: SYNTHESIS INTERRUPTED.");
      setState(prev => ({ ...prev, isMoreLoading: false, isRecsLoading: false }));
    }
  }, [state.userMovies, state.feedbackHistory, state.filters, state.guestSearchUsed, user]);

  const restoreSearch = (item: SearchHistoryItem) => {
    setState(prev => ({
      ...prev,
      recommendations: item.recommendations,
      filters: item.filters
    }));
    setShowStatsModal(false);
  };

  const markAsWatched = (movie: Movie) => {
    gateInteraction(() => {
      setState((prev) => ({
        ...prev,
        userMovies: [{ ...movie, userRating: 8 }, ...prev.userMovies],
        recommendations: prev.recommendations.filter((m) => m.title.toLowerCase() !== movie.title.toLowerCase())
      }));
    });
  };

  const handleFeedback = (movie: Movie, feedback: Feedback) => {
    gateInteraction(() => {
      setState((prev) => {
        const updatedRecs = prev.recommendations.map((r) => r.id === movie.id ? { ...r, feedback } : r);
        return {
          ...prev,
          recommendations: updatedRecs,
          feedbackHistory: [{ title: movie.title, feedback }, ...prev.feedbackHistory].slice(0, 200)
        };
      });
    });
  };

  const removeFeedback = (index: number) => {
    setState((prev) => ({
      ...prev,
      feedbackHistory: prev.feedbackHistory.filter((_, i) => i !== index)
    }));
  };

  const addToWatchlist = (movie: Movie) => {
    gateInteraction(() => {
      setState((prev) => {
        if (prev.watchlist.some(m => m.title.toLowerCase() === movie.title.toLowerCase())) {
          return prev;
        }
        return {
          ...prev,
          watchlist: [...prev.watchlist, movie]
        };
      });
    });
  };

  const removeFromWatchlist = (title: string) => {
    setState((prev) => ({
      ...prev,
      watchlist: prev.watchlist.filter(m => m.title.toLowerCase() !== title.toLowerCase())
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState((prev) => ({ ...prev, isLoading: true }));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      const headers = lines[0].split(',');
      const getIdx = (n: string) => headers.findIndex(h => h.trim().replace(/^"|"$/g, '') === n);
      const [iT, iY, iR, iTy] = [getIdx('Title'), getIdx('Year'), getIdx('Your Rating'), getIdx('Title Type')];

      const movies: Movie[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const rating = parseInt(row[iR]);
        if (row[iT] && rating >= 7) {
          movies.push({
            id: Math.random().toString(36).substr(2, 9),
            title: row[iT],
            year: row[iY],
            rating: rating,
            userRating: rating,
            type: row[iTy]?.toLowerCase().includes('tv') ? ContentType.SERIES : ContentType.MOVIE,
            genres: [],
            posterUrl: '[SIGNAL_LOST]'
          });
        }
      }
      setState((prev) => ({ ...prev, userMovies: movies, isLoggedIn: !!user, isLoading: false }));
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = ''; // Reset input
  };

  if (!supabase) return <div className="min-h-screen flex items-center justify-center text-white">SUPABASE_CONFIG_MISSING</div>;
  const isLoading = state.isLoading || !minLoadingComplete;

  return (
    <div className={`min-h-screen pb-20 relative ${!user ? 'landing-bg-desktop' : ''}`}>
      {isLoading && <NeuralLoader />}
      {!user && <MosaicBackground />}

      {(user || state.userMovies.length > 0) && (
        <header className="fixed top-0 left-0 right-0 z-[80] bg-slate-950/60 backdrop-blur-xl border-b border-cyan-500/5 h-20 flex items-center animate-in slide-in-from-top duration-700">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-20">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <img src={headerLogo} alt="NEURALSTREAM" style={{ width: '96px', height: '30px' }} className="block" />
              </div>

              <button
                onClick={() => setShowStatsModal(true)}
                className="group flex items-center gap-4 p-1.5 pr-6 bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30 transition-all rounded-sm relative z-50 cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all tech-chipped">
                  <i className="fa-solid fa-id-badge text-xl"></i>
                </div>
                <div className="text-left space-y-0.5 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(0,245,255,0.5)]"></span>
                    <span className="font-mono italic font-[800] text-[9px] leading-[14px] tracking-[0.9px] text-[#64748B] uppercase">Neural_DNA_Profile</span>
                  </div>
                  <div className="font-mono italic font-[800] text-[10px] leading-[15px] tracking-[-0.25px] text-[#00F5FF] uppercase flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span>Nodes:</span>
                      <span className="text-white">{state.userMovies.length}</span>
                    </div>
                    <span className="text-slate-700">//</span>
                    <div className="flex items-center gap-1">
                      <span>Signals:</span>
                      <span className="text-white">{state.feedbackHistory.length}</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </header>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="max-w-4xl w-full tech-border bg-slate-900 shadow-[0_0_50px_rgba(0,245,255,0.1)] relative overflow-hidden flex flex-col md:flex-row border-cyan-500/20 tech-chipped">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white px-2 z-[110]">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <div className="md:w-1/2 p-4 md:p-12 bg-black/40 border-b md:border-b-0 md:border-r border-white/5 space-y-10">
              <div className="space-y-1 italic">
                <div className="font-mono text-[10px] text-cyan-500 uppercase tracking-[0.4em] font-black">Unlock all features</div>
                <h2 className="auth-title">
                  Secure Your <br /><span className="text-cyan-400">Taste Matrix</span>
                </h2>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 group">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-slate-800 border border-white/5 text-slate-500 group-hover:text-cyan-400 transition-all tech-chipped">
                    <i className="fa-solid fa-vault text-xs"></i>
                  </div>
                  <div>
                    <h4 className="auth-feature-title mb-1">Search History & Saves</h4>
                    <p className="auth-feature-desc">Save all your recommendations and search history to access them anytime across all devices.</p>
                  </div>
                </div>
                <div className="flex gap-4 group">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-slate-800 border border-white/5 text-slate-500 group-hover:text-greenAcc-400 transition-all tech-chipped">
                    <i className="fa-solid fa-sync text-xs"></i>
                  </div>
                  <div>
                    <h4 className="auth-feature-title mb-1">Personalized Taste Profile</h4>
                    <p className="auth-feature-desc">Your movie history and preferences are securely stored and synced across your unique viewer profile.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 p-4 md:p-12 flex flex-col justify-center bg-slate-900">
              <div className="text-center mb-10">
                <h3 className="section-title-tourney inline-block">Identity Verification</h3>
              </div>

              {verificationSent ? (
                <div className="text-center py-10 space-y-6 bg-cyan-500/5 border border-cyan-500/20 animate-in zoom-in-95 duration-500">
                  <i className="fa-solid fa-paper-plane text-4xl text-cyan-400 animate-bounce"></i>
                  <div className="space-y-2 px-6">
                    <p className="text-cyan-400 mono text-xs font-bold uppercase tracking-widest leading-relaxed">UPLINK_PACKET_SENT_TO_EMAIL.</p>
                  </div>
                  <button onClick={() => setVerificationSent(false)} className="mt-4 text-[9px] underline text-slate-400 hover:text-white uppercase tracking-[0.2em] font-black">BACK_TO_LOGIN</button>
                </div>
              ) : (
                <form onSubmit={handleAuth} className="space-y-6">
                  <div className="space-y-1">
                    <label className="auth-input-label ml-1">ACCESS_EMAIL</label>
                    <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 auth-input-text text-white outline-none focus:border-cyan-500 rounded-sm" placeholder="TYPE_EMAIL..." />
                  </div>
                  <div className="space-y-1">
                    <label className="auth-input-label ml-1">SECURITY_KEY</label>
                    <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 auth-input-text text-white outline-none focus:border-cyan-500 rounded-sm" placeholder="TYPE_PASSWORD..." />
                  </div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-5 bg-cyan-500 text-black font-mono mono-extrabold-italic text-sm uppercase tracking-[3.84px] transition-all relative overflow-hidden group/auth-btn hover:bg-white shadow-[0_0_30px_rgba(0,245,255,0.2)] tech-chipped"
                  >
                    <span className="relative z-10">{authLoading ? 'ESTABLISHING_UPLINK...' : (isSignUp ? 'SIGN UP' : 'LOG IN')}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg animate-in fade-in duration-300">
          <div className="max-w-4xl w-full h-[640px] max-h-[80vh] tech-border bg-slate-900 border-cyan-500/20 shadow-[0_0_100px_rgba(0,245,255,0.1)] relative tech-chipped flex flex-col">
            <div className="p-4 md:p-8 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="modal-title-tourney text-white">Neural DNA Profile</h2>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-2xl"></i>
              </button>
            </div>

            <div className="px-4 md:px-8 py-6 border-b border-white/5 bg-black/20">
              <NeuralDNA
                totalSignals={state.userMovies.length + state.feedbackHistory.length}
                maxSignals={150}
              />
            </div>

            <div className="px-4 md:px-8 border-b border-white/5 flex gap-4 md:gap-8 overflow-x-auto custom-scrollbar whitespace-nowrap">
              {[
                { id: 'SIGNALS', label: 'Signals' },
                { id: 'SEARCHES', label: 'Searches' },
                { id: 'WATCHLIST', label: 'Watchlist' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatsTab(tab.id as any)}
                  className={`py-4 dna-tab-label relative transition-all shrink-0 ${activeStatsTab === tab.id ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  {tab.label}
                  {activeStatsTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(0,245,255,0.5)]"></div>
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
              {activeStatsTab === 'SIGNALS' ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {state.feedbackHistory.length > 0 ? state.feedbackHistory.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 group transition-colors hover:bg-black/60">
                      <div className="flex items-center gap-6">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-sm ${f.feedback.type === 'like' ? 'text-cyan-400 bg-cyan-500/10' : 'text-red-400 bg-red-500/10'}`}>
                          <i className={`fa-solid ${f.feedback.type === 'like' ? 'fa-thumbs-up' : 'fa-thumbs-down'} text-xs`}></i>
                        </div>
                        <span className="dna-list-item-title">{f.title}</span>
                      </div>
                      <button
                        onClick={() => removeFeedback(i)}
                        className="w-8 h-8 flex items-center justify-center bg-white/5 text-slate-600 hover:bg-red-500 hover:text-white transition-all rounded-sm"
                        title="Remove from memory"
                      >
                        <i className="fa-solid fa-xmark text-xs"></i>
                      </button>
                    </div>
                  )) : (
                    <div className="p-6 text-center mono text-[10px] text-slate-700 uppercase tech-chipped bg-black/20">NO_SIGNALS_DETECTED</div>
                  )}
                </div>
              ) : activeStatsTab === 'SEARCHES' ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {state.searchHistory && state.searchHistory.length > 0 ? state.searchHistory.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => restoreSearch(s)}
                      className="w-full text-left flex items-center justify-between p-4 bg-black/40 border border-white/5 hover:border-cyan-500/40 transition-all tech-chipped group"
                    >
                      <div className="space-y-1">
                        <div className="dna-list-item-title group-hover:!text-white transition-colors line-clamp-1">{s.query}</div>
                        <div className="dna-list-item-date">{new Date(s.timestamp).toLocaleDateString()}</div>
                      </div>
                      <i className="fa-solid fa-chevron-right text-[10px] text-slate-700 group-hover:text-cyan-400 transition-colors"></i>
                    </button>
                  )) : (
                    <div className="p-6 text-center mono text-[10px] text-slate-700 uppercase tech-chipped bg-black/20">MEMORY_EMPTY</div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {state.watchlist.length > 0 ? state.watchlist.map((m, i) => (
                    <div key={i} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-black/40 border border-white/5 group transition-colors hover:bg-black/60 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-14 bg-slate-800 shrink-0 overflow-hidden tech-chipped">
                          {m.posterUrl && !m.posterUrl.includes('[SIGNAL_LOST]') ? (
                            <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover grayscale-[0.4] contrast-125" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className="fa-solid fa-film text-slate-700 text-xs"></i>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="dna-list-item-title">{m.title}</span>
                          <div className="dna-list-item-date">{m.year} // {m.type}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                          onClick={() => {
                            handleFeedback(m, { type: 'like' });
                            removeFromWatchlist(m.title);
                          }}
                          className="flex-1 md:flex-none h-8 px-3 flex items-center justify-center bg-white/5 border border-white/5 text-slate-400 hover:bg-cyan-500 hover:text-black transition-all rounded-sm dna-watchlist-btn-label"
                        >
                          <i className="fa-solid fa-thumbs-up mr-2 text-[10px]"></i> LIKE
                        </button>
                        <button
                          onClick={() => {
                            handleFeedback(m, { type: 'dislike' });
                            removeFromWatchlist(m.title);
                          }}
                          className="flex-1 md:flex-none h-8 px-3 flex items-center justify-center bg-white/5 border border-white/5 text-slate-400 hover:bg-red-500 hover:text-white transition-all rounded-sm dna-watchlist-btn-label"
                        >
                          <i className="fa-solid fa-thumbs-down mr-2 text-[10px]"></i> DISLIKE
                        </button>
                        <button
                          onClick={() => {
                            markAsWatched(m);
                            removeFromWatchlist(m.title);
                          }}
                          className="flex-1 md:flex-none h-8 px-3 flex items-center justify-center bg-white/5 border border-white/5 text-slate-400 hover:bg-greenAcc-500 hover:text-black transition-all rounded-sm dna-watchlist-btn-label"
                        >
                          <i className="fa-solid fa-check mr-2 text-[10px]"></i> WATCHED
                        </button>
                        <button
                          onClick={() => removeFromWatchlist(m.title)}
                          className="w-8 h-8 flex items-center justify-center bg-white/5 text-slate-600 hover:bg-red-500 hover:text-white transition-all rounded-sm"
                          title="Remove from watchlist"
                        >
                          <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="p-6 text-center mono text-[10px] text-slate-700 uppercase tech-chipped bg-black/20">WATCHLIST_EMPTY</div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 md:p-8 border-t border-white/5 bg-black/20 flex justify-start items-center">
              <div className="relative p-[1px] tech-chipped-red">
                <button
                  onClick={handleLogout}
                  className="px-6 py-4 flex items-center gap-2 hover:bg-red-500/10 transition-colors dna-sign-out-label"
                >
                  <i className="fa-solid fa-power-off text-xs"></i>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={`max-w-7xl mx-auto px-4 md:px-8 relative z-10 pt-24 md:pt-40`}>
        <div className="relative">
          <div className="">
            {!user && (
              <div className="md:mx-[3rem]">
                <PromoHero
                  isFlipped={isFlipped}
                  onTryNow={() => setIsFlipped(true)}
                  onLogin={() => openAuth(false)}
                  onSignUp={() => openAuth(true)}
                />
              </div>
            )}

            {showUploadScreen ? (
              <div className="max-w-xl mx-auto tech-border bg-slate-900/40 p-4 md:p-12 text-center space-y-10 relative -mt-16 backdrop-blur-md z-30 border-cyan-500/20 tech-chipped">
                <div className="space-y-4">
                  <div className="mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">Neural_Profile_Empty</div>
                  <h2 className="text-3xl font-black uppercase text-white italic">Initialize Your <span className="text-cyan-400">Matrix</span></h2>
                </div>
                <label className="group relative w-full flex flex-col items-center justify-center gap-6 py-16 border border-cyan-500/20 hover:border-cyan-500/60 bg-cyan-500/5 cursor-pointer transition-all tech-chipped">
                  <i className="fa-solid fa-cloud-arrow-up text-5xl text-cyan-400"></i>
                  <span className="mono text-sm text-cyan-400 font-black uppercase tracking-widest">[ UPLOAD IMDB CSV ]</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                </label>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="perspective-1000 relative mt-0 md:-mt-8 z-30 md:mx-[3rem]">
                  <div className={`transition-all duration-1000 preserve-3d relative ${isFlipped || user ? 'rotate-y-180' : ''}`}>
                    <div className={`backface-hidden ${isFlipped || user ? 'absolute inset-0 invisible pointer-events-none' : 'relative'}`}>
                      <div className="tech-border bg-slate-900/80 backdrop-blur-xl border-cyan-500/10 tech-chipped">
                        <PromoFeatures />
                      </div>
                    </div>

                    <div className={`backface-hidden rotate-y-180 ${isFlipped || user ? 'relative' : 'absolute inset-0 invisible pointer-events-none'}`}>
                      <section
                        ref={tuningRef}
                        className="tech-border p-4 md:p-8 bg-slate-900/80 backdrop-blur-xl space-y-10 border-cyan-500/30 tech-chipped"
                      >
                        <div className={`space-y-6 ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationFillMode: 'both' }}>
                          <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
                            <div className="space-y-1">
                              <div className="mono text-[10px] uppercase font-black tracking-widest flex items-center gap-2 mono-extrabold-italic">
                                <span className={`w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(0,245,255,0.5)]`}></span>
                                <span className="text-cyan-500">Neural_Uplink_Console</span>
                              </div>
                              <h2 className="section-title-tourney">Tuning Parameters</h2>
                            </div>

                            <div className="flex flex-col items-start md:items-end gap-2">
                              <div className="relative">
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className={`px-6 py-2 border font-mono mono-extrabold-italic text-xs uppercase tracking-widest transition-all tech-chipped whitespace-nowrap ${importSuccess
                                    ? 'bg-cyan-500 border-cyan-400 text-black'
                                    : state.userMovies.length > 0
                                      ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                      : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500 hover:text-black'
                                    }`}
                                >
                                  {importSuccess ? '[ SYNC_COMPLETE ]' : state.userMovies.length > 0 ? '[ RE-IMPORT FROM IMDB ]' : '[ IMPORT FROM IMDB ]'}
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
                              </div>
                            </div>
                          </div>

                          <div className={`relative flex items-start group ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                            <div className="absolute left-6 top-5 font-mono mono-extrabold-italic text-cyan-500/60 text-sm select-none">CMD_&gt;</div>
                            <textarea
                              ref={textareaRef}
                              rows={1}
                              value={state.filters.query}
                              onChange={(e) => {
                                setState((s) => ({ ...s, filters: { ...s.filters, query: e.target.value } }));
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              placeholder="SPECIFY_NEURAL_OVERRIDE..."
                              className="w-full bg-black/40 border border-white/10 group-hover:border-cyan-500/40 focus:border-cyan-500/60 p-5 pl-20 font-mono italic text-sm text-white outline-none uppercase placeholder-slate-800 rounded-sm resize-none overflow-hidden"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {[
                            {
                              label: 'Modality', component: (
                                <div className="flex w-full p-1 bg-black/40 border border-white/10 h-[52px] tech-chipped">
                                  {CONTENT_TYPES.map((ct) => (
                                    <button
                                      key={ct.value}
                                      onClick={() => setState((s) => ({ ...s, filters: { ...s.filters, type: ct.value } }))}
                                      className={`flex-1 flex items-center justify-center font-mono mono-extrabold-italic text-[10px] uppercase transition-all ${state.filters.type === ct.value ? 'bg-cyan-500/20 text-cyan-400' : 'text-[#8195b1]'
                                        }`}
                                    >
                                      {ct.label}
                                    </button>
                                  ))}
                                </div>
                              )
                            },
                            { label: 'Genre_Axis', value: state.filters.genre, setter: (v: string) => setState(s => ({ ...s, filters: { ...s.filters, genre: v } })), options: GENRES, placeholder: 'ALL_CHANNELS' },
                            { label: 'Affective_State', value: state.filters.mood, setter: (v: string) => setState(s => ({ ...s, filters: { ...s.filters, mood: v } })), options: MOODS, placeholder: 'UNCALIBRATED' }
                          ].map((f, i) => (
                            <div key={i} className={`space-y-3 ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationDelay: `${200 + i * 100}ms`, animationFillMode: 'both' }}>
                              <label className="font-mono text-[10px] uppercase text-[#8195b1] font-bold italic mono-bold-italic tracking-widest flex items-center gap-2">
                                {f.label}
                              </label>
                              {f.component || (
                                <div className="relative group">
                                  <select
                                    value={f.value}
                                    onChange={(e) => f.setter!(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 p-4 h-[52px] font-mono italic text-xs uppercase text-white outline-none group-hover:border-cyan-500/30 focus:border-cyan-500/50 appearance-none tech-chipped"
                                  >
                                    <option value="">{f.placeholder}</option>
                                    {f.options?.map((opt: string) => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-500/50">
                                    <i className="fa-solid fa-chevron-down text-[10px]"></i>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-row items-center gap-4">
                          <div className="flex-1 h-[1px] bg-cyan-500/10"></div>
                          <div className="flex gap-2">
                          </div>
                          <div className="flex-1 h-[1px] bg-cyan-500/10"></div>
                        </div>

                        <button
                          onClick={() => fetchRecommendations()}
                          disabled={state.isRecsLoading}
                          className={`group w-full relative p-[1px] overflow-hidden transition-all duration-300 rounded-sm tech-chipped ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`}
                          style={{ animationDelay: '600ms', animationFillMode: 'both' }}
                        >
                          {/* Spinning Border Beam */}
                          <span className={`absolute inset-[-200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#00f5ff_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${state.isRecsLoading ? 'opacity-100' : ''}`}></span>

                          {/* Inner Surface & Content */}
                          <div className={`relative z-10 w-full py-5 bg-slate-900 font-mono mono-extrabold-italic text-sm uppercase tracking-[0.6em] flex items-center justify-center gap-4 transition-colors duration-300 group-hover:text-cyan-400 ${state.isRecsLoading ? 'text-cyan-400' : 'text-cyan-400/60'}`}>
                            {state.isRecsLoading ? (
                              <><i className="fa-solid fa-microchip animate-spin text-lg"></i>SYNTHESIZING...</>
                            ) : (
                              <><i className="fa-solid fa-bolt text-xs"></i>INITIATE<i className="fa-solid fa-bolt text-xs"></i></>
                            )}
                          </div>
                        </button>

                        {state.isRecsLoading && <NeuralLoader variant="compact" progress={state.progress} />}
                      </section>
                    </div>
                  </div>
                </div>

                {!state.isRecsLoading && state.recommendations.length > 0 && (
                  <section className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-10 md:px-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
                      <div className="space-y-1">
                        <div className="mono text-[10px] uppercase font-black tracking-widest flex items-center gap-2 mono-extrabold-italic">
                          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(0,245,255,0.5)]"></span>
                          <span className="text-cyan-500">Output_Matrix</span>
                        </div>
                        <h3 className="section-title-tourney">Verified Matches</h3>
                      </div>
                      <div className="flex gap-2 opacity-30">
                        <div className="w-32 h-1 bg-cyan-500"></div>
                        <div className="w-8 h-1 bg-cyan-500"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 items-stretch">
                      {state.recommendations.map((movie, idx) => (
                        <MovieCard key={movie.id} movie={movie} index={idx} isRecommendation onLikeSimilar={(seed) => fetchRecommendations(seed)} onMarkWatched={(m) => markAsWatched(m)} onFeedback={(m, f) => handleFeedback(m, f)} onAddToWatchlist={(m) => addToWatchlist(m)} />
                      ))}
                    </div>

                    <div className="flex justify-center pt-8">
                      <button
                        onClick={() => fetchRecommendations(undefined, true)}
                        disabled={state.isMoreLoading}
                        className="group relative px-10 py-4 bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/60 transition-all tech-chipped overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <div className="relative flex items-center gap-3 btn-show-more-label transition-colors">
                          {state.isMoreLoading ? (
                            <><i className="fa-solid fa-sync animate-spin"></i> EXPANDING_MATRIX...</>
                          ) : (
                            <><i className="fa-solid fa-plus"></i> SHOW_MORE_RESULTS</>
                          )}
                        </div>
                      </button>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;