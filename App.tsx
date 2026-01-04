import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ToastMessage, User, Theme } from './types';
import { APP_VERSION, DEFAULT_LINKS, DEFAULT_REQUESTS } from './constants';
import { generateSnippet } from './services/geminiService';
import { initGoogleAuth, signOutUser, openGoogleSignIn, renderGoogleButton } from './services/authService';
import { syncToCloud, fetchFromCloud } from './services/syncService';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('focus_tab_state');
    const systemTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === APP_VERSION) {
            return { ...parsed, user: null };
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

  const [currentSnippet, setCurrentSnippet] = useState<string>('Breathe in, let the [h]world settle[/h]...');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [revealKey, setRevealKey] = useState(0); 
  
  const lastPromptIdRef = useRef<string | null>(null);

  const saveState = useCallback((state: AppState, skipSync = false) => {
    localStorage.setItem('focus_tab_state', JSON.stringify({ ...state, user: null }));
    setAppState(state);
    if (state.user && !skipSync) {
      setIsSyncing(true);
      syncToCloud(state).finally(() => setIsSyncing(false));
    }
  }, []);

  const addToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleSignIn = () => {
    setIsSyncing(true);
    openGoogleSignIn(async (user) => {
      if (user) {
        setAppState(prev => ({ ...prev, user }));
        const cloudData = await fetchFromCloud(user.id);
        if (cloudData) {
          saveState({ ...appState, ...cloudData, user }, true);
          addToast('Studio synced', 'success');
        }
      }
      setIsSyncing(false);
    });
  };

  const fetchRandomSnippet = useCallback(async () => {
    const activeRequests = appState.requests.filter(r => r.active);
    if (activeRequests.length === 0) return;

    const eligible = activeRequests.length > 1 && lastPromptIdRef.current 
      ? activeRequests.filter(r => r.id !== lastPromptIdRef.current)
      : activeRequests;

    const randomReq = eligible[Math.floor(Math.random() * eligible.length)];
    lastPromptIdRef.current = randomReq.id;

    setIsGenerating(true);
    const result = await generateSnippet(randomReq.prompt, appState.language);
    setCurrentSnippet(result);
    setIsGenerating(false);
    setRevealKey(prev => prev + 1);
  }, [appState.requests, appState.language]);

  const renderSnippet = (text: string) => {
    const parts = text.split(/\[h\](.*?)\[\/h\]/g);
    return parts.map((part, i) => (
      i % 2 === 1 
        ? <span key={i} className="text-purple-600 dark:text-purple-400">{part}</span> 
        : <span key={i}>{part}</span>
    ));
  };

  useEffect(() => {
    if (appState.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    if (!appState.user && !isSettingsOpen) {
      setTimeout(() => renderGoogleButton('google-login-btn', appState.theme), 150);
    }
  }, [appState.theme, appState.user, isSettingsOpen]);

  useEffect(() => {
    initGoogleAuth(async (user) => {
      if (user) {
        setAppState(prev => ({ ...prev, user }));
        setIsSyncing(true);
        const cloudData = await fetchFromCloud(user.id);
        if (cloudData) {
          setAppState(prev => ({ ...prev, ...cloudData, user }));
        }
        setIsSyncing(false);
      } else {
        renderGoogleButton('google-login-btn', appState.theme);
      }
    });
    fetchRandomSnippet();
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center overflow-x-hidden selection:bg-indigo-100 dark:selection:bg-indigo-900/40">
      
      {/* 1. LAYERED BACKGROUNDS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`theme-overlay bg-[#FBFBFE] ${appState.theme === 'light' ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-50/50 rounded-full blur-[160px] animate-breathing-slow" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-purple-50/40 rounded-full blur-[140px] animate-breathing-slow" style={{ animationDelay: '-5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_0%,rgba(251,251,254,1)_100%)]" />
        </div>
        <div className={`theme-overlay bg-[#0A0A0B] ${appState.theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] bg-indigo-950/20 rounded-full blur-[120px] animate-lunar-drift" />
            <div className="absolute bottom-[20%] right-[15%] w-[35%] h-[35%] bg-purple-950/10 rounded-full blur-[100px] animate-lunar-drift" style={{ animationDelay: '-8s' }} />
        </div>
      </div>

      {/* 2. NAVIGATION BAR - FIXED TO FULL WIDTH SPREAD */}
      <nav className="w-full px-8 md:px-12 lg:px-16 py-10 flex justify-between items-center z-20 animate-reveal">
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-sm border border-black/5 dark:border-white/5">
                <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg animate-pulse" />
            </div>
            <span className="font-semibold tracking-tight text-lg text-gray-800 dark:text-gray-200">FocusTab</span>
            {isSyncing && <div className="ml-2 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />}
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-3">
            <button 
              onClick={() => saveState({...appState, theme: appState.theme === 'light' ? 'dark' : 'light'})}
              className="p-3.5 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95 group"
              aria-label="Toggle Theme"
            >
              {appState.theme === 'light' ? 
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> :
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-[0.15em] hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-indigo-500/10"
            >
                Studio
            </button>
        </div>
      </nav>

      {/* 3. HERO SECTION */}
      <main className="flex-1 w-full flex flex-col items-center justify-center px-8 z-10 py-16">
        <div key={revealKey} className="animate-reveal max-w-4xl text-center flex flex-col items-center">
            {/* Perspective Title with Selective Highlighting and No Typography Changes */}
            <h1 className="serif editorial-title text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.15] md:leading-[1.1] tracking-[-0.02em] px-4 text-black dark:text-white">
                {renderSnippet(currentSnippet)}
            </h1>

            <p className="mt-12 text-gray-400 dark:text-gray-500 text-sm md:text-base max-w-lg leading-relaxed font-medium">
                Your daily perspective, curated for a focused work day.
            </p>

            <div className="mt-16">
                <button 
                    onClick={fetchRandomSnippet}
                    disabled={isGenerating}
                    className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-50"
                >
                    {isGenerating ? 'Reflecting...' : 'New Perspective'}
                </button>
            </div>
        </div>
      </main>

      {/* 4. BOTTOM SECTION */}
      <section className="w-full max-w-7xl px-8 pb-20 z-10 animate-reveal" style={{ animationDelay: '0.4s' }}>
        <div className="soft-card p-10 md:p-16 rounded-[4rem] shadow-2xl shadow-black/5 overflow-hidden flex flex-col items-center">
            
            {appState.user ? (
              <div className="w-full flex flex-col md:flex-row gap-16 items-center md:items-start">
                  <div className="w-full md:w-1/3 flex flex-col text-center md:text-left">
                      <h2 className="serif text-4xl md:text-5xl text-gray-800 dark:text-gray-100 mb-6">Intentional <br/>Gateways</h2>
                      <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed max-w-[280px] mx-auto md:mx-0">
                          Your digital world, refined. Connect your most meaningful destinations.
                      </p>
                  </div>

                  <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-3 gap-6">
                      {appState.links.length > 0 ? (
                          appState.links.map(link => (
                              <a 
                                  key={link.id} 
                                  href={link.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="group relative flex flex-col p-6 bg-white/40 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                              >
                                  <div className="mb-10 w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm border border-black/5 dark:border-white/5 group-hover:scale-110 transition-transform duration-700">
                                      {link.icon ? <img src={link.icon} alt="" className="w-7 h-7 object-contain opacity-70 group-hover:opacity-100 transition-opacity" /> : <div className="w-4 h-4 rounded-full" style={{backgroundColor: link.color}} />}
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 group-hover:text-indigo-500 transition-colors">Gateway</span>
                                      <span className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-1">{link.title}</span>
                                  </div>
                              </a>
                          ))
                      ) : (
                          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center opacity-40">
                              <div className="w-16 h-16 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-3xl mb-4" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Connect your first link in Studio</span>
                          </div>
                      )}
                  </div>
              </div>
            ) : (
              <div className="max-w-md w-full text-center flex flex-col items-center py-8">
                  <h2 className="serif text-4xl text-gray-800 dark:text-gray-100 mb-6">Secure Your Focus</h2>
                  <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed mb-12">
                      Sign in with Google to sync your intentional gateways across devices and personalize your focus experience.
                  </p>
                  <div id="google-login-btn" className="transition-all hover:scale-[1.02] active:scale-[0.98]"></div>
              </div>
            )}
        </div>
      </section>

      {/* 5. TOASTS */}
      <div className="fixed bottom-12 right-12 flex flex-col gap-3 z-[100]">
        {toasts.map(toast => (
          <div key={toast.id} className="px-8 py-5 bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest rounded-3xl shadow-2xl animate-reveal border border-white/10 dark:border-black/5">
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
        onSignOut={() => { signOutUser(); saveState({...appState, user: null}); addToast('Signed out'); }}
      />
    </div>
  );
};

export default App;