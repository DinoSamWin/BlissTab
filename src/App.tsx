import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, ToastMessage, User, Theme, SubscriptionTier } from './types';
import { APP_VERSION, DEFAULT_REQUESTS, SearchEngine } from './constants';
import { REGIONAL_SEARCH_ENGINES, REGIONAL_DEFAULT_LINKS, isChinaRegion } from './services/environmentService';
import { generateSnippet, clearAllPerspectivePools } from './services/geminiService';
import { signOutUser } from './services/authService';
import { syncToCloud, fetchFromCloud } from './services/syncService';
import { loadHistory, saveHistory, addToHistory, getSessionCountToday, getMinutesSinceLast, getLateNightStreak } from './services/perspectiveService';
import { canGeneratePerspective, resetPerspectiveCount, incrementPerspectiveCount, getSubscriptionTier, getPerspectiveCount, isSubscribed } from './services/usageLimitsService';
import { fetchSubscriptionState, determineSubscriptionTier } from './services/subscriptionService';
import { fetchUserMembership, fetchUserSettings } from './services/redeemService';
import { canonicalizeUrl } from './services/urlCanonicalService';
import { getLocalLogoDataUrl, downloadAndCacheLogo } from './services/gatewayLogoCacheService';
import { fetchUserGatewayOverrides, getLogoSignedUrl } from './services/supabaseService';
import { EmotionType, TrackType } from './types';
import { saveEmotionLog, calculateEmotionalBaseline, getTodayEmotionClickCount, analyzeEmotionalPatterns, getEmotionLogs } from './services/emotionService';
import { updateTrackAffinity } from './services/recommendationEngine';
import { useUser } from './contexts/UserContext';
import Settings from './components/Settings';
import LoginPromptModal from './components/LoginPromptModal';
import PreferenceInputModal from './components/PreferenceInputModal';
import IntegrationGateways from './components/IntegrationGateways';
import ExtensionInstallPrompt from './components/ExtensionInstallPrompt';
import { DevFeedbackUI } from './components/DevFeedbackUI';
import DebugInfo from './components/DebugInfo';
import SocialProof from './components/SocialProof';
import LandingOptimization from './components/LandingOptimization';
import DailyRhythm from './components/DailyRhythm';
import VentingModePromo from './components/VentingModePromo';
import TheRhythmBlueprint from './components/TheRhythmBlueprint';
import FAQScreen from './components/FAQScreen';
import JumpStarLoading from './components/common/JumpStarLoading';
import SemanticFooter from './components/SemanticFooter';
import { Activity, Sparkles } from 'lucide-react';

// Check if running in Chrome Extension environment
const IS_EXTENSION = typeof window !== 'undefined' && !!(window as any).chrome?.runtime?.id;

// --- SHARED UI COMPONENTS (EXTRACTED) ---

const renderSnippet = (text: string) => {
  const parts = text.split(/\[h\](.*?)\[\/h\]/g);
  return parts.map((part, i) => (
    i % 2 === 1
      ? <span key={i} className="text-purple-600 dark:text-purple-400">{part}</span>
      : <span key={i}>{part}</span>
  ));
};

const Typewriter: React.FC<{ text: string; onComplete?: () => void }> = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);

        // Auto-scroll logic: Keep the container in view as it grows
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const isOffScreen = rect.bottom > window.innerHeight - 100;
          if (isOffScreen) {
            window.scrollBy({ top: 20, behavior: 'smooth' });
          }
        }
      }, 55); // Slightly faster for responsiveness
      return () => clearTimeout(timeout);
    } else if (onComplete && text.length > 0) {
      // Don't immediately complete to avoid the "swap flash"
      const finalDelay = setTimeout(() => onComplete(), 100);
      return () => clearTimeout(finalDelay);
    }
  }, [index, text, onComplete]);

  return <span ref={containerRef}>{renderSnippet(displayedText)}</span>;
};


const EmotionalPulsePerceiver: React.FC<{ emotion: EmotionType | null; currentLang: string }> = ({ emotion, currentLang }) => {
  const labels: Record<string, string> = {
    happy: '正在同步你的快乐能量...',
    neutral: '正在感知你的平静...',
    angry: '捕捉到了你的愤怒频率...',
    anxious: '感应到了你的焦虑状态...',
    sad: '正在接收你的伤感信号...',
    exhausted: '捕捉到了你的疲惫状态...'
  };

  const subLabels: Record<string, string> = {
    'Chinese (Simplified)': '正在感受你的情绪...',
    'English': 'Feeling your emotion...',
    'Japanese': 'あなたの感情を感じています...',
    'Korean': '당신의 감정을 느끼고 있습니다...',
    'German': 'Fühle deine Emotionen...',
    'French': 'Ressentir votre émotion...',
    'Spanish': 'Sintiendo tu emoción...',
    'Italian': 'Sentendo la tua emozione...',
    'Portuguese': 'Sentindo a sua emoção...'
  };

  const subLabel = subLabels[currentLang] || subLabels['English'];

  return (
    <div className="flex flex-col items-center justify-center animate-reveal h-full py-2">
      <div className="relative mb-4">
        {/* Subtle Outer Glow (Breathing) */}
        <div className="absolute inset-[-30px] bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-[25px] animate-breathing-light-glow" />

        {/* Central Breathing Light Container */}
        <div className="relative w-24 h-24 flex items-center justify-center bg-white/40 dark:bg-white/10 backdrop-blur-2xl rounded-full shadow-2xl border border-white/30 animate-breathing-light">
          <div className="w-16 h-16 animate-float-slow select-none flex items-center justify-center">
            {emotion ? (
              <img
                src={`/icons/emotions/${emotion}.png`}
                alt={emotion}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const emojiMap: Record<string, string> = {
                    happy: '😊',
                    neutral: '😌',
                    angry: '😠',
                    anxious: '😟',
                    sad: '😭',
                    exhausted: '😫'
                  };
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('span');
                  fallback.innerText = emojiMap[emotion as string] || '💭';
                  fallback.className = 'text-5xl';
                  e.currentTarget.parentElement?.appendChild(fallback);
                }}
              />
            ) : (
              <span className="text-5xl">💭</span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Caption */}
      <div className="text-lg md:text-xl font-medium tracking-tight text-black/80 dark:text-white/80 serif mb-2">
        {emotion ? labels[emotion] : '正在深度感应...'}
      </div>

      {/* Localized Sub-label (Small Text) */}
      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-black/30 dark:text-white/30">
        {subLabel}
      </div>
    </div>
  );
};

// --- App Component ---

const App: React.FC = () => {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('focus_tab_state');
    const systemTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    // Check for saved user in localStorage (from authService)
    let savedUser: User | null = null;
    try {
      const userStr = localStorage.getItem('focus_tab_user');
      console.log('[App] Initializing state. Stored user string:', userStr); // Debug log
      if (userStr) {
        savedUser = JSON.parse(userStr);
      }
    } catch (e) {
      console.error('[App] Failed to parse saved user', e);
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // CRITICAL: Validate that saved state belongs to current user
        // This prevents data leakage when switching accounts (e.g., Account B loading Account A's gateways)
        if (parsed.user && savedUser && parsed.user.id !== savedUser.id) {
          console.warn('[App] State user mismatch detected. Saved state user:', parsed.user.email, 'Current user:', savedUser.email);
          console.warn('[App] Using default state to prevent data leakage');

          // Return clean state with current user, preserving only theme/language preferences
          return {
            version: APP_VERSION,
            links: REGIONAL_DEFAULT_LINKS['GLOBAL'], // Temporary default, updated in useEffect
            requests: DEFAULT_REQUESTS,
            pinnedSnippetId: null,
            language: parsed.language || 'English',
            user: savedUser,
            theme: parsed.theme || systemTheme,
            selectedPersona: parsed.selectedPersona || 'soulmate',
          };
        }

        if (parsed.version === APP_VERSION) {
          // Use saved user from authService if available, otherwise null
          return {
            ...parsed,
            user: savedUser,
            selectedPersona: parsed.selectedPersona || 'soulmate'
          };
        }
      } catch (e) { console.error("Restore failed", e); }
    }
    return {
      version: APP_VERSION,
      links: REGIONAL_DEFAULT_LINKS['GLOBAL'], // Temporary default, updated in useEffect
      requests: DEFAULT_REQUESTS,
      pinnedSnippetId: null,
      language: 'English',
      user: savedUser, // Use saved user if available
      theme: systemTheme,
      selectedPersona: 'soulmate'
    };
  });

  const [region, setRegion] = useState<'CN' | 'GLOBAL'>('GLOBAL');

  const searchEngines = useMemo(() => REGIONAL_SEARCH_ENGINES[region], [region]);
  const defaultLinks = useMemo(() => REGIONAL_DEFAULT_LINKS[region], [region]);

  // Sync region on mount
  useEffect(() => {
    isChinaRegion().then(isCN => {
      const detectedRegion = isCN ? 'CN' : 'GLOBAL';
      setRegion(detectedRegion);

      // If it's the very first run (no saved state), update links
      const hasSavedState = !!localStorage.getItem('focus_tab_state');
      if (!hasSavedState) {
        setAppState(prev => ({
          ...prev,
          links: REGIONAL_DEFAULT_LINKS[detectedRegion]
        }));
      }

      // Update default search engine if not saved
      const savedEngine = localStorage.getItem('focus_tab_search_engine');
      if (!savedEngine) {
        setSelectedEngine(detectedRegion === 'CN' ? 'baidu' : 'google');
      }
    });
  }, []);

  const [currentSnippet, setCurrentSnippet] = useState<string | null>(null);
  const [currentSnippetIsMemoryEcho, setCurrentSnippetIsMemoryEcho] = useState<boolean>(false);
  const [currentSnippetEchoType, setCurrentSnippetEchoType] = useState<'node_2' | 'node_3' | undefined>();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [revealKey, setRevealKey] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPreferenceModalOpen, setIsPreferenceModalOpen] = useState(false);
  const [showInlineGuidance, setShowInlineGuidance] = useState(false);
  const [hasLocalPreference, setHasLocalPreference] = useState(false);
  const [shouldShakeHelper, setShouldShakeHelper] = useState(false);
  const { user: contextUser, setUser: setContextUser, isAuthChecking: isUserContextChecking } = useUser();
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [logoCacheVersion, setLogoCacheVersion] = useState(0); // triggers rerender when local logo cache changes across tabs

  const isAuthenticated = !!appState.user;

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>(() => {
    const saved = localStorage.getItem('focus_tab_search_engine');
    // If not saved, it will be set by the region effect
    return saved || 'google'; 
  });
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [isComposing, setIsComposing] = useState<boolean>(false); // 输入法组合状态
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const perspectiveTitleRef = useRef<HTMLHeadingElement>(null);
  const [isSingleLine, setIsSingleLine] = useState<boolean>(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastPromptIdRef = useRef<string | null>(null);
  const snippetRequestIdRef = useRef<number>(0);
  const didInitialSnippetFetchRef = useRef<boolean>(false);

  // Emotion & ECRA State
  const [isEmotionFrozen, setIsEmotionFrozen] = useState(false);
  const [isPerceiving, setIsPerceiving] = useState(false);
  const [isSootheActive, setIsSootheActive] = useState(false);
  const [showEmotionTooltip, setShowEmotionTooltip] = useState(false);
  const emotionTooltipShownRef = useRef(false);
  const [lastClickedEmotion, setLastClickedEmotion] = useState<EmotionType | null>(() => {
    return (localStorage.getItem('focus_tab_last_emotion') as EmotionType) || 'neutral';
  });
  const [isCompassHovered, setIsCompassHovered] = useState(false);
  const [isAuraActive, setIsAuraActive] = useState(false);
  const [compassHoverCount, setCompassHoverCount] = useState(0);
  const [hasInteractedWithCompass, setHasInteractedWithCompass] = useState<boolean>(() => {
    return localStorage.getItem('focus_tab_has_interacted_emotion') === 'true';
  });

  const [useTypewriter, setUseTypewriter] = useState(false);
  const [typewriterKey, setTypewriterKey] = useState(0);

  // Clear pools when language changes to prevent mix-ups (Reactive Safety)
  useEffect(() => {
    console.log('[App] Language changed to:', appState.language, '- Clearing perspective pools');
    clearAllPerspectivePools();
  }, [appState.language]);

  const currentSnippetStartTimeRef = useRef<number>(Date.now());
  const currentSnippetTrackRef = useRef<TrackType | null>(null);



  // Store latest appState in ref to avoid dependency issues in storage event listener
  const appStateRef = useRef<AppState>(appState);

  // Track if cloud sync is safe (prevent overwriting cloud data if fetch failed)
  const isCloudSyncSafeRef = useRef<boolean>(true);
  const hasAttemptedCloudSyncRef = useRef<boolean>(false);
  const lastActivityTimeRef = useRef<number>(Date.now());

  // Activity Tracking
  useEffect(() => {
    const updateActivity = () => {
      lastActivityTimeRef.current = Date.now();
    };
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    return () => {
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);

  // Handle reporting Dwell Time
  const reportDwellTime = useCallback((exitReason: 'REFRESH' | 'NAVIGATE' | 'EMOTION_CLICK' | 'HIDDEN') => {
    if (!currentSnippetTrackRef.current) return;
    const durationMs = Date.now() - currentSnippetStartTimeRef.current;

    updateTrackAffinity({
      userId: appState.user?.id,
      trackType: currentSnippetTrackRef.current,
      durationMs,
      exitReason
    }).catch(e => console.error('[App] Failed to update track affinity:', e));
  }, [appState.user]);

  // Hook for visibility and before unload tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        reportDwellTime('HIDDEN');
      } else {
        currentSnippetStartTimeRef.current = Date.now(); // Reset timer if coming back
      }
    };

    const handleBeforeUnload = () => {
      reportDwellTime('NAVIGATE');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [reportDwellTime]);

  // Keep ref in sync with appState
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    // ... (keep existing implementation)
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const saveState = useCallback(async (state: AppState | ((prev: AppState) => AppState), skipSync = false) => {
    // Handle functional updates - use setAppState's functional form
    let newState: AppState;

    if (typeof state === 'function') {
      // For functional updates, use setAppState to get the latest state
      // This ensures we always work with the most current state
      await new Promise<void>(resolve => {
        setAppState(prev => {
          newState = state(prev);
          // Update localStorage immediately
          localStorage.setItem('focus_tab_state', JSON.stringify({ ...newState, user: null }));
          resolve();
          return newState;
        });
      });
    } else {
      newState = state;
      // Always update local state immediately for responsive UI
      localStorage.setItem('focus_tab_state', JSON.stringify({ ...newState, user: null }));
      setAppState(newState);
    }

    // Sync to Supabase if user is logged in, not skipping, AND sync is safe
    if (newState.user && !skipSync) {
      if (!isCloudSyncSafeRef.current) {
        console.warn('[App] Skipping cloud sync because initial fetch failed (safety mode)');
        return;
      }

      setIsSyncing(true);
      try {
        await syncToCloud(newState);
        console.log('[App] State saved and synced to Supabase successfully');
      } catch (error) {
        console.error('[App] Failed to sync state to Supabase:', error);
        // Show error toast to user
        addToast('Failed to save changes. Please try again.', 'error');
        throw error; // Re-throw so caller can handle
      } finally {
        setIsSyncing(false);
      }
    }
  }, [addToast]);

  // Function to handle user login and data sync (extracted for reuse)
  const handleUserLogin = useCallback(async (user: User) => {
    console.log('[App] User authenticated:', user.email);
    // Clear explicit signout flag on successful login
    localStorage.removeItem('focus_tab_explicit_signout');

    // CRITICAL: Force Google to forget the "preferred" account by reinitializing
    // This prevents account reversion when switching between accounts
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        // Disable auto-select to force account picker on next login
        (window as any).google.accounts.id.disableAutoSelect();
        console.log('[App] Disabled auto-select to prevent account reversion');
      } catch (e) {
        console.warn('[App] Failed to disable auto-select', e);
      }
    }

    // Reset perspective count on login
    resetPerspectiveCount();
    // Clear local preference flag
    setHasLocalPreference(false);

    // Reset safety flag - prevent sync until successful fetch
    isCloudSyncSafeRef.current = false;

    setIsSyncing(true);

    try {
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

      // Check for pending local preference to migrate
      const pendingPreference = localStorage.getItem('startly_intention_pending');
      const localPreference = localStorage.getItem('startly_intention_local');
      const preferenceToMigrate = pendingPreference || localPreference;

      // Fetch cloud data + user gateway overrides
      const [cloudResult, gatewayOverrides] = await Promise.all([
        fetchFromCloud(user.id),
        fetchUserGatewayOverrides(user.id),
      ]);

      const overridesByCanonical: Record<string, typeof gatewayOverrides[number]> = {};
      for (const o of gatewayOverrides) {
        overridesByCanonical[o.canonical_url] = o;
      }

      // Use functional update to get latest state without dependency
      setAppState(prevState => {
        let requests = DEFAULT_REQUESTS;
        let cloudData: AppState | null = null;

        if (cloudResult.status === 'success') {
          cloudData = cloudResult.data as AppState;
          requests = cloudData.requests || DEFAULT_REQUESTS;
          isCloudSyncSafeRef.current = true;
          console.log('[App] Cloud data loaded successfully.');
        } else if (cloudResult.status === 'not_found' || cloudResult.status === 'error') {
          // If error (like 406), we still consider it "safe" to sync LATER, 
          // but we won't overwrite anything now.
          isCloudSyncSafeRef.current = cloudResult.status === 'not_found';
          console.log('[App] Cloud data status:', cloudResult.status);
        }

        // Migrate local preference
        if (preferenceToMigrate) {
          const newIntention = { id: `intention_${Date.now()}`, prompt: preferenceToMigrate, active: true };
          if (!requests.some(r => r.prompt === preferenceToMigrate)) {
            requests = [...requests, newIntention];
          }
          localStorage.removeItem('startly_intention_pending');
          localStorage.removeItem('startly_intention_local');
        }

        if (cloudData) {
          const linksWithOverrides = (cloudData.links || []).map((l: any) => {
            let canonicalUrl = l.canonicalUrl || l.url;
            try { canonicalUrl = l.canonicalUrl || canonicalizeUrl(l.url); } catch { }
            const ov = overridesByCanonical[canonicalUrl];
            return {
              ...l,
              canonicalUrl,
              customTitle: ov?.custom_title ?? l.customTitle ?? null,
              customLogoPath: ov?.custom_logo_path ?? l.customLogoPath ?? null,
              customLogoUrl: ov?.custom_logo_url ?? l.customLogoUrl ?? null,
              customLogoSignedUrl: ov?.custom_logo_signed_url ?? l.customLogoSignedUrl ?? null,
              customLogoHash: ov?.custom_logo_hash ?? l.customLogoHash ?? null,
            };
          });

          const mergedState = {
            ...prevState,
            links: linksWithOverrides,
            requests: requests,
            language: cloudData.language || prevState.language,
            theme: cloudData.theme || prevState.theme,
            user: userWithAllData,
            subscriptionTier,
            version: cloudData.version || prevState.version,
            pinnedSnippetId: cloudData.pinnedSnippetId || prevState.pinnedSnippetId,
          };
          localStorage.setItem('focus_tab_state', JSON.stringify({ ...mergedState, user: null }));

          // ONLY update context if data truly changed to prevent infinite loops
          const contextNeedsUpdate = !contextUser || 
            contextUser.id !== userWithAllData.id || 
            contextUser.isSubscribed !== userWithAllData.isSubscribed ||
            (!contextUser.emailVerified && userWithAllData.emailVerified);

          if (contextNeedsUpdate) {
            console.log('[App] Updating UserContext with fresh user data');
            setContextUser(userWithAllData);
          }

          if (preferenceToMigrate) {
            setTimeout(() => { fetchRandomSnippet(true); }, 500);
          }

          return mergedState;
        } else {
          // Fallback for new user or load error
          const stateWithUser: AppState = {
            ...prevState,
            links: REGIONAL_DEFAULT_LINKS[region],
            requests: requests,
            user: userWithAllData,
            subscriptionTier,
          };

          if (isCloudSyncSafeRef.current) {
            syncToCloud(stateWithUser).catch(err => console.error('[App] Initial sync failed:', err));
          }

          // Sync if mismatch
          if (!contextUser || contextUser.id !== userWithAllData.id || (!contextUser.emailVerified && userWithAllData.emailVerified)) {
            setContextUser(userWithAllData);
          }

          return stateWithUser;
        }
      });
    } catch (err) {
      console.error('[App] handleUserLogin failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [saveState]); // Removed appState dependency

  const handleSignIn = () => {
    // Navigate to the dedicated login page (Firebase Auth)
    navigate('/login');
  };

  const handleSignOut = useCallback(() => {
    // 1. Clear auth token/session
    signOutUser();
    setContextUser(null); // Sync with UserContext

    // Set explicit signout flag to prevent auto-login on refresh
    localStorage.setItem('focus_tab_explicit_signout', 'true');

    // 2. Reset AppState to defaults to prevent data leakage
    // We keep theme and language as they are device-specific preferences
    setAppState(prev => {
      const resetState: AppState = {
        version: prev.version,
        user: null,
        links: REGIONAL_DEFAULT_LINKS[region],
        requests: DEFAULT_REQUESTS,
        pinnedSnippetId: null,
        language: prev.language,
        theme: prev.theme,
        selectedPersona: prev.selectedPersona,
        subscriptionTier: 'authenticated_free', // Reset tier
      };

      // 3. Immediately update localStorage with the reset state to ensure
      // that a refresh loads this clean state, not the old user state.
      localStorage.setItem('focus_tab_state', JSON.stringify({ ...resetState, user: null }));

      return resetState;
    });

    setIsSettingsOpen(false);
    addToast('Signed out successfully', 'info');
  }, [addToast]);




  const fetchRandomSnippet = useCallback(async (bypassLimit: boolean = false, clickedEmotion?: EmotionType) => {
    if (isGenerating) {
      console.warn('[App] Request rejected: isGenerating is TRUE');
      return;
    }

    // Check usage limits before generating (unless bypassing for immediate refresh after preference save)
    if (!bypassLimit) {
      const limitCheck = canGeneratePerspective(appState);
      if (!limitCheck.allowed) {
        console.warn('[App] Request rejected: Limit reached', limitCheck.reason);
        if (limitCheck.reason === 'context_needed') {
          // Show inline guidance instead of blocking
          setShowInlineGuidance(true);
          // Trigger shake animation when user tries to click but is blocked
          setShouldShakeHelper(true);
          setTimeout(() => setShouldShakeHelper(false), 600);
          return;
        }
        return;
      }
    }

    // If inline guidance is showing and user clicks (but not blocked), trigger shake only
    // Don't refresh content, just shake to draw attention
    if (!bypassLimit && !isAuthenticated && (showInlineGuidance || hasLocalPreference)) {
      setShouldShakeHelper(true);
      setTimeout(() => setShouldShakeHelper(false), 600);
      return; // Don't proceed with content generation
    }

    // Get active requests, including local preference for unauthenticated users
    let activeRequests = appState.requests.filter(r => r.active);

    // Check for local preference for unauthenticated users
    if (!appState.user) {
      const localPreference = localStorage.getItem('startly_intention_local');
      if (localPreference) {
        // Use local preference as a temporary active request
        activeRequests = [{
          id: 'local_preference',
          prompt: localPreference,
          active: true
        }];
      }
    }

    // --- CASE 1: Empty Intentions Fallback ---
    // User deleted everything? We give them the defaults so they aren't staring at a blank engine.
    if (activeRequests.length === 0) {
      activeRequests = DEFAULT_REQUESTS;
    }

    // --- CASE 2: Balanced Intention Selection Algorithm ---
    // Objective: Avoid repetitive "vibes" if a user has 5 intentions.
    // Calculate fatigue factors based on history.
    const history = loadHistory();
    const promptHistory = history.slice(0, 15).map(h => h.promptId);

    // Weighting logic:
    // Start with 100 points per request.
    // - Minus 80 if it was the very last one.
    // - Minus 40 for every other occurrence in the last 15 items.
    const eligibleWithWeights = activeRequests.map(req => {
      let weight = 100;

      // 1. Immediate repetition penalty
      if (req.id === lastPromptIdRef.current) weight -= 90;

      // 2. Frequency fatigue penalty
      const occurrences = promptHistory.filter(id => id === req.id).length;
      weight -= occurrences * 30;

      return { req, weight: Math.max(5, weight) };
    });

    // Simple weighted pick
    const totalWeight = eligibleWithWeights.reduce((sum, item) => sum + item.weight, 0);
    let randomValue = Math.random() * totalWeight;
    let selectedReq = activeRequests[0];

    for (const item of eligibleWithWeights) {
      randomValue -= item.weight;
      if (randomValue <= 0) {
        selectedReq = item.req;
        break;
      }
    }

    const randomReq = selectedReq;
    lastPromptIdRef.current = randomReq.id;

    const requestId = ++snippetRequestIdRef.current;
    setIsGenerating(true);
    // Show loading while generating (prevents stale content flashes)
    setCurrentSnippet(null);

    try {
      // Increment perspective count for unauthenticated users (only if not bypassing)
      if (!appState.user && !bypassLimit) {
        const newCount = incrementPerspectiveCount();
        // Update inline guidance state when count reaches threshold
        if (newCount >= 2) {
          setShowInlineGuidance(true);
        }
      }

      // Load recent history to prevent repetition
      const history = loadHistory();

      console.log('[App] Generating new perspective...', {
        prompt: randomReq.prompt.substring(0, 30),
        language: appState.language,
        historyCount: history.length,
        timestamp: Date.now()
      });

      // Fetch Battery Level (Best Effort)
      let batteryLevel: number | undefined;
      // @ts-ignore
      if (typeof navigator.getBattery === 'function') {
        try {
          // @ts-ignore
          const battery = await navigator.getBattery();
          batteryLevel = Math.round(battery.level * 100);
        } catch (e) {
          console.warn('[App] Battery access failed', e);
        }
      }

      // Enhanced Context Detection (V4.0)
      let tabCount: number | undefined;
      let audioPlaying: boolean | undefined;
      let isMuted: boolean | undefined;
      let isFullscreen: boolean | undefined;
      let windowState: 'normal' | 'minimized' | 'maximized' | 'fullscreen' | undefined;
      let downloadActive: boolean | undefined;

      // Detect browser state if in chrome extension
      const _chrome = (window as any).chrome;
      if (typeof _chrome !== 'undefined' && _chrome.tabs) {
        try {
          const tabs = await _chrome.tabs.query({});
          tabCount = tabs.length;
          audioPlaying = tabs.some((t: any) => t.audible);
          isMuted = tabs.every((t: any) => t.mutedInfo?.muted);

          const lastWindow = await _chrome.windows.getLastFocused();
          windowState = lastWindow.state;
          isFullscreen = lastWindow.state === 'fullscreen';

          const downloads = await _chrome.downloads.search({ state: 'in_progress' });
          downloadActive = downloads.length > 0;
        } catch (e) {
          console.warn('[App] Browser extension API access failed', e);
        }
      }

      const idleTimeSeconds = Math.floor((Date.now() - lastActivityTimeRef.current) / 1000);

      // Calculate Router Context
      const now = new Date();
      const context: any = {
        local_time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), // HH:MM
        weekday: now.getDay(),
        is_weekend: now.getDay() === 0 || now.getDay() === 6,
        session_count_today: getSessionCountToday(history),
        minutes_since_last: getMinutesSinceLast(history),
        late_night_streak: getLateNightStreak(history),
        work_mode_disabled: false,
        custom_themes: appState.requests.filter(r => r.active).map(r => r.prompt),
        language: appState.language,
        recent_history: history,
        weather: 'Unknown',
        battery_level: batteryLevel,
        clickedEmotion: clickedEmotion,
        emotionalBaseline: calculateEmotionalBaseline(),
        emotionalPatterns: analyzeEmotionalPatterns(),
        bypassPool: !!clickedEmotion, // Only bypass pool for emotion clicks
        deepObservationMode: getTodayEmotionClickCount() > 5,
        // V4.0 Digital Context
        tab_count: tabCount,
        audio_playing: audioPlaying,
        is_muted: isMuted,
        is_fullscreen: isFullscreen,
        window_state: windowState,
        idle_time_seconds: idleTimeSeconds,
        download_active: downloadActive,
        selectedPersona: appState.selectedPersona || 'soulmate',
      };

      // --- NORMAL MODE: Real AI Generation ---
      const response = await generateSnippet(context);
      const result = response.text;
      const plan = response.plan;

      // Only apply the latest in-flight request result
      if (requestId !== snippetRequestIdRef.current) return;

      console.log('[App] Generated perspective:', result.substring(0, 50));

      const updatedHistory = addToHistory(result, randomReq.id, history, {
        intent: plan?.intent,
        style: plan?.style,
        theme: plan?.selected_theme,
        dimension: plan?.cached_item?.dimension,
        // Hack: infer track from style mapping if backend isn't sending it directly yet
        trackType: (plan?.cached_item?.track as TrackType) || 'A_PHYSICAL'
      });
      saveHistory(updatedHistory);

      // Report Dwell Time for previous item
      if (currentSnippetTrackRef.current) {
        reportDwellTime(clickedEmotion ? 'EMOTION_CLICK' : 'REFRESH');
      }

      currentSnippetTrackRef.current = updatedHistory[0].trackType || null;
      currentSnippetStartTimeRef.current = Date.now();

      setCurrentSnippet(result);
      setCurrentSnippetIsMemoryEcho(plan?.cached_item?.is_memory_echo || false);
      setCurrentSnippetEchoType(plan?.cached_item?.echo_type);

      // Only bump revealKey for generic refreshes to trigger 'animate-reveal'
      // For emotions, we use the internal Typewriter/reveal system
      if (!clickedEmotion) {
        setRevealKey(prev => prev + 1);
      }
    } catch (error) {
      if (requestId !== snippetRequestIdRef.current) return;
      console.error('[App] Error generating perspective:', error);
      addToast('Failed to generate perspective', 'error');
    } finally {
      if (requestId === snippetRequestIdRef.current) {
        setIsGenerating(false);
      }
    }
  }, [appState, reportDwellTime, isAuthenticated, showInlineGuidance, hasLocalPreference, isGenerating]);

  const renderSnippet = (text: string) => {
    const parts = text.split(/\[h\](.*?)\[\/h\]/g);
    return parts.map((part, i) => (
      i % 2 === 1
        ? <span key={i} className="text-purple-600 dark:text-purple-400">{part}</span>
        : <span key={i}>{part}</span>
    ));
  };

  // Jump loading (inspired by the reference): a soft "jumping star" with squash + shadow
  // Theme sync effect
  useEffect(() => {
    if (appState.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    if (!isAuthenticated && !isSettingsOpen) {
      // Login is now handled via the /login page
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

    const engine = searchEngines.find(e => e.id === selectedEngine) || searchEngines[0];
    const searchUrl = `${engine.searchUrl}${encodeURIComponent(searchQuery.trim())}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
    setSearchQuery(''); // 搜索后清空输入框
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 如果正在输入法组合输入中，不处理回车键（让输入法先确认输入）
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault(); // 防止默认行为
      handleSearch();
    }
  };

  // 处理输入法组合开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 处理输入法组合结束
  const handleCompositionEnd = () => {
    setIsComposing(false);
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

  // Helper: Draw marker-style highlight with hand-drawn look
  const drawMarkerHighlight = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ) => {
    ctx.save();

    // Create hand-drawn effect with slight randomness
    const offset = 2; // Slight offset for hand-drawn feel
    const points: Array<{ x: number, y: number }> = [];

    // Top edge with slight variation
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const baseX = x + t * width;
      const baseY = y;
      points.push({
        x: baseX + (Math.random() - 0.5) * offset,
        y: baseY + (Math.random() - 0.5) * offset
      });
    }

    // Right edge
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const baseX = x + width;
      const baseY = y + t * height;
      points.push({
        x: baseX + (Math.random() - 0.5) * offset,
        y: baseY + (Math.random() - 0.5) * offset
      });
    }

    // Bottom edge (reverse)
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const baseX = x + t * width;
      const baseY = y + height;
      points.push({
        x: baseX + (Math.random() - 0.5) * offset,
        y: baseY + (Math.random() - 0.5) * offset
      });
    }

    // Left edge (reverse)
    for (let i = 5; i >= 0; i--) {
      const t = i / 5;
      const baseX = x;
      const baseY = y + t * height;
      points.push({
        x: baseX + (Math.random() - 0.5) * offset,
        y: baseY + (Math.random() - 0.5) * offset
      });
    }

    // Draw filled shape
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25; // Semi-transparent
    ctx.fill();
    ctx.restore();
  };

  // Helper: Generate avatar with first letter
  const generateAvatar = (ctx: CanvasRenderingContext2D, letter: string, size: number, x: number, y: number) => {
    // Draw circle background with gradient
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#E8E8E8');
    gradient.addColorStop(1, '#D0D0D0');

    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw letter
    ctx.fillStyle = '#666666';
    ctx.font = `500 ${size * 0.5}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter.toUpperCase(), x + size / 2, y + size / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  };

  // Helper: Parse quote with highlights and measure text
  const parseQuoteWithHighlights = (text: string) => {
    const parts: Array<{ text: string, highlighted: boolean }> = [];
    const regex = /\[h\](.*?)\[\/h\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before highlight
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), highlighted: false });
      }
      // Add highlighted text
      parts.push({ text: match[1], highlighted: true });
      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), highlighted: false });
    }

    // If no highlights found, treat entire text as non-highlighted
    if (parts.length === 0) {
      parts.push({ text, highlighted: false });
    }

    return parts;
  };

  // Helper: Draw StartlyTab homepage mockup
  const drawHomepageMockup = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const radius = 12;

    // Draw rounded rectangle background
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Browser chrome (top bar)
    const chromeHeight = 50;
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(x, y, width, chromeHeight);

    // Window controls
    const controlSize = 12;
    const controlY = y + chromeHeight / 2 - controlSize / 2;
    const controlSpacing = 18;
    const controlStartX = x + 20;

    // Red, yellow, green circles
    ctx.beginPath();
    ctx.arc(controlStartX, controlY + controlSize / 2, controlSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FF5F57';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(controlStartX + controlSpacing, controlY + controlSize / 2, controlSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFBD2E';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(controlStartX + controlSpacing * 2, controlY + controlSize / 2, controlSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#28CA42';
    ctx.fill();

    // Tab
    const tabWidth = 120;
    const tabHeight = 35;
    const tabX = x + 60;
    const tabY = y + chromeHeight;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tabX, tabY, tabWidth, tabHeight);

    // Tab content (icon + text)
    ctx.fillStyle = '#FF9500';
    ctx.font = '400 14px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('●', tabX + 10, tabY + tabHeight / 2 + 5);
    ctx.fillStyle = '#333333';
    ctx.fillText('StartlyTab', tabX + 25, tabY + tabHeight / 2 + 5);

    // Search bar
    const searchY = y + chromeHeight + tabHeight + 40;
    const searchHeight = 50;
    const searchPadding = 40;

    ctx.fillStyle = '#F8F8F8';
    ctx.fillRect(x + searchPadding, searchY, width - searchPadding * 2, searchHeight);

    // Search icon
    ctx.fillStyle = '#999999';
    ctx.font = '400 16px "Inter", sans-serif';
    ctx.fillText('🔍', x + searchPadding + 15, searchY + searchHeight / 2 + 5);

    // Search placeholder
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('Search', x + searchPadding + 40, searchY + searchHeight / 2 + 5);

    // Main quote area (centered)
    const quoteY = searchY + searchHeight + 60;
    ctx.fillStyle = '#111111';
    ctx.font = '400 32px "Instrument Serif", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Rest is not idleness,', width / 2, quoteY);
    ctx.fillText('but a necessary pause.', width / 2, quoteY + 45);

    // Action buttons
    const buttonY = quoteY + 100;
    const buttonWidth = 140;
    const buttonHeight = 40;
    const buttonSpacing = 20;

    // "NEW PERSPECTIVE" button
    ctx.fillStyle = '#000000';
    ctx.fillRect(width / 2 - buttonWidth - buttonSpacing / 2, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEW PERSPECTIVE', width / 2 - buttonSpacing / 2, buttonY + buttonHeight / 2 + 3);

    // "SHARE QUOTE" button
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.strokeRect(width / 2 + buttonSpacing / 2, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = '#666666';
    ctx.fillText('SHARE QUOTE', width / 2 + buttonWidth / 2 + buttonSpacing / 2, buttonY + buttonHeight / 2 + 3);

    // "Intentional Gateways" section
    const gatewaysY = buttonY + buttonHeight + 60;
    ctx.fillStyle = '#111111';
    ctx.font = '400 20px "Instrument Serif", serif';
    ctx.textAlign = 'left';
    ctx.fillText('Intentional Gateways', x + searchPadding, gatewaysY);

    ctx.fillStyle = '#999999';
    ctx.font = '400 12px "Inter", sans-serif';
    ctx.fillText('Your personal shortcuts, always ready.', x + searchPadding, gatewaysY + 30);

    // Gateway icons
    const iconSize = 32;
    const iconSpacing = 50;
    const iconsStartX = x + searchPadding;
    const iconsY = gatewaysY + 50;

    const icons = ['●', '●', '●', '●', '●'];
    icons.forEach((icon, i) => {
      ctx.fillStyle = '#E0E0E0';
      ctx.fillRect(iconsStartX + i * iconSpacing, iconsY, iconSize, iconSize);
      ctx.fillStyle = '#999999';
      ctx.font = '400 16px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(icon, iconsStartX + i * iconSpacing + iconSize / 2, iconsY + iconSize / 2 + 5);
    });

    ctx.textAlign = 'left';

    // Subtle shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = 'transparent';
    ctx.fill();
    ctx.restore();
  };

  const createShareCard = async (quote: string) => {
    // Ensure fonts are loaded before rendering
    await document.fonts.ready;

    const width = 1080;
    const horizontalPadding = width * 0.12; // 12% padding
    const maxContentWidth = width - horizontalPadding * 2;

    // Parse quote to identify highlighted sections
    const quoteParts = parseQuoteWithHighlights(quote);
    const cleanQuote = quote.replace(/\[h\](.*?)\[\/h\]/g, '$1');

    // Setup canvas for measurement
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    if (!measureCtx) return null;

    // Measure quote height
    measureCtx.font = '400 72px "Instrument Serif", serif';
    const quoteLineHeight = 100;
    const quoteLines = wrapText(measureCtx, cleanQuote, maxContentWidth);
    const quoteHeight = quoteLines.length * quoteLineHeight + 40; // Extra padding

    // Calculate adaptive height
    const topSectionHeight = 160 + quoteHeight; // Top padding + quote
    const userSectionHeight = 120; // Avatar + text
    const spacingBetweenSections = 80;
    const homepageMockupHeight = 450;
    const productInfoHeight = 180;
    const bottomPadding = 100;

    const totalHeight = topSectionHeight + spacingBetweenSections + userSectionHeight +
      spacingBetweenSections + homepageMockupHeight + spacingBetweenSections +
      productInfoHeight + bottomPadding;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background - off-white / very light warm gray
    ctx.fillStyle = '#FAFAF8';
    ctx.fillRect(0, 0, width, totalHeight);

    let currentY = 120; // Start from top

    // ========== 1. TOP SECTION - PERSPECTIVE QUOTE ==========

    // Large quotation mark accent (top left)
    ctx.fillStyle = '#E8E8E6';
    ctx.font = '400 140px "Instrument Serif", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('"', horizontalPadding, currentY - 30);

    // Quote text with marker highlights
    ctx.font = '400 72px "Instrument Serif", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Marker colors (warm beige, soft pastel yellow, light lavender)
    const markerColors = ['#F5E6D3', '#FFF8DC', '#E6E6FA'];
    let markerColorIndex = 0;

    // Calculate highlight positions by processing quote parts line by line
    const highlightRects: Array<{ x: number, y: number, width: number, height: number, color: string }> = [];
    const quoteStartY = currentY;

    // Process each line and find highlighted segments
    quoteLines.forEach((line, lineIndex) => {
      const lineY = quoteStartY + lineIndex * quoteLineHeight;

      // Check each quote part to see if it appears in this line
      quoteParts.forEach((part) => {
        if (part.highlighted && part.text.trim()) {
          const partText = part.text.trim();

          // Find if this highlighted text appears in current line
          const partIndex = line.indexOf(partText);
          if (partIndex !== -1) {
            // Calculate position
            const beforeText = line.substring(0, partIndex);
            const highlightX = horizontalPadding + ctx.measureText(beforeText).width;
            const highlightWidth = ctx.measureText(partText).width;
            const highlightHeight = 72 * 0.85;

            highlightRects.push({
              x: highlightX - 8,
              y: lineY - highlightHeight * 0.15,
              width: highlightWidth + 16,
              height: highlightHeight,
              color: markerColors[markerColorIndex % markerColors.length]
            });

            markerColorIndex++;
          }
        }
      });
    });

    // Draw highlights first (behind text)
    highlightRects.forEach(rect => {
      drawMarkerHighlight(ctx, rect.x, rect.y, rect.width, rect.height, rect.color);
    });

    // Draw text on top
    ctx.fillStyle = '#1A1A1A';
    quoteLines.forEach((line, index) => {
      ctx.fillText(line, horizontalPadding, quoteStartY + (index * quoteLineHeight));
    });

    currentY += quoteHeight + 100; // Spacing after quote

    // ========== 2. MIDDLE SECTION - USER IDENTITY ==========

    const user = appState.user;
    const avatarSize = 64;
    const avatarX = horizontalPadding;
    const avatarY = currentY;

    if (user) {
      // Draw avatar
      if (user.picture) {
        // Try to load user picture
        try {
          const avatarImg = new Image();
          avatarImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            avatarImg.onload = () => resolve();
            avatarImg.onerror = () => resolve();
            avatarImg.src = user.picture;
          });

          if (avatarImg.complete && avatarImg.naturalWidth > 0) {
            // Draw circular avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
          } else {
            // Fallback to letter avatar
            const firstLetter = (user.name || user.email || 'U')[0];
            generateAvatar(ctx, firstLetter, avatarSize, avatarX, avatarY);
          }
        } catch {
          // Fallback to letter avatar
          const firstLetter = (user.name || user.email || 'U')[0];
          generateAvatar(ctx, firstLetter, avatarSize, avatarX, avatarY);
        }
      } else {
        // Generate letter avatar
        const firstLetter = (user.name || user.email || 'U')[0];
        generateAvatar(ctx, firstLetter, avatarSize, avatarX, avatarY);
      }

      // User name or masked email
      const textX = avatarX + avatarSize + 20;
      const textY = avatarY + 8;

      ctx.fillStyle = '#2A2A2A';
      ctx.font = '500 20px "Inter", sans-serif';
      ctx.textAlign = 'left';

      const displayName = user.name || (user.email ? `${user.email.split('@')[0].substring(0, 1)}***@${user.email.split('@')[1]}` : 'User');
      ctx.fillText(displayName, textX, textY);

      // Secondary line: "Shared via StartlyTab"
      ctx.fillStyle = '#888888';
      ctx.font = '400 14px "Inter", sans-serif';
      ctx.fillText('Shared via StartlyTab', textX, textY + 32);
    } else {
      // No user - show generic
      generateAvatar(ctx, 'U', avatarSize, avatarX, avatarY);
      ctx.fillStyle = '#2A2A2A';
      ctx.font = '500 20px "Inter", sans-serif';
      ctx.fillText('Shared via StartlyTab', avatarX + avatarSize + 20, avatarY + 20);
    }

    currentY += userSectionHeight + spacingBetweenSections;

    // ========== 3. BOTTOM SECTION - PRODUCT PROMOTION ==========

    // Homepage mockup
    const mockupWidth = width * 0.85;
    const mockupHeight = homepageMockupHeight;
    const mockupX = (width - mockupWidth) / 2;
    const mockupY = currentY;

    drawHomepageMockup(ctx, mockupX, mockupY, mockupWidth, mockupHeight);

    currentY += mockupHeight + spacingBetweenSections;

    // Product info (centered)
    ctx.textAlign = 'center';

    // Product name: StartlyTab
    ctx.fillStyle = '#1A1A1A';
    ctx.font = '500 36px "Inter", sans-serif';
    ctx.fillText('StartlyTab', width / 2, currentY);
    currentY += 50;

    // Slogan: Start your day softly
    ctx.fillStyle = '#666666';
    ctx.font = '400 22px "Inter", sans-serif';
    ctx.fillText('Start your day softly', width / 2, currentY);
    currentY += 50;

    // Positioning line
    ctx.fillStyle = '#777777';
    ctx.font = '400 18px "Inter", sans-serif';
    ctx.fillText('A warm browser start page for focused minds.', width / 2, currentY);
    currentY += 50;

    // Website URL
    ctx.fillStyle = '#555555';
    ctx.font = '400 18px "Inter", sans-serif';
    ctx.fillText('www.startlytab.com', width / 2, currentY);

    ctx.textAlign = 'left'; // Reset

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  };

  const currentEngine = searchEngines.find(e => e.id === selectedEngine) || searchEngines[0];
  const [isSharing, setIsSharing] = useState(false);
  const visibleLinks = appState.links.slice(0, 10);
  const remainingLinks = Math.max(0, appState.links.length - visibleLinks.length);

  const handleEmotionClick = async (emotion: EmotionType) => {
    if (isEmotionFrozen) return;

    // 1. Force state reset and clear tooltips
    setIsCompassHovered(false);
    setShowEmotionTooltip(false);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }

    // 2. Lock UI & Selected State
    setIsEmotionFrozen(true);
    setLastClickedEmotion(emotion);
    localStorage.setItem('focus_tab_last_emotion', emotion);

    if (!hasInteractedWithCompass) {
      setHasInteractedWithCompass(true);
      localStorage.setItem('focus_tab_has_interacted_emotion', 'true');
    }

    // 3. Central Text Transition - Perception Stage
    setCurrentSnippet(null);
    setIsPerceiving(true);
    setUseTypewriter(true);
    setTypewriterKey(prev => prev + 1);

    // 4. Background Micro-feedback
    if (emotion === 'angry' || emotion === 'anxious' || emotion === 'sad' || emotion === 'exhausted') {
      setIsSootheActive(true);
      setTimeout(() => setIsSootheActive(false), 4500);
    }

    // 5. Trigger Aura Animation
    setIsAuraActive(true);
    setTimeout(() => setIsAuraActive(false), 2000);

    const now = new Date();
    const timeSlot = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    saveEmotionLog(emotion, timeSlot);

    // 6. Brief Pause (0.5s) for "Perceiving" animation start
    await new Promise(resolve => setTimeout(resolve, 500));

    // 6. Mandatory "Sensing" Duration (min 1.5s total)
    const senseStart = Date.now();

    // 7. Fetch with Bypass & Generate
    // We already set useTypewriter to true and incremented typewriterKey above
    await fetchRandomSnippet(true, emotion);

    // Ensure users can actually read the sensing prompt
    const elapsed = Date.now() - senseStart;
    if (elapsed < 1500) {
      await new Promise(resolve => setTimeout(resolve, 1500 - elapsed));
    }

    // 8. Exit sensing phase
    setIsPerceiving(false);

    // 9. Cool-down to prevent rapid re-clicks
    setTimeout(() => {
      setIsEmotionFrozen(false);
    }, 3000);
  };

  // Detect if perspective text is single line
  useEffect(() => {
    if (!currentSnippet) {
      setIsSingleLine(false);
      return;
    }

    const checkSingleLine = () => {
      if (perspectiveTitleRef.current) {
        const element = perspectiveTitleRef.current;
        // Compare scrollHeight with line-height to detect if text wraps
        const lineHeight = parseFloat(window.getComputedStyle(element).lineHeight);
        const scrollHeight = element.scrollHeight;
        // If scrollHeight is less than or equal to 1.5 * lineHeight, it's likely single line
        // Using 1.5 to account for slight variations
        setIsSingleLine(scrollHeight <= lineHeight * 1.5);
      }
    };

    // Check after render and when snippet changes
    const timeoutId = setTimeout(checkSingleLine, 100);
    window.addEventListener('resize', checkSingleLine);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkSingleLine);
    };
  }, [currentSnippet, revealKey]);

  useEffect(() => {
    // Rely exclusively on UserContext to manage the overall authentication flow
    // and just render the Google Button when we know the user is completely logged out.

    if (didInitialSnippetFetchRef.current === false) {
      didInitialSnippetFetchRef.current = true;
      fetchRandomSnippet();
    }

    if (!isUserContextChecking && !appState.user) {
      console.log('[App] No user, directing to /login page for authentication');
    }
  }, [isUserContextChecking, appState.user]);

  // Listen for cross-tab storage changes (when user logs in/out in another tab)
  useEffect(() => {
    let isProcessing = false; // Flag to prevent concurrent processing

    const handleStorageChange = async (e: StorageEvent) => {
      // Handle changes to focus_tab_user (login/logout)
      if (e.key === 'focus_tab_user') {
        // Prevent concurrent processing
        if (isProcessing) {
          console.log('[App] Storage event already processing, skipping...');
          return;
        }

        isProcessing = true;
        console.log('[App] Detected user login/logout in another tab, syncing...');

        try {
          // Check if user state changed
          let newUser: User | null = null;
          if (e.newValue) {
            try {
              newUser = JSON.parse(e.newValue);
            } catch (error) {
              console.error('[App] Failed to parse user from storage event:', error);
              isProcessing = false;
              return;
            }
          }

          // Use ref to get latest state without causing re-renders
          const currentState = appStateRef.current;
          const currentUser = currentState.user;
          const currentUserId = currentUser?.id || null;
          const newUserId = newUser?.id || null;

          // Only update if user state actually changed (including verification status)
          // We only care about: logout, login, or unverified -> verified transition.
          // We STERNLY ignore verified -> unverified transitions to prevent stale state loops.
          const currentIsVerified = !!currentUser?.emailVerified;
          const newIsVerified = !!newUser?.emailVerified;
          
          const hasUserIdChanged = currentUserId !== newUserId;
          const verificationStatusImproved = !currentIsVerified && newIsVerified;
          
          if (hasUserIdChanged || verificationStatusImproved) {
            console.log('[App] User state change significant, syncing...', {
              idChanged: hasUserIdChanged,
              verificationImproved: verificationStatusImproved
            });

            if (newUser) {
              // User logged in in another tab
              console.log('[App] User logged in in another tab, updating state...');
              setIsAuthChecking(true);
              await handleUserLogin(newUser);
              setIsAuthChecking(false);
              addToast('Logged in from another tab', 'success');
            } else {
              // User logged out in another tab
              console.log('[App] User logged out in another tab, updating state...');
              // Use functional update to avoid dependency on appState
              setAppState(prevState => {
                const newState = {
                  ...prevState,
                  user: null,
                  subscriptionTier: undefined,
                  links: REGIONAL_DEFAULT_LINKS[region],
                  requests: DEFAULT_REQUESTS
                };
                // Save state asynchronously without blocking
                saveState(newState, true).catch(err => console.error('[App] Failed to save logout state:', err));
                return newState;
              });
              addToast('Logged out from another tab', 'info');
            }
          } else {
            console.log('[App] User state unchanged, skipping update');
          }
        } finally {
          isProcessing = false;
        }
      }

      // Handle changes to focus_tab_state (Gateway data changes)
      if (e.key === 'focus_tab_state') {
        // 防止当前标签页触发（storage 事件只在其他标签页触发）
        if (!e.newValue) return;

        try {
          const newStateData = JSON.parse(e.newValue);
          const currentState = appStateRef.current;

          // 只同步 Gateway 相关的数据（links）
          // 避免覆盖其他状态（如 currentSnippet 等）
          if (newStateData.links &&
            JSON.stringify(newStateData.links) !== JSON.stringify(currentState.links)) {
            console.log('[App] Detected Gateway changes in another tab, syncing...');

            setAppState(prevState => ({
              ...prevState,
              links: newStateData.links || prevState.links,
              // 保持其他状态不变
            }));

            // 可选：显示提示（为了不打扰用户，这里不显示）
            // addToast('Gateway updated from another tab', 'info');
          }
        } catch (error) {
          console.error('[App] Failed to parse state from storage event:', error);
        }
      }

      // Handle explicit sign-out flag (migrated from legacy listener)
      if (e.key === 'focus_tab_explicit_signout' && e.newValue === 'true') {
        const currentUser = appStateRef.current.user;
        if (currentUser) {
          console.log('[App] Explicit sign out detected from another tab');
          // Reset state
          handleSignOut(); // Re-use handleSignOut function for consistency
        }
      }

      // Handle changes to local gateway logo cache (cross-tab UI refresh)
      if (e.key === 'focus_tab_gateway_logo_cache') {
        setLogoCacheVersion(v => v + 1);
      }
    };

    // Listen for storage events from other tabs
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleUserLogin, saveState, addToast]); // Removed appState from dependencies

  // Check if should show inline guidance on mount and when perspective count changes
  useEffect(() => {
    if (!isAuthenticated) {
      const count = getPerspectiveCount();
      // Only show if user has actually clicked 2 times (not just on page load)
      // This prevents showing on first visit when count might be stale
      if (count >= 2) {
        setShowInlineGuidance(true);
      } else {
        setShowInlineGuidance(false);
      }

      // Check for local preference
      const localPref = localStorage.getItem('startly_intention_local');
      setHasLocalPreference(!!localPref);
    } else {
      setShowInlineGuidance(false);
      setHasLocalPreference(false);
    }
  }, [isAuthenticated]);

  // Also check when perspective count changes (after increment)
  useEffect(() => {
    if (!isAuthenticated) {
      const count = getPerspectiveCount();
      if (count >= 2) {
        setShowInlineGuidance(true);
      }
    }
  }, [isAuthenticated, appState.user]);

  // 1. Sync UserContext to AppState
  useEffect(() => {
    if (contextUser) {
      const currentAppUser = appState.user;
      
      // Determine if we truly need to trigger the full login/sync flow
      const idChanged = !currentAppUser || currentAppUser.id !== contextUser.id;
      const verificationFixed = contextUser.emailVerified && (!currentAppUser || !currentAppUser.emailVerified);
      const initialSyncNeeded = !hasAttemptedCloudSyncRef.current;

      if (idChanged || verificationFixed || initialSyncNeeded) {
        console.log('[App] Auth state change requires sync:', { 
          idExists: !!currentAppUser, 
          idChanged, 
          verificationFixed, 
          initialSyncNeeded 
        });
        hasAttemptedCloudSyncRef.current = true;
        handleUserLogin(contextUser);
      }
    }
  }, [contextUser?.id, contextUser?.emailVerified, !!appState.user, handleUserLogin]);

  // 2. Global Loading Overlay (Prevents blank screens/flashes)
  if (isUserContextChecking && !appState.user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FBFBFE] dark:bg-[#0A0A0B] z-[1000]">
        <JumpStarLoading caption="Starting your day softly..." />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center selection:bg-indigo-100 dark:selection:bg-indigo-900/40 clip-path-bounds">
      {/* Background Soothe Layer */}
      <div className={`bg-soothe-overlay ${isSootheActive ? 'bg-soothe-active' : ''}`} />

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
          <img src="/icons/icon-64x64.png" alt="StartlyTab - Mindful New Tab Dashboard for Focus" className="w-11 h-11 object-contain" />
          <span className="logo-text text-xl text-gray-800 dark:text-gray-200">StartlyTab</span>
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
                  alt={`${currentEngine.name} search engine`}
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
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
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
                {searchEngines.map((engine) => (
                  <button
                    key={engine.id}
                    onClick={() => {
                      setSelectedEngine(engine.id);
                      localStorage.setItem('focus_tab_search_engine', engine.id);
                      setIsSearchDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${selectedEngine === engine.id ? 'bg-gray-50 dark:bg-white/5' : ''
                      }`}
                  >
                    <img
                      src={engine.icon}
                      alt={`${engine.name} search`}
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
          {/* {isAuthenticated && !IS_EXTENSION && (
            <ExtensionInstallPrompt theme={appState.theme} />
          )} */}

          <button
            onClick={() => navigate('/echo-land')}
            className="relative p-3.5 bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-black/5 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 transition-all active:scale-95 group"
            aria-label="Trend Hub"
          >
            <Activity className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 transition-colors" />
            {isSubscribed(appState) && getEmotionLogs().length > 0 && Math.floor((Date.now() - [...getEmotionLogs()].sort((a, b) => b.timestamp - a.timestamp)[getEmotionLogs().length - 1].timestamp) / (1000 * 60 * 60 * 24)) >= 7 && (
              <div className="absolute top-1.5 right-1.5 text-indigo-500 pointer-events-none animate-pulse">
                <Sparkles size={10} />
              </div>
            )}
          </button>

          <button
            onClick={() => {
              const newTheme = appState.theme === 'light' ? 'dark' : 'light';
              saveState({ ...appState, theme: newTheme });
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
      <main className="flex-1 w-full flex flex-col items-center justify-center px-8 z-10 py-10">
        {(() => {
          const isCN = appState.language === 'Chinese (Simplified)';
          const rawLen = currentSnippet?.length || 0;
          // Language-specific container heuristics
          // V1.4 strict cap is ~45 CN chars (and approx 100 EN chars).
          // We force wide max-widths to allow single/double-line spread rather than stacking.
          const containerClass = isCN
            ? 'max-w-6xl lg:max-w-[90rem]' // Always allow Chinese to spread horizontally
            : (rawLen > 90 ? 'max-w-5xl lg:max-w-6xl' : 'max-w-6xl lg:max-w-[85rem]');

          return (
            <div key={revealKey} className={`animate-reveal transition-all duration-500 ease-out text-center flex flex-col items-center 
              ${containerClass} 
              ${isSingleLine ? '-mt-8 md:-mt-12 lg:-mt-16' : ''}`}>

              {isAuthenticated ? (
                <>
                  {/* Text Container: Handles scrolling for long text while keeping buttons visible */}
                  <div className="min-h-[220px] md:min-h-[260px] lg:min-h-[280px] transition-all duration-700 flex flex-col items-center justify-center w-full px-4 md:px-8">
                    <div
                      ref={perspectiveTitleRef}
                      key={`${revealKey}-${typewriterKey}`}
                      className={`serif font-normal leading-[1.35] md:leading-[1.3] lg:leading-[1.3] tracking-[-0.02em] text-black dark:text-white transition-all duration-300
                        ${isCN
                          ? (rawLen > 38
                            ? 'text-3xl md:text-5xl lg:text-6xl'
                            : rawLen > 22
                              ? 'text-4xl md:text-6xl lg:text-[4.5rem]'
                              : 'text-5xl md:text-7xl lg:text-[5.5rem] font-medium leading-[1.2]')
                          : (rawLen > 120
                            ? 'text-3xl md:text-5xl lg:text-6xl'
                            : rawLen > 80
                              ? 'text-4xl md:text-6xl lg:text-7xl'
                              : 'text-5xl md:text-7xl lg:text-[5.5rem] font-medium leading-[1.15]')}
                    ${useTypewriter && !isPerceiving ? 'animate-text-emerge' : 'animate-reveal'}
                  `}
                      style={{ textWrap: 'balance', orphans: 3, widows: 3 }}
                    >
                      {isPerceiving ? (
                        <div className="flex flex-col items-center justify-center w-full min-h-[100px]">
                          <EmotionalPulsePerceiver emotion={lastClickedEmotion} currentLang={appState.language || 'English'} />
                        </div>
                      ) : currentSnippet ? (
                        <div className="relative group inline-block">
                          <div className="editorial-title">
                            {useTypewriter ? (
                              <Typewriter text={currentSnippet} onComplete={() => setUseTypewriter(false)} />
                            ) : (
                              renderSnippet(currentSnippet)
                            )}
                          </div>

                          {/* <DevFeedbackUI
                            currentSnippet={currentSnippet}
                            selectedPersona={appState.selectedPersona || 'soulmate'}
                            setAppState={setAppState}
                          /> */}

                          {currentSnippetIsMemoryEcho && (
                            <span className="absolute -right-10 -top-4 cursor-help inline-block no-editorial-title" style={{ WebkitTextFillColor: 'initial', background: 'none' }}>
                              <span className="text-2xl animate-pulse inline-block">✨</span>
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 dark:bg-white/90 text-white dark:text-black text-[12px] md:text-sm p-3 rounded-lg shadow-2xl z-50 font-sans leading-tight">
                                {appState.language === 'Chinese (Simplified)'
                                  ? (currentSnippetEchoType === 'node_3' ? "我注意到了你最近的心理节律。" : "这是来自你昨天的节奏反馈。")
                                  : (currentSnippetEchoType === 'node_3' ? "I've noticed your recent psychological rhythm." : "This is feedback from your rhythm yesterday.")
                                }
                              </span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10">
                          <JumpStarLoading caption="Collecting moments..." />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center w-full px-4">
                    <div className="relative flex items-center gap-4 translate-y-[-10px] animate-reveal">

                      {/* 1. Neutral State View (Centered Pair) */}
                      <div className={`flex items-center gap-4 transition-all duration-500
                    ${(isCompassHovered && !isEmotionFrozen) ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
                      >
                        <button
                          onClick={() => fetchRandomSnippet()}
                          disabled={isGenerating || isEmotionFrozen}
                          className={`w-[280px] h-[64px] rounded-full font-bold uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-black/5 flex items-center justify-center transition-all
                        ${isGenerating || isEmotionFrozen
                              ? 'bg-gray-400 cursor-not-allowed opacity-50'
                              : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-95'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            {isGenerating && (
                              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                            <span>NEW PERSPECTIVE</span>
                          </div>
                        </button>

                        {/* Spacer for Collapsed Emoji Area */}
                        <div className="w-[64px] h-[64px]" />
                      </div>

                      {/* 2. Onboarding Tooltip (Positioned relative to the anchor pair) */}
                      {showEmotionTooltip && !hasInteractedWithCompass && (
                        <div className="absolute -top-16 right-0 translate-x-[-12px] px-5 py-2.5 bg-black/90 dark:bg-white text-white dark:text-black rounded-2xl text-[11px] font-medium tracking-wide whitespace-nowrap shadow-2xl animate-reveal-bounce z-[60] border border-white/10">
                          {appState.language === 'Chinese (Simplified)' ? (
                            <>此刻的感觉如何？ <span className="opacity-60 italic">(专属你的视界)</span></>
                          ) : (
                            <>How is this moment feeling? <span className="opacity-60 italic">(Just for you)</span></>
                          )}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black/90 dark:bg-white rotate-45"></div>
                        </div>
                      )}

                      {/* 3. Emotion Interaction Drawer (Overlay) */}
                      <div
                        onMouseEnter={() => {
                          setIsCompassHovered(true);
                          if (!hasInteractedWithCompass && compassHoverCount < 3) {
                            tooltipTimeoutRef.current = setTimeout(() => {
                              setCompassHoverCount(prev => prev + 1);
                              setShowEmotionTooltip(true);
                            }, 500);
                          }
                        }}
                        onMouseLeave={() => {
                          setIsCompassHovered(false);
                          setShowEmotionTooltip(false);
                          if (tooltipTimeoutRef.current) {
                            clearTimeout(tooltipTimeoutRef.current);
                            tooltipTimeoutRef.current = null;
                          }
                        }}
                        className={`absolute transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-full bg-white dark:bg-black backdrop-blur-3xl border border-black/[0.03] dark:border-white/[0.08] flex items-center group/drawer z-20 cursor-pointer
                      ${isCompassHovered && !isEmotionFrozen
                            ? 'w-[520px] h-16 top-0 right-[-80px] md:right-[-80px] px-10 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                            : 'w-16 h-16 right-0 top-0 justify-center bg-white/90 dark:bg-white/10 overflow-hidden shadow-indigo-500/10'}
                      ${isEmotionFrozen ? 'pointer-events-none' : ''}`}
                      >
                        {/* Collapsed State Icon */}
                        <div
                          className={`absolute inset-0 flex items-center justify-center transition-all duration-500 rounded-full
                        ${(isCompassHovered && !isEmotionFrozen) ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}
                        ${isAuraActive ? 'animate-aura-glow' : ''}`}
                        >
                          {lastClickedEmotion ? (
                            <img
                              src={`/icons/emotions/${lastClickedEmotion}.png`}
                              alt=""
                              className="w-11 h-11 object-contain"
                              onError={(e) => {
                                const emojiMap: Record<string, string> = {
                                  happy: '😊',
                                  neutral: '😌',
                                  angry: '😠',
                                  anxious: '😟',
                                  sad: '😭',
                                  exhausted: '😫'
                                };
                                e.currentTarget.style.display = 'none';
                                const span = document.createElement('span');
                                span.innerText = emojiMap[lastClickedEmotion as string] || '💭';
                                span.className = 'text-2xl';
                                e.currentTarget.parentElement?.appendChild(span);
                              }}
                            />
                          ) : (
                            <span className="text-2xl">💭</span>
                          )}
                        </div>

                        {/* Gradient Flourish */}
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover/drawer:opacity-100 transition-opacity duration-700 pointer-events-none rounded-full overflow-hidden"></div>

                        {/* Expanded Content */}
                        <div className={`w-full flex items-center justify-around transition-all duration-500
                      ${(isCompassHovered && !isEmotionFrozen) ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-90 pointer-events-none'}`}>
                          {[
                            { type: 'happy', zh: '开心', en: 'Happy' },
                            { type: 'neutral', zh: '平静', en: 'Neutral' },
                            { type: 'angry', zh: '愤怒', en: 'Angry' },
                            { type: 'anxious', zh: '焦虑', en: 'Anxious' },
                            { type: 'sad', zh: '难过', en: 'Sad' },
                            { type: 'exhausted', zh: '疲惫', en: 'Exhausted' }
                          ].map((emotion) => (
                            <div key={emotion.type} className="flex flex-col items-center group/item relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEmotionClick(emotion.type as EmotionType);
                                }}
                                disabled={isGenerating || isEmotionFrozen}
                                className={`relative w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 transform
                              ${isEmotionFrozen && lastClickedEmotion !== emotion.type
                                    ? 'opacity-0 scale-50 pointer-events-none'
                                    : isEmotionFrozen && lastClickedEmotion === emotion.type
                                      ? 'scale-125'
                                      : 'hover:bg-black/5 dark:hover:bg-white/10 hover:scale-110 active:scale-95'
                                  }`}
                              >
                                <span className={`w-10 h-10 flex items-center justify-center ${isAuraActive && lastClickedEmotion === emotion.type ? 'animate-aura-glow' : ''}`}>
                                  <img
                                    src={`/icons/emotions/${emotion.type}.png`}
                                    alt={appState.language === 'Chinese (Simplified)' ? emotion.zh : emotion.en}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      const emojiMap: Record<string, string> = {
                                        happy: '😊',
                                        neutral: '😌',
                                        angry: '😠',
                                        anxious: '😟',
                                        sad: '😭',
                                        exhausted: '😫'
                                      };
                                      e.currentTarget.style.display = 'none';
                                      const span = document.createElement('span');
                                      span.innerText = emojiMap[emotion.type as string] || '💭';
                                      span.className = 'text-3xl';
                                      e.currentTarget.parentElement?.appendChild(span);
                                    }}
                                  />
                                </span>
                              </button>

                              {/* Hover Label (Multi-language) */}
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/90 dark:bg-white text-white dark:text-black rounded-lg text-[10px] font-bold tracking-tight opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-lg">
                                {appState.language === 'Chinese (Simplified)' ? emotion.zh : emotion.en}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <h1 className="serif text-3xl md:text-5xl lg:text-7xl font-normal leading-[1.4] md:leading-[1.3] lg:leading-[1.3] tracking-[-0.01em] text-black dark:text-white transition-all duration-300 max-w-[90rem] px-8 text-center" style={{ textWrap: 'balance' }}>
                    StartlyTab | <span className="text-purple-600 dark:text-purple-400">A New Tab That Understands Your Mood,</span> Not Only Just Your Tasks
                  </h1>
                  <h2 className="mt-8 serif text-2xl md:text-3xl lg:text-4xl text-gray-600 dark:text-gray-400 font-normal max-w-4xl text-center">
                    Break the Cycle of Work Anxiety and Digital Noise.
                  </h2>

                  {/* Invisible SEO block */}
                  <div className="sr-only">
                    StartlyTab is a mental rhythm adjustment tool designed for high-pressure workers. Get your free emotional workspace and break free from anxious digital noise through gentle reminders and emotional awareness.
                  </div>

                  <div className="mt-12">
                    <button
                      onClick={() => setIsPreferenceModalOpen(true)}
                      title="Start your mindful journey with StartlyTab"
                      aria-label="Start your mindful day and get your free emotional workspace"
                      className="px-12 py-6 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                      Start My Mindful Day
                    </button>
                  </div>

                  <SocialProof />
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {!isAuthenticated && (
        /* Unauthenticated State: Hero Login Prompt */
        <section className="w-full max-w-7xl px-8 pb-14 z-10 animate-reveal" style={{ animationDelay: '0.4s' }}>
          <div className="soft-card p-6 md:p-8 rounded-[2rem] shadow-xl shadow-black/5 overflow-hidden flex flex-col items-center">
            <div className="w-full flex flex-col items-center justify-center py-2">
              <div className="max-w-md w-full flex flex-col items-center text-center">
                <h2 className="serif text-3xl md:text-4xl text-gray-800 dark:text-gray-100 mb-2 whitespace-nowrap">Start your day softly — with everything ready</h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed mb-6">
                  Unlimited shortcuts, always one click away.
                </p>

                <div className="w-full flex flex-col items-center gap-4 mt-4">
                  {(typeof window !== 'undefined' && !!(window as any).chrome?.runtime?.id) ? (
                    <button
                      onClick={handleSignIn}
                      disabled={isSyncing}
                      className="w-full max-w-[280px] h-[48px] bg-white dark:bg-[#131314] text-[#1F1F1F] dark:text-[#E3E3E3] border border-[#747775] dark:border-[#747775] rounded-full text-sm font-medium hover:bg-[#F7F8F8] dark:hover:bg-[#2D2E30] transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 disabled:opacity-80 disabled:cursor-not-allowed group"
                    >
                      {isSyncing ? (
                        <div className="flex items-center gap-3">
                          <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-gray-500 font-bold tracking-tight">Signing in...</span>
                        </div>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                          <span className="font-bold tracking-tight">Sign in with Google</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="relative inline-block group">
                      {/* New Firebase Auth login button */}
                      <button
                        onClick={handleSignIn}
                        disabled={isSyncing}
                        className={`flex items-center gap-3 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-white/10 rounded-full px-6 py-3 shadow-sm transition-all ${isSyncing ? 'opacity-40 pointer-events-none scale-95' : 'hover:scale-[1.02] hover:shadow-md active:scale-[0.98]'}`}
                      >
                        {isSyncing ? (
                          <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                          </svg>
                        )}
                        <span className="font-bold tracking-tight text-gray-700 dark:text-gray-200 text-sm">
                          {isSyncing ? 'Signing in...' : 'Sign in'}
                        </span>
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-3 mt-4 opacity-60">
                    <a href="/privacy" target="_blank" className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium">Privacy Policy</a>
                    <span className="text-gray-300 dark:text-gray-700 text-[10px]">•</span>
                    <a href="/terms" target="_blank" className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium">Terms of Service</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!isAuthenticated && (
        <>
          <LandingOptimization />
          <DailyRhythm />
          <VentingModePromo onRequireLogin={() => setIsLoginModalOpen(true)} />
          <TheRhythmBlueprint onRequireLogin={() => setIsLoginModalOpen(true)} />
          <FAQScreen onRequireLogin={() => setIsLoginModalOpen(true)} />
          <SemanticFooter />
        </>
      )}

      {/* 3.5. INTEGRATION GATEWAYS (Real Data) */}
      {isAuthenticated && (
        <IntegrationGateways
          links={appState.links}
          userId={appState.user?.id}
          onUpdate={(newLinks) => saveState(prev => ({ ...prev, links: newLinks }))}
          appState={appState}
        />
      )}

      {/* 4. BOTTOM SECTION REMOVED (Replaced by IntegrationGateways) */}

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
        onSignOut={handleSignOut}
      />



      <LoginPromptModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSignIn={handleSignIn}
        theme={appState.theme}
      />

      <PreferenceInputModal
        isOpen={isPreferenceModalOpen}
        onClose={() => setIsPreferenceModalOpen(false)}
        onSaveLocal={async (preference: string) => {
          // This function is no longer used for unauthenticated users
          // Google button handles login directly
        }}
        theme={appState.theme}
        isAuthenticated={isAuthenticated}
      />
      <DebugInfo currentUser={appState.user} />

    </div >
  );
};

export default App;