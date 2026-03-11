import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { fetchSubscriptionState } from '../services/subscriptionService';
import { fetchUserMembership, fetchUserSettings } from '../services/redeemService';
import { initGoogleAuthStrict } from '../services/authService';

interface UserContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    isAuthChecking: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within UserProvider');
    }
    return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [user, setUser] = useState<User | null>(() => {
        try {
            const savedUser = localStorage.getItem('focus_tab_user');
            console.log('[UserContext] Initializing state from localStorage:', savedUser ? 'found' : 'null');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    // 1. Unified Google Auth Initialization
    useEffect(() => {
        let isMounted = true;

        const explicitSignout = localStorage.getItem('focus_tab_explicit_signout') === 'true';
        if (explicitSignout) {
            console.log('[UserContext] Explicit signout detected, skipping auto-login check.');
            setIsAuthChecking(false);
            return;
        }

        console.log('[UserContext] Initializing Google Auth Strict...');

        // Safety timeout for auth checking (2s max)
        const timer = setTimeout(() => {
            if (isMounted) {
                console.log('[UserContext] Auth safety timer fired.');
                setIsAuthChecking(false);
            }
        }, 2000);

        // initGoogleAuthStrict may return a cleanup function or be void
        const result = initGoogleAuthStrict((incomingUser) => {
            if (!isMounted) return;
            console.log('[UserContext] Google Auth callback received:', incomingUser?.email || 'null');

            if (incomingUser) {
                setUser(incomingUser);
                localStorage.setItem('focus_tab_user', JSON.stringify(incomingUser));
            } else {
                // If SDK says null, we only clear if we don't have a local session
                const savedLocal = localStorage.getItem('focus_tab_user');
                if (!savedLocal) {
                    setUser(null);
                }
            }

            // Always resolve checking state once we get any response
            setIsAuthChecking(false);
            clearTimeout(timer);
        });

        return () => {
            isMounted = false;
            clearTimeout(timer);
            // If initGoogleAuthStrict returned a cleanup function, call it
            if (typeof result === 'function') {
                (result as Function)();
            } else if (result && typeof (result as any).then === 'function') {
                // It's a Promise - check if it resolved to a function
                (result as Promise<any>).then((cleanup: any) => {
                    if (typeof cleanup === 'function') cleanup();
                }).catch(() => { });
            }
        };
    }, []);

    // 2. Sync with localStorage changes (cross-tab)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'focus_tab_user') {
                if (!e.newValue) {
                    setUser(null);
                } else {
                    try {
                        setUser(JSON.parse(e.newValue));
                    } catch (error) {
                        console.error('[UserContext] Failed to parse user from storage event', error);
                    }
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // 3. Silent background subscription & settings sync (Ported from legacy AppRouter)
    useEffect(() => {
        if (!user?.id) return;

        const checkSubscription = async () => {
            // Only sync if we have a valid local session to prevent "Zombie Resurrection"
            const storedUser = localStorage.getItem('focus_tab_user');
            if (!storedUser) return;

            try {
                const [subscriptionData, membershipData, settingsData] = await Promise.all([
                    fetchSubscriptionState(user.id),
                    fetchUserMembership(user.id),
                    fetchUserSettings(user.id),
                ]);

                const updatedUser: User = {
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

                // Double check if we are still logged in before writing
                if (localStorage.getItem('focus_tab_user')) {
                    setUser(updatedUser);
                    localStorage.setItem('focus_tab_user', JSON.stringify(updatedUser));
                }
            } catch (error) {
                console.error('[UserContext] Background sync failed:', error);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') checkSubscription();
        };
        const handleFocus = () => checkSubscription();

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        // Initial check on mount if authenticated
        checkSubscription();

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user?.id]);

    const handleSetUser = useCallback((newUser: User | null) => {
        console.log('[UserContext] Manual setUser called:', newUser?.email || 'null');
        setUser(newUser);
        if (newUser) {
            localStorage.setItem('focus_tab_user', JSON.stringify(newUser));
            localStorage.removeItem('focus_tab_explicit_signout');
        } else {
            localStorage.removeItem('focus_tab_user');
            localStorage.setItem('focus_tab_explicit_signout', 'true');
        }
        setIsAuthChecking(false);
    }, []);

    const contextValue = React.useMemo(() => ({
        user,
        setUser: handleSetUser,
        isAuthChecking
    }), [user, handleSetUser, isAuthChecking]);

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
};
