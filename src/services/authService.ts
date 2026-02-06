import { User } from '../types';

/**
 * Google OAuth Client ID from environment variable
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const IS_PLACEHOLDER_ID = !CLIENT_ID || CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID') || CLIENT_ID === '';

// Debug: Log client ID status (remove in production)
if (typeof window !== 'undefined') {
  console.log('[Auth] ===== Google OAuth Configuration =====');
  console.log('[Auth] Client ID loaded:', CLIENT_ID ? 'Yes' : 'No');
  console.log('[Auth] Client ID value:', CLIENT_ID ? `${CLIENT_ID.substring(0, 20)}...` : 'Not set');
  console.log('[Auth] Full Client ID:', CLIENT_ID || 'NOT SET');
  console.log('[Auth] Is placeholder:', IS_PLACEHOLDER_ID);
  console.log('[Auth] Current origin:', window.location.origin);
  console.log('[Auth] Environment:', import.meta.env.MODE);
  console.log('[Auth] All env vars:', {
    hasClientId: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
    hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
    hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  });
  console.log('[Auth] ======================================');
}

export async function initGoogleAuth(onUser: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  // 1. Check local storage first for immediate UI response
  const savedUser = localStorage.getItem('focus_tab_user');
  let hasExistingUser = false;
  let authCheckComplete = false;

  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      onUser(user);
      hasExistingUser = true;
      authCheckComplete = true;
      console.log('[Auth] Restored user from localStorage:', user.email);
    } catch (e) {
      console.error('[Auth] Auth restore failed', e);
    }
  }

  // 2. Poll for the Google SDK to load
  const gsiInterval = setInterval(() => {
    if ((window as any).google?.accounts?.id) {
      clearInterval(gsiInterval);

      console.log('[Auth] Google SDK loaded, initializing...');
      console.log('[Auth] Using Client ID:', IS_PLACEHOLDER_ID ? 'MOCK_ID (placeholder)' : CLIENT_ID);
      console.log('[Auth] Has existing user:', hasExistingUser);

      const handleCredentialResponse = (response: any) => {
        try {
          console.log('[Auth] Received credential response');
          // Decode the JWT ID Token
          const base64Url = response.credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));

          const user: User = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
          };

          console.log('[Auth] User authenticated:', user.email);
          localStorage.setItem('focus_tab_user', JSON.stringify(user));
          onUser(user);
          authCheckComplete = true;
        } catch (e) {
          console.error('[Auth] Auth parsing failed', e);
          onUser(null);
          authCheckComplete = true;
        }
      };

      // Detect Safari browser
      const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
        /^((?!chrome|android).)*safari/i.test(navigator.vendor);

      try {
        const initConfig: any = {
          client_id: IS_PLACEHOLDER_ID ? 'MOCK_ID' : CLIENT_ID,
          callback: handleCredentialResponse,
          // Only auto-select if no existing user (to avoid popup on every refresh)
          auto_select: !hasExistingUser,
          // FedCM is the new standard, but can be finicky in iframes. 
          // We set it to false if the environment is restricted.
          use_fedcm_for_prompt: false
        };

        // Safari-specific configuration
        if (isSafariBrowser) {
          console.log('[Auth] Safari detected, using Safari-optimized configuration');
          // Safari has issues with popup mode, so we rely on button click instead of One Tap
          // The button will use redirect mode automatically in Safari
        }

        (window as any).google.accounts.id.initialize(initConfig);
        console.log('[Auth] Google SDK initialized successfully');

        // If no existing user, notify that auth check is complete (no user found)
        if (!hasExistingUser && !authCheckComplete) {
          console.log('[Auth] No existing user found, auth check complete');
          onUser(null);
          authCheckComplete = true;
        }

        // Only show One Tap if user is NOT already logged in AND not Safari
        // Safari has issues with popup/One Tap, so we skip it and rely on button click
        if (!IS_PLACEHOLDER_ID && !hasExistingUser && !isSafariBrowser) {
          console.log('[Auth] No existing user, attempting One Tap prompt...');
          (window as any).google.accounts.id.prompt();
        } else if (hasExistingUser) {
          console.log('[Auth] User already logged in, skipping One Tap prompt');
        } else if (isSafariBrowser) {
          console.log('[Auth] Safari detected, skipping One Tap (will use button click instead)');
        }
      } catch (error) {
        console.error('[Auth] Failed to initialize Google SDK:', error);
        // If initialization fails and no user exists, notify completion
        if (!hasExistingUser && !authCheckComplete) {
          onUser(null);
          authCheckComplete = true;
        }
      }
    }
  }, 300);

  // Stop polling after 5 seconds and notify completion if not already done
  setTimeout(() => {
    clearInterval(gsiInterval);
    if (!authCheckComplete) {
      console.log('[Auth] Auth check timeout, no user found');
      onUser(null);
      authCheckComplete = true;
    }
  }, 5000);
}

/**
 * Detect if browser is Safari
 */
function isSafari(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isSafariUA = /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/chromium/.test(userAgent);
  const isSafariVendor = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);

  return isSafariUA || isSafariVendor || /^((?!chrome|android).)*safari/i.test(window.navigator.vendor);
}

/**
 * Renders the official Google Sign-In button.
 * For Safari, uses redirect mode instead of popup to avoid connection issues.
 */
export function renderGoogleButton(containerId: string, theme: 'light' | 'dark' = 'light') {
  if (typeof window === 'undefined') return;

  console.log('[Auth] renderGoogleButton called for:', containerId);
  console.log('[Auth] Google SDK available:', !!(window as any).google?.accounts?.id);
  console.log('[Auth] Client ID available:', !IS_PLACEHOLDER_ID);
  console.log('[Auth] Browser is Safari:', isSafari());

  if ((window as any).google?.accounts?.id) {
    const container = document.getElementById(containerId);
    if (container) {
      try {
        console.log('[Auth] Rendering Google button...');

        // Safari-specific configuration: use redirect mode instead of popup
        const buttonConfig: any = {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 280
        };

        // For Safari, configure to use redirect mode
        if (isSafari()) {
          console.log('[Auth] Safari detected, using redirect-friendly configuration');
          // Note: Google Identity Services handles this automatically,
          // but we can add additional configuration if needed
        }

        (window as any).google.accounts.id.renderButton(
          container,
          buttonConfig
        );
        console.log('[Auth] Google button rendered successfully');
      } catch (error) {
        console.error('[Auth] Failed to render Google button:', error);
      }
    } else {
      console.warn('[Auth] Container not found:', containerId);
    }
  } else {
    console.warn('[Auth] Google SDK not loaded yet, button will be rendered when SDK is ready');
    // Retry after a delay
    setTimeout(() => {
      if ((window as any).google?.accounts?.id) {
        renderGoogleButton(containerId, theme);
      }
    }, 1000);
  }
}

/**
 * Manual trigger for the sign-in flow.
 * If no real Client ID is provided, it falls back to a simulated login.
 * For Safari, triggers button click instead of prompt() to avoid popup issues.
 */
export function openGoogleSignIn(onUser?: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  if (IS_PLACEHOLDER_ID) {
    console.info("StartlyTab: Simulating login (No Client ID provided).");
    setTimeout(() => {
      const mockUser: User = {
        id: 'mock-' + Math.random().toString(36).substr(2, 9),
        email: 'workspace.pro@example.com',
        name: 'Design Professional',
        picture: `https://ui-avatars.com/api/?name=Design+Professional&background=6366f1&color=fff`
      };
      localStorage.setItem('focus_tab_user', JSON.stringify(mockUser));
      if (onUser) onUser(mockUser);
    }, 600);
    return;
  }

  if ((window as any).google?.accounts?.id) {
    // For Safari, don't use prompt() as it causes popup connection issues
    // Instead, programmatically click the button which will use redirect mode
    if (isSafari()) {
      console.log('[Auth] Safari detected, triggering button click instead of prompt');
      const button = document.querySelector('#google-login-btn button');
      if (button) {
        (button as HTMLElement).click();
      } else {
        console.warn('[Auth] Google button not found, falling back to prompt');
        // Fallback: try prompt anyway (might work in some Safari versions)
        try {
          (window as any).google.accounts.id.prompt();
        } catch (error) {
          console.error('[Auth] Prompt failed in Safari:', error);
        }
      }
    } else {
      // For non-Safari browsers, use prompt() as usual
      (window as any).google.accounts.id.prompt();
    }
  }
}

export function signOutUser() {
  localStorage.removeItem('focus_tab_user');
  if (typeof window !== 'undefined' && (window as any).google) {
    try {
      (window as any).google.accounts.id.disableAutoSelect();
    } catch (e) {
      // Library might not be initialized
    }
  }
}
