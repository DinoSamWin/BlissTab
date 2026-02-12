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

export async function initGoogleAuthStrict(onUser: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  console.log('[AuthStrict] Initializing Strict Auth V2');
  console.log('[AuthStrict] explicit_signout status:', localStorage.getItem('focus_tab_explicit_signout'));

  // 1. Check local storage first
  const savedUser = localStorage.getItem('focus_tab_user');
  let hasExistingUser = false;
  let authCheckComplete = false;

  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      onUser(user);
      hasExistingUser = true;
      authCheckComplete = true;
      console.log('[AuthStrict] Restored user:', user.email);
    } catch (e) {
      console.error('[AuthStrict] Restore failed', e);
    }
  }

  // 2. Poll for Google SDK
  const gsiInterval = setInterval(() => {
    if ((window as any).google?.accounts?.id) {
      clearInterval(gsiInterval);
      console.log('[AuthStrict] Google SDK loaded.');

      const handleCredentialResponse = (response: any) => {
        try {
          console.log('[AuthStrict] RESPONSE RECEIVED', response);
          const base64Url = response.credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));

          const incomingUser: User = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
          };

          // 1. TIMESTAMP CHECK
          // Reject credentials issued BEFORE the last explicit logout
          const lastLogoutTs = localStorage.getItem('focus_tab_last_logout_ts');
          const tokenIat = payload.iat; // Seconds
          if (lastLogoutTs && tokenIat) {
            const logoutTime = parseInt(lastLogoutTs, 10);
            if (tokenIat * 1000 < logoutTime) {
              console.error('[AuthStrict] BLOCKING STALE CREDENTIAL. Issued before logout.');
              console.error(`[AuthStrict] Token: ${new Date(tokenIat * 1000).toISOString()}, Logout: ${new Date(logoutTime).toISOString()}`);
              return;
            }
          }

          // 2. EXPLICIT SIGNOUT CHECK
          const isExplicitSignOut = localStorage.getItem('focus_tab_explicit_signout') === 'true';
          const selectBy = response.select_by;

          if (isExplicitSignOut) {
            // If explicit sign out is true, we ONLY accept manual interaction
            // 'user', 'btn', 'btn_confirm' are manual.
            // 'auto' is auto.
            // null/undefined usually means auto or one-tap silent.
            // We will be VERY STRICT.
            if (selectBy === 'auto' || !selectBy) {
              console.error('[AuthStrict] BLOCKING AUTO-LOGIN due to Explicit SignOut.');
              (window as any).google.accounts.id.disableAutoSelect(); // Reinforce
              return;
            }
            // Even if 'user' (One Tap click), we might want to allow it IF the user clicked it.
            console.log('[AuthStrict] Allowing manual sign-in despite explicit signout flag:', selectBy);
          }

          // 3. EXISTING USER CHECK
          const existingUserStr = localStorage.getItem('focus_tab_user');
          if (existingUserStr) {
            const existing = JSON.parse(existingUserStr);
            if (existing.email !== incomingUser.email) {
              console.error('[AuthStrict] BLOCKING MISMATCH:', existing.email, '!=', incomingUser.email);
              return;
            }
            if (selectBy === 'auto') {
              console.warn('[AuthStrict] Blocking redundant auto-login for existing user');
              return;
            }
          }

          console.log('[AuthStrict] Authenticated successfully:', incomingUser.email);
          localStorage.setItem('focus_tab_user', JSON.stringify(incomingUser));
          // CLEAR explicit signout flag on successful login
          localStorage.removeItem('focus_tab_explicit_signout');

          onUser(incomingUser);
          authCheckComplete = true;

        } catch (e) {
          console.error('[AuthStrict] Credential handling failed', e);
        }
      };

      const isSafariBrowser = isSafari();

      try {
        const isExplicitSignOut = localStorage.getItem('focus_tab_explicit_signout') === 'true';

        const initConfig: any = {
          client_id: IS_PLACEHOLDER_ID ? 'MOCK_ID' : CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false, // HARDCODED FALSE
          use_fedcm_for_prompt: false,
          cancel_on_tap_outside: true
        };

        console.log('[AuthStrict] Initializing GSI with:', initConfig);
        (window as any).google.accounts.id.initialize(initConfig);

        // Prompt Logic
        if (!hasExistingUser && !authCheckComplete) {
          // If explicit sign out, DO NOT SHOW ONE TAP.
          // This prevents the "Refresh -> Auto Login" loop described by the user.
          // The user must click the "Sign In" button manually.
          if (isExplicitSignOut) {
            console.log('[AuthStrict] Explicit sign-out detected. Suppressing One Tap prompt.');
            authCheckComplete = true;
            onUser(null);
            return;
          }

          console.log('[AuthStrict] No user, prompting...');
          if (!isSafariBrowser) {
            (window as any).google.accounts.id.prompt((notification: any) => {
              console.log('[AuthStrict] Prompt Notification:', notification);
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.log('[AuthStrict] Prompt skipped/hidden:', notification.getNotDisplayedReason());
                authCheckComplete = true; // Mark done if skipped
                onUser(null);
              }
            });
          } else {
            console.log('[AuthStrict] Safari: Skipping prompt');
            authCheckComplete = true;
            onUser(null);
          }
        }
      } catch (error) {
        console.error('[AuthStrict] Init failed', error);
      }
    }
  }, 300);

  setTimeout(() => {
    clearInterval(gsiInterval);
    if (!authCheckComplete) {
      console.log('[AuthStrict] Timeout');
      onUser(null);
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

export const signOutUser = () => {
  // Get current user email before clearing
  const currentUserEmail = localStorage.getItem('focus_tab_user');
  let userEmail: string | null = null;

  try {
    if (currentUserEmail) {
      const parsed = JSON.parse(currentUserEmail);
      userEmail = parsed.email;
    }
  } catch (e) {
    console.warn('[Auth] Failed to parse user email for revoke', e);
  }

  localStorage.removeItem('focus_tab_user');
  localStorage.removeItem('focus_tab_token');
  // Set timestamp to invalidate any stale auto-login tokens
  localStorage.setItem('focus_tab_last_logout_ts', Date.now().toString());

  if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    try {
      (window as any).google.accounts.id.disableAutoSelect();
      // Also cancel any pending prompts
      (window as any).google.accounts.id.cancel();

      // Aggressive Revocation: Invalidate the session permissions
      if (userEmail) {
        (window as any).google.accounts.id.revoke(userEmail, (done: any) => {
          console.log('[Auth] Revoked credential for:', userEmail, done);
        });
      }
    } catch (e) {
      console.warn('[Auth] Failed to revoke/cancel', e);
    }
  }
};
