
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ContentType, Movie, AppState, Feedback } from './types';
import { GENRES, MOODS, CONTENT_TYPES, MAJOR_PLATFORMS } from './constants';
import { getRecommendations, searchMovieForHistory } from './services/geminiService';
import { MovieCard } from './components/MovieCard';
import { NeuralLoader } from './components/NeuralLoader';
import { PromoHero } from './components/PromoHero';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    userMovies: [],
    feedbackHistory: [],
    recommendations: [],
    isLoading: true,
    filters: INITIAL_FILTERS,
    sources: [],
    guestSearchUsed: !!localStorage.getItem('neural_guest_search')
  });

  const [quickSearch, setQuickSearch] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const skipSync = useRef(false);

  useEffect(() => {
    const initApp = async () => {
      if (!supabase) {
        setState((s) => ({ ...s, isLoading: false }));
        setSyncStatus('OFFLINE');
        return;
      }

      supabase.auth.getSession().then(({ data: { session } }: any) => {
        setUser(session?.user ?? null);
        if (!session) {
          setState((s) => ({ ...s, isLoading: false }));
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        setUser(session?.user ?? null);
        if (session) {
           setShowAuthModal(false);
        }
      });

      return () => subscription.unsubscribe();
    };

    initApp();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !supabase) return;

      setState((s) => ({ ...s, isLoading: true }));
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('state, is_approved')
          .eq('id', user.id)
          .single();

        if (data) {
          setIsApproved(data.is_approved === true);
          if (data.state) {
            skipSync.current = true;
            setState({
              ...data.state,
              filters: { ...INITIAL_FILTERS, ...(data.state.filters || {}) },
              isLoggedIn: true,
              isLoading: false,
              guestSearchUsed: true
            });
          } else {
            setState((s) => ({ ...s, isLoggedIn: true, isLoading: false, guestSearchUsed: true }));
          }
        } else {
          setIsApproved(false);
          setState((s) => ({ ...s, isLoggedIn: true, isLoading: false }));
        }
      } catch (err) {
        console.error("Hydration Error:", err);
        setIsApproved(false);
        setState((s) => ({ ...s, isLoggedIn: true, isLoading: false }));
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user || !supabase || state.isLoading || isApproved === false) return;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }

    const syncToCloud = async () => {
      setSyncStatus('SYNCING');
      const { isLoading, ...persistableState } = state;
      
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          state: persistableState,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Cloud Sync Error:', error);
        setSyncStatus('ERROR');
      } else {
        setSyncStatus('IDLE');
      }
    };

    const debounceTimer = setTimeout(syncToCloud, 2000);
    return () => clearTimeout(debounceTimer);
  }, [state, user, isApproved]);

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

  const openAuth = (signUp: boolean = false) => {
    setIsSignUp(signUp);
    setShowAuthModal(true);
  };

  const gateInteraction = (callback: () => void) => {
    if (user) {
      callback();
    } else {
      openAuth();
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    
    gateInteraction(async () => {
      setIsQuickAdding(true);
      const result = await searchMovieForHistory(quickSearch);
      if (result) {
        setState((prev) => ({
          ...prev,
          userMovies: [result, ...prev.userMovies.filter((m) => m.title.toLowerCase() !== result.title.toLowerCase())]
        }));
        setQuickSearch('');
      } else {
        alert("TITLE NOT FOUND IN DATABASE.");
      }
      setIsQuickAdding(false);
    });
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
        const updatedRecs = prev.recommendations.map((r) => 
          r.id === movie.id ? { ...r, feedback } : r
        );
        return {
          ...prev,
          recommendations: updatedRecs,
          feedbackHistory: [{ title: movie.title, feedback }, ...prev.feedbackHistory].slice(0, 200)
        };
      });
    });
  };

  const fetchRecommendations = useCallback(async (seed?: Movie) => {
    if (!user) {
      if (state.guestSearchUsed) {
        openAuth();
        return;
      }
    }

    setState((prev) => ({ ...prev, isLoading: true }));
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

      if (!user) {
        localStorage.setItem('neural_guest_search', 'true');
      }

      setState((prev) => ({ 
        ...prev, 
        recommendations: movies, 
        sources: newSources,
        isLoading: false,
        guestSearchUsed: !user ? true : prev.guestSearchUsed
      }));
    } catch (error) {
      alert("ENGINE_FAILURE: API HANDSHAKE TIMEOUT.");
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.userMovies, state.feedbackHistory, state.filters, state.guestSearchUsed, user]);

  const parseImdbCsv = (csvText: string): Movie[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',');
    const getIndex = (name: string) => headers.findIndex((h) => h.trim().replace(/^"|"$/g, '') === name);
    
    const idxRating = getIndex('Your Rating');
    const idxTitle = getIndex('Title');
    const idxYear = getIndex('Year');
    const idxType = getIndex('Title Type');
    const idxGenres = getIndex('Genres');
    const idxConst = getIndex('Const');

    const movies: Movie[] = [];
    const parseRow = (row: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += char; }
      }
      result.push(current.trim());
      return result;
    };

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseRow(lines[i]);
      const userRating = parseInt(cols[idxRating]);
      const title = cols[idxTitle]?.replace(/^"|"$/g, '');
      const imdbId = cols[idxConst];
      
      if (title && userRating >= 7) {
        movies.push({
          id: imdbId || Math.random().toString(36).substr(2, 9),
          title,
          year: cols[idxYear] || 'N/A',
          userRating,
          rating: userRating,
          type: cols[idxType]?.toLowerCase().includes('tv') ? ContentType.SERIES : ContentType.MOVIE,
          genres: cols[idxGenres]?.replace(/^"|"$/g, '').split(',').map((g) => g.trim()) || [],
          posterUrl: `[SIGNAL_LOST]` 
        });
      }
    }
    return movies;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    gateInteraction(() => {
        setState((prev) => ({ ...prev, isLoading: true }));
        const reader = new FileReader();
        reader.onload = (event) => {
        const text = event.target?.result as string;
        const movies = parseImdbCsv(text);
        if (movies.length > 0) {
            setState((prev) => ({ ...prev, isLoggedIn: true, userMovies: movies, isLoading: false }));
        } else {
            alert("CRITICAL: NO VALID (7+) RATINGS DETECTED IN CSV STREAM.");
            setState((prev) => ({ ...prev, isLoading: false }));
        }
        };
        reader.readAsText(file);
    });
  };

  if (!supabase) return (<div className="min-h-screen flex items-center justify-center p-6 bg-slate-950"><div className="text-white">CONFIG MISSING</div></div>);

  if (state.isLoading) {
     return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><NeuralLoader /></div>;
  }
  
  if (user && isApproved === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-lg w-full tech-border bg-slate-900/40 p-10 overflow-hidden shadow-2xl relative text-center">
          <div className="scanline opacity-30"></div>
          <div className="space-y-10 relative z-20">
            <div className="relative inline-block">
              <div className="w-24 h-24 border-2 border-amber-500/30 rounded-full flex items-center justify-center mx-auto bg-amber-500/5">
                 <i className="fa-solid fa-fingerprint text-4xl text-amber-500 animate-pulse"></i>
              </div>
              <div className="absolute inset-0 border border-amber-500/20 rounded-full animate-ping"></div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">Identity_<span className="text-amber-500">Under_Review</span></h1>
              <div className="flex items-center justify-center gap-2 mono text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                 <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                 Awaiting Manual Admin Clearance
              </div>
            </div>
            <div className="text-white text-center">ACCOUNT UNDER REVIEW</div>
            <button onClick={() => supabase.auth.signOut()} className="mt-4 text-red-500">[ LOGOUT ]</button>
          </div>
        </div>
      </div>
    );
  }

  const showUploadScreen = user && state.userMovies.length === 0 && !state.isLoading;

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="max-w-md w-full tech-border bg-slate-900 p-8 shadow-2xl relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white px-2">X</button>
            <div className="text-center space-y-4 mb-6">
              <i className="fa-solid fa-lock text-3xl text-cyan-500"></i>
              <h2 className="text-xl font-black text-white uppercase italic">Authentication_Required</h2>
              <p className="mono text-xs text-slate-400">
                {state.guestSearchUsed ? "GUEST_TRIALS_EXHAUSTED." : "INTERACTION_GATED."} ESTABLISH NEURAL LINK TO CONTINUE.
              </p>
            </div>
            
            {verificationSent ? (
               <div className="text-center py-4 bg-green-500/10 border border-green-500/30">
                  <p className="text-green-400 mono text-xs font-bold">VERIFICATION LINK SENT TO {authEmail}</p>
                  <button onClick={() => setVerificationSent(false)} className="mt-2 text-[10px] underline text-slate-400">Back</button>
               </div>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 mono text-sm text-white outline-none focus:border-cyan-500/50 uppercase" placeholder="EMAIL_ADDRESS..." />
                <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 mono text-sm text-white outline-none focus:border-cyan-500/50 uppercase" placeholder="ACCESS_KEY..." />
                <button type="submit" disabled={authLoading} className="w-full py-3 bg-cyan-500 text-black mono font-black text-sm uppercase tracking-widest hover:bg-white transition-colors">
                  {authLoading ? 'CONNECTING...' : (isSignUp ? 'INIT_REGISTRATION' : 'LOGIN')}
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="mono text-[10px] text-slate-500 hover:text-cyan-400 uppercase">
                    {isSignUp ? 'HAS_EXISTING_ID?' : 'CREATE_NEW_NEURAL_ID'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="max-w-2xl w-full tech-border bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
              <div className="scanline opacity-5"></div>
              <button onClick={() => setShowStatsModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white px-2 z-30">X</button>
              
              <div className="flex flex-col gap-8 relative z-20">
                 <div className="space-y-1">
                    <div className="mono text-[10px] text-cyan-500 uppercase tracking-[0.4em] font-black">Neural_DNA_Profile</div>
                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Diagnostic_Report</h2>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-black/40 border border-white/5 space-y-1">
                       <div className="mono text-[9px] text-slate-500 uppercase">Historical_Nodes</div>
                       <div className="text-2xl font-black text-cyan-400">{state.userMovies.length}</div>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 space-y-1">
                       <div className="mono text-[9px] text-slate-500 uppercase">Refinement_Signals</div>
                       <div className="text-2xl font-black text-cyan-400">{state.feedbackHistory.length}</div>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 space-y-1">
                       <div className="mono text-[9px] text-slate-500 uppercase">Profile_Sync</div>
                       <div className="text-xs font-black text-green-400 uppercase">100%_ACTIVE</div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="mono text-[10px] text-slate-400 border-b border-white/10 pb-2 uppercase tracking-widest font-bold">Genre_Channel_Distribution</div>
                    <div className="flex flex-wrap gap-2">
                       {Array.from(new Set(state.userMovies.flatMap(m => m.genres))).slice(0, 15).map(genre => (
                          <div key={genre} className="px-3 py-1 bg-white/5 border border-white/5 mono text-[9px] text-slate-300 uppercase">
                             {genre} // {state.userMovies.filter(m => m.genres.includes(genre)).length}
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="mono text-[10px] text-slate-400 border-b border-white/10 pb-2 uppercase tracking-widest font-bold">Recent_Neural_Feedback</div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                       {state.feedbackHistory.slice(0, 10).map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px] mono border-b border-white/5 pb-1">
                             <span className="text-slate-400 truncate uppercase">{f.title}</span>
                             <span className={f.feedback.type === 'like' ? 'text-cyan-500' : 'text-red-500'}>{f.feedback.type.toUpperCase()}</span>
                          </div>
                       ))}
                       {state.feedbackHistory.length === 0 && <div className="text-[10px] mono text-slate-600">NO_FEEDBACK_SIGNALS_DETECTED.</div>}
                    </div>
                 </div>

                 <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="mono text-[8px] text-slate-700 uppercase">Matrix_ID:: {user?.id?.slice(0, 12)}...</div>
                    <button onClick={() => setShowStatsModal(false)} className="mono text-xs bg-cyan-500 text-black px-6 py-2 font-black uppercase tracking-widest">[ DISMISS ]</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Sliding Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-[60] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
          <div className={`absolute top-0 right-0 w-80 h-full bg-slate-950 border-l border-white/5 shadow-2xl transition-transform duration-300 ease-out transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} overflow-hidden`}>
             <div className="scanline opacity-10"></div>
             <div className="p-6 flex flex-col h-full space-y-12">
                <div className="flex items-center justify-between">
                   <span className="mono text-[10px] text-cyan-500 uppercase tracking-widest font-black">Neural_Control_Panel</span>
                   <button onClick={() => setIsMenuOpen(false)} className="text-white hover:text-cyan-400 transition-colors">
                      <i className="fa-solid fa-xmark text-xl"></i>
                   </button>
                </div>

                <div className="flex flex-col gap-8 flex-1">
                    {user ? (
                      <>
                        <div className="space-y-4">
                           <div className="mono text-[8px] text-slate-600 uppercase tracking-widest font-bold">Identity_Profile</div>
                           <div className="p-4 bg-white/5 border border-white/5 space-y-1">
                              <div className="mono text-[10px] text-slate-400 truncate uppercase">{user.email}</div>
                              <div className="mono text-[8px] text-slate-600 uppercase">Authenticated_Uplink</div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="mono text-[8px] text-slate-600 uppercase tracking-widest font-bold">Neural_Statistics</div>
                           <button 
                             onClick={() => { setShowStatsModal(true); setIsMenuOpen(false); }}
                             className="w-full p-4 bg-cyan-500/5 border border-cyan-500/20 text-left space-y-1 group"
                           >
                              <div className="flex items-center justify-between">
                                 <div className="text-xl font-black text-cyan-400">{state.userMovies.length}</div>
                                 <i className="fa-solid fa-chevron-right text-[10px] text-cyan-500/50 group-hover:translate-x-1 transition-transform"></i>
                              </div>
                              <div className="mono text-[8px] text-slate-500 uppercase tracking-widest">Historical_Data_Nodes</div>
                           </button>
                        </div>

                        <div className="space-y-4">
                           <div className="mono text-[8px] text-slate-600 uppercase tracking-widest font-bold">Quick_Action</div>
                           <form onSubmit={handleQuickAdd} className="flex flex-col gap-2">
                              <input 
                                type="text" 
                                placeholder="QUICK_ADD_TITLE..." 
                                className="w-full bg-black/40 border border-white/10 p-3 mono text-[10px] text-white outline-none focus:border-cyan-500/50 uppercase rounded-sm" 
                                value={quickSearch} 
                                onChange={(e) => setQuickSearch(e.target.value)} 
                                disabled={isQuickAdding} 
                              />
                              <button type="submit" disabled={isQuickAdding} className="w-full py-2 bg-white/5 hover:bg-cyan-500 hover:text-black mono text-[10px] font-bold uppercase transition-all border border-white/5">
                                 {isQuickAdding ? 'SYNCING...' : '[ INITIALIZE_ENTRY ]'}
                              </button>
                           </form>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-6">
                        <div className="mono text-xs text-slate-500 text-center uppercase leading-relaxed">
                          Establishing connection required for neural synthesis.
                        </div>
                        <button onClick={() => { setShowAuthModal(true); setIsMenuOpen(false); }} className="w-full py-4 bg-cyan-500 text-black mono font-black text-xs uppercase tracking-widest hover:bg-white transition-colors">
                          [ LOGIN / SIGNUP ]
                        </button>
                      </div>
                    )}
                </div>

                <div className="pt-8 border-t border-white/5">
                   {user && (
                      <button onClick={() => supabase.auth.signOut()} className="w-full py-3 border border-red-500/20 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-all mono text-[10px] uppercase font-black tracking-widest">
                         [ EXIT_PROTOCOL ]
                      </button>
                   )}
                   <div className="mt-4 flex justify-between items-center mono text-[8px] text-slate-800 uppercase">
                      <span>Neural_Stream_v1.0</span>
                      <span>Ready_Signal</span>
                   </div>
                </div>
             </div>
          </div>
      </div>

      {/* Conditionally hide header on unauthorized landing page */}
      {user && (
        <header className={`sticky top-0 z-50 backdrop-blur-2xl border-b px-4 md:px-8 flex items-center justify-between h-14 md:h-20 transition-colors bg-slate-950/95 border-white/5`}>
            <div className="flex items-center gap-2 md:gap-10">
            <div className="flex items-center gap-2 shrink-0">
                <div className={`w-5 h-5 md:w-8 md:h-8 flex items-center justify-center bg-cyan-500`}>
                <i className={`fa-solid fa-dna text-[8px] md:text-sm text-black`}></i>
                </div>
                <span className="text-sm md:text-2xl font-black tracking-tighter uppercase italic whitespace-nowrap leading-tight">
                Neural<span className="text-cyan-400">Stream</span>
                </span>
            </div>
            
            {user && (
                <div className="hidden lg:flex items-center h-full">
                    <form onSubmit={handleQuickAdd} className="flex items-center gap-2 border border-white/10 bg-black/40 px-2 md:px-4 h-8 md:h-11 rounded-sm">
                    <i className="fa-solid fa-search text-[10px] text-slate-600"></i>
                    <input type="text" placeholder="QUICK_ADD..." className="bg-transparent mono text-[10px] md:text-xs outline-none w-24 md:w-48 lg:w-64 text-white placeholder-slate-700 uppercase" value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} disabled={isQuickAdding} />
                    <button type="submit" className="bg-white/5 hover:bg-cyan-500 hover:text-black px-2 md:px-4 h-6 md:h-8 mono text-[9px] md:text-xs uppercase font-bold transition-all ml-1 md:ml-2">{isQuickAdding ? '...' : '[ ADD ]'}</button>
                    </form>
                </div>
            )}
            </div>
            
            <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-6">
                {user ? (
                <>
                    <div className="flex items-center gap-6 h-10">
                        <button 
                        onClick={() => setShowStatsModal(true)}
                        className="flex flex-col items-end leading-tight group/stats text-right hover:opacity-80 transition-opacity"
                        >
                        <div className="mono text-[8px] text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-0.5">
                            <span className={`w-1.5 h-1.5 ${syncStatus === 'SYNCING' ? 'bg-cyan-500 animate-ping' : 'bg-green-500'} rounded-full`}></span>
                            CLOUD_SYNC :: ENCRYPTED
                        </div>
                        <div className="mono text-[10px] text-cyan-400 font-bold uppercase tracking-tight">
                            {state.userMovies.length} DATA_POINTS // {state.feedbackHistory.length} FEEDBACKS
                        </div>
                        </button>
                    </div>
                    <button onClick={() => supabase.auth.signOut()} className="mono text-[9px] md:text-xs text-red-400/50 hover:text-red-400 hover:bg-red-400/10 px-2 md:px-6 h-8 md:h-11 border border-red-500/20 transition-all uppercase font-bold flex items-center justify-center tracking-widest">[ EXIT ]</button>
                </>
                ) : (
                <button onClick={() => openAuth()} className="mono text-xs bg-cyan-500 text-black px-4 py-2 font-black uppercase hover:bg-white transition-colors">
                    [ LOGIN / SIGNUP ]
                </button>
                )}
            </div>

            <button 
                onClick={() => setIsMenuOpen(true)}
                className="lg:hidden flex items-center justify-center w-10 h-10 text-cyan-500 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all rounded-sm"
            >
                <i className="fa-solid fa-bars-staggered text-lg"></i>
            </button>
            </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-10 space-y-6 md:space-y-16">
        
        {/* Promo Hero for Guests */}
        {!user && state.recommendations.length === 0 && (
          <PromoHero onLogin={() => openAuth(false)} onSignUp={() => openAuth(true)} />
        )}

        {showUploadScreen ? (
             <div className="max-w-xl mx-auto tech-border bg-slate-900/40 p-12 text-center space-y-10 relative mt-10">
                <div className="scanline opacity-10"></div>
                <div className="space-y-4">
                   <div className="mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">Neural_Profile_Empty</div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">Calibrate Your <span className="text-cyan-400">Matrix</span></h2>
                </div>
                <label className="group relative w-full flex flex-col items-center justify-center gap-6 py-16 px-8 border border-cyan-500/20 hover:border-cyan-500/60 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer transition-all duration-500">
                  <i className="fa-solid fa-cloud-arrow-up text-5xl text-cyan-400 group-hover:scale-110 transition-transform"></i>
                  <div className="space-y-1">
                    <span className="mono text-sm text-cyan-400 font-black uppercase tracking-[0.3em]">[ UPLOAD IMDB CSV ]</span>
                    <p className="mono text-[10px] text-slate-600 uppercase">Cloud Sync will activate post-import</p>
                  </div>
                  <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
                </label>
                <div className="space-y-2">
                    <p className="mono text-[10px] text-slate-500">OR START MANUAL ENTRY</p>
                    <button onClick={() => setState((s) => ({ ...s, userMovies: [{ id: 'init', title: 'Start Adding...', year: '2024', rating: 10, type: ContentType.MOVIE, genres: [] }] }))} className="mono text-xs text-white border-b border-cyan-500/50 hover:text-cyan-400 pb-1">
                        INITIALIZE EMPTY PROFILE
                    </button>
                </div>
             </div>
        ) : (
            <>
            <section className={`tech-border p-3 md:p-8 backdrop-blur-md relative overflow-hidden bg-slate-900/10`}>
            <div className="scanline opacity-10"></div>
            <div className="space-y-4 md:space-y-10">
                <div className="space-y-2 md:space-y-6">
                <div className="flex items-center justify-between">
                    <div className="mono text-[8px] md:text-[10px] text-cyan-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                    <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                    TUNING_PARAMETERS
                    </div>
                    {!user && !state.guestSearchUsed && <div className="mono text-[9px] text-green-400 animate-pulse">GUEST_MODE::1_SEARCH_REMAINING</div>}
                </div>
                <div className="relative group flex items-start">
                    <div className="absolute left-4 md:left-6 top-4 md:top-5 mono text-cyan-500/60 font-black text-xs md:text-sm select-none">CMD_&gt;</div>
                    <textarea 
                    rows={2}
                    value={state.filters.query}
                    onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, query: e.target.value } }))}
                    disabled={(!user && state.guestSearchUsed)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        fetchRecommendations();
                        }
                    }}
                    placeholder={!user && state.guestSearchUsed ? "GUEST LIMIT REACHED. PLEASE LOGIN." : "SPECIFY_NEURAL_OVERRIDE..."}
                    className="w-full bg-black/40 border border-white/10 group-hover:border-cyan-500/40 focus:border-cyan-500/60 p-4 md:p-5 pl-12 md:pl-20 mono text-[11px] md:text-sm text-white outline-none transition-all uppercase placeholder-slate-800 rounded-sm resize-none min-h-[80px] md:min-h-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                </div>
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 pt-0 md:pt-4`}>
                <div className="space-y-1 md:space-y-3">
                    <label className="mono text-[8px] md:text-[10px] uppercase text-slate-600 tracking-widest font-bold">Modality</label>
                    <div className="flex flex-row flex-wrap gap-1">
                        {CONTENT_TYPES.map((ct) => (
                        <button key={ct.value} onClick={() => setState((s) => ({ ...s, filters: { ...s.filters, type: ct.value } }))} className={`py-1 md:py-2 px-2 md:px-3 mono text-[9px] md:text-xs font-bold uppercase text-left transition-all border-l-2 ${state.filters.type === ct.value ? 'border-cyan-500 bg-cyan-500/5 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'} whitespace-nowrap`}>
                            {ct.label}
                        </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1 md:space-y-3">
                    <label className="mono text-[8px] md:text-[10px] uppercase text-slate-600 tracking-widest font-bold">Genre_Axis</label>
                    <select value={state.filters.genre} onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, genre: e.target.value } }))} className="w-full bg-black/40 border border-white/10 p-2 md:p-4 mono text-[10px] md:text-xs uppercase text-white outline-none focus:border-cyan-500/50 appearance-none rounded-none">
                        <option value="">ALL_CHANNELS</option>
                        {GENRES.map((g) => <option key={g} value={g}>{g.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="space-y-1 md:space-y-3">
                    <label className="mono text-[8px] md:text-[10px] uppercase text-slate-600 tracking-widest font-bold">Affective_State</label>
                    <select value={state.filters.mood} onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, mood: e.target.value } }))} className="w-full bg-black/40 border border-white/10 p-2 md:p-4 mono text-[10px] md:text-xs uppercase text-white outline-none focus:border-cyan-500/50 appearance-none rounded-none">
                        <option value="">UNCALIBRATED</option>
                        {MOODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="space-y-1 md:space-y-3">
                    <label className="mono text-[8px] md:text-[10px] uppercase text-slate-600 tracking-widest font-bold">Availability_Matrix</label>
                    <select 
                        value={state.filters.providers?.[0] || ''} 
                        onChange={(e) => setState((s) => ({ ...s, filters: { ...s.filters, providers: e.target.value ? [e.target.value] : [] } }))} 
                        className="w-full bg-black/40 border border-white/10 p-2 md:p-4 mono text-[10px] md:text-xs uppercase text-white outline-none focus:border-cyan-500/50 appearance-none rounded-none"
                    >
                        <option value="">GLOBAL_STREAM</option>
                        {MAJOR_PLATFORMS.map((p) => <option key={p.id} value={p.name}>{p.name.toUpperCase()}</option>)}
                    </select>
                </div>
                </div>
            </div>
            
            <button 
                onClick={() => fetchRecommendations()} 
                disabled={state.isLoading || (!user && state.guestSearchUsed)} 
                className={`mt-6 md:mt-12 w-full py-3 md:py-6 border border-cyan-500/30 text-cyan-400 mono font-black text-[10px] md:text-sm uppercase tracking-[0.3em] md:tracking-[0.6em] transition-all relative group overflow-hidden ${(!user && state.guestSearchUsed) ? 'opacity-50 cursor-not-allowed bg-black' : 'hover:bg-cyan-500 hover:text-black'}`}
            >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {state.isLoading ? (
                <span className="flex items-center justify-center gap-2 md:gap-4">
                    <i className="fa-solid fa-microchip animate-spin text-sm md:text-lg"></i>
                    SYNTHESIZING...
                </span>
                ) : (
                <span className="flex items-center justify-center gap-2 md:gap-4">
                    <i className="fa-solid fa-bolt text-[10px] md:text-xs"></i>
                    {(!user && state.guestSearchUsed) ? 'GUEST LIMIT REACHED // LOGIN REQUIRED' : '[ INITIATE_NEURAL_UPLINK ]'}
                    <i className="fa-solid fa-bolt text-[10px] md:text-xs"></i>
                </span>
                )}
            </button>
            </section>
            
            {state.isLoading && (
            <div className="animate-in fade-in duration-700">
                <NeuralLoader />
            </div>
            )}
            
            {!state.isLoading && state.recommendations.length > 0 && (
            <section className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4 md:pb-8">
                <div className="space-y-1 flex flex-col md:flex-row md:items-end gap-4 w-full">
                    <div>
                        <div className="mono text-[8px] md:text-[10px] text-cyan-500 uppercase tracking-widest font-bold">Output_Matrix</div>
                        <h3 className="text-base md:text-xl font-black uppercase text-white italic">
                            VERIFIED_MATCHES
                        </h3>
                    </div>
                </div>
                {!user && (
                    <div className="mono text-[9px] bg-cyan-900/40 border border-cyan-500/30 text-cyan-200 px-3 py-2 animate-pulse">
                        <i className="fa-solid fa-circle-info mr-2"></i>
                        LOGIN TO SAVE & INTERACT
                    </div>
                )}
                <div className="flex flex-wrap gap-1 md:gap-2">
                    {state.sources.length > 0 && state.sources.slice(0, 3).map((s, i) => (
                    <a key={i} href={s.web?.uri || '#'} target="_blank" className="mono text-[8px] md:text-[10px] px-2 md:px-3 py-1 md:py-1.5 bg-cyan-500/5 text-cyan-500/60 border border-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all uppercase">
                        DATA_{i+1}
                    </a>
                    ))}
                </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 items-stretch">
                {state.recommendations.map((movie) => (
                    <MovieCard 
                        key={movie.id} 
                        movie={movie} 
                        isRecommendation 
                        onLikeSimilar={(seed) => gateInteraction(() => fetchRecommendations(seed))} 
                        onMarkWatched={(m) => markAsWatched(m)} 
                        onFeedback={(m, f) => handleFeedback(m, f)} 
                    />
                ))}
                </div>
            </section>
            )}
            </>
        )}
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 245, 255, 0.2); }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
