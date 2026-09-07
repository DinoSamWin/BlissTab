// Background script for FocusTab Extension

// Listen for auth messages from the popup/UI
// Note: We no longer use offscreen documents to avoid remote hosted code flagging.
// Social logins are handled via redirect to web + AUTH_SYNC back to extension.

// Listen for external messages (Web-to-Extension Sync)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_SYNC' && message.user) {
        console.log('[Background] Received AUTH_SYNC from:', sender.origin);
        (async () => {
            try {
                // Store auth info in chrome.storage which all extension pages can access
                await chrome.storage.local.set({ 
                    'focus_tab_user': message.user,
                    'focus_tab_token': message.token || null,
                    'focus_tab_sync_ts': Date.now()
                });
                
                // Also broadcast to any open New Tab pages to trigger immediate state update
                const tabs = await chrome.tabs.query({ url: 'chrome://newtab/*' });
                const internalTabs = await chrome.tabs.query({ url: chrome.runtime.getURL('*') });
                
                const allTabs = [...tabs, ...internalTabs];
                for (const tab of allTabs) {
                    if (tab.id) {
                        try {
                           chrome.tabs.sendMessage(tab.id, { 
                               type: 'AUTH_SYNC_COMPLETE', 
                               user: message.user, 
                               token: message.token 
                           }).catch(() => {}); // Ignore errors for inactive tabs
                        } catch (e) {}
                    }
                }
                
                sendResponse({ success: true });
            } catch (err: any) {
                console.error('[Background] Failed to sync auth from web:', err);
                sendResponse({ error: 'sync_failed' });
            }
        })();
        return true;
    }
    return false;
});

// Context-aware mode stores only aggregate activation timestamps. It never
// stores tab ids, titles, URLs, or browsing history.
const CONTEXT_SENSING_ENABLED_KEY = 'startly_context_sensing_enabled';
const TAB_ACTIVATIONS_KEY = 'startlytab_tab_activations_10m';
const TEN_MINUTES_MS = 10 * 60 * 1000;

async function recordAggregateTabActivation() {
    const enabledState = await chrome.storage.local.get(CONTEXT_SENSING_ENABLED_KEY);
    if (enabledState[CONTEXT_SENSING_ENABLED_KEY] !== true) return;

    const now = Date.now();
    const stored = await chrome.storage.local.get(TAB_ACTIVATIONS_KEY);
    const previous = Array.isArray(stored[TAB_ACTIVATIONS_KEY])
        ? stored[TAB_ACTIVATIONS_KEY].filter((timestamp: unknown) => (
            typeof timestamp === 'number' && now - timestamp <= TEN_MINUTES_MS
        ))
        : [];
    await chrome.storage.local.set({ [TAB_ACTIVATIONS_KEY]: [...previous, now].slice(-100) });
}

// 1. Setup global initialization
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('[Background] Failed to set panel behavior:', error));

// 2. Enable side panel globally
chrome.sidePanel.setOptions({
    enabled: true,
    path: 'popup.html'
}).catch((error) => console.error('[Background] Failed to set global options:', error));

console.log('[Background] Native Side Panel controller initialized.');

chrome.tabs.onActivated.addListener(() => {
    recordAggregateTabActivation().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'GET_CONTEXT_SUMMARY') return false;

    (async () => {
        const enabledState = await chrome.storage.local.get(CONTEXT_SENSING_ENABLED_KEY);
        if (enabledState[CONTEXT_SENSING_ENABLED_KEY] !== true) {
            sendResponse({ enabled: false });
            return;
        }
        const now = Date.now();
        const stored = await chrome.storage.local.get(TAB_ACTIVATIONS_KEY);
        const recent = Array.isArray(stored[TAB_ACTIVATIONS_KEY])
            ? stored[TAB_ACTIVATIONS_KEY].filter((timestamp: unknown) => (
                typeof timestamp === 'number' && now - timestamp <= TEN_MINUTES_MS
            ))
            : [];
        sendResponse({ enabled: true, tabSwitches10m: recent.length });
    })().catch(() => sendResponse({ enabled: true, tabSwitches10m: undefined }));
    return true;
});
