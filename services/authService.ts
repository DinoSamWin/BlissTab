
import { User } from '../types';

// In a real production environment, this would be your actual Google Client ID.
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

const IS_PLACEHOLDER_ID = CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID');

export async function initGoogleAuth(onUser: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  // Mocking the auth check for a better UX when the real GSI lib isn't fully configured or in this sandbox
  const savedUser = localStorage.getItem('focus_tab_user');
  if (savedUser) {
    try {
      onUser(JSON.parse(savedUser));
    } catch (e) {
      console.error('Auth restore failed', e);
    }
  }

  // If we are using a placeholder ID, do not attempt to initialize GSI to avoid console errors
  if (IS_PLACEHOLDER_ID) {
    console.info("FocusTab: Auth is in simulation mode (No valid Client ID provided).");
    return;
  }

  // Load GSI if available
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
        client_id: CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: true,
        // Disable FedCM to prevent NotAllowedError in restricted iframe environments
        use_fedcm_for_prompt: false 
      });
      
      // Attempt One Tap
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('One Tap suppressed or skipped');
        }
      });
    }
  }, 500);

  // Safety timeout for interval
  setTimeout(() => clearInterval(gsiInterval), 5000);
}

/**
 * Triggers the login flow. 
 * If the CLIENT_ID is still the default placeholder, it simulates a login for demo purposes
 * to ensure the UI is responsive as requested.
 */
export function openGoogleSignIn(onUser?: (user: User | null) => void) {
  if (typeof window === 'undefined') return;

  // If GSI is available and we have a real Client ID, use it.
  // Otherwise, if it's the placeholder, we simulate a login for the user to see the flow.
  if (IS_PLACEHOLDER_ID) {
    console.warn("FocusTab: Using mock login because CLIENT_ID is still placeholder.");
    
    // Simulate a brief loading state
    setTimeout(() => {
      const mockUser: User = {
        id: 'mock-12345',
        email: 'focus.user@example.com',
        name: 'Focus Explorer',
        picture: 'https://ui-avatars.com/api/?name=Focus+Explorer&background=random'
      };
      localStorage.setItem('focus_tab_user', JSON.stringify(mockUser));
      if (onUser) onUser(mockUser);
    }, 800);
    return;
  }

  if ((window as any).google?.accounts?.id) {
    (window as any).google.accounts.id.prompt();
  } else {
    alert("Google Sign-In is still loading. Please try again in a moment.");
  }
}

export function signOutUser() {
  localStorage.removeItem('focus_tab_user');
  if (typeof window !== 'undefined' && (window as any).google) {
    try {
      (window as any).google.accounts.id.disableAutoSelect();
    } catch (e) {
      // Ignore errors if GSI wasn't initialized
    }
  }
}
