import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ToastMessage, User, Theme, SubscriptionTier } from './types';
import { APP_VERSION, DEFAULT_LINKS, DEFAULT_REQUESTS, SEARCH_ENGINES, DEFAULT_SEARCH_ENGINE, SearchEngine } from './constants';
import { generateSnippet } from './services/geminiService';
import { initGoogleAuth, signOutUser, openGoogleSignIn, renderGoogleButton } from './services/authService';
import { syncToCloud, fetchFromCloud } from './services/syncService';
import { loadHistory, saveHistory, addToHistory, getSessionCountToday, getMinutesSinceLast, getLateNightStreak } from './services/perspectiveService';
import { canGeneratePerspective, resetPerspectiveCount, incrementPerspectiveCount, getSubscriptionTier, getPerspectiveCount } from './services/usageLimitsService';
import { fetchSubscriptionState, determineSubscriptionTier } from './services/subscriptionService';
import { fetchUserMembership, fetchUserSettings } from './services/redeemService';
import { canonicalizeUrl } from './services/urlCanonicalService';
import { getLocalLogoDataUrl, downloadAndCacheLogo } from './services/gatewayLogoCacheService';
import { fetchUserGatewayOverrides, getLogoSignedUrl } from './services/supabaseService';
import Settings from './components/Settings';
import LoginPromptModal from './components/LoginPromptModal';
import PreferenceInputModal from './components/PreferenceInputModal';
import IntegrationGateways from './components/IntegrationGateways';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('focus_tab_state');
    const systemTheme: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    // Check for saved user in localStorage (from authService)
    let savedUser: User | null = null;
    try {
      const userStr = localStorage.getItem('focus_tab_user');
      if (userStr) {
        savedUser = JSON.parse(userStr);
      }
    } catch (e) {
      console.error('[App] Failed to parse saved user', e);
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.version === APP_VERSION) {
          // Use saved user from authService if available, otherwise null
          return { ...parsed, user: savedUser };
        }
      } catch (e) { console.error("Restore failed", e); }
    }
    return {
      version: APP_VERSION,
      links: DEFAULT_LINKS,
      requests: DEFAULT_REQUESTS,
      pinnedSnippetId: null,
      language: 'English',
      user: savedUser, // Use saved user if available
      theme: systemTheme
    };
  });

  const [currentSnippet, setCurrentSnippet] = useState<string | null>(null);
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
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true); // Track auth check status
  const [logoCacheVersion, setLogoCacheVersion] = useState(0); // triggers rerender when local logo cache changes across tabs

  const isAuthenticated = !!appState.user;

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEngine, setSelectedEngine] = useState<string>(() => {
    const saved = localStorage.getItem('focus_tab_search_engine');
    return saved || DEFAULT_SEARCH_ENGINE;
  });
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [isComposing, setIsComposing] = useState<boolean>(false); // 输入法组合状态
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const perspectiveTitleRef = useRef<HTMLHeadingElement>(null);
  const [isSingleLine, setIsSingleLine] = useState<boolean>(false);

  const lastPromptIdRef = useRef<string | null>(null);
  const snippetRequestIdRef = useRef<number>(0);
  const didInitialSnippetFetchRef = useRef<boolean>(false);

  // Store latest appState in ref to avoid dependency issues in storage event listener
  const appStateRef = useRef<AppState>(appState);

  // Keep ref in sync with appState
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
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

    // Sync to Supabase if user is logged in and not skipping
    if (newState.user && !skipSync) {
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
    // Reset perspective count on login
    resetPerspectiveCount();
    // Clear local preference flag
    setHasLocalPreference(false);

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
      const [cloudData, gatewayOverrides] = await Promise.all([
        fetchFromCloud(user.id),
        fetchUserGatewayOverrides(user.id),
      ]);

      const overridesByCanonical: Record<string, typeof gatewayOverrides[number]> = {};
      for (const o of gatewayOverrides) {
        overridesByCanonical[o.canonical_url] = o;
      }

      // Use functional update to get latest state without dependency
      setAppState(prevState => {
        let requests = cloudData?.requests || prevState.requests;

        // Migrate local preference to cloud if exists
        if (preferenceToMigrate) {
          const newIntention = {
            id: `intention_${Date.now()}`,
            prompt: preferenceToMigrate,
            active: true
          };

          // Add to requests if not already exists (don't overwrite existing)
          const exists = requests.some(r => r.prompt === preferenceToMigrate);
          if (!exists) {
            requests = [...requests, newIntention];
          }

          // Clear local storage
          localStorage.removeItem('startly_intention_pending');
          localStorage.removeItem('startly_intention_local');
        }

        if (cloudData) {
          console.log('[App] Cloud data fetched:', {
            links: cloudData.links?.length || 0,
            requests: requests.length
          });
          // Use cloud data as source of truth - don't merge with local state
          const linksWithOverrides = (cloudData.links || []).map((l: any) => {
            let canonicalUrl = l.canonicalUrl || l.url;
            try { canonicalUrl = l.canonicalUrl || canonicalizeUrl(l.url); } catch { }
            const ov = overridesByCanonical[canonicalUrl];
            const linkWithOverride = {
              ...l,
              canonicalUrl,
              customTitle: ov?.custom_title ?? l.customTitle ?? null,
              customLogoPath: ov?.custom_logo_path ?? l.customLogoPath ?? null,
              customLogoUrl: ov?.custom_logo_url ?? l.customLogoUrl ?? null,
              customLogoSignedUrl: ov?.custom_logo_signed_url ?? l.customLogoSignedUrl ?? null,
              customLogoHash: ov?.custom_logo_hash ?? l.customLogoHash ?? null,
            };

            // Download logo from cloud to local cache if needed (async, non-blocking)
            if (linkWithOverride.customLogoHash) {
              const hasLocalCache = getLocalLogoDataUrl(canonicalUrl, linkWithOverride.customLogoHash);
              if (!hasLocalCache) {
                // Try to download: prefer publicUrl, fallback to signedUrl, or regenerate signedUrl
                const logoUrlToDownload = linkWithOverride.customLogoUrl || linkWithOverride.customLogoSignedUrl;

                if (logoUrlToDownload) {
                  // Fix URL if it doesn't have .webp extension (for backward compatibility)
                  let fixedUrl = logoUrlToDownload;
                  if (linkWithOverride.customLogoPath && !logoUrlToDownload.includes('.webp')) {
                    // If path exists and URL doesn't have extension, try to fix it
                    const pathParts = linkWithOverride.customLogoPath.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    if (!fileName.includes('.')) {
                      // Path doesn't have extension, add .webp to URL
                      fixedUrl = logoUrlToDownload.replace(/([^/]+)$/, '$1.webp');
                      console.log('[App] Fixed logo URL:', { original: logoUrlToDownload, fixed: fixedUrl });
                    }
                  }

                  // Download in background - don't await
                  // Pass storagePath to use Supabase download() method instead of direct fetch
                  downloadAndCacheLogo(
                    canonicalUrl,
                    fixedUrl,
                    linkWithOverride.customLogoHash,
                    linkWithOverride.customLogoPath || undefined
                  )
                    .then(success => {
                      if (success) {
                        // Trigger re-render to show cached logo
                        setAppState(prev => ({ ...prev }));
                      } else {
                        // Download failed, but we still have the URL - it should display directly
                        console.log('[App] Logo download failed, but URL is available for direct display:', fixedUrl);
                      }
                    })
                    .catch(err => {
                      console.warn('[App] Failed to download logo:', err);
                      // Even if download fails, the URL should still work for direct display
                    });
                } else if (linkWithOverride.customLogoPath) {
                  // No URL available, but we have path - try to generate signed URL
                  getLogoSignedUrl(linkWithOverride.customLogoPath)
                    .then(signedUrl => {
                      if (signedUrl && linkWithOverride.customLogoHash) {
                        downloadAndCacheLogo(
                          canonicalUrl,
                          signedUrl,
                          linkWithOverride.customLogoHash,
                          linkWithOverride.customLogoPath || undefined
                        )
                          .then(success => {
                            if (success) {
                              setAppState(prev => ({ ...prev }));
                            }
                          });
                      }
                    })
                    .catch(err => console.warn('[App] Failed to generate signed URL:', err));
                }
              }
            }

            return linkWithOverride;
          });

          const mergedState = {
            ...prevState,
            // Cloud data takes precedence
            links: linksWithOverrides,
            requests: requests, // Use migrated requests
            language: cloudData.language || prevState.language,
            theme: cloudData.theme || prevState.theme,
            user: userWithAllData, // Ensure user with all data is set
            subscriptionTier, // Set subscription tier
            version: cloudData.version || prevState.version,
            pinnedSnippetId: cloudData.pinnedSnippetId || prevState.pinnedSnippetId,
          };
          // Save state asynchronously without blocking (will sync migrated preference)
          saveState(mergedState, true).catch(err => console.error('[App] Failed to save state:', err));

          // If preference was migrated, trigger immediate refresh
          if (preferenceToMigrate) {
            setTimeout(() => {
              fetchRandomSnippet(true); // Bypass limit for immediate refresh
            }, 500);
          }

          return mergedState;
        } else {
          console.log('[App] No cloud data found, syncing current state');
          // No cloud data, set user and sync current state (with migrated preference)
          const stateWithUser = {
            ...prevState,
            user: userWithAllData,
            subscriptionTier,
            requests: requests // Include migrated preference
          };
          // Sync current state to cloud for first-time users
          syncToCloud(stateWithUser).catch(err => console.error('[App] Failed to sync to cloud:', err));

          // If preference was migrated, trigger immediate refresh
          if (preferenceToMigrate) {
            setTimeout(() => {
              fetchRandomSnippet(true); // Bypass limit for immediate refresh
            }, 500);
          }

          return stateWithUser;
        }
      });
    } finally {
      setIsSyncing(false);
    }
  }, [saveState]); // Removed appState dependency

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

        // Fetch cloud data + user gateway overrides and merge with current state
        const [cloudData, gatewayOverrides] = await Promise.all([
          fetchFromCloud(user.id),
          fetchUserGatewayOverrides(user.id),
        ]);
        const overridesByCanonical: Record<string, typeof gatewayOverrides[number]> = {};
        for (const o of gatewayOverrides) {
          overridesByCanonical[o.canonical_url] = o;
        }
        if (cloudData) {
          const linksWithOverrides = (cloudData.links || []).map((l: any) => {
            let canonicalUrl = l.canonicalUrl || l.url;
            try { canonicalUrl = l.canonicalUrl || canonicalizeUrl(l.url); } catch { }
            const ov = overridesByCanonical[canonicalUrl];
            const linkWithOverride = {
              ...l,
              canonicalUrl,
              customTitle: ov?.custom_title ?? l.customTitle ?? null,
              customLogoPath: ov?.custom_logo_path ?? l.customLogoPath ?? null,
              customLogoUrl: ov?.custom_logo_url ?? l.customLogoUrl ?? null,
              customLogoSignedUrl: ov?.custom_logo_signed_url ?? l.customLogoSignedUrl ?? null,
              customLogoHash: ov?.custom_logo_hash ?? l.customLogoHash ?? null,
            };

            // Download logo from cloud to local cache if needed (async, non-blocking)
            if (linkWithOverride.customLogoHash) {
              const hasLocalCache = getLocalLogoDataUrl(canonicalUrl, linkWithOverride.customLogoHash);
              if (!hasLocalCache) {
                // Try to download: prefer publicUrl, fallback to signedUrl, or regenerate signedUrl
                const logoUrlToDownload = linkWithOverride.customLogoUrl || linkWithOverride.customLogoSignedUrl;

                if (logoUrlToDownload) {
                  // Fix URL if it doesn't have .webp extension (for backward compatibility)
                  let fixedUrl = logoUrlToDownload;
                  if (linkWithOverride.customLogoPath && !logoUrlToDownload.includes('.webp')) {
                    // If path exists and URL doesn't have extension, try to fix it
                    const pathParts = linkWithOverride.customLogoPath.split('/');
                    const fileName = pathParts[pathParts.length - 1];
                    if (!fileName.includes('.')) {
                      // Path doesn't have extension, add .webp to URL
                      fixedUrl = logoUrlToDownload.replace(/([^/]+)$/, '$1.webp');
                      console.log('[App] Fixed logo URL:', { original: logoUrlToDownload, fixed: fixedUrl });
                    }
                  }

                  // Download in background - don't await
                  // Pass storagePath to use Supabase download() method instead of direct fetch
                  downloadAndCacheLogo(
                    canonicalUrl,
                    fixedUrl,
                    linkWithOverride.customLogoHash,
                    linkWithOverride.customLogoPath || undefined
                  )
                    .then(success => {
                      if (success) {
                        // Trigger re-render to show cached logo
                        setAppState(prev => ({ ...prev }));
                      } else {
                        // Download failed, but we still have the URL - it should display directly
                        console.log('[App] Logo download failed, but URL is available for direct display:', fixedUrl);
                      }
                    })
                    .catch(err => {
                      console.warn('[App] Failed to download logo:', err);
                      // Even if download fails, the URL should still work for direct display
                    });
                } else if (linkWithOverride.customLogoPath) {
                  // No URL available, but we have path - try to generate signed URL
                  getLogoSignedUrl(linkWithOverride.customLogoPath)
                    .then(signedUrl => {
                      if (signedUrl && linkWithOverride.customLogoHash) {
                        downloadAndCacheLogo(
                          canonicalUrl,
                          signedUrl,
                          linkWithOverride.customLogoHash,
                          linkWithOverride.customLogoPath || undefined
                        )
                          .then(success => {
                            if (success) {
                              setAppState(prev => ({ ...prev }));
                            }
                          });
                      }
                    })
                    .catch(err => console.warn('[App] Failed to generate signed URL:', err));
                }
              }
            }

            return linkWithOverride;
          });
          // Merge cloud data with current state, preserving user with all data
          const mergedState = {
            ...currentState,
            ...cloudData,
            user: userWithAllData, // Ensure user with all data is set
            subscriptionTier, // Set subscription tier
            // Preserve local state if cloud data is missing fields
            links: linksWithOverrides.length ? linksWithOverrides : (cloudData.links || currentState.links),
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

  const fetchRandomSnippet = useCallback(async (bypassLimit: boolean = false) => {
    console.log('[App] fetchRandomSnippet called. isGenerating:', isGenerating, 'bypassLimit:', bypassLimit);
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

    if (activeRequests.length === 0) return;

    const eligible = activeRequests.length > 1 && lastPromptIdRef.current
      ? activeRequests.filter(r => r.id !== lastPromptIdRef.current)
      : activeRequests;

    const randomReq = eligible[Math.floor(Math.random() * eligible.length)];
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

      // Calculate Router Context
      const now = new Date();
      const context: any = {
        local_time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), // HH:MM
        weekday: now.getDay(),
        is_weekend: now.getDay() === 0 || now.getDay() === 6,
        session_count_today: getSessionCountToday(history),
        minutes_since_last: getMinutesSinceLast(history),
        late_night_streak: getLateNightStreak(history),
        work_mode_disabled: false, // Could be linked to settings later
        custom_themes: appState.requests.filter(r => r.active).map(r => r.prompt),
        language: appState.language,
        recent_history: history,
        // V3.5 Context
        weather: 'Unknown',
        battery_level: batteryLevel
      };

      // Generate with context - V3.5
      // @ts-ignore
      const { text: result, plan } = await generateSnippet(context);

      // Only apply the latest in-flight request result
      if (requestId !== snippetRequestIdRef.current) return;

      console.log('[App] Generated perspective:', result.substring(0, 50));

      // Save to history (include plan metadata if available)
      const updatedHistory = addToHistory(result, randomReq.id, history, {
        intent: plan?.intent,
        style: plan?.style,
        theme: plan?.selected_theme
      });
      saveHistory(updatedHistory);

      setCurrentSnippet(result);
      setRevealKey(prev => prev + 1);
    } catch (error) {
      if (requestId !== snippetRequestIdRef.current) return;
      console.error('[App] Error generating perspective:', error);
      addToast('Failed to generate perspective', 'error');
    } finally {
      if (requestId === snippetRequestIdRef.current) {
        setIsGenerating(false);
      }
    }
  }, [appState]);

  const renderSnippet = (text: string) => {
    const parts = text.split(/\[h\](.*?)\[\/h\]/g);
    return parts.map((part, i) => (
      i % 2 === 1
        ? <span key={i} className="text-purple-600 dark:text-purple-400">{part}</span>
        : <span key={i}>{part}</span>
    ));
  };

  // Jump loading (inspired by the reference): a soft "jumping star" with squash + shadow
  const JumpStarLoading: React.FC<{ caption?: string }> = ({ caption = 'Reflecting…' }) => {
    return (
      <div className="relative w-full flex flex-col items-center justify-center" role="status" aria-live="polite" aria-busy="true">
        <style>{`
          @keyframes st-jump {
            0%   { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
            18%  { transform: translateY(0) scaleX(1.08) scaleY(0.92) rotate(-2deg); }
            50%  { transform: translateY(-22px) scaleX(0.96) scaleY(1.04) rotate(2deg); }
            80%  { transform: translateY(0) scaleX(1.06) scaleY(0.94) rotate(-1deg); }
            100% { transform: translateY(0) scaleX(1) scaleY(1) rotate(0deg); }
          }
          @keyframes st-shadow {
            0%   { transform: scaleX(1); opacity: 0.22; }
            50%  { transform: scaleX(0.62); opacity: 0.10; }
            100% { transform: scaleX(1); opacity: 0.22; }
          }
          @keyframes st-glow {
            0%, 100% { opacity: 0.18; filter: blur(26px); }
            50% { opacity: 0.28; filter: blur(34px); }
          }
        `}</style>

        {/* soft glow behind the star */}
        <div
          className="pointer-events-none absolute -inset-x-16 -inset-y-20 rounded-[4rem]"
          style={{
            animation: 'st-glow 1.15s ease-in-out infinite',
            background:
              'radial-gradient(circle at 50% 45%, rgba(236,72,153,0.14), rgba(168,85,247,0.10), rgba(99,102,241,0.08), rgba(0,0,0,0))',
          }}
        />

        <div className="relative flex flex-col items-center justify-center py-10">
          <div className="relative">
            {/* shadow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-[56px] w-[42px] h-[10px] rounded-full bg-black/20 dark:bg-white/10"
              style={{ animation: 'st-shadow 1.15s ease-in-out infinite' }}
            />

            {/* star */}
            <div style={{ animation: 'st-jump 1.15s cubic-bezier(.22,.9,.3,1) infinite', transformOrigin: '50% 70%' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2.3l2.6 6.1 6.6.6-5 4.3 1.5 6.4L12 16.9 6.3 19.7l1.5-6.4-5-4.3 6.6-.6L12 2.3z"
                  fill="rgba(239,68,68,0.92)"
                />
              </svg>
            </div>
          </div>

          <div className="mt-10 text-sm text-gray-400 dark:text-gray-500 tracking-wide">
            {caption}
          </div>
        </div>
      </div>
    );
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

  const currentEngine = SEARCH_ENGINES.find(e => e.id === selectedEngine) || SEARCH_ENGINES[0];
  const [isSharing, setIsSharing] = useState(false);
  const visibleLinks = appState.links.slice(0, 10);
  const remainingLinks = Math.max(0, appState.links.length - visibleLinks.length);

  const handleShareQuote = async () => {
    if (isSharing) return;
    if (!currentSnippet) return;
    try {
      setIsSharing(true);
      // Pass quote with highlights preserved - createShareCard will parse them
      const blob = await createShareCard(currentSnippet);
      if (!blob) throw new Error('Failed to create image');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `startlytab-quote-${Date.now()}.png`;
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
    console.log('[App] Initializing Google Auth...');
    setIsAuthChecking(true);

    initGoogleAuth(async (user) => {
      setIsAuthChecking(false); // Auth check complete

      if (user) {
        await handleUserLogin(user);
      } else {
        console.log('[App] No user, rendering Google button');
        // Delay button rendering to ensure SDK is loaded
        // Use ref to get latest theme without dependency
        setTimeout(() => {
          renderGoogleButton('google-login-btn', appStateRef.current.theme);
        }, 500);
      }
    });
    if (!didInitialSnippetFetchRef.current) {
      didInitialSnippetFetchRef.current = true;
      fetchRandomSnippet();
    }
  }, [handleUserLogin]); // Removed appState.theme dependency

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

          // Only update if user state actually changed
          if (currentUserId !== newUserId) {
            console.log('[App] User state changed:', {
              from: currentUserId ? 'logged in' : 'logged out',
              to: newUserId ? 'logged in' : 'logged out'
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
                const newState = { ...prevState, user: null, subscriptionTier: undefined };
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
  }, [isAuthenticated, appState.user]); // Re-check when user state changes

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
          <img src="/icons/icon-64x64.png" alt="StartlyTab" className="w-11 h-11 object-contain" />
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
                {SEARCH_ENGINES.map((engine) => (
                  <button
                    key={engine.id}
                    onClick={() => {
                      setSelectedEngine(engine.id);
                      setIsSearchDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${selectedEngine === engine.id ? 'bg-gray-50 dark:bg-white/5' : ''
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
      <main className="flex-1 w-full flex flex-col items-center justify-center px-8 z-10 pt-8 pb-16">
        <div key={revealKey} className={`animate-reveal transition-all duration-500 ease-out text-center flex flex-col items-center 
          ${(currentSnippet?.length || 0) > 26 ? 'max-w-[90%] lg:max-w-7xl' : 'max-w-4xl'} 
          ${isSingleLine ? '-mt-8 md:-mt-12 lg:-mt-16' : ''}`}>

          {/* Text Container: Handles scrolling for long text while keeping buttons visible */}
          <div className="max-h-[50vh] overflow-y-auto no-scrollbar w-full px-4 md:px-8">
            <h1
              ref={perspectiveTitleRef}
              className={`serif editorial-title font-normal leading-[1.35] md:leading-[1.3] lg:leading-[1.3] tracking-[-0.02em] text-black dark:text-white transition-all duration-300
                ${(currentSnippet?.length || 0) > 26
                  ? 'text-4xl md:text-6xl lg:text-7xl'
                  : 'text-5xl md:text-7xl lg:text-8xl'}
              `}
            >
              {currentSnippet ? (
                renderSnippet(currentSnippet)
              ) : (
                <JumpStarLoading caption="Content coming soon" />
              )}
            </h1>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            {/* Action buttons - always visible */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchRandomSnippet()}
                disabled={isGenerating}
                className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Reflecting...' : 'New Perspective'}
              </button>
              <button
                onClick={handleShareQuote}
                disabled={isSharing || !currentSnippet}
                className="px-6 py-4 rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-600 dark:text-gray-200 transition-all hover:bg-white/80 dark:hover:bg-white/10 active:scale-95 flex items-center gap-2 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
                  <path d="M12 16V4" />
                  <path d="M8 8l4-4 4 4" />
                </svg>
                <span>Share Quote</span>
              </button>
            </div>

            {/* Inline helper line - shown below buttons when threshold reached or after local save */}
            {!isAuthenticated && (showInlineGuidance || hasLocalPreference) && (
              <div className={`max-w-md w-full text-center animate-reveal mt-2 ${shouldShakeHelper ? 'animate-shake' : ''}`}>
                {hasLocalPreference ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Saved locally.{' '}
                    <button
                      onClick={handleSignIn}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Sign in with Google
                    </button>
                    {' '}to unlock unlimited perspectives and sync across devices.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Still looking for the right tone?{' '}
                    <button
                      onClick={() => setIsPreferenceModalOpen(true)}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Tell us what you like
                    </button>
                    {' '}to get better matches.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 3.5. INTEGRATION GATEWAYS (Real Data) */}
      {isAuthenticated ? (
        <IntegrationGateways
          links={appState.links}
          onUpdate={(newLinks) => saveState(prev => ({ ...prev, links: newLinks }))}
        />
      ) : (
        /* Unauthenticated State: Hero Login Prompt */
        <section className="w-full max-w-7xl px-8 pb-14 z-10 animate-reveal" style={{ animationDelay: '0.4s' }}>
          <div className="soft-card p-6 md:p-8 rounded-[2rem] shadow-xl shadow-black/5 overflow-hidden flex flex-col items-center">
            <div className="w-full flex flex-col items-center justify-center py-6">
              <div className="max-w-md w-full flex flex-col items-center text-center">
                <h2 className="serif text-3xl md:text-4xl text-gray-800 dark:text-gray-100 mb-2 whitespace-nowrap">Start your day softly — with everything ready</h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm leading-relaxed mb-6">
                  Unlimited shortcuts, always one click away.
                </p>
                <div id="google-login-btn" className="transition-all hover:scale-[1.02] active:scale-[0.98]"></div>
              </div>
            </div>
          </div>
        </section>
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
        onSignOut={() => {
          signOutUser();
          const newState = { ...appState, user: null, subscriptionTier: undefined };
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
    </div>
  );
};

export default App;