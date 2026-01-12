import { User } from '../types';

// Replace this with your actual Client ID from Google Cloud Console
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const IS_PLACEHOLDER_ID = CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID');

export async function initGoogleAuth(onUser: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  const savedUser = localStorage.getItem('focus_tab_user');
  if (savedUser) {
    try {
      onUser(JSON.parse(savedUser));
    } catch (e) {
      console.error('Auth restore failed', e);
    }
  }

  const gsiInterval = setInterval(() => {
    if ((window as any).google?.accounts?.id) {
      clearInterval(gsiInterval);
      
      const handleCredentialResponse = (response: any) => {
        try {
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
        use_fedcm_for_prompt: false 
      });
      
      // Attempt One Tap only if not in placeholder mode
      if (!IS_PLACEHOLDER_ID) {
        (window as any).google.accounts.id.prompt();
      }
    }
  }, 300);

  setTimeout(() => clearInterval(gsiInterval), 5000);
}

/**
 * Renders the official Google Sign-In button into a container.
 * This is the recommended way for production environments.
 */
export function renderGoogleButton(containerId: string, theme: 'light' | 'dark' = 'light') {
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    (window as any).google.accounts.id.renderButton(
      document.getElementById(containerId),
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

export function openGoogleSignIn(onUser?: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  if (IS_PLACEHOLDER_ID) {
    // Simulate login for development if no Client ID is provided
    setTimeout(() => {
      const mockUser: User = {
        id: 'mock-12345',
        email: 'focus.user@example.com',
        name: 'Focus Explorer',
        picture: 'https://ui-avatars.com/api/?name=Focus+Explorer&background=random'
      };
      localStorage.setItem('focus_tab_user', JSON.stringify(mockUser));
      if (onUser) onUser(mockUser);
    }, 500);
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
    } catch (e) {}
  }
}
