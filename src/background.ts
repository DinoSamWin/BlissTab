// Background script for FocusTab Extension

// 1. Setup global initialization
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error('[Background] Failed to set panel behavior:', error));

// 2. Handle the extension icon click
chrome.action.onClicked.addListener((tab) => {
    if (!tab.id) return;

    // Reject restricted URLs
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-error://') || tab.url.startsWith('about:'))) {
        console.warn('[Background] Side panel cannot be opened on this page.');
        return;
    }

    // Construct a per-tab URL with the current page info.
    const url = new URL(chrome.runtime.getURL('popup.html'));
    url.searchParams.set('tabId', tab.id.toString());
    url.searchParams.set('url', tab.url || '');
    url.searchParams.set('title', tab.title || '');
    url.searchParams.set('t', Date.now().toString()); // Force refresh

    if (tab.favIconUrl) {
        url.searchParams.set('icon', tab.favIconUrl);
    }

    // CRITICAL: We must trigger setOptions and open() in the same synchronous task block
    // to preserve the "user gesture" provided by the action click.
    // Putting open() inside a callback or using await often causes the "gesture expired" error.

    chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: url.pathname + url.search,
        enabled: true
    });

    chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
        console.error('[Background] sidePanel.open failed:', err.message);
    });
});

// 3. Reset state on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setOptions({ enabled: false });
});

console.log('[Background] Gesture-safe Side Panel controller initialized.');
