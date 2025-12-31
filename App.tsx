
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ToastMessage, User, Theme } from './types';
import { APP_VERSION, DEFAULT_LINKS, DEFAULT_REQUESTS } from './constants';
import { generateSnippet } from './services/geminiService';
import { initGoogleAuth, signOutUser, openGoogleSignIn } from './services/authService';
import { syncToCloud, fetchFromCloud } from './services/syncService';
import Settings from './components/Settings';

const App: React.FC = () => {
  // --- State ---
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('focus_tab_state');
    const systemTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === APP_VERSION) {
            return {
                ...parsed,
                language: parsed.language || 'English',
                theme: parsed.theme || systemTheme,
                user: null
            };
        }
      } catch (e) { console.error("Restore failed", e); }
    }
    return {
      version: APP_VERSION,
      links: DEFAULT_LINKS,
      requests: DEFAULT_REQUESTS,
      pinnedSnippetId: null,
      language: 'English',
      user: null,
      theme: systemTheme
    };
  });

  const [currentSnippet, setCurrentSnippet] = useState<string>('Breathe in, let thoughts settle...');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [key, setKey] = useState(0); 
  
  const lastPromptIdRef = useRef<string | null>(null);

  // --- Helpers ---
  const saveState = useCallback((state: AppState, skipSync = false) => {
    localStorage.setItem('focus_tab_state', JSON.stringify({ ...state, user: null }));
    setAppState(state);
    
    // Cloud sync if logged in
    if (state.user && !skipSync) {
      setIsSyncing(true);
      syncToCloud(state).finally(() => setIsSyncing(false));
    }
  }, []);

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleSignIn = () => {
    setIsSyncing(true);
    openGoogleSignIn(async (user) => {
      if (user) {
        setAppState(prev => ({ ...prev, user }));
        const cloudData = await fetchFromCloud(user.id);
        if (cloudData) {
          const newState = {
            ...appState,
            ...cloudData,
            user,
            version: APP_VERSION
          };
          setAppState(newState);
          addToast('Settings synced from cloud', 'success');
        } else {
          addToast(`Welcome, ${user.name || 'Explorer'}`, 'success');
        }
      }
      setIsSyncing(false);
    });
  };

  const handleSignOut = () => {
    signOutUser();
    setAppState(prev => ({ ...prev, user: null }));
    addToast('Signed out of Google');
  };

  const fetchRandomSnippet = useCallback(async () => {
    const activeRequests = appState.requests.filter(r => r.active);
    if (activeRequests.length === 0) {
      setCurrentSnippet("Add your own intentions in settings.");
      return;
    }

    let eligible = activeRequests;
    if (activeRequests.length > 1 && lastPromptIdRef.current) {
      eligible = activeRequests.filter(r => r.id !== lastPromptIdRef.current);
    }

    const randomReq = eligible[Math.floor(Math.random() * eligible.length)];
    lastPromptIdRef.current = randomReq.id;

    setIsGenerating(true);
    const result = await generateSnippet(randomReq.prompt, appState.language);
    setCurrentSnippet(result);
    setIsGenerating(false);
    setKey(prev => prev + 1);
  }, [appState.requests, appState.language]);

  const toggleTheme = () => {
    const nextTheme = appState.theme === 'light' ? 'dark' : 'light';
    saveState({ ...appState, theme: nextTheme });
  };

  // --- Theme Effect ---
  useEffect(() => {
    if (appState.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [appState.theme]);

  // --- Sync Logic ---
  useEffect(() => {
    initGoogleAuth(async (user) => {
      if (user) {
        setAppState(prev => ({ ...prev, user }));
        
        setIsSyncing(true);
        const cloudData = await fetchFromCloud(user.id);
        if (cloudData) {
          setAppState(prev => ({
            ...prev,
            ...cloudData,
            user, 
            version: APP_VERSION 
          }));
        }
        setIsSyncing(false);
      }
    });
  }, []);

  // --- Initial Load Snippet ---
  useEffect(() => {
    fetchRandomSnippet();
  }, [appState.language]);

  // --- Render ---
  return (
    <div className={`relative w-full h-screen flex flex-col items-center justify-between p-8 md:p-12 overflow-hidden select-none transition-colors duration-1000`}>
      
      {/* 1. Background Decoration (Atmospheric Halos & Lunar Texture) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        
        {/* LIGHT MODE HALOS */}
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-orange-100/30 rounded-full blur-[120px] animate-breathing-slow dark:hidden" />
        <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 bg-blue-50/20 rounded-full blur-[140px] animate-breathing-slow dark:hidden" style={{ animationDelay: '-4s' }} />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-white/10 dark:hidden" />

        {/* DARK MODE LUNAR SURFACE (Upper Area Only) */}
        <div className="hidden dark:block absolute top-0 left-0 w-full h-1/2 overflow-hidden">
            {/* Extremely faint craters */}
            <div className="absolute top-[10%] left-[15%] w-64 h-64 bg-white/[0.02] rounded-full blur-[80px] animate-breathing-slow" />
            <div className="absolute top-[25%] left-[60%] w-96 h-96 bg-white/[0.015] rounded-full blur-[100px] animate-breathing-slow" style={{ animationDelay: '-3s' }} />
            <div className="absolute top-[5%] left-[80%] w-48 h-48 bg-white/[0.01] rounded-full blur-[60px] animate-breathing-slow" style={{ animationDelay: '-6s' }} />
            <div className="absolute top-[40%] left-[5%] w-80 h-80 bg-white/[0.01] rounded-full blur-[90px] animate-breathing-slow" style={{ animationDelay: '-1.5s' }} />
        </div>

        {/* DARK MODE GROUNDING (Lower Area Only) */}
        <div className="hidden dark:block absolute bottom-0 left-0 w-full h-full pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* 2. Top Navigation */}
      <div className="w-full flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
            {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md rounded-full border border-white/60 dark:border-white/5 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-600 rounded-full animate-pulse-slow" />
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">Syncing</span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-4">
            {appState.user && (
                <div className="flex items-center gap-3 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md px-4 py-2 rounded-2xl border border-white/60 dark:border-white/5 shadow-sm animate-fade-in transition-all">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight truncate max-w-[120px]">{appState.user.name}</span>
                        <span className="text-[9px] text-gray-400 dark:text-gray-500 leading-tight">Synced</span>
                    </div>
                    {appState.user.picture ? (
                        <img src={appState.user.picture} alt="" className="w-8 h-8 rounded-full border border-white/80 dark:border-white/10 shadow-inner" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest border border-white/80 dark:border-white/10">
                            {appState.user.name?.charAt(0)}
                        </div>
                    )}
                </div>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md rounded-2xl shadow-sm border border-white/60 dark:border-white/5 hover:shadow-md hover:bg-white/60 dark:hover:bg-white/[0.08] transition-all active:scale-95 group"
              aria-label="Settings"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
        </div>
      </div>

      {/* 3. Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full px-4 text-center z-10 mb-12">
        <div key={key} className={`transition-all duration-1000 ${isGenerating ? 'opacity-20 blur-sm scale-[0.99]' : 'opacity-100 blur-0 scale-100 animate-reveal'}`}>
          <div className="relative inline-block px-10">
            <span className="serif absolute -top-14 left-0 text-9xl text-gray-200/40 dark:text-gray-800/40 pointer-events-none select-none italic">“</span>
            <h1 className="serif text-4xl md:text-5xl lg:text-6xl text-gray-800 dark:text-gray-200 leading-[2.2] font-normal tracking-tight">
              {currentSnippet}
            </h1>
            <div className="mt-20 h-px w-28 mx-auto bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent" />
          </div>
        </div>
        
        <button 
          onClick={fetchRandomSnippet}
          disabled={isGenerating}
          className="mt-20 group relative flex items-center gap-3 px-10 py-4 bg-white/30 dark:bg-white/[0.02] backdrop-blur-md hover:bg-white/60 dark:hover:bg-white/[0.06] rounded-full border border-white/80 dark:border-white/5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
        >
          <svg 
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-transform duration-700 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300">
            {isGenerating ? 'Reflecting' : 'Refresh'}
          </span>
        </button>
      </main>

      {/* 4. Quick Links Area / Logged-out Placeholder */}
      <footer className="w-full flex justify-center items-end pb-8 z-10 relative">
        
        {/* Theme Toggle */}
        <div className="absolute left-0 bottom-8 md:bottom-12">
            <button 
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                className="p-3.5 bg-white/40 dark:bg-white/[0.03] backdrop-blur-md rounded-2xl shadow-sm border border-white/60 dark:border-white/5 hover:shadow-md hover:bg-white/60 dark:hover:bg-white/[0.08] transition-all active:scale-95 group overflow-hidden"
            >
                {appState.theme === 'light' ? (
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-400 transition-all duration-700 transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-indigo-400 transition-all duration-700 transform group-hover:-rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                )}
            </button>
        </div>

        {!appState.user ? (
          <div className="flex flex-col items-center gap-8 bg-white/30 dark:bg-white/[0.02] backdrop-blur-3xl p-10 md:p-14 rounded-[4rem] border border-white/50 dark:border-white/[0.04] shadow-[0_8px_48px_0_rgba(0,0,0,0.03)] animate-reveal max-w-md text-center group">
            <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">The Dashboard</h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed px-8 font-medium">
                  Sync your favorite gateways across devices to maintain your focus wherever you go.
                </p>
            </div>
            
            <button 
              onClick={handleSignIn}
              disabled={isSyncing}
              className="inline-flex items-center gap-3 bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-white/5 px-10 py-4 rounded-2xl shadow-sm hover:shadow-xl transition-all active:scale-95 group/btn disabled:opacity-50"
            >
              <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin opacity-50' : ''}`} viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.77l3.39-3.39C17.85 1.5 15.15 0 12 0 7.31 0 3.25 2.69 1.25 6.64l3.96 3.07C6.16 6.94 8.86 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.02 3.46-4.99 3.46-8.73z" />
                  <path fill="#FBBC05" d="M5.21 14.71c-.24-.7-.37-1.44-.37-2.21s.13-1.51.37-2.21L1.25 7.22C.45 8.71 0 10.33 0 12s.45 3.29 1.25 4.78l3.96-3.07z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.14 0-5.84-1.9-6.84-4.73L1.25 17.68C3.25 21.31 7.31 24 12 24z" />
              </svg>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest group-hover/btn:text-black dark:group-hover/btn:text-white transition-colors">Sign in with Google</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 bg-white/20 dark:bg-white/[0.01] backdrop-blur-2xl p-8 md:p-10 rounded-[3.5rem] border border-white/40 dark:border-white/[0.03] shadow-[0_4px_32px_0_rgba(0,0,0,0.02)] animate-reveal">
            {appState.links.length === 0 ? (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] italic px-6">Begin with intention. Add links in studio.</p>
            ) : (
              appState.links.map(link => (
                <a 
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-3 transition-all"
                  title={link.title}
                >
                  <div className="w-16 h-16 md:w-18 md:h-18 bg-white/60 dark:bg-white/[0.03] rounded-3xl flex items-center justify-center shadow-sm border border-white/80 dark:border-white/[0.04] group-hover:shadow-lg group-hover:bg-white dark:group-hover:bg-white/[0.1] group-hover:-translate-y-2 transition-all duration-500 overflow-hidden p-4 relative">
                    {link.icon ? (
                      <img src={link.icon} alt="" className="w-full h-full object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                    ) : (
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: link.color }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-all uppercase tracking-[0.2em] max-w-[80px] truncate text-center">
                    {link.title}
                  </span>
                </a>
              ))
            )}
          </div>
        )}
      </footer>

      {/* 5. Toasts */}
      <div className="fixed bottom-24 right-8 flex flex-col gap-3 z-[60]">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="px-8 py-4 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/5 animate-in slide-in-from-right duration-700 flex items-center gap-4"
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-red-400' : 'bg-green-400'} animate-pulse`} />
            {toast.message}
          </div>
        ))}
      </div>

      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        state={appState}
        updateState={saveState}
        addToast={addToast}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    </div>
  );
};

export default App;
