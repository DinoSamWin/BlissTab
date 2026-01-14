import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ToastMessage, User, Theme, SubscriptionTier } from './types';
import { APP_VERSION, DEFAULT_LINKS, DEFAULT_REQUESTS, SEARCH_ENGINES, DEFAULT_SEARCH_ENGINE, SearchEngine } from './constants';
import { generateSnippet } from './services/geminiService';
import { initGoogleAuth, signOutUser, openGoogleSignIn, renderGoogleButton } from './services/authService';
import { syncToCloud, fetchFromCloud } from './services/syncService';
import { loadHistory, saveHistory, addToHistory } from './services/perspectiveService';
import { canGeneratePerspective, resetPerspectiveCount, incrementPerspectiveCount, getSubscriptionTier } from './services/usageLimitsService';
import { fetchSubscriptionState, determineSubscriptionTier } from './services/subscriptionService';
import { fetchUserMembership, fetchUserSettings } from './services/redeemService';
import Settings from './components/Settings';
import LoginPromptModal from './components/LoginPromptModal';

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
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  const isAuthenticated = !!appState.user;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>(() => {
    const saved = localStorage.getItem('focus_tab_search_engine');
    return saved || DEFAULT_SEARCH_ENGINE;
  });
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
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
        // Reset perspective count for unauthenticated users
        resetPerspectiveCount();
        
        // Fetch subscription state, membership, and settings from backend
        const [subscriptionData, membershipData, settingsData] = await Promise.all([
          fetchSubscriptionState(user.id),
          fetchUserMembership(user.id),
          fetchUserSettings(user.id),
        ]);
        
        const userWithAllData = {
          ...user,
          ...subscriptionData,
          ...(membershipData && {
            memberViaRedeem: membershipData.memberViaRedeem,
            membershipSince: membershipData.membershipSince,
          }),
          ...(settingsData && {
            redeemEnabled: settingsData.redeemEnabled,
          }),
        };
        const subscriptionTier = determineSubscriptionTier(userWithAllData);
        
        // First set user, then fetch cloud data
        const currentState = appState;
        setAppState(prev => ({ ...prev, user: userWithAllData, subscriptionTier }));
        
        // Fetch cloud data and merge with current state
        const cloudData = await fetchFromCloud(user.id);
        if (cloudData) {
          // Merge cloud data with current state, preserving user with all data
          const mergedState = {
            ...currentState,
            ...cloudData,
            user: userWithAllData, // Ensure user with all data is set
            subscriptionTier, // Set subscription tier
            // Preserve local state if cloud data is missing fields
            links: cloudData.links || currentState.links,
            requests: cloudData.requests || currentState.requests,
            language: cloudData.language || currentState.language,
            theme: cloudData.theme || currentState.theme,
          };
          saveState(mergedState, true); // Skip sync on initial load
          addToast('Data synced from cloud', 'success');
        } else {
          // No cloud data, sync current state to cloud
          const stateWithUser = { ...currentState, user: userWithAllData, subscriptionTier };
          saveState(stateWithUser, false); // Sync current state to cloud
          addToast('Logged in successfully', 'success');
        }
      }
      setIsSyncing(false);
    });
  };

  const fetchRandomSnippet = useCallback(async () => {
    // Check usage limits before generating
    const limitCheck = canGeneratePerspective(appState);
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'limit_reached') {
        setIsLoginModalOpen(true);
      }
      return;
    }

    const activeRequests = appState.requests.filter(r => r.active);
    if (activeRequests.length === 0) return;

    const eligible = activeRequests.length > 1 && lastPromptIdRef.current 
      ? activeRequests.filter(r => r.id !== lastPromptIdRef.current)
      : activeRequests;

    const randomReq = eligible[Math.floor(Math.random() * eligible.length)];
    lastPromptIdRef.current = randomReq.id;

    setIsGenerating(true);
    
    // Increment perspective count for unauthenticated users
    if (!appState.user) {
      incrementPerspectiveCount();
    }
    
    // Load recent history to prevent repetition
    const history = loadHistory();
    
    // Generate with history awareness
    const result = await generateSnippet(randomReq.prompt, appState.language, history);
    
    // Save to history
    const updatedHistory = addToHistory(result, randomReq.id, history);
    saveHistory(updatedHistory);
    
    setCurrentSnippet(result);
    setIsGenerating(false);
    setRevealKey(prev => prev + 1);
  }, [appState]);

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
    if (!isAuthenticated && !isSettingsOpen) {
      setTimeout(() => renderGoogleButton('google-login-btn', appState.theme), 150);
    }
  }, [appState.theme, isAuthenticated, isSettingsOpen]);

  // Handle search engine selection persistence
  useEffect(() => {
    localStorage.setItem('focus_tab_search_engine', selectedEngine);
  }, [selectedEngine]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };

    if (isSearchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchDropdownOpen]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const engine = SEARCH_ENGINES.find(e => e.id === selectedEngine) || SEARCH_ENGINES[0];
    const searchUrl = `${engine.searchUrl}${encodeURIComponent(searchQuery.trim())}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const stripHighlights = (text: string) => text.replace(/\[h\](.*?)\[\/h\]/g, '$1');

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';

    words.forEach(word => {
      const testLine = line ? `${line} ${word}` : word;
      const { width } = ctx.measureText(testLine);
      if (width > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });
    if (line) lines.push(line);
    return lines;
  };

  const createShareCard = async (quote: string) => {
    const width = 1080;
    const height = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.fillStyle = appState.theme === 'dark' ? '#0C0C0D' : '#F8F8FB';
    ctx.fillRect(0, 0, width, height);

    // Quote text
    ctx.fillStyle = appState.theme === 'dark' ? '#F5F5F7' : '#0F172A';
    ctx.font = 'bold 56px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const maxQuoteWidth = width * 0.78;
    const lines = wrapText(ctx, quote, maxQuoteWidth);
    const lineHeight = 78;
    const totalQuoteHeight = lines.length * lineHeight;
    let y = (height - totalQuoteHeight) / 2 - 80;

    lines.forEach(line => {
      ctx.fillText(line, width / 2, y);
      y += lineHeight;
    });

    // Product name
    ctx.font = '600 28px "Inter", sans-serif';
    ctx.fillStyle = appState.theme === 'dark' ? '#E5E7EB' : '#111827';
    ctx.fillText('StartlyTab', width / 2, height - 180);

    // Slogan
    ctx.font = '400 22px "Inter", sans-serif';
    ctx.fillStyle = appState.theme === 'dark' ? '#9CA3AF' : '#6B7280';
    ctx.fillText('Perspective for a focused day.', width / 2, height - 135);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  };

  const currentEngine = SEARCH_ENGINES.find(e => e.id === selectedEngine) || SEARCH_ENGINES[0];
  const [isSharing, setIsSharing] = useState(false);
  const visibleLinks = appState.links.slice(0, 10);
  const remainingLinks = Math.max(0, appState.links.length - visibleLinks.length);

  const handleShareQuote = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      const cleanQuote = stripHighlights(currentSnippet);
      const blob = await createShareCard(cleanQuote);
      if (!blob) throw new Error('Failed to create image');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `focustab-quote-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(url);
      addToast('Quote ready to share', 'success');
    } catch (e) {
      console.error(e);
      addToast('Share failed', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    console.log('[App] Initializing Google Auth...');
    initGoogleAuth(async (user) => {
      if (user) {
        console.log('[App] User authenticated:', user.email);
        // Reset perspective count on login
        resetPerspectiveCount();
        
        setIsSyncing(true);
        
        // Fetch subscription state, membership, and settings from backend
        const [subscriptionData, membershipData, settingsData] = await Promise.all([
          fetchSubscriptionState(user.id),
          fetchUserMembership(user.id),
          fetchUserSettings(user.id),
        ]);
        
        const userWithAllData = {
          ...user,
          ...subscriptionData,
          ...(membershipData && {
            memberViaRedeem: membershipData.memberViaRedeem,
            membershipSince: membershipData.membershipSince,
          }),
          ...(settingsData && {
            redeemEnabled: settingsData.redeemEnabled,
          }),
        };
        const subscriptionTier = determineSubscriptionTier(userWithAllData);
        
        // Fetch cloud data first
        const cloudData = await fetchFromCloud(user.id);
        
        if (cloudData) {
          console.log('[App] Cloud data fetched:', {
            links: cloudData.links?.length || 0,
            requests: cloudData.requests?.length || 0
          });
          // Merge cloud data with current state
          const mergedState = {
            ...appState,
            ...cloudData,
            user: userWithAllData, // Ensure user with all data is set
            subscriptionTier, // Set subscription tier
            // Preserve local state if cloud data is missing fields
            links: cloudData.links || appState.links,
            requests: cloudData.requests || appState.requests,
            language: cloudData.language || appState.language,
            theme: cloudData.theme || appState.theme,
          };
          saveState(mergedState, true); // Skip sync on initial load
        } else {
          console.log('[App] No cloud data found, syncing current state');
          // No cloud data, set user and sync current state
          const stateWithUser = { ...appState, user: userWithAllData, subscriptionTier };
          setAppState(stateWithUser);
          // Sync current state to cloud for first-time users
          await syncToCloud(stateWithUser);
        }
        setIsSyncing(false);
      } else {
        console.log('[App] No user, rendering Google button');
        // Delay button rendering to ensure SDK is loaded
        setTimeout(() => {
          renderGoogleButton('google-login-btn', appState.theme);
        }, 500);
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
            <span className="logo-text text-lg text-gray-800 dark:text-gray-200">StartlyTab</span>
            {isSyncing && <div className="ml-2 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />}
            
            {/* Enhanced Search Input */}
            <div className="ml-6 relative" ref={searchDropdownRef}>
              <div className="flex items-center bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[999px] overflow-hidden relative h-[50px] min-h-[50px] w-[380px]">
                {/* Search Engine Selector */}
                <button
                  onClick={() => setIsSearchDropdownOpen(!isSearchDropdownOpen)}
                  className="flex items-center justify-center w-[44px] h-full hover:bg-white/50 dark:hover:bg-white/10 transition-colors relative"
                  aria-label="Select search engine"
                >
                  <img 
                    src={currentEngine.icon} 
                    alt={currentEngine.name}
                    className="w-[18px] h-[18px]"
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-[30px] bg-black/5 dark:bg-white/5"></div>
                </button>

                {/* Search Input */}
                <input
                  ref={searchInputRef}
                  id="search-input"
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="flex-1 px-[18px] py-[12px] pr-[60px] bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none"
                  style={{ 
                    fontSize: '15px',
                    lineHeight: '1.5'
                  }}
                />

                {/* Circular Search Button - Embedded */}
                <button
                  onClick={handleSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full bg-black flex items-center justify-center hover:bg-[#1A1A1A] active:bg-[#111] transition-colors cursor-pointer"
                  aria-label="Search"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>

              {/* Search Engine Dropdown */}
              {isSearchDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-black/5 dark:border-white/5 rounded-2xl shadow-lg overflow-hidden z-30 min-w-[200px]">
                  {SEARCH_ENGINES.map((engine) => (
                    <button
                      key={engine.id}
                      onClick={() => {
                        setSelectedEngine(engine.id);
                        setIsSearchDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                        selectedEngine === engine.id ? 'bg-gray-50 dark:bg-white/5' : ''
                      }`}
                    >
                      <img 
                        src={engine.icon} 
                        alt={engine.name}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{engine.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                const newTheme = appState.theme === 'light' ? 'dark' : 'light';
                saveState({...appState, theme: newTheme});
                addToast(`Theme: ${newTheme}`, 'info');
              }}
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

            <div className="mt-10 flex items-center gap-4">
                <button 
                    onClick={fetchRandomSnippet}
                    disabled={isGenerating}
                    className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-50"
                >
                    {isGenerating ? 'Reflecting...' : 'New Perspective'}
                </button>
                <button
                  onClick={handleShareQuote}
                  disabled={isSharing}
                  className="px-6 py-4 rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600 dark:text-gray-200 transition-all hover:bg-white/80 dark:hover:bg-white/10 active:scale-95 flex items-center gap-2 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/>
                    <path d="M12 16V4"/>
                    <path d="M8 8l4-4 4 4"/>
                  </svg>
                  <span>Share Quote</span>
                </button>
            </div>
        </div>
      </main>

      {/* 4. BOTTOM SECTION */}
      <section className="w-full max-w-7xl px-8 pb-14 z-10 animate-reveal" style={{ animationDelay: '0.4s' }}>
        <div className="soft-card p-6 md:p-8 rounded-[2rem] shadow-xl shadow-black/5 overflow-hidden flex flex-col items-center">
            
            {isAuthenticated ? (
              <div className="w-full flex flex-col md:flex-row gap-8 md:gap-10 items-start">
                  <div className="w-full md:w-1/3 flex flex-col text-left">
                      <h2 className="serif text-3xl md:text-4xl text-gray-800 dark:text-gray-100 mb-3">Intentional Gateways</h2>
                      <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed">
                          Your personal shortcuts, always ready.
                      </p>
                  </div>

                  <div className="flex-1 w-full">
                      {appState.links.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                          {visibleLinks.map(link => (
                            <a 
                              key={link.id} 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group flex items-center gap-3 px-3 py-3 rounded-xl border border-black/5 dark:border-white/5 bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center border border-black/5 dark:border-white/5">
                                {link.icon ? <img src={link.icon} alt="" className="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity" /> : <div className="w-3.5 h-3.5 rounded-full" style={{backgroundColor: link.color}} />}
                              </div>
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{link.title}</span>
                            </a>
                          ))}
                          {remainingLinks > 0 && (
                            <div className="flex items-center justify-center px-3 py-3 rounded-xl border border-dashed border-black/10 dark:border-white/10 text-xs font-semibold text-gray-500 dark:text-gray-300">
                              +{remainingLinks} More
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-10 flex flex-col items-center justify-center text-center opacity-60">
                            <div className="w-12 h-12 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-2xl mb-3" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Connect your first link in Studio</span>
                        </div>
                      )}
                  </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-6">
                  <div className="max-w-md w-full flex flex-col items-center text-center">
                      <h2 className="serif text-3xl md:text-4xl text-gray-800 dark:text-gray-100 mb-2">Start your day softly</h2>
                      <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed mb-6">
                          Sign in with Google to sync your gateways across devices.
                      </p>
                      <div id="google-login-btn" className="transition-all hover:scale-[1.02] active:scale-[0.98]"></div>
                  </div>
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
        onSignOut={() => { 
          signOutUser(); 
          const newState = {...appState, user: null, subscriptionTier: undefined};
          saveState(newState); 
          addToast('Signed out'); 
        }}
      />

      <LoginPromptModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSignIn={handleSignIn}
        theme={appState.theme}
      />
    </div>
  );
};

export default App;