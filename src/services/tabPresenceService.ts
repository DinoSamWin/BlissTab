/**
 * TabPresenceService
 * 
 * Web-environment best-effort tab counter.
 * Uses BroadcastChannel + localStorage heartbeat to count how many
 * StartlyTab pages are currently open (same origin only).
 * 
 * Limitation: Cannot see tabs from other domains. In the Chrome Extension
 * environment, use chrome.tabs.query() instead (handled in geminiService).
 */

const TAB_PRESENCE_KEY = 'StartlyTab_ActiveTabs';
const HEARTBEAT_INTERVAL_MS = 5000;   // 5s ping
const TAB_STALE_THRESHOLD_MS = 15000; // assume dead if no ping for 15s

interface TabEntry {
    id: string;
    lastSeen: number;
    url: string;
}

let tabId: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let channel: BroadcastChannel | null = null;

function getTabId(): string {
    if (!tabId) {
        tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    return tabId;
}

function readActiveTabs(): TabEntry[] {
    try {
        const raw = localStorage.getItem(TAB_PRESENCE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeActiveTabs(tabs: TabEntry[]): void {
    try {
        localStorage.setItem(TAB_PRESENCE_KEY, JSON.stringify(tabs));
    } catch { /* storage full, ignore */ }
}

function pruneAndRegister(): TabEntry[] {
    const now = Date.now();
    const id = getTabId();
    const existing = readActiveTabs().filter(
        t => t.id === id || (now - t.lastSeen) < TAB_STALE_THRESHOLD_MS
    );

    const selfIndex = existing.findIndex(t => t.id === id);
    const selfEntry: TabEntry = { id, lastSeen: now, url: location.href };

    if (selfIndex >= 0) {
        existing[selfIndex] = selfEntry;
    } else {
        existing.push(selfEntry);
    }

    writeActiveTabs(existing);
    return existing;
}

function deregister(): void {
    const id = getTabId();
    const tabs = readActiveTabs().filter(t => t.id !== id);
    writeActiveTabs(tabs);
    channel?.postMessage({ type: 'tab_closed', tabId: id });
}

/**
 * Start heartbeat. Call once per page load.
 */
export function startTabPresence(): void {
    // Prevent double-init
    if (heartbeatTimer) return;

    pruneAndRegister();

    // Announce ourselves to other tabs
    if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('startly_tab_presence');
        channel.onmessage = (_ev) => {
            // Another tab pinged — re-prune to get fresh count
            pruneAndRegister();
        };
    }

    heartbeatTimer = setInterval(() => {
        pruneAndRegister();
        channel?.postMessage({ type: 'heartbeat', tabId: getTabId() });
    }, HEARTBEAT_INTERVAL_MS);

    // Clean up on page unload
    window.addEventListener('pagehide', deregister, { once: true });
    window.addEventListener('beforeunload', deregister, { once: true });
}

/**
 * Returns the current count of active StartlyTab windows (same origin).
 * Returns -1 if running in Chrome Extension context (not needed there).
 */
export function getWebTabCount(): number {
    // In Chrome Extension context, don't interfere — use chrome.tabs.query instead
    const isChromeExt = typeof chrome !== 'undefined' && !!chrome.tabs;
    if (isChromeExt) return -1;

    pruneAndRegister(); // ensure self is registered and stale entries pruned
    return readActiveTabs().length;
}
