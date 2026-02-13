import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import App from './App';
import SubscriptionPage from './components/SubscriptionPage';
import PrivacyPolicy from './components/PrivacyPolicy';
import LoadingDemo from './components/LoadingDemo';
import { User } from './types';
import { fetchSubscriptionState, determineSubscriptionTier, updateSubscriptionState } from './services/subscriptionService';
import { fetchUserMembership, fetchUserSettings } from './services/redeemService';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('focus_tab_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Sync with localStorage changes (e.g., logout in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'focus_tab_user') {
        if (!e.newValue) {
          // User logged out in another tab
          setUser(null);
        } else {
          // User logged in/switched in another tab
          try {
            setUser(JSON.parse(e.newValue));
          } catch (error) {
            console.error('[AppRouter] Failed to parse user from storage event', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Silent background subscription check (1200ms timeout, no loading overlay)
  useEffect(() => {
    if (!user?.id) return;

    // GUARD: If localStorage is empty, it means we are logged out.
    // Do NOT attempt to fetch or write back to localStorage.
    // This prevents "Zombie Resurrection" when tab initiates focus.
    const storedUser = localStorage.getItem('focus_tab_user');
    if (!storedUser) {
      if (user) setUser(null); // Self-correct
      return;
    }

    const checkSubscription = async () => {
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 1200);
      });

      const fetchPromise = Promise.all([
        fetchSubscriptionState(user.id),
        fetchUserMembership(user.id),
        fetchUserSettings(user.id),
      ]).then(([subscriptionData, membershipData, settingsData]) => {
        return {
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
      });

      try {
        const updatedUser = await Promise.race([fetchPromise, timeoutPromise]);
        if (updatedUser) {
          // Double check if we are still logged in before writing
          if (localStorage.getItem('focus_tab_user')) {
            setUser(updatedUser);
            localStorage.setItem('focus_tab_user', JSON.stringify(updatedUser));
          }
        }
      } catch (error) {
        console.error('[AppRouter] Background subscription check failed:', error);
      }
    };

    checkSubscription();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSubscription();
      }
    };

    const handleFocus = () => {
      checkSubscription();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);

  const handleSetUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('focus_tab_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('focus_tab_user');
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser: handleSetUser }}>
      {children}
    </UserContext.Provider>
  );
};

const AppRoutes: React.FC = () => {
  const { user, setUser } = useUser();
  const location = useLocation();

  const handleSubscriptionUpdate = async (updatedUser: User) => {
    // Update subscription in backend
    if (updatedUser.id) {
      await updateSubscriptionState(updatedUser.id, {
        isSubscribed: updatedUser.isSubscribed || false,
        subscriptionPlan: updatedUser.subscriptionPlan || 'free',
        subscriptionStatus: updatedUser.subscriptionStatus || 'active',
        subscriptionExpiresAt: updatedUser.subscriptionExpiresAt || null,
      });
    }

    setUser(updatedUser);
  };

  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route
        path="/subscription"
        element={
          <SubscriptionPage
            user={user}
            onSubscriptionUpdate={handleSubscriptionUpdate}
          />
        }
      />
      <Route path="/loading-demo" element={<LoadingDemo />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const AppRouter: React.FC = () => {
  // Check if running in Chrome Extension environment
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;

  if (isExtension) {
    return (
      <HashRouter>
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </HashRouter>
    );
  }

  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  );
};

export default AppRouter;

