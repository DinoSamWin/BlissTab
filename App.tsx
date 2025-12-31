
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ToastMessage, User } from './types';
import { APP_VERSION, DEFAULT_LINKS, DEFAULT_REQUESTS } from './constants';
import { generateSnippet } from './services/geminiService';
import { initGoogleAuth, signOutUser, openGoogleSignIn } from './services/authService';
import { syncToCloud, fetchFromCloud } from './services/syncService';
import Settings from './components/Settings';

const App: React.FC = () => {
  // --- State ---
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('focus_tab_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === APP_VERSION) {
            return {
                ...parsed,
                language: parsed.language || 'English',
                user: null // Auth state handled by effect
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
      user: null
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
          setAppState(prev => ({
            ...prev,
            ...cloudData,
            user,
            version: APP_VERSION
          }));
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

  // --- Sync Logic ---
  useEffect(() => {
    initGoogleAuth(async (user) => {
      if (user) {
        setAppState(prev => ({ ...prev, user }));
        
        // Fetch cloud data on login if not already done
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
    <div className="relative w-full h-screen flex flex-col items-center justify-between p-8 md:p-12 overflow-hidden select-none">
      
      {/* 1. Background Decoration (Warm Halos) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-orange-100/30 rounded-full blur-[120px] animate-breathing" />
        <div className="absolute -bottom-1/4 -right-1/4 w-2/3 h-2/3 bg-blue-50/20 rounded-full blur-[140px] animate-breathing" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-radial-gradient from-transparent via-transparent to-white/10 pointer-events-none" />
      </div>

      {/* 2. Top Navigation */}
      <div className="w-full flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
            {isSyncing && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/40 backdrop-blur-md rounded-full border border-white/60 animate-fade-in">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse-slow" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Syncing</span>
                </div>
            )}
        </div>
        <div className="flex items-center gap-4">
            {appState.user && (
                <div className="flex items-center gap-3 bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/60 shadow-sm animate-fade-in transition-all">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-700 leading-tight truncate max-w-[120px]">{appState.user.name}</span>
                        <span className="text-[9px] text-gray-400 leading-tight">Synced</span>
                    </div>
                    {appState.user.picture ? (
                        <img src={appState.user.picture} alt="" className="w-8 h-8 rounded-full border border-white/80 shadow-inner" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase tracking-widest border border-white/80">
                            {appState.user.name?.charAt(0)}
                        </div>
                    )}
                </div>
            )}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-3 bg-white/40 backdrop-blur-md rounded-2xl shadow-sm border border-white/60 hover:shadow-md hover:bg-white/60 transition-all active:scale-95 group"
              aria-label="Settings"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
        </div>
      </div>

      {/* 3. Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-2xl w-full px-4 text-center z-10">
        <div key={key} className={`transition-all duration-1000 ${isGenerating ? 'opacity-20 blur-sm scale-[0.99]' : 'opacity-100 blur-0 scale-100 animate-reveal'}`}>
          <div className="relative inline-block">
            <span className="serif absolute -top-8 -left-8 text-7xl text-gray-200/40 pointer-events-none select-none italic">“</span>
            <h1 className="serif text-4xl md:text-5xl lg:text-6xl text-gray-800 leading-[1.3] font-normal tracking-tight">
              {currentSnippet}
            </h1>
            <div className="mt-8 h-px w-16 mx-auto bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          </div>
        </div>
        
        <button 
          onClick={fetchRandomSnippet}
          disabled={isGenerating}
          className="mt-16 group relative flex items-center gap-3 px-8 py-3 bg-white/30 backdrop-blur-md hover:bg-white/60 rounded-full border border-white/80 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
        >
          <svg 
            className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform duration-700 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-180'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 group-hover:text-gray-600">
            {isGenerating ? 'Breathing...' : 'Refresh'}
          </span>
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity blur-lg -z-10" />
        </button>
      </main>

      {/* 4. Quick Links Area / Placeholder */}
      <footer className="w-full flex justify-center pb-8 z-10">
        {!appState.user && appState.links.length === 0 ? (
          <div className="flex flex-col items-center gap-5 bg-white/20 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)] animate-reveal max-w-sm text-center">
            <button 
              onClick={handleSignIn}
              disabled={isSyncing}
              className="inline-flex items-center gap-3 bg-white border border-gray-100 px-8 py-3.5 rounded-2xl shadow-sm hover:shadow-lg transition-all active:scale-95 group disabled:opacity-50"
            >
              <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin opacity-50' : ''}`} viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.77l3.39-3.39C17.85 1.5 15.15 0 12 0 7.31 0 3.25 2.69 1.25 6.64l3.96 3.07C6.16 6.94 8.86 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.02 3.46-4.99 3.46-8.73z" />
                  <path fill="#FBBC05" d="M5.21 14.71c-.24-.7-.37-1.44-.37-2.21s.13-1.51.37-2.21L1.25 7.22C.45 8.71 0 10.33 0 12s.45 3.29 1.25 4.78l3.96-3.07z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.14 0-5.84-1.9-6.84-4.73L1.25 17.68C3.25 21.31 7.31 24 12 24z" />
              </svg>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-widest group-hover:text-black">Sign in with Google</span>
            </button>
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[240px]">
              Sign in with Google to sync and access your favorite links across devices.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 bg-white/20 backdrop-blur-2xl p-6 md:p-8 rounded-[3rem] border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.04)]">
            {appState.links.length === 0 && (
              <p className="text-[10px] text-gray-400 uppercase tracking-widest italic px-4">Begin with intention.</p>
            )}
            {appState.links.map(link => (
              <a 
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3 transition-all"
                title={link.title}
              >
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white/60 rounded-2xl flex items-center justify-center shadow-sm border border-white/80 group-hover:shadow-lg group-hover:bg-white group-hover:-translate-y-1.5 transition-all overflow-hidden p-3.5 relative">
                  {link.icon ? (
                    <img src={link.icon} alt="" className="w-full h-full object-contain filter grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                  ) : (
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: link.color }} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="text-[9px] font-semibold text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-gray-600 transition-all uppercase tracking-[0.15em] max-w-[70px] truncate text-center">
                  {link.title}
                </span>
              </a>
            ))}
          </div>
        )}
      </footer>

      {/* 5. Toasts */}
      <div className="fixed bottom-24 right-8 flex flex-col gap-2 z-[60]">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="px-6 py-3 bg-white text-gray-800 text-xs font-medium rounded-2xl shadow-2xl border border-gray-100 animate-in slide-in-from-right duration-500 flex items-center gap-3"
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
