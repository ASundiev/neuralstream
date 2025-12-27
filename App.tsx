
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ContentType, Movie, AppState, Feedback, SearchHistoryItem } from './types';
import { GENRES, MOODS, CONTENT_TYPES, MAJOR_PLATFORMS } from './constants';
import { getRecommendations } from './services/geminiService';
import { MovieCard } from './components/MovieCard';
import { NeuralLoader } from './components/NeuralLoader';
import { PromoHero } from './components/PromoHero';
import { NeuralBackground } from './components/NeuralBackground';

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
  query: '',
  providers: []
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE'>('IDLE');
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState<'SIGNALS' | 'SEARCHES'>('SIGNALS');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tuningVisible, setTuningVisible] = useState(false);

  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    userMovies: [],
    feedbackHistory: [],
    searchHistory: [],
    recommendations: [],
    isLoading: true,
    isRecsLoading: false,
    filters: INITIAL_FILTERS,
    sources: [],
    guestSearchUsed: !!localStorage.getItem('neural_guest_search')
  });

  const skipSync = useRef(false);
  const tuningRef = useRef<HTMLElement>(null);

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

  const handleLogout = async () => {
    if (window.confirm("TERMINATE_NEURAL_UPLINK? ANY UNSYNCED LOCAL CACHE WILL BE FLUSHED.")) {
      await supabase.auth.signOut();
      setIsMenuOpen(false);
      setShowStatsModal(false);
    }
  };

  const fetchProfile = useCallback(async () => {
    if (!user || !supabase) {
      if (!user) setState(s => ({ ...s, isLoading: false }));
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
            isLoggedIn: true,
            isLoading: false,
            isRecsLoading: false,
            guestSearchUsed: true
          });
        } else {
          setState((s) => ({ ...s, isLoggedIn: true, isLoading: false, isRecsLoading: false, guestSearchUsed: true }));
        }
      } else {
        setState((s) => ({ ...s, isLoggedIn: true, isLoading: false }));
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
          setState((s) => ({ ...s, isLoading: false }));
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

  const openAuth = (signUp: boolean = false) => {
    setIsSignUp(signUp);
    setShowAuthModal(true);
  };

  const gateInteraction = (callback: () => void) => {
    if (user) callback();
    else openAuth();
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

  const fetchRecommendations = useCallback(async (seed?: Movie) => {
    if (!user && state.guestSearchUsed) {
      openAuth();
      return;
    }
    setState((prev) => ({ ...prev, isRecsLoading: true }));
    try {
      const { movies, sources: newSources } = await getRecommendations({
        watchedHistory: state.userMovies,
        feedbackHistory: state.feedbackHistory,
        targetType: state.filters.type,
        genre: state.filters.genre,
        mood: state.filters.mood,
        seedMovie: seed,
        naturalLanguageQuery: state.filters.query,
        preferredProviders: state.filters.providers,
        isGuest: !user
      });
      if (!user) localStorage.setItem('neural_guest_search', 'true');
      setState((prev) => ({ 
        ...prev, 
        recommendations: movies, 
        sources: newSources,
        guestSearchUsed: !user ? true : prev.guestSearchUsed,
        searchHistory: [
          {
            id: Math.random().toString(36).substr(2, 9),
            query: prev.filters.query || "NEURAL_SWEEP",
            timestamp: new Date().toISOString(),
            recommendations: movies,
            filters: { ...prev.filters }
          },
          ...(prev.searchHistory || [])
        ].slice(0, 50)
      }));
    } catch (error) {
      alert("ENGINE_FAILURE: SYNTHESIS INTERRUPTED.");
    } finally {
      setState((prev) => ({ ...prev, isRecsLoading: false }));
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

  const removeSignal = (index: number) => {
    setState((prev) => {
      const newHistory = [...prev.feedbackHistory];
      newHistory.splice(index, 1);
      return { ...prev, feedbackHistory: newHistory };
    });
  };

  const purgeSearch = (id: string) => {
    setState((prev) => ({
      ...prev,
      searchHistory: (prev.searchHistory || []).filter(h => h.id !== id)
    }));
  };

  const clearVault = () => {
    if (window.confirm("PURGE_ENTIRE_SEARCH_VAULT?")) {
        setState((prev) => ({ ...prev, searchHistory: [] }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    gateInteraction(() => {
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
        setState((prev) => ({ ...prev, userMovies: movies, isLoggedIn: true, isLoading: false }));
      };
      reader.readAsText(file);
    });
  };

  if (!supabase) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">SUPABASE_CONFIG_MISSING</div>;
  if (state.isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><NeuralLoader /></div>;

  return (
    <div className="min-h-screen pb-20 relative bg-slate-950">
      {!user && <NeuralBackground />}
      
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full tech-border bg-slate-900 p-8 shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white px-2">X</button>
            <div className="text-center space-y-4 mb-6">
              <i className="fa-solid fa-lock text-3xl text-cyan-500"></i>
              <h2 className="text-xl font-black text-white uppercase italic">Authentication</h2>
              <p className="mono text-[10px] text-slate-400 uppercase tracking-widest">{state.guestSearchUsed ? "GUEST_TRIALS_EXHAUSTED." : "PROFILE_HANDSHAKE_REQUIRED."}</p>
            </div>
            {verificationSent ? (
               <div className="text-center py-4 bg-green-500/10 border border-green-500/30">
                  <p className="text-green-400 mono text-xs font-bold uppercase">Check your email for link.</p>
                  <button onClick={() => setVerificationSent(false)} className="mt-2 text-[10px] underline text-slate-400">BACK</button>
               </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 mono text-sm text-white outline-none focus:border-cyan-500 uppercase" placeholder="EMAIL..." />
                <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 mono text-sm text-white outline-none focus:border-cyan-500 uppercase" placeholder="PASSWORD..." />
                <button 
                  type="submit" 
                  disabled={authLoading} 
                  className="w-full py-4 bg-transparent border border-cyan-500/30 text-cyan-400 mono font-black text-sm uppercase tracking-widest transition-all relative overflow-hidden group/auth-btn shadow-[0_0_20px_rgba(0,245,255,0)] hover:shadow-[0_0_40px_rgba(0,245,255,0.3)] hover:bg-cyan-500 hover:text-black"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-500"></div>
                  <span className="relative z-10">{authLoading ? 'SYNCING...' : (isSignUp ? 'REGISTER' : 'LOGIN')}</span>
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="mono text-[10px] text-slate-500 uppercase hover:text-cyan-400">
                    {isSignUp ? 'HAVE_ACCOUNT?' : 'CREATE_NEURAL_ID'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showStatsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <div className="max-w-3xl w-full tech-border bg-slate-900 p-8 shadow-2xl relative overflow-hidden h-[85vh] flex flex-col">
              <button onClick={() => setShowStatsModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white px-2 z-30">X</button>
              
              <div className="space-y-1 mb-8">
                 <div className="mono text-[10px] text-cyan-500 uppercase font-black tracking-widest">Neural_DNA_Profile</div>
                 <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Diagnostic_Report</h2>
              </div>

              <div className="overflow-y-auto pr-4 custom-scrollbar space-y-8 flex-1 min-h-0">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-black/40 border border-white/5 space-y-1">
                       <div className="mono text-[9px] text-slate-500 uppercase">Nodes</div>
                       <div className="text-2xl font-black text-cyan-400">{state.userMovies.length}</div>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 space-y-1">
                       <div className="mono text-[9px] text-slate-500 uppercase">Signals</div>
                       <div className="text-2xl font-black text-cyan-400">{state.feedbackHistory.length}</div>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 space-y-1">
                       <div className="mono text-[9px] text-slate-500 uppercase">Sync</div>
                       <div className="text-xs font-black text-green-400 uppercase">ACTIVE</div>
                    </div>
                 </div>

                 <div className="space-y-4 flex flex-col h-full min-h-0">
                    <div className="flex items-center justify-between border-b border-cyan-500/10 mb-2">
                        <div className="flex">
                            <button 
                              onClick={() => setActiveStatsTab('SIGNALS')}
                              className={`mono text-[10px] uppercase font-black tracking-widest px-6 py-2 transition-all relative ${activeStatsTab === 'SIGNALS' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Signal_Log
                                {activeStatsTab === 'SIGNALS' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>}
                            </button>
                            <button 
                              onClick={() => setActiveStatsTab('SEARCHES')}
                              className={`mono text-[10px] uppercase font-black tracking-widest px-6 py-2 transition-all relative ${activeStatsTab === 'SEARCHES' ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Search_Vault
                                {activeStatsTab === 'SEARCHES' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>}
                            </button>
                        </div>
                        {activeStatsTab === 'SEARCHES' && (state.searchHistory?.length || 0) > 0 && (
                            <button onClick={clearVault} className="mono text-[8px] text-red-500 hover:text-red-400 transition-colors mr-4 uppercase font-bold">[ PURGE_ALL ]</button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 pb-10">
                    {activeStatsTab === 'SIGNALS' ? (
                        <>
                        {state.feedbackHistory.length > 0 ? (
                        <div className="space-y-2 animate-in fade-in duration-300">
                            {state.feedbackHistory.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                    <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-sm ${item.feedback.type === 'like' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <i className={`fa-solid ${item.feedback.type === 'like' ? 'fa-thumbs-up' : 'fa-thumbs-down'} text-xs`}></i>
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase text-white truncate max-w-[200px] md:max-w-sm">{item.title}</div>
                                        {item.feedback.reason && <div className="mono text-[9px] text-slate-500 italic mt-0.5">" {item.feedback.reason} "</div>}
                                    </div>
                                    </div>
                                    <button 
                                    onClick={() => removeSignal(idx)}
                                    className="mono text-[9px] text-red-500/40 hover:text-red-500 transition-colors uppercase font-bold"
                                    >
                                    [ PURGE ]
                                    </button>
                                </div>
                            ))}
                        </div>
                        ) : (
                        <div className="py-20 text-center border border-white/5 bg-white/5">
                            <p className="mono text-[10px] text-slate-600 uppercase tracking-widest">No_Signals_Intercepted</p>
                        </div>
                        )}
                        </>
                    ) : (
                        <>
                        {(state.searchHistory && state.searchHistory.length > 0) ? (
                            <div className="space-y-2 animate-in fade-in duration-300">
                                {state.searchHistory.map((item) => (
                                    <div key={item.id} className="group relative">
                                        <button 
                                          onClick={() => restoreSearch(item)}
                                          className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 flex items-center justify-center bg-slate-800 text-slate-500 text-[10px]">
                                                    <i className={`fa-solid ${item.filters.type === ContentType.MOVIE ? 'fa-film' : item.filters.type === ContentType.SERIES ? 'fa-tv' : 'fa-clapperboard'}`}></i>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-xs font-black uppercase text-white group-hover:text-cyan-400 transition-colors truncate max-w-[200px] md:max-w-md">
                                                        {item.query}
                                                    </div>
                                                    <div className="mono text-[8px] text-slate-600 uppercase flex items-center gap-2">
                                                        <span>{new Date(item.timestamp).toLocaleDateString()} // {new Date(item.timestamp).toLocaleTimeString()}</span>
                                                        <span>• {item.recommendations.length} RESULTS</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="mono text-[9px] text-slate-700 uppercase group-hover:text-cyan-600 transition-colors font-bold">[ RESTORE ]</span>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); purgeSearch(item.id); }}
                                            className="absolute top-1/2 -right-12 -translate-y-1/2 mono text-[9px] text-red-500/40 hover:text-red-500 transition-colors uppercase font-bold opacity-0 group-hover:opacity-100 group-hover:-right-4 px-2"
                                        >
                                            [ X ]
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center border border-white/5 bg-white/5">
                                <p className="mono text-[10px] text-slate-600 uppercase tracking-widest">Vault_Is_Empty</p>
                            </div>
                        )}
                        </>
                    )}
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5 mt-auto flex flex-row gap-4 bg-slate-900 z-10 pb-2">
                 <button 
                   onClick={handleLogout}
                   className="flex-1 py-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black mono text-[11px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                 >
                    [ LOG_OUT ]
                 </button>
                 <button 
                   onClick={() => setShowStatsModal(false)} 
                   className="flex-1 py-4 bg-cyan-500 text-black mono font-black text-[11px] uppercase tracking-widest hover:bg-white transition-colors"
                 >
                    [ DISMISS ]
                 </button>
              </div>
           </div>
        </div>
      )}

      {user && (
        <header className="z-50 w-full relative">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14 md:h-20">
              <div className="flex items-center gap-2 md:gap-10">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-cyan-500 shadow-[0_0_15px_rgba(0,245,255,0.4)]">
                        <i className="fa-solid fa-dna text-[10px] md:text-sm text-black"></i>
                    </div>
                    <span className="text-lg md:text-2xl font-black tracking-tighter uppercase italic leading-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                        Neural<span className="text-cyan-400">Stream</span>
                    </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setShowStatsModal(true)} 
                      className="group relative flex items-center gap-4 bg-slate-900/40 border border-cyan-500/10 hover:border-cyan-500/40 hover:bg-slate-900/80 p-2 pr-4 transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(0,245,255,0.1)] rounded-sm"
                    >
                        <div className="w-10 h-10 flex items-center justify-center bg-cyan-500/5 border border-cyan-500/20 text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                           <i className="fa-solid fa-id-card-clip"></i>
                        </div>
                        <div className="flex flex-col items-start leading-tight text-left">
                            <div className="mono text-[8px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-black">
                                <span className={`w-1.5 h-1.5 ${syncStatus === 'SYNCING' ? 'bg-cyan-500 animate-ping' : 'bg-green-500'} rounded-full`}></span>
                                NEURAL_DNA_PROFILE
                            </div>
                            <div className="mono text-[10px] text-cyan-400 font-bold uppercase tracking-tight group-hover:text-white transition-colors">
                                NODES: <span className="text-white drop-shadow-[0_0_5px_rgba(0,245,255,0.2)]">{state.userMovies.length}</span> // SIGNALS: <span className="text-white drop-shadow-[0_0_5px_rgba(0,245,255,0.2)]">{state.feedbackHistory.length}</span>
                            </div>
                        </div>
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                           <i className="fa-solid fa-chevron-right text-[10px] text-cyan-400"></i>
                        </div>
                    </button>
                </div>
              </div>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-16 relative z-10">
        <div className="relative">
          {!user && state.recommendations.length === 0 && <PromoHero onLogin={() => openAuth(false)} onSignUp={() => openAuth(true)} />}

          {showUploadScreen ? (
              <div className="max-w-xl mx-auto tech-border bg-slate-900/40 p-12 text-center space-y-10 relative mt-10 backdrop-blur-md">
                  <div className="space-y-4">
                    <div className="mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">Neural_Profile_Empty</div>
                    <h2 className="text-3xl font-black uppercase text-white italic">Initialize Your <span className="text-cyan-400">Matrix</span></h2>
                  </div>
                  <label className="group relative w-full flex flex-col items-center justify-center gap-6 py-16 border border-cyan-500/20 hover:border-cyan-500/60 bg-cyan-500/5 cursor-pointer transition-all">
                    <i className="fa-solid fa-cloud-arrow-up text-5xl text-cyan-400"></i>
                    <span className="mono text-sm text-cyan-400 font-black uppercase tracking-widest">[ UPLOAD IMDB CSV ]</span>
                    <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                  </label>
              </div>
          ) : (
              <>
              {(user || !state.guestSearchUsed) && (
                <section 
                  ref={tuningRef}
                  className={`tech-border p-8 bg-slate-900/80 backdrop-blur-xl space-y-10 relative z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] ${(!user && state.recommendations.length === 0) ? '-mt-6 md:-mt-16 mx-2 md:mx-12' : ''}`}
                >
                  <div className={`space-y-6 ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationFillMode: 'both' }}>
                    <div className="space-y-1">
                      <div className="mono text-[10px] text-cyan-500 uppercase font-black tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                        Neural_Uplink_Console
                      </div>
                      <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Tuning Parameters</h2>
                    </div>
                    
                    <div className={`relative flex items-start group ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                        <div className="absolute left-6 top-5 mono text-cyan-500/60 font-black text-sm select-none">CMD_&gt;</div>
                        <textarea 
                          rows={2}
                          value={state.filters.query}
                          onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, query: e.target.value } }))}
                          placeholder="SPECIFY_NEURAL_OVERRIDE..."
                          className="w-full bg-black/40 border border-white/10 group-hover:border-cyan-500/40 focus:border-cyan-500/60 p-5 pl-20 mono text-sm text-white outline-none uppercase placeholder-slate-800 rounded-sm resize-none"
                        />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className={`space-y-3 ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                      <label className="mono text-[10px] uppercase text-slate-300 font-bold tracking-widest">Modality</label>
                      <div className="flex w-full p-1 bg-black/40 border border-white/10 h-[52px]">
                          {CONTENT_TYPES.map((ct) => (
                          <button 
                            key={ct.value} 
                            onClick={() => setState((s) => ({ ...s, filters: { ...s.filters, type: ct.value } }))} 
                            className={`flex-1 flex items-center justify-center mono text-[10px] font-black uppercase transition-all duration-300 relative ${
                              state.filters.type === ct.value 
                                ? 'bg-slate-800 text-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.1)] border border-cyan-500/20' 
                                : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                            }`}
                          >
                              {ct.label}
                          </button>
                          ))}
                      </div>
                    </div>
                    <div className={`space-y-3 ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                      <label className="mono text-[10px] uppercase text-slate-300 font-bold tracking-widest">Genre_Axis</label>
                      <div className="relative group">
                        <select 
                          value={state.filters.genre} 
                          onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, genre: e.target.value } }))} 
                          className="w-full bg-black/40 border border-white/10 p-4 pr-10 h-[52px] mono text-xs uppercase text-white outline-none group-hover:border-cyan-500/30 focus:border-cyan-500/50 appearance-none rounded-none transition-colors"
                        >
                            <option value="">ALL_CHANNELS</option>
                            {GENRES.map((g) => <option key={g} value={g}>{g.toUpperCase()}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity">
                          <i className="fa-solid fa-chevron-down text-[10px] text-cyan-500"></i>
                        </div>
                      </div>
                    </div>
                    <div className={`space-y-3 ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                      <label className="mono text-[10px] uppercase text-slate-300 font-bold tracking-widest">Affective_State</label>
                      <div className="relative group">
                        <select 
                          value={state.filters.mood} 
                          onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, mood: e.target.value } }))} 
                          className="w-full bg-black/40 border border-white/10 p-4 pr-10 h-[52px] mono text-xs uppercase text-white outline-none group-hover:border-cyan-500/30 focus:border-cyan-500/50 appearance-none rounded-none transition-colors"
                        >
                            <option value="">UNCALIBRATED</option>
                            {MOODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity">
                          <i className="fa-solid fa-chevron-down text-[10px] text-cyan-500"></i>
                        </div>
                      </div>
                    </div>
                    <div className={`space-y-3 ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'}`} style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
                      <label className="mono text-[10px] uppercase text-slate-300 font-bold tracking-widest">Availability_Matrix</label>
                      <div className="relative group">
                        <select 
                          value={state.filters.providers?.[0] || ''} 
                          onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, providers: e.target.value ? [e.target.value] : [] } }))} 
                          className="w-full bg-black/40 border border-white/10 p-4 pr-10 h-[52px] mono text-xs uppercase text-white outline-none group-hover:border-cyan-500/30 focus:border-cyan-500/50 appearance-none rounded-none transition-colors"
                        >
                            <option value="">GLOBAL_STREAM</option>
                            {MAJOR_PLATFORMS.map((p) => <option key={p.id} value={p.name}>{p.name.toUpperCase()}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity">
                          <i className="fa-solid fa-chevron-down text-[10px] text-cyan-500"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => fetchRecommendations()} 
                    disabled={state.isRecsLoading} 
                    className={`w-full py-6 bg-transparent border border-cyan-500/30 text-cyan-400 mono font-black text-sm uppercase tracking-[0.6em] transition-all relative overflow-hidden group/initiate-btn hover-electric ${tuningVisible ? 'animate-neural-reveal' : 'opacity-0'} ${state.isRecsLoading ? 'bg-black/50 cursor-wait' : ''}`}
                    style={{ animationDelay: '600ms', animationFillMode: 'both' }}
                  >
                    <div className="relative z-10 glitch-text">
                      {state.isRecsLoading ? (
                        <span className="flex items-center justify-center gap-4">
                          <i className="fa-solid fa-microchip animate-spin text-lg"></i>SYNTHESIZING...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-4">
                          <i className="fa-solid fa-bolt text-xs"></i>Initiate<i className="fa-solid fa-bolt text-xs"></i>
                        </span>
                      )}
                    </div>
                  </button>
                </section>
              )}
              
              {state.isRecsLoading && <div className="mt-10 animate-in fade-in duration-700"><NeuralLoader /></div>}
              
              {!state.isRecsLoading && state.recommendations.length > 0 && (
              <section className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 mt-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-8">
                    <div>
                      <div className="mono text-[10px] text-cyan-500 uppercase tracking-widest font-bold">Output_Matrix</div>
                      <h3 className="text-xl font-black uppercase text-white italic">VERIFIED_MATCHES</h3>
                    </div>
                    {!user && <div className="mono text-[9px] bg-cyan-900/40 border border-cyan-500/30 text-cyan-200 px-3 py-2 animate-pulse uppercase tracking-widest">GUEST_TRIAL_RESULTS. LOGIN TO SAVE.</div>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-stretch">
                  {state.recommendations.map((movie, idx) => (
                      <MovieCard key={movie.id} movie={movie} index={idx} isRecommendation onLikeSimilar={(seed) => fetchRecommendations(seed)} onMarkWatched={(m) => markAsWatched(m)} onFeedback={(m, f) => handleFeedback(m, f)} />
                  ))}
                  </div>
              </section>
              )}
              </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
