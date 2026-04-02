import {
  Auth,
  User as FirebaseUser,
  AuthError,
  AuthErrorCodes,
  GoogleAuthProvider,
  TwitterAuthProvider,
  signInWithPopup, signInWithPopup,
  signOut,
  updateProfile,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  linkWithCredential,
  OAuthCredential,
  FacebookAuthProvider,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset
} from 'firebase/auth';
import { auth } from './firebaseService';
import { User } from '../types';

// Environment Helpers
const AUTH_VERSION = '1.0.5-domain-fix';

const getAppUrl = () => {
  if (typeof window === 'undefined') return 'https://startlytab.com/auth/action';
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;

  // 1. Production Domain (both www and non-www → use startlytab.com which is Firebase-authorized)
  if (hostname === 'www.startlytab.com' || hostname === 'startlytab.com') {
    return 'https://startlytab.com/auth/action';
  }

  // 2. Vercel Preview / Branch URLs
  if (hostname.endsWith('.vercel.app')) {
    return `${protocol}//${hostname}/auth/action`;
  }

  // 3. Local Development
  const isLocal = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  hostname === '0.0.0.0' ||
                  hostname.startsWith('192.168.') ||
                  hostname.startsWith('10.') ||
                  hostname.startsWith('172.');
                  
  if (isLocal) {
    return `${protocol}//${hostname}${port ? ':' + port : ''}/auth/action`;
  }

  return `${window.location.origin}/auth/action`;
};

// Check if we're in a Chrome Extension environment
// Critical: We check the protocol to ensure websites are NEVER treated as extensions
const IS_EXTENSION = typeof window !== 'undefined' && 
                     window.location.protocol === 'chrome-extension:';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ─────────────────────────────────────────────
// Rate Limiter (front-end, session-level)
// ─────────────────────────────────────────────

const RATE_LIMIT_KEY = 'ft_login_attempts';
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds

interface RateLimitState {
  count: number;
  lockedUntil: number | null;
}

export function getRateLimitState(): RateLimitState {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { count: 0, lockedUntil: null };
}

export function recordFailedAttempt(): RateLimitState {
  const state = getRateLimitState();
  const newCount = state.count + 1;
  const lockedUntil = newCount >= RATE_LIMIT_MAX ? Date.now() + RATE_LIMIT_WINDOW_MS : null;
  const next: RateLimitState = { count: newCount, lockedUntil };
  sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(next));
  return next;
}

export function resetRateLimit(): void {
  sessionStorage.removeItem(RATE_LIMIT_KEY);
}

export function isRateLimited(): { limited: boolean; secondsLeft: number } {
  const state = getRateLimitState();
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const secondsLeft = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    return { limited: true, secondsLeft };
  }
  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    resetRateLimit();
  }
  return { limited: false, secondsLeft: 0 };
}

// ─────────────────────────────────────────────
// Firebase User → App User mapper
// ─────────────────────────────────────────────

export function firebaseUserToAppUser(fbUser: any): User {
  const isSocialUser = fbUser.providerData && fbUser.providerData.some(
    (p: any) => p.providerId !== 'password'
  );

  // X (Twitter) specific: Email is often nested in providerData
  let email = fbUser.email;
  if (!email && fbUser.providerData) {
    const xProvider = fbUser.providerData.find((p: any) => p.providerId === 'twitter.com');
    if (xProvider && xProvider.email) {
      email = xProvider.email;
    }
  }

  return {
    id: fbUser.uid,
    email: email || '',
    // Trust social providers or Firebase's own flag
    emailVerified: fbUser.emailVerified || isSocialUser,
    name: fbUser.displayName || email?.split('@')[0] || 'User',
    picture: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || fbUser.email || 'U')}&background=6366f1&color=fff`,
  };
}

// ─────────────────────────────────────────────
// Email / Password Auth
// ─────────────────────────────────────────────

export interface AuthResult {
  user?: User;
  error?: string;
  /** For account-exists-with-different-credential: existing methods on that email */
  existingMethods?: string[];
  /** When the email was found via a social provider, pending credential to link */
  pendingCredential?: OAuthCredential;
  /** True when signup succeeded but email verification is pending */
  needsEmailVerification?: boolean;
}



/** Force-reload the current user's data from Firebase server */
export async function reloadUser(): Promise<User | null> {
  if (!auth?.currentUser) return null;
  try {
    await auth.currentUser.reload();
    return firebaseUserToAppUser(auth.currentUser);
  } catch (e) {
    console.warn('[Auth] reloadUser error:', e);
    return null;
  }
}

/** Re-send verification email to the currently signed-in (unverified) user */
export async function resendVerificationEmail(): Promise<{ success: boolean }> {
  if (!auth?.currentUser) return { success: false };
  try {
    const user = auth.currentUser;
    return await triggerCustomEmailFunction('send-verification-email', {
      email: user.email || '',
      displayName: user.displayName || '',
      redirectUrl: getAppUrl()
    });
  } catch (e) {
    console.warn('[Auth] resendVerificationEmail error:', e);
    return { success: false };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!auth) return { error: 'firebase_not_configured' };
  const rateLimitCheck = isRateLimited();
  if (rateLimitCheck.limited) {
    return { error: `rate_limited:${rateLimitCheck.secondsLeft}` };
  }

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    resetRateLimit();
    return { user: firebaseUserToAppUser(result.user) };
  } catch (e) {
    const err = e as AuthError;
    recordFailedAttempt();

    switch (err.code) {
      case AuthErrorCodes.INVALID_PASSWORD:
      case 'auth/wrong-password':
      case 'auth/invalid-credential': {
        const state = getRateLimitState();
        const attemptsLeft = RATE_LIMIT_MAX - state.count;
        return { error: `wrong_password:${Math.max(0, attemptsLeft)}` };
      }
      case AuthErrorCodes.USER_DELETED:
      case 'auth/user-not-found':
        return { error: 'user_not_found' };
      case 'auth/too-many-requests':
        return { error: 'rate_limited:60' };
      case 'auth/invalid-email':
        return { error: 'invalid_email' };
      default:
        console.error('[Auth] signInWithEmail error:', err.code, err.message);
        return { error: err.code || 'unknown' };
    }
  }
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthResult> {
  if (!auth) return { error: 'firebase_not_configured' };
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    // Send branded verification email using custom Supabase Edge Function
    try {
      await triggerCustomEmailFunction('send-verification-email', {
        email,
        displayName,
        redirectUrl: getAppUrl()
      });
    } catch (verifyErr: any) {
      console.warn('[Auth] Verification email failed:', verifyErr);
      return { error: `email_delivery_failed:${verifyErr.message}` };
    }
    resetRateLimit();
    // Return needsEmailVerification so UI shows the pending screen instead of logging in
    return { user: firebaseUserToAppUser(result.user), needsEmailVerification: true };
  } catch (e) {
    const err = e as AuthError;

    if (err.code === 'auth/email-already-in-use') {
      // Detect which sign-in methods are associated with this email
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        return { error: 'email_in_use', existingMethods: methods };
      } catch {
        return { error: 'email_in_use', existingMethods: [] };
      }
    }

    switch (err.code) {
      case 'auth/weak-password':
        return { error: 'weak_password' };
      case 'auth/invalid-email':
        return { error: 'invalid_email' };
      default:
        console.error('[Auth] signUpWithEmail error:', err.code, err.message);
        return { error: err.code || 'unknown' };
    }
  }
}

// ─────────────────────────────────────────────
// Custom Email Functions
// ─────────────────────────────────────────────

async function triggerCustomEmailFunction(endpoint: string, payload: any) {
  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!functionsUrl || !anonKey) {
    console.error(`[Auth] Supabase credentials missing for ${endpoint}`);
    return { success: false };
  }

  try {
    const response = await fetch(`${functionsUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'apikey': anonKey
      },
      body: JSON.stringify({ ...payload, lang: 'en' }),
    });
    
    if (!response.ok) {
      const errTxt = await response.text();
      console.error(`[Auth] ${endpoint} error response:`, response.status, errTxt);
      return { success: false };
    }
    
    return { success: true };
  } catch (err) {
    console.error(`[Auth] ${endpoint} network error:`, err);
    return { success: false };
  }
}

export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string; methods?: string[] }> {
  if (!auth) {
    console.error('[Auth] sendPasswordReset: firebase auth not initialized');
    return { success: false, error: 'firebase_not_configured' };
  }
  
  try {
    console.log('[Auth] Pre-verifying sign-in methods for:', email);
    
    // 0. Pre-check: Does this email have a password provider?
    const methods = await fetchSignInMethodsForEmail(auth, email);
    console.log('[Auth] Methods found for this email:', methods);
    
    if (methods.length > 0 && !methods.includes('password')) {
      console.warn('[Auth] Detected Google-only account. Skipping reset link to avoid Firebase 400.');
      return { success: false, error: 'account_is_social', methods };
    }

    // 1. First attempt: Custom branded email via Supabase Edge Function
    const customResult = await triggerCustomEmailFunction('send-password-reset-email', {
      email,
      redirectUrl: getAppUrl()
    });
    if (customResult.success) {
      console.log('[Auth] Custom branded reset email sent successfully.');
      return { success: true };
    }
    
    console.warn('[Auth] Custom reset failed. Falling back to native Firebase.');
    
    // 2. Second attempt: Native Firebase as fallback
    const actionCodeSettings = {
      url: `${window.location.origin}/auth/action`,
      handleCodeInApp: true,
    };
    
    await firebaseSendPasswordResetEmail(auth, email, actionCodeSettings);
    console.log('[Auth] Native Firebase reset email dispatched as fallback.');
    
    return { success: true };
  } catch (e: any) {
    const errorCode = e.code || e.message || 'unknown';
    console.error('[Auth] sendPasswordReset top-level error:', errorCode);
    
    if (errorCode === 'auth/user-not-found') {
      return { success: false, error: 'user_not_found' };
    }
    
    // Fallback success for security reasons in production, but we might want to show error in dev
    return { success: true };
  }
}

// ─────────────────────────────────────────────
// Google Sign In
// ─────────────────────────────────────────────

export async function signInWithGoogle(): Promise<AuthResult> {
  if (IS_EXTENSION) {
    console.log('[Auth] Extension environment detected for Google login');
    return signInWithGoogleExtension();
  }
  return signInWithGoogleWeb();
}

async function signInWithGoogleWeb(): Promise<AuthResult> {
  if (!auth) return { error: 'firebase_not_configured' };
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    // Switch to Redirect mode to bypass all browser popup/iframe blockers (ORB)
    localStorage.removeItem("focus_tab_explicit_signout"); // Clear signout markers to prevent loop
    await signInWithRedirect(auth, provider);
    
    // The redirect will navigate the page away. Handled via onAuthStateChanged in Context.
    return { error: 'cancelled' }; 
  } catch (e) {
    return handleSocialAuthError(e as AuthError, 'google.com');
  }
}

async function signInWithGoogleExtension(): Promise<AuthResult> {
  try {
    const clientId = GOOGLE_CLIENT_ID || '4260709449-hvmd55u8rt4vrfrh8sduqkcjr3f35gar.apps.googleusercontent.com';
    // @ts-ignore
    const redirectUri = chrome.identity.getRedirectURL();
    const nonce = Math.random().toString(36).substring(7);

    const authUrl = [
      'https://accounts.google.com/o/oauth2/v2/auth',
      `?client_id=${clientId}`,
      `&response_type=id_token`,
      `&redirect_uri=${encodeURIComponent(redirectUri)}`,
      `&scope=email%20profile%20openid`,
      `&nonce=${nonce}`,
      `&prompt=select_account`,
    ].join('');

    const redirectUrl: string = await new Promise((resolve, reject) => {
      // @ts-ignore
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url: string | undefined) => {
        // @ts-ignore
        if (chrome.runtime.lastError) {
          // @ts-ignore
          reject(new Error(chrome.runtime.lastError.message));
        } else if (url) {
          resolve(url);
        } else {
          reject(new Error('No redirect URL returned'));
        }
      });
    });

    const hash = new URL(redirectUrl).hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');

    if (!idToken) throw new Error('No id_token in redirect');

    const credential = GoogleAuthProvider.credential(idToken);
    if (!auth) throw new Error('Firebase not configured');
    
    console.log('[Auth] Attempting Firebase sign-in with id_token...');
    const result = await signInWithCredential(auth, credential);
    console.log('[Auth] Google Extension sign-in success:', result.user?.email);
    
    return { user: firebaseUserToAppUser(result.user) };
  } catch (e: any) {
    console.error('[Auth] Google Extension sign-in error:', e.message || e);
    // Propagate more descriptive errors if available
    const msg = e.message || 'unknown';
    if (msg.includes('lastError') || msg.includes('cancel')) {
      return { error: 'cancelled' };
    }
    return { error: msg };
  }
}

// ─────────────────────────────────────────────
// Facebook Sign In
// ─────────────────────────────────────────────

export async function signInWithFacebook(): Promise<AuthResult> {
  if (IS_EXTENSION) {
    return handleOffscreenAuth('facebook.com');
  }
  if (!auth) return { error: 'firebase_not_configured' };
  try {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');

    const result = await signInWithRedirect(auth, provider);
    return { user: firebaseUserToAppUser(result.user) };
  } catch (e) {
    return handleSocialAuthError(e as AuthError, 'facebook.com');
  }
}


// ─────────────────────────────────────────────
// X (Twitter) Sign In
// ─────────────────────────────────────────────

export async function signInWithX(): Promise<AuthResult> {
  if (IS_EXTENSION) {
    return handleOffscreenAuth('twitter.com');
  }
  if (!auth) return { error: 'firebase_not_configured' };
  try {
    const provider = new TwitterAuthProvider();
    const result = await signInWithRedirect(auth, provider);
    return { user: firebaseUserToAppUser(result.user) };
  } catch (e) {
    return handleSocialAuthError(e as AuthError, 'twitter.com');
  }
}

// ─────────────────────────────────────────────
// Offscreen Auth Handler (For Extension Environment)
// ─────────────────────────────────────────────

async function handleOffscreenAuth(provider: string): Promise<AuthResult> {
  try {
    // Determine the web app's URL. Prefer the environment variable or fallback to production.
    const WEB_URL = import.meta.env.VITE_WEB_URL || 'https://startlytab.com';
    const loginUrl = `${WEB_URL}/login?from_ext=true&social=${provider}`;

    // Open a new tab to the web app for authentication
    // @ts-ignore
    chrome.tabs.create({ url: loginUrl });

    // Return a 'cancelled' error so the UI stops the loading spinner.
    // The actual login state will be pushed from the web to the extension asynchronously.
    return { error: 'cancelled' };
  } catch (e: any) {
    console.error(`[Auth] Web Auth redirect error for ${provider}:`, e);
    return { error: e.message || 'unknown' };
  }
}

// ─────────────────────────────────────────────
// Account Linking (after conflict resolution)
// ─────────────────────────────────────────────

export async function linkPendingCredential(pendingCredential: OAuthCredential): Promise<AuthResult> {
  if (!auth) return { error: 'firebase_not_configured' };
  const currentUser = auth.currentUser;
  if (!currentUser) return { error: 'not_logged_in' };

  try {
    const result = await linkWithCredential(currentUser, pendingCredential);
    return { user: firebaseUserToAppUser(result.user) };
  } catch (e) {
    console.error('[Auth] linkWithCredential error:', e);
    return { error: 'link_failed' };
  }
}

// ─────────────────────────────────────────────
// Sign Out
// ─────────────────────────────────────────────

export async function signOutUser(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('[Auth] signOut error:', e);
    }
  }
  // Synchronously clear local cache
  localStorage.removeItem('focus_tab_user');
  localStorage.removeItem('focus_tab_token');
  localStorage.setItem('focus_tab_last_logout_ts', Date.now().toString());
  localStorage.setItem('focus_tab_explicit_signout', 'true');
}

// ─────────────────────────────────────────────
// Shared Error Handler for Social Providers
// ─────────────────────────────────────────────

async function handleSocialAuthError(err: AuthError, _provider: string): Promise<AuthResult> {
  if (err.code === 'auth/account-exists-with-different-credential') {
    const email = (err as any).customData?.email || '';
    let existingMethods: string[] = [];
    let pendingCredential: OAuthCredential | undefined;

    try {
      if (email) {
        existingMethods = await fetchSignInMethodsForEmail(auth, email);
      }
      // Extract the pending credential to link later
      if (_provider === 'facebook.com') {
        pendingCredential = FacebookAuthProvider.credentialFromError(err) ?? undefined;
      } else if (_provider === 'twitter.com') {
        pendingCredential = TwitterAuthProvider.credentialFromError(err) ?? undefined;
      } else if (_provider === 'google.com') {
        pendingCredential = GoogleAuthProvider.credentialFromError(err) ?? undefined;
      }
    } catch { /* ignore */ }

    return {
      error: 'account_exists_different_credential',
      existingMethods,
      pendingCredential,
    };
  }

  if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
    return { error: 'cancelled' };
  }

  if (err.code === 'auth/popup-blocked') {
    return { error: 'popup_blocked' };
  }

  console.error('[Auth] Social auth error:', err.code, err.message);
  return { error: err.code || 'unknown' };
}

// ─────────────────────────────────────────────
// Get existing sign-in methods for an email
// ─────────────────────────────────────────────

export async function getSignInMethodsForEmail(email: string): Promise<string[]> {
  if (!auth) return [];
  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Legacy compatibility: keep renderGoogleButton
// (no longer renders via GSI, will be replaced by LoginPage UI)
// ─────────────────────────────────────────────
export function renderGoogleButton(_containerId: string, _theme: 'light' | 'dark' = 'light') {
  // This function is kept for backwards compatibility.
  // New UI components in LoginPage.tsx handle button rendering directly.
  console.warn('[Auth] renderGoogleButton is deprecated. Use LoginPage.tsx Google button instead.');
}

// ─────────────────────────────────────────────
// Legacy Google Init (kept for any remaining usage)
// Will be phased out in favour of onAuthStateChanged in UserContext
// ─────────────────────────────────────────────
export async function initGoogleAuthStrict(_onUser: (user: User | null) => void) {
  // No-op: auth state is now managed via onAuthStateChanged in UserContext.tsx
  // This shim prevents import errors from components still referencing it.
}

// Triggering Vercel rebuild Thu Apr  2 10:40:29 CST 2026
