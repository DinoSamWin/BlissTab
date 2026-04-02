import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebaseService';
import { User } from '../types';
import { fetchSubscriptionState } from '../services/subscriptionService';
import { fetchUserMembership, fetchUserSettings } from '../services/redeemService';
import { firebaseUserToAppUser } from '../services/authService';

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
    const [user, setUserState] = useState<User | null>(() => {
        // Optimistic pre-load from localStorage for instant UI render
        try {
            const savedUser = localStorage.getItem('focus_tab_user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    // PERSISTENT VERIFICATION FLAG: Prevents rollback during synchronization races
    const verifiedRef = React.useRef<boolean>(!!user?.emailVerified);
    
    // Keep ref in sync with current state
    React.useEffect(() => {
        if (user?.emailVerified) verifiedRef.current = true;
    }, [user?.emailVerified]);

    // 1. Firebase Auth State Listener (single source of truth)
    useEffect(() => {
        if (!auth) {
            console.warn('[UserContext] Firebase Auth not initialized. Skipping listener.');
            setIsAuthChecking(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
            if (fbUser) {
                const appUser = firebaseUserToAppUser(fbUser);
                
                // Get pre-auth storage check to see if we already verified this guy
                const existingRaw = localStorage.getItem('focus_tab_user');
                let merged = appUser;
                
                if (existingRaw) {
                    try {
                        const existing = JSON.parse(existingRaw);
                        if (existing.id === appUser.id) {
                            // STICKY VERIFICATION: Trust local state/ref over Firebase (Firebase token can be stale)
                            const finalEmailVerified = appUser.emailVerified || existing.emailVerified || verifiedRef.current;
                            if (finalEmailVerified) verifiedRef.current = true;
                            
                            merged = { ...existing, ...appUser, emailVerified: finalEmailVerified };
                        }
                    } catch (e) {
                        console.error('[UserContext] Failed to merge previous user state', e);
                    }
                }
                
                setUserState(merged);
                localStorage.setItem('focus_tab_user', JSON.stringify(merged));
                localStorage.removeItem('focus_tab_explicit_signout');
                console.log('[UserContext] Auth update:', merged.email, 'Verified:', merged.emailVerified);
            } else {
                // Firebase says no user (currently null)
                const signoutRaw = localStorage.getItem('focus_tab_explicit_signout');
                let isRecentSignout = false;
                
                try {
                    if (signoutRaw) {
                        const parsed = JSON.parse(signoutRaw);
                        // Only treat as signout if happened in the last 15 minutes
                        if (parsed && typeof parsed.timestamp === 'number') {
                            isRecentSignout = (Date.now() - parsed.timestamp < 15 * 60 * 1000);
                        }
                    } else if (signoutRaw === 'true') {
                        isRecentSignout = true; // Legacy support
                    }
                } catch {
                    isRecentSignout = signoutRaw === 'true';
                }

                const hasLocalUser = !!localStorage.getItem('focus_tab_user');
                
                // CRITICAL: Only clear state if it's a confirmed explicit signout.
                // Otherwise, preserve the local UI state until the next explicit action.
                if (isRecentSignout || !hasLocalUser) {
                    console.log('[UserContext] Clearing user state (confirmed logout or missing session)');
                    setUserState(null);
                    localStorage.removeItem('focus_tab_user');
                } else {
                    console.log('[UserContext] Firebase auth null but preserving local session for stability.');
                }
            }
            setIsAuthChecking(false);
        });

        // Safety: if Firebase doesn't respond within 3s, stop blocking UI
        const timer = setTimeout(() => setIsAuthChecking(false), 3000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    // 2. Cross-tab sync (storage event)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'focus_tab_user') {
                if (!e.newValue) {
                    setUserState(null);
                } else {
                    try {
                        setUserState(JSON.parse(e.newValue));
                    } catch (error) {
                        console.error('[UserContext] Failed to parse user from storage event', error);
                    }
                }
            } else if (e.key === 'focus_tab_explicit_signout') {
                const newValue = e.newValue;
                if (newValue) {
                    try {
                        const { timestamp } = JSON.parse(newValue);
                        // Only react if the signout happened in the last 10 seconds
                        if (Date.now() - timestamp < 10000) {
                            console.log('[UserContext] Recent explicit sign out detected from another tab');
                            handleSetUser(null, false, 'StorageEvent:Signout'); // false = don't propagate back to storage
                        }
                    } catch (err) {
                        // Legacy support for 'true' string
                        if (newValue === 'true') {
                            console.log('[UserContext] Legacy explicit sign out detected');
                            handleSetUser(null, false, 'StorageEvent:LegacySignout');
                        }
                    }
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // 2b. Direct message sync (from background)
        const handleRuntimeMessage = (message: any) => {
            if (message.type === 'SYNC_LOCAL_STORAGE' && message.user) {
                console.log('[UserContext] Received sync message from background');
                setUserState(message.user);
            }
        };

        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener(handleRuntimeMessage);
        }

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
                chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
            }
        };
    }, []);

    // 3. Silent background subscription & settings sync
    useEffect(() => {
        if (!user?.id) return;

        const checkSubscription = async () => {
            const storedUser = localStorage.getItem('focus_tab_user');
            if (!storedUser) return;

            try {
                const [subscriptionData, membershipData, settingsData] = await Promise.all([
                    fetchSubscriptionState(user.id),
                    fetchUserMembership(user.id),
                    fetchUserSettings(user.id),
                ]);

                const updatedUser: User = {
                    ...user!,
                    ...subscriptionData,
                    ...(membershipData && {
                        memberViaRedeem: membershipData.memberViaRedeem,
                        membershipSince: membershipData.membershipSince,
                    }),
                    ...(settingsData && {
                        redeemEnabled: settingsData.redeemEnabled,
                    }),
                };

                // CRITICAL INTEGRITY CHECK: Ensure background sync doesn't overwrite verification
                if (verifiedRef.current && !updatedUser.emailVerified) {
                    console.log('[UserContext] Preventing verification rollback during background sync');
                    updatedUser.emailVerified = true;
                }

                const currentLocal = localStorage.getItem('focus_tab_user');
                if (currentLocal) {
                    const parsed = JSON.parse(currentLocal);
                    if (parsed.id === user.id) {
                        setUserState(updatedUser);
                        localStorage.setItem('focus_tab_user', JSON.stringify(updatedUser));
                    }
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
        checkSubscription();

        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user?.id]);

    // Manual setUser — used after login actions to immediately update state
    const handleSetUser = useCallback((newUser: User | null, propagateSignout = true, source = 'Manual') => {
        console.log(`[UserContext] handleSetUser called from ${source}:`, newUser?.email || 'null', 'Verified:', newUser?.emailVerified);
        
        let finalUser = newUser;
        if (newUser && verifiedRef.current && !newUser.emailVerified) {
            console.log('[UserContext] Forcing verification state on manual setUser');
            finalUser = { ...newUser, emailVerified: true };
        }

        setUserState(finalUser);
        if (finalUser) {
            if (finalUser.emailVerified) verifiedRef.current = true;
            localStorage.setItem('focus_tab_user', JSON.stringify(finalUser));
            localStorage.removeItem('focus_tab_explicit_signout');
        } else {
            verifiedRef.current = false;
            localStorage.removeItem('focus_tab_user');
            if (propagateSignout) {
                localStorage.setItem('focus_tab_explicit_signout', JSON.stringify({ timestamp: Date.now() }));
            }
        }
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
