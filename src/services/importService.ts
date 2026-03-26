import { QuickLink } from '../types';

/**
 * Service to handle importing bookmarks and shortcuts from various sources.
 */

// Helper to flatten bookmark tree
const flattenBookmarks = (nodes: any[]): { title: string; url: string }[] => {
    let results: { title: string; url: string }[] = [];
    for (const node of nodes) {
        if (node.url) {
            // Only include http/https links to avoid parsing errors
            if (node.url.startsWith('http')) {
                results.push({ title: node.title || 'Untitled', url: node.url });
            }
        }
        if (node.children) {
            results = results.concat(flattenBookmarks(node.children));
        }
    }
    return results;
};

const isExtensionEnv = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;

/**
 * Fetches all bookmarks from the browser (Chrome).
 */
export const fetchChromeBookmarks = async (): Promise<{ title: string; url: string }[]> => {
    if (!isExtensionEnv || !chrome.bookmarks) {
        console.warn('[ImportService] Chrome Bookmarks API not available, using mock data for dev');
        // Return high-quality mock data for testing on localhost
        return [
            { title: 'Google', url: 'https://google.com' },
            { title: 'YouTube', url: 'https://youtube.com' },
            { title: 'GitHub', url: 'https://github.com' },
            { title: 'Product Hunt', url: 'https://producthunt.com' },
            { title: 'Twitter', url: 'https://twitter.com' },
        ];
    }

    try {
        return new Promise((resolve) => {
            chrome.bookmarks.getTree((tree) => {
                if (!tree) return resolve([]);
                resolve(flattenBookmarks(tree));
            });
        });
    } catch (err) {
        console.error('[ImportService] Failed to fetch bookmarks:', err);
        return [];
    }
};

/**
 * Checks if a specific Chrome extension is installed and enabled.
 */
export const isExtensionInstalled = async (extensionId: string): Promise<boolean> => {
    if (!isExtensionEnv || !chrome.management) return true; // Assume true in dev for UI testing
    
    return new Promise((resolve) => {
        chrome.management.get(extensionId, (info) => {
            if (chrome.runtime.lastError || !info) {
                resolve(false);
            } else {
                resolve(info.enabled);
            }
        });
    });
};

const EXECUTION_TIMEOUT = 5000;

/**
 * Executes a script on a specific tab to extract data.
 */
const extractDataFromTab = async (tabId: number, scriptFn: () => any): Promise<any> => {
    if (!isExtensionEnv || !chrome.scripting) return null;
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Extraction timed out')), EXECUTION_TIMEOUT);
        
        chrome.scripting.executeScript({
            target: { tabId },
            func: scriptFn,
        }, (results) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else if (results && results[0]) {
                resolve(results[0].result);
            } else {
                resolve(null);
            }
        });
    });
};

/**
 * Implementation for Infinity import logic.
 */
export const triggerInfinityImport = async (): Promise<{ title: string; url: string }[]> => {
    if (!isExtensionEnv || !chrome.tabs) {
        console.warn('[ImportService] Chrome Tabs API not available, using mock data');
        await new Promise(r => setTimeout(r, 2000)); // Simulate work
        return [
            { title: 'OpenAI', url: 'https://openai.com' },
            { title: 'Notion', url: 'https://notion.so' },
            { title: 'Figma', url: 'https://figma.com' },
        ];
    }

    const url = 'https://www.infinitynewtab.com/';
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url, active: false }, async (tab) => {
            if (!tab?.id) return reject(new Error('Failed to create tab'));

            const listener = async (tabId: number, info: any) => {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    try {
                        const data = await extractDataFromTab(tab.id, () => {
                            const items: any[] = [];
                            const elements = document.querySelectorAll('.site-item, [data-url]');
                            elements.forEach(el => {
                                const url = el.getAttribute('data-url') || (el as HTMLAnchorElement).href;
                                const title = el.getAttribute('title') || el.textContent;
                                if (url && url.startsWith('http')) {
                                    items.push({ title: title?.trim() || 'Imported', url });
                                }
                            });
                            return items;
                        });
                        chrome.tabs.remove(tab.id);
                        resolve(data || []);
                    } catch (err) {
                        chrome.tabs.remove(tab.id);
                        reject(err);
                    }
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    });
};

/**
 * Implementation for Start.me import logic.
 */
export const triggerStartMeImport = async (): Promise<{ title: string; url: string }[]> => {
    if (!isExtensionEnv || !chrome.tabs) {
        console.warn('[ImportService] Chrome Tabs API not available, using mock data');
        await new Promise(r => setTimeout(r, 2000));
        return [
            { title: 'Reddit', url: 'https://reddit.com' },
            { title: 'Medium', url: 'https://medium.com' },
            { title: 'LinkedIn', url: 'https://linkedin.com' },
        ];
    }

    const url = 'https://start.me/';
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url, active: false }, async (tab) => {
            if (!tab?.id) return reject(new Error('Failed to create tab'));

            const listener = async (tabId: number, info: any) => {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    
                    try {
                        const data = await extractDataFromTab(tab.id, () => {
                            const items: any[] = [];
                            const links = document.querySelectorAll('a[href^="http"]');
                            links.forEach(a => {
                                const href = (a as HTMLAnchorElement).href;
                                const title = a.textContent?.trim();
                                if (href && title) {
                                    items.push({ title, url: href });
                                }
                            });
                            return items;
                        });
                        chrome.tabs.remove(tab.id);
                        resolve(data || []);
                    } catch (err) {
                        chrome.tabs.remove(tab.id);
                        reject(err);
                    }
                }
            };
            chrome.tabs.onUpdated.addListener(listener);
        });
    });
};

/**
 * Formats basic bookmark data into QuickLink objects.
 */
export const formatToQuickLinks = (items: { title: string; url: string }[]): QuickLink[] => {
    return items.map(item => ({
        id: crypto.randomUUID(),
        title: item.title,
        url: item.url,
        icon: null,
        color: '#6366f1', // Focus color
        category: 'Imported'
    }));
};
