import { auth } from '../services/firebaseService';
import { 
    signInWithPopup, 
    TwitterAuthProvider, 
    FacebookAuthProvider, 
    GoogleAuthProvider,
    AuthError
} from 'firebase/auth';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SYNC_LOCAL_STORAGE') {
        localStorage.setItem('focus_tab_user', JSON.stringify(message.user));
        if (message.token) {
           localStorage.setItem('focus_tab_token', message.token);
        }
        localStorage.removeItem('focus_tab_explicit_signout');
        sendResponse({ success: true });
        return true;
    }

    if (message.type !== 'EXECUTE_OFFSCREEN_AUTH') return false;

    // Handle asynchronously
    handleOffscreenAuth(message.provider)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ error: error.message || 'unknown error' }));

    return true; // Keep message channel open for async response
});


async function handleOffscreenAuth(providerName: string) {
    let provider;
    switch (providerName) {
        case 'twitter.com':
            provider = new TwitterAuthProvider();
            break;
        case 'facebook.com':
            provider = new FacebookAuthProvider();
            provider.addScope('email');
            provider.addScope('public_profile');
            break;
        case 'google.com':
            provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            break;
        default:
            throw new Error(`Unsupported provider: ${providerName}`);
    }

    try {
        const result = await signInWithPopup(auth, provider);
        // Firebase automatically saves the state in IndexedDB
        // Return minimal non-object data to satisfy message passing
        return { success: true, uid: result.user.uid, email: result.user.email };
    } catch (e) {
        const err = e as AuthError;
        let errorCode = err.code || 'unknown';
        if (err.code === 'auth/account-exists-with-different-credential') {
            errorCode = 'account_exists_different_credential';
        } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
            errorCode = 'cancelled';
        } else if (err.code === 'auth/popup-blocked') {
            errorCode = 'popup_blocked';
        }
        
        return { error: errorCode };
    }
}
