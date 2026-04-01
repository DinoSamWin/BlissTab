import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  Auth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Check if we're running inside a Chrome Extension
// @ts-ignore
const IS_EXTENSION = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Only initialize Firebase if API key is configured — prevents crash when env vars are missing
if (firebaseConfig.apiKey) {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Chrome Extension: use IndexedDB for persistence (Service Worker safe)
  // Web: use localStorage persistence
  if (IS_EXTENSION) {
    auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
    });
  } else {
    try {
      auth = getAuth(app);
      // Default is browserLocalPersistence in web context
    } catch {
      auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
      });
    }
  }
} else {
  console.warn('[Firebase] No API key configured — Firebase auth is disabled.');
}

export { auth, app };
