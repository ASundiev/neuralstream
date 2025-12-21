
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ContentType, Movie, AppState, Feedback } from './types';
import { GENRES, MOODS, CONTENT_TYPES } from './constants';
import { getRecommendations, searchMovieForHistory } from './services/geminiService';
import { MovieCard } from './components/MovieCard';
import { NeuralLoader } from './components/NeuralLoader';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vplgyzzwgbgwudbtdgfk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbGd5enp3Z2Jnd3VkYnRkZ2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzM0ODksImV4cCI6MjA4MTc0OTQ4OX0.90zVerWUdgekP_MWRiViKC80bDy46UkZau6MZ6ANrKE';

let supabase: any = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error("CRITICAL_CONFIG_ERROR: Supabase client initialization failed.", e);
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'OFFLINE'>('IDLE');

  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    userMovies: [],
    feedbackHistory: [],
    recommendations: [],
    isLoading: true,
    filters: { type: ContentType.BOTH, genre: '', mood: '', query: '' },
    sources: []
  });

  const [quickSearch, setQuickSearch] = useState('');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const skipSync = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setState(s => ({ ...s, isLoading: false }));
      setSyncStatus('OFFLINE');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      if (!session) setState(s => ({ ...s, isLoading: false }));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !supabase) return;
      setState(s => ({ ...s, isLoading: true }));
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('state')
          .eq('id', user.id)
          .single();

        if (data?.state) {
          skipSync.current = true;
          setState({
            ...data.state,
            isLoggedIn: true,
            isLoading: false
          });
        } else {
          setState(s => ({ ...s, isLoggedIn: true, isLoading: false }));
        }
      } catch (err) {
        console.error("Hydration Error:", err);
        setState(s => ({ ...s, isLoggedIn: true, isLoading: false }));
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user || !supabase || state.isLoading) return;
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
  }, [state, user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert("SYS_ERROR: BACKEND_CONNECTION_LOST");
      return;
    }
    setAuthLoading(true);
    try {
      const { error } = isSignUp 
        ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
        : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });

      if (error) throw error;
      if (isSignUp) setVerificationSent(true);
    } catch (err: any) {
      alert(`AUTH_FAILURE: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const parseImdbCsv = (csvText: string): Movie[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',');
    const getIndex = (name: string) => headers.findIndex(h => h.trim().replace(/^"|"$/g, '') === name);
    
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
          genres: cols[idxGenres]?.replace(/^"|"$/g, '').split(',').map(g => g.trim()) || [],
          posterUrl: `[SIGNAL_LOST]` 
        });
      }
    }
    return movies;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState(prev => ({ ...prev, isLoading: true }));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const movies = parseImdbCsv(text);
      if (movies.length > 0) {
        setState(prev => ({ ...prev, isLoggedIn: true, userMovies: movies, isLoading: false }));
      } else {
        alert("CRITICAL: NO VALID (7+) RATINGS DETECTED IN CSV STREAM.");
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };
    reader.readAsText(file);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    setIsQuickAdding(true);
    const result = await searchMovieForHistory(quickSearch);
    if (result) {
      setState(prev => ({
        ...prev,
        userMovies: [result, ...prev.userMovies.filter(m => m.title.toLowerCase() !== result.title.toLowerCase())]
      }));
      setQuickSearch('');
    } else {
      alert("TITLE NOT FOUND IN DATABASE.");
    }
    setIsQuickAdding(false);
  };

  const markAsWatched = (movie: Movie) => {
    setState(prev => ({
      ...prev,
      userMovies: [{ ...movie, userRating: 8 }, ...prev.userMovies],
      recommendations: prev.recommendations.filter(m => m.title.toLowerCase() !== movie.title.toLowerCase())
    }));
  };

  const handleFeedback = (movie: Movie, feedback: Feedback) => {
    setState(prev => {
      const updatedRecs = prev.recommendations.map(r => 
        r.id === movie.id ? { ...r, feedback } : r
      );
      return {
        ...prev,
        recommendations: updatedRecs,
        feedbackHistory: [...prev.feedbackHistory, { title: movie.title, feedback }]
      };
    });
  };

  const fetchRecommendations = useCallback(async (seed?: Movie) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { movies, sources: newSources } = await getRecommendations({
        watchedHistory: state.userMovies,
        feedbackHistory: state.feedbackHistory,
        targetType: state.filters.type,
        genre: state.filters.genre,
        mood: state.filters.mood,
        seedMovie: seed,
        naturalLanguageQuery: state.filters.query
      });

      const watchedTitlesNormalized = new Set(
        state.userMovies.map(m => m.title.toLowerCase().trim())
      );

      const verifiedMovies = movies.filter(m => !watchedTitlesNormalized.has(m.title.toLowerCase().trim()));

      setState(prev => ({ 
        ...prev, 
        recommendations: verifiedMovies, 
        sources: newSources,
        isLoading: false 
      }));
    } catch (error) {
      alert("ENGINE_FAILURE: API HANDSHAKE TIMEOUT.");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.userMovies, state.feedbackHistory, state.filters]);

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-md w-full tech-border bg-slate-900/40 p-10 overflow-hidden shadow-2xl relative text-center space-y-6">
          <div className="scanline opacity-30"></div>
          <div className="space-y-4">
            <i className="fa-solid fa-triangle-exclamation text-red-500 text-5xl animate-pulse"></i>
            <h1 className="text-2xl font-black text-white uppercase italic">Config_<span className="text-red-500">Missing</span></h1>
            <p className="mono text-xs text-slate-400 leading-relaxed uppercase">
              Supabase Project URL and Anon Key are required for operation. Check your environment variables.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.isLoading && !state.isLoggedIn) {
     return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><NeuralLoader /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-md w-full tech-border bg-slate-900/40 p-10 overflow-hidden shadow-2xl relative">
          <div className="scanline opacity-30"></div>
          <div className="space-y-8 relative z-20">
            {verificationSent ? (
              <div className="space-y-8 text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-3">
                  <div className="w-16 h-16 border border-cyan-500/30 rounded-full flex items-center justify-center mx-auto bg-cyan-500/5 animate-pulse">
                    <i className="fa-solid fa-envelope-open-text text-2xl text-cyan-400"></i>
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Handshake_Pending</h2>
                  <p className="mono text-[11px] text-slate-400 uppercase leading-relaxed">
                    A secure authentication link has been dispatched to:
                    <br />
                    <span className="text-cyan-400 font-bold break-all mt-2 block">{authEmail}</span>
                  </p>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 text-left space-y-3">
                  <div className="mono text-[9px] text-slate-500 uppercase font-bold border-b border-white/5 pb-2">Protocol_Verification_Steps</div>
                  <div className="space-y-2">
                    {['ACCESS YOUR INBOX', 'LOCATE ENCRYPTED HANDSHAKE LINK', 'AUTHORIZE UPLINK'].map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="mono text-[10px] text-cyan-500">0{i+1}</span>
                        <span className="mono text-[10px] text-slate-400 uppercase">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setVerificationSent(false)} className="w-full py-3 border border-white/10 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-400 mono text-xs uppercase font-black tracking-widest transition-all">
                  [ BACK_TO_AUTHORIZE ]
                </button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="mono text-xs text-cyan-500 uppercase tracking-[0.3em] font-bold">Uplink_Node_v3.1.2</div>
                  <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Neural<span className="text-cyan-400">Stream</span></h1>
                </div>
                <form onSubmit={handleAuth} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="mono text-[10px] text-slate-500 uppercase font-bold pl-1">Ident_Email</label>
                      <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 mono text-sm text-white outline-none focus:border-cyan-500/50 rounded-none uppercase" placeholder="ENTER_EMAIL..." />
                    </div>
                    <div className="space-y-1">
                      <label className="mono text-[10px] text-slate-500 uppercase font-bold pl-1">Access_Key</label>
                      <input type="password" required value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 p-3 mono text-sm text-white outline-none focus:border-cyan-500/50 rounded-none uppercase" placeholder="ENTER_PASSWORD..." />
                    </div>
                  </div>
                  <button type="submit" disabled={authLoading} className="w-full py-4 bg-cyan-500 text-black mono font-black text-sm uppercase tracking-[0.4em] hover:bg-white transition-colors">
                    {authLoading ? 'ESTABLISHING...' : (isSignUp ? '[ SIGN_UP ]' : '[ AUTHORIZE ]')}
                  </button>
                  <div className="flex justify-between mono text-[10px] text-slate-500 uppercase">
                    <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="hover:text-cyan-400">{isSignUp ? 'EXISTING_MEMBER?' : 'NEED_NEW_IDENT?'}</button>
                    <span className="opacity-30">SYS_AUTH_SECURE</span>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.userMovies.length === 0 && !state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
         <div className="max-w-xl w-full tech-border bg-slate-900/40 p-12 text-center space-y-10 relative">
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
            <button onClick={() => setState(s => ({ ...s, isLoggedIn: true, userMovies: [{ id: 'init', title: 'Example Data', year: '2024', rating: 10, type: ContentType.MOVIE, genres: ['Sci-Fi'] }] }))} className="mono text-[10px] text-slate-500 uppercase hover:text-white">[ SKIP_AND_START_CLEAN ]</button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-2xl border-b border-white/5 px-8 flex items-center justify-between h-20">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-cyan-500 flex items-center justify-center">
              <i className="fa-solid fa-dna text-black text-sm"></i>
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase italic leading-tight">Neural<span className="text-cyan-400">Stream</span></span>
          </div>
          <div className="hidden md:flex items-center h-full">
            <form onSubmit={handleQuickAdd} className="flex items-center gap-2 border border-white/10 bg-black/40 px-4 h-11 rounded-sm">
               <i className="fa-solid fa-search text-xs text-slate-600"></i>
               <input type="text" placeholder="QUICK_ADD_WATCHED..." className="bg-transparent mono text-xs outline-none w-64 text-white placeholder-slate-700 uppercase" value={quickSearch} onChange={e => setQuickSearch(e.target.value)} disabled={isQuickAdding} />
               <button type="submit" className="bg-white/5 hover:bg-cyan-500 hover:text-black px-4 h-8 mono text-xs uppercase font-bold transition-all ml-2">{isQuickAdding ? '...' : '[ ADD ]'}</button>
            </form>
          </div>
        </div>
        <div className="flex items-center gap-10">
          <div className="hidden lg:flex flex-col items-end leading-tight justify-center">
             <div className="mono text-[10px] text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <span className={`w-1.5 h-1.5 ${syncStatus === 'SYNCING' ? 'bg-cyan-500 animate-ping' : syncStatus === 'ERROR' ? 'bg-red-500' : 'bg-green-500'} rounded-full`}></span>
                {syncStatus === 'SYNCING' ? 'CLOUD_SYNCING...' : syncStatus === 'ERROR' ? 'SYNC_ERROR' : 'CLOUD_SYNC::ENCRYPTED'}
             </div>
             <div className="mono text-xs font-bold text-cyan-400 uppercase tracking-tighter">{state.userMovies.length} DATA_POINTS // {state.feedbackHistory.length} FEEDBACKS</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="mono text-xs text-red-400/50 hover:text-red-400 hover:bg-red-400/10 px-6 h-11 border border-red-500/20 transition-all uppercase font-bold flex items-center justify-center">[ DISCONNECT ]</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-16">
        <section className="tech-border p-8 bg-slate-900/10 backdrop-blur-md relative overflow-hidden">
          <div className="scanline opacity-10"></div>
          
          <div className="space-y-10">
            {/* Unified Tuning Parameters & Command Bar */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="mono text-[10px] text-cyan-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                   TUNING PARAMETERS
                </div>
              </div>
              
              <div className="relative group flex items-center">
                <div className="absolute left-6 mono text-cyan-500/60 font-black text-sm select-none">CMD_></div>
                <input 
                  type="text"
                  value={state.filters.query}
                  onChange={(e) => setState(s => ({ ...s, filters: { ...s.filters, query: e.target.value } }))}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRecommendations()}
                  placeholder="SPECIFY_NEURAL_OVERRIDE... (E.G. 'NON-STUPID CHRISTMAS MOVIE, LIKE HOLDOVERS')"
                  className="w-full bg-black/40 border border-white/10 group-hover:border-cyan-500/40 focus:border-cyan-500/60 p-5 pl-20 mono text-sm text-white outline-none transition-all uppercase placeholder-slate-800 rounded-sm"
                />
                <div className="absolute right-6 flex items-center gap-3">
                   <div className="mono text-[8px] text-slate-700 uppercase hidden sm:block tracking-widest">Syntax::FUZZY</div>
                   <div className={`w-1.5 h-1.5 rounded-full ${state.filters.query ? 'bg-cyan-500 shadow-[0_0_8px_cyan]' : 'bg-slate-800'}`}></div>
                </div>
              </div>
            </div>

            {/* Manual Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
               <div className="space-y-3">
                  <label className="mono text-[10px] uppercase text-slate-600 tracking-widest font-bold">Modality</label>
                  <div className="flex flex-col gap-1">
                    {CONTENT_TYPES.map(ct => (
                      <button key={ct.value} onClick={() => setState(s => ({ ...s, filters: { ...s.filters, type: ct.value } }))} className={`py-2 px-3 mono text-xs font-bold uppercase text-left transition-all border-l-2 ${state.filters.type === ct.value ? 'border-cyan-500 bg-cyan-500/5 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                        {ct.label}
                      </button>
                    ))}
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="mono text-[10px] uppercase text-slate-600 tracking-widest font-bold">Genre_Axis</label>
                  <select value={state.filters.genre} onChange={(e) => setState(s => ({ ...s, filters: { ...s.filters, genre: e.target.value } }))} className="w-full bg-black/40 border border-white/10 p-4 mono text-xs uppercase text-white outline-none focus:border-cyan-500/50 appearance-none rounded-none">
                    <option value="">ALL_CHANNELS</option>
                    {GENRES.map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
                  </select>
               </div>
               <div className="space-y-3">
                  <label className="mono text-[10px] uppercase text-slate-600 tracking-widest font-bold">Affective_State</label>
                  <select value={state.filters.mood} onChange={(e) => setState(s => ({ ...s, filters: { ...s.filters, mood: e.target.value } }))} className="w-full bg-black/40 border border-white/10 p-4 mono text-xs uppercase text-white outline-none focus:border-cyan-500/50 appearance-none rounded-none">
                    <option value="">UNCALIBRATED</option>
                    {MOODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
               </div>
            </div>
          </div>

          <button onClick={() => fetchRecommendations()} disabled={state.isLoading} className="mt-12 w-full py-6 border border-cyan-500/30 hover:bg-cyan-500 text-cyan-400 hover:text-black mono font-black text-sm uppercase tracking-[0.6em] transition-all relative group overflow-hidden">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {state.isLoading ? (
              <span className="flex items-center justify-center gap-4">
                <i className="fa-solid fa-microchip animate-spin text-lg"></i>
                SYNTHESIZING_NODES...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-4">
                <i className="fa-solid fa-bolt text-xs"></i>
                [ INITIATE_NEURAL_UPLINK ]
                <i className="fa-solid fa-bolt text-xs"></i>
              </span>
            )}
          </button>
        </section>

        {state.isLoading ? (
          <div className="animate-in fade-in duration-700">
            <NeuralLoader />
          </div>
        ) : state.recommendations.length > 0 && (
          <section className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
              <div className="space-y-1">
                <div className="mono text-[10px] text-cyan-500 uppercase tracking-widest font-bold">Output_Matrix</div>
                <h3 className="text-xl font-black uppercase text-white italic">Verified_Matches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {state.sources.length > 0 && state.sources.slice(0, 4).map((s, i) => (
                  <a key={i} href={s.web?.uri || '#'} target="_blank" className="mono text-[10px] px-3 py-1.5 bg-cyan-500/5 text-cyan-500/60 border border-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 transition-all uppercase">
                    DATA_REF_{i+1}
                  </a>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-stretch">
              {state.recommendations.map(movie => (
                <MovieCard key={movie.id} movie={movie} isRecommendation onLikeSimilar={(seed) => fetchRecommendations(seed)} onMarkWatched={(m) => markAsWatched(m)} onFeedback={(m, f) => handleFeedback(m, f)} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
