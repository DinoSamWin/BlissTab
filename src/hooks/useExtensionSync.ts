
import { useEffect, useRef } from 'react';
import { AppState, QuickLink, User, SubscriptionTier } from '../types';
import { SUBSCRIPTION_LIMITS } from '../services/usageLimitsService';

export function useExtensionSync(
    appState: AppState,
    saveState: (state: AppState | ((prev: AppState) => AppState)) => void
) {
    // Keep a ref to saveState to avoid re-binding listeners constantly
    const saveStateRef = useRef(saveState);
    useEffect(() => {
        saveStateRef.current = saveState;
    }, [saveState]);

    // 1. Sync FROM App TO Extension
    // We strictly write the current state to the extension storage
    // so the popup can make decisions (Auth check, Quota check)
    useEffect(() => {
        // @ts-ignore
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

        const payload = {
            gateways: appState.links,
            user: appState.user || null,
            subscriptionTier: appState.subscriptionTier || 'unauthenticated',
            limits: SUBSCRIPTION_LIMITS // Pass limits so popup doesn't need to hardcode them
        };

        // @ts-ignore
        chrome.storage.local.set(payload);
    }, [appState.links, appState.user, appState.subscriptionTier]);


    // 2. Listen for changes FROM Extension (Popup)
    useEffect(() => {
        // @ts-ignore
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

        // @ts-ignore
        const handleStorageChange = (changes: any, areaName: string) => {
            if (areaName === 'local' && changes.pendingGateway) {
                const newGateway: QuickLink = changes.pendingGateway.newValue;
                if (!newGateway) return;

                // found a new gateway pending addition!
                // We consume it, add it to our state, and then clear the pending flag.

                saveStateRef.current(prev => {
                    const exists = prev.links.some(l => l.id === newGateway.id);
                    if (exists) return prev;

                    return {
                        ...prev,
                        links: [...prev.links, newGateway]
                    };
                });

                // Clear the pending gateway from storage to avoid re-processing
                // @ts-ignore
                chrome.storage.local.remove('pendingGateway');
            }
        };

        // @ts-ignore
        chrome.storage.onChanged.addListener(handleStorageChange);
        // @ts-ignore
        return () => {
            // @ts-ignore
            chrome.storage.onChanged.removeListener(handleStorageChange);
        }
    }, []);
}
