import { User } from '../types';

/**
 * Google OAuth Client ID from environment variable
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const IS_PLACEHOLDER_ID = !CLIENT_ID || CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID') || CLIENT_ID === '';

// Check if running in Chrome Extension environment with Identity permission
const IS_EXTENSION = typeof chrome !== 'undefined' && !!chrome.identity && !!chrome.runtime?.id;

// Debug: Log client ID status (remove in production)
if (typeof window !== 'undefined') {
  console.log('[Auth] ===== Google OAuth Configuration =====');
  console.log('[Auth] Environment:', IS_EXTENSION ? 'CHROME_EXTENSION' : 'WEB');
  console.log('[Auth] Client ID loaded:', CLIENT_ID ? 'Yes' : 'No');
  // Only log full ID in dev/extension to help user debug redirect URI
  console.log('[Auth] Client ID:', CLIENT_ID ? CLIENT_ID : 'NOT SET');
  if (IS_EXTENSION) {
    try {
      console.log('[Auth] Extension Redirect URI:', chrome.identity.getRedirectURL());
    } catch (e) { console.warn('Could not get redirect URI', e); }
  }
  console.log('[Auth] ======================================');
}

export async function initGoogleAuthStrict(onUser: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  console.log('[AuthStrict] Initializing Strict Auth V2');
  console.log('[AuthStrict] explicit_signout status:', localStorage.getItem('focus_tab_explicit_signout'));

  // 1. Check local storage first
  const savedUser = localStorage.getItem('focus_tab_user');
  let hasExistingUser = false;

  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      onUser(user);
      hasExistingUser = true;
      console.log('[AuthStrict] Restored user:', user.email);
    } catch (e) {
      console.error('[AuthStrict] Restore failed', e);
    }
  }

  // If in Extension mode, stop here. We don't have auto-login (One Tap) via GIS script.
  if (IS_EXTENSION) {
    console.log('[AuthStrict] Extension mode: Skipping GIS One Tap initialization.');
    if (!hasExistingUser) onUser(null);
    return;
  }

  // 2. Poll for Google SDK (Web Mode Only)
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
          const lastLogoutTs = localStorage.getItem('focus_tab_last_logout_ts');
          const tokenIat = payload.iat; // Seconds
          if (lastLogoutTs && tokenIat) {
            const logoutTime = parseInt(lastLogoutTs, 10);
            if (tokenIat * 1000 < logoutTime) {
              console.error('[AuthStrict] BLOCKING STALE CREDENTIAL. Issued before logout.');
              return;
            }
          }

          // 2. EXPLICIT SIGNOUT CHECK
          const isExplicitSignOut = localStorage.getItem('focus_tab_explicit_signout') === 'true';
          const selectBy = response.select_by;

          if (isExplicitSignOut) {
            if (selectBy === 'auto' || !selectBy) {
              console.error('[AuthStrict] BLOCKING AUTO-LOGIN due to Explicit SignOut.');
              (window as any).google.accounts.id.disableAutoSelect();
              return;
            }
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
          localStorage.removeItem('focus_tab_explicit_signout');

          onUser(incomingUser);

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
          auto_select: false,
          use_fedcm_for_prompt: false,
          cancel_on_tap_outside: true
        };

        console.log('[AuthStrict] Initializing GSI with:', initConfig);
        (window as any).google.accounts.id.initialize(initConfig);

        // Prompt Logic (Web Mode Only)
        if (!hasExistingUser) {
          if (isExplicitSignOut) {
            console.log('[AuthStrict] Explicit sign-out detected. Suppressing One Tap prompt.');
            onUser(null);
            return;
          }

          if (!isSafariBrowser) {
            (window as any).google.accounts.id.prompt((notification: any) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                onUser(null);
              }
            });
          } else {
            console.log('[AuthStrict] Safari: Skipping prompt');
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
 * Renders the Google Sign-In button.
 * - Web: Uses GSI SDK.
 * - Extension: Renders a custom button triggering chrome.identity.
 */
export function renderGoogleButton(containerId: string, theme: 'light' | 'dark' = 'light') {
  if (typeof window === 'undefined') return;

  console.log('[Auth] renderGoogleButton called for:', containerId);

  // === EXTENSION HANDLING ===
  if (IS_EXTENSION) {
    const container = document.getElementById(containerId);
    if (container) {
      // Render a custom button that matches Google's style
      container.innerHTML = `
              <button id="ext-google-login-btn" style="
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  background: ${theme === 'dark' ? '#131314' : '#FFFFFF'}; 
                  color: ${theme === 'dark' ? '#E3E3E3' : '#1F1F1F'}; 
                  border: 1px solid ${theme === 'dark' ? '#747775' : '#747775'}; 
                  border-radius: 20px; 
                  height: 40px; 
                  padding: 0 12px; 
                  font-family: 'Roboto', sans-serif; 
                  font-size: 14px; 
                  font-weight: 500; 
                  cursor: pointer; 
                  width: 280px;
                  transition: background-color 0.2s;
              ">
                  <span style="margin-right: 12px; display: flex;">
                      <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
                  </span>
                  Sign in with Google
              </button>
          `;

      const btn = document.getElementById('ext-google-login-btn');
      if (btn) {
        btn.onmouseenter = () => { btn.style.backgroundColor = theme === 'dark' ? '#2D2E30' : '#F7F8F8'; };
        btn.onmouseleave = () => { btn.style.backgroundColor = theme === 'dark' ? '#131314' : '#FFFFFF'; };
        btn.onclick = () => openGoogleSignIn();
      }
      console.log('[Auth] Extension button rendered manually.');
    }
    return;
  }

  // === WEB HANDLING ===
  if ((window as any).google?.accounts?.id) {
    const container = document.getElementById(containerId);
    if (container) {
      try {
        console.log('[Auth] Rendering Google button...');
        const buttonConfig: any = {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 280
        };

        (window as any).google.accounts.id.renderButton(container, buttonConfig);
        console.log('[Auth] Google button rendered successfully');
      } catch (error) {
        console.error('[Auth] Failed to render Google button:', error);
      }
    } else {
      console.warn('[Auth] Container not found:', containerId);
    }
  } else {
    console.warn('[Auth] Google SDK not loaded yet, button will be rendered when SDK is ready');
    setTimeout(() => {
      if ((window as any).google?.accounts?.id) {
        renderGoogleButton(containerId, theme);
      }
    }, 1000);
  }
}

/**
 * Manual trigger for the sign-in flow.
 * - Web: Triggers prompt() or clicks hidden button.
 * - Extension: Calls chrome.identity.launchWebAuthFlow.
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

  // === EXTENSION HANDLING ===
  if (IS_EXTENSION) {
    console.log('[Auth] Starting Extension WebAuthFlow');
    const redirectUri = chrome.identity.getRedirectURL();
    console.log('[Auth] Using Redirect URI:', redirectUri);

    const nonce = Math.random().toString(36).substring(7);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=id_token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=email%20profile%20openid` +
      `&nonce=${nonce}` +
      `&prompt=select_account`;

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        console.error('[Auth] WebAuthFlow error:', chrome.runtime.lastError.message);
        return;
      }
      if (redirectUrl) {
        console.log('[Auth] WebAuthFlow success. Parsing token...');
        // Parse id_token from URL fragment
        const url = new URL(redirectUrl);
        const params = new URLSearchParams(url.hash.substring(1)); // hash contains id_token
        const idToken = params.get('id_token');

        if (idToken) {
          try {
            const base64Url = idToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));

            const user: User = {
              id: payload.sub,
              email: payload.email,
              name: payload.name,
              picture: payload.picture
            };

            localStorage.setItem('focus_tab_user', JSON.stringify(user));
            localStorage.removeItem('focus_tab_explicit_signout');

            if (onUser) {
              onUser(user);
            } else {
              // If no callback, we can reload to pick up state, or expose a global event
              window.location.reload();
            }
          } catch (e) {
            console.error('[Auth] Token parse error', e);
          }
        } else {
          console.warn('[Auth] No id_token found in redirect URL');
        }
      }
    });
    return;
  }

  // === WEB HANDLING ===
  if ((window as any).google?.accounts?.id && !IS_EXTENSION) {
    console.log('[Auth] Web mode: Opening Google Sign-In in a new tab');

    // To strictly use a "New Tab" instead of a popup, we construct the OAuth URL manually
    // This allows us to use target="_blank" logic
    const redirectUri = window.location.origin;
    const nonce = Math.random().toString(36).substring(7);

    // Use the standard Google OAuth 2.0 endpoint for a full-page/tab experience
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}` +
      `&response_type=id_token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=email%20profile%20openid` +
      `&nonce=${nonce}` +
      `&prompt=select_account`;

    // Open in a new tab
    const newWindow = window.open(authUrl, '_blank');

    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Pop-up blocker might have triggered, fallback to GSI prompt
      console.warn('[Auth] New tab blocked or failed, falling back to SDK prompt');
      (window as any).google.accounts.id.prompt();
    }
    return;
  }
}

export const signOutUser = () => {
  const currentUserEmail = localStorage.getItem('focus_tab_user');
  let userEmail: string | null = null;
  try {
    if (currentUserEmail) {
      const parsed = JSON.parse(currentUserEmail);
      userEmail = parsed.email;
    }
  } catch (e) { }

  localStorage.removeItem('focus_tab_user');
  localStorage.removeItem('focus_tab_token');
  localStorage.setItem('focus_tab_last_logout_ts', Date.now().toString());

  // Web Revoke
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    try {
      (window as any).google.accounts.id.disableAutoSelect();
      (window as any).google.accounts.id.cancel();
      if (userEmail) {
        (window as any).google.accounts.id.revoke(userEmail, () => { });
      }
    } catch (e) {
      console.warn('[Auth] Failed to revoke/cancel', e);
    }
  }

  // Extension Revoke (Optional: Remove cached token if using getAuthToken, but we use WebAuthFlow so just clear local state)
};
