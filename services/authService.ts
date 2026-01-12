import { User } from '../types';

/**
 * PASTE YOUR CLIENT ID HERE after creating it in the Google Cloud Console.
 * It should look like: "123456789-abcdef.apps.googleusercontent.com"
 */
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const IS_PLACEHOLDER_ID = !CLIENT_ID || CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID');

export async function initGoogleAuth(onUser: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  // 1. Check local storage first for immediate UI response
  const savedUser = localStorage.getItem('focus_tab_user');
  if (savedUser) {
    try {
      onUser(JSON.parse(savedUser));
    } catch (e) {
      console.error('Auth restore failed', e);
    }
  }

  // 2. Poll for the Google SDK to load
  const gsiInterval = setInterval(() => {
    if ((window as any).google?.accounts?.id) {
      clearInterval(gsiInterval);
      
      const handleCredentialResponse = (response: any) => {
        try {
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

          localStorage.setItem('focus_tab_user', JSON.stringify(user));
          onUser(user);
        } catch (e) {
          console.error('Auth parsing failed', e);
          onUser(null);
        }
      };

      (window as any).google.accounts.id.initialize({
        client_id: IS_PLACEHOLDER_ID ? 'MOCK_ID' : CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true,
        // FedCM is the new standard, but can be finicky in iframes. 
        // We set it to false if the environment is restricted.
        use_fedcm_for_prompt: false 
      });
      
      // Attempt One Tap automatically if a real ID exists
      if (!IS_PLACEHOLDER_ID) {
        (window as any).google.accounts.id.prompt();
      }
    }
  }, 300);

  // Stop polling after 5 seconds to save resources
  setTimeout(() => clearInterval(gsiInterval), 5000);
}

/**
 * Renders the official Google Sign-In button.
 */
export function renderGoogleButton(containerId: string, theme: 'light' | 'dark' = 'light') {
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    const container = document.getElementById(containerId);
    if (container) {
      (window as any).google.accounts.id.renderButton(
        container,
        { 
          theme: theme === 'dark' ? 'filled_black' : 'outline', 
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          width: 280
        }
      );
    }
  }
}

/**
 * Manual trigger for the sign-in flow.
 * If no real Client ID is provided, it falls back to a simulated login.
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
    (window as any).google.accounts.id.prompt();
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
