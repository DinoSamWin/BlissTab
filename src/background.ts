// Background script for FocusTab Extension

/// OFFSCREEN AUTHENTICATION MANAGER ///
const OFFSCREEN_DOCUMENT_PATH = 'assets/offscreen.html';

async function hasOffscreenDocument() {
    // @ts-ignore
    if ('getContexts' in chrome.runtime) {
        // @ts-ignore
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
        });
        return contexts.length > 0;
    } else {
        // @ts-ignore
        const matchedClients = await clients.matchAll();
        return await matchedClients.some(c => c.url.includes(chrome.runtime.id));
    }
}

async function setupOffscreenDocument(path: string) {
    if (await hasOffscreenDocument()) return;
    
    // @ts-ignore
    if (chrome.offscreen) {
        // @ts-ignore
        await chrome.offscreen.createDocument({
            url: path,
            reasons: ['DOM_SCRAPING'], // Used as a workaround for Firebase Auth which needs DOM access
            justification: 'Firebase Authentication popup handling'
        });
    }
}

// Listen for auth messages from the popup/UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'INIT_OFFSCREEN_AUTH') {
        (async () => {

            try {
                // Ensure offscreen document exists
                await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
                
                // The offscreen document might not be ready to receive messages immediately because
                // its module script takes a moment to execute. We retry a few times if we get an error.
                let response;
                let lastError = null;
                
                for (let i = 0; i < 15; i++) {
                    try {
                        response = await chrome.runtime.sendMessage({
                            type: 'EXECUTE_OFFSCREEN_AUTH',
                            provider: message.provider,
                            target: 'offscreen'
                        });
                        // If no error was thrown, it was received
                        break;

                    } catch (err: any) {
                        lastError = err;
                        if (err.message && (err.message.includes('Receiving end does not exist') || err.message.includes('A listener indicated an asynchronous response'))) {
                            // Wait 100ms before retrying
                            await new Promise(r => setTimeout(r, 100));
                        } else {
                            // Some other error, throw it
                            throw err;
                        }
                    }
                }
                
                if (!response && lastError) {
                    throw lastError;
                }
                
                sendResponse(response);
            } catch (err: any) {
                console.error('[Background] Offscreen auth error:', err);
                sendResponse({ error: err.message || 'setup_failed' });
            }
        })();
        return true; // Indicate async response
    }
});

// Listen for external messages (Web-to-Extension Sync)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTH_SYNC' && message.user) {
        console.log('[Background] Received AUTH_SYNC from:', sender.origin);
        (async () => {
            try {
                // Ensure offscreen document exists so it can write to localStorage
                await setupOffscreenDocument(OFFSCREEN_DOCUMENT_PATH);
                
                await chrome.runtime.sendMessage({
                    type: 'SYNC_LOCAL_STORAGE',
                    user: message.user,
                    token: message.token
                });
                
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
