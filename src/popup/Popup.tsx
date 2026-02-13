import React, { useEffect, useState, useMemo } from 'react';
import { QuickLink, AppState } from '../types';
import { canonicalizeUrl } from '../services/urlCanonicalService';
import { getLocalLogoDataUrl, downloadAndCacheLogo } from '../services/gatewayLogoCacheService';
import { DEFAULT_LINKS, DEFAULT_REQUESTS } from '../constants';
import { ExternalLink, Plus, Settings, X, Check, Search } from 'lucide-react';

const Popup: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<{ title: string; url: string; favIconUrl: string } | null>(null);
    const [customTitle, setCustomTitle] = useState('');
    const [category, setCategory] = useState<string>('Shortcuts');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [existingLink, setExistingLink] = useState<QuickLink | null>(null);
    const [categories, setCategories] = useState<string[]>(['Shortcuts', 'Work', 'Personal', 'Design', 'Dev']);
    const [isSaved, setIsSaved] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    // Load current tab and existing state
    useEffect(() => {
        // Get current tab
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (tab && tab.url && tab.title) {
                    setCurrentTab({
                        title: tab.title,
                        url: tab.url,
                        favIconUrl: tab.favIconUrl || ''
                    });
                    setCustomTitle(tab.title);

                    // Check if already saved
                    const savedState = localStorage.getItem('focus_tab_state');
                    if (savedState) {
                        try {
                            const parsed: AppState = JSON.parse(savedState);
                            const canonical = canonicalizeUrl(tab.url);

                            // Extract categories
                            if (parsed.links) {
                                const cats = new Set<string>(['Shortcuts']);
                                parsed.links.forEach(l => {
                                    if (l.category) cats.add(l.category);
                                });
                                setCategories(Array.from(cats));

                                const found = parsed.links.find(l => {
                                    try {
                                        return (l.canonicalUrl || canonicalizeUrl(l.url)) === canonical;
                                    } catch {
                                        return l.url === tab.url;
                                    }
                                });

                                if (found) {
                                    setExistingLink(found);
                                    setCustomTitle(found.customTitle || found.title);
                                    setCategory(found.category || 'Shortcuts');

                                    // Load existing logo
                                    const localLogo = found.customLogoHash
                                        ? getLocalLogoDataUrl(canonical, found.customLogoHash)
                                        : null;

                                    if (localLogo) {
                                        setLogoPreview(localLogo);
                                    } else if (found.customLogoUrl) {
                                        setLogoPreview(found.customLogoUrl);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Failed to parse state', e);
                        }
                    }
                }
            });
        }
    }, []);

    // Handle logo file selection
    useEffect(() => {
        if (logoFile) {
            const objectUrl = URL.createObjectURL(logoFile);
            setLogoPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [logoFile]);

    const handleSave = async () => {
        if (!currentTab) return;

        const savedState = localStorage.getItem('focus_tab_state');
        let newState: AppState;

        // Initialize default state if empty
        if (!savedState) {
            newState = {
                version: '1.0.0',
                links: DEFAULT_LINKS,
                requests: DEFAULT_REQUESTS,
                pinnedSnippetId: null,
                language: 'English',
                user: null,
                theme: 'light'
            };
        } else {
            try {
                newState = JSON.parse(savedState);
            } catch {
                newState = {
                    version: '1.0.0',
                    links: DEFAULT_LINKS,
                    requests: DEFAULT_REQUESTS,
                    pinnedSnippetId: null,
                    language: 'English',
                    user: null,
                    theme: 'light'
                };
            }
        }

        const canonical = canonicalizeUrl(currentTab.url);
        const linkId = existingLink ? existingLink.id : Date.now().toString();

        // Prepare new link object
        const newLink: QuickLink = {
            id: linkId,
            url: currentTab.url,
            title: currentTab.title, // Original title
            icon: currentTab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(currentTab.url).hostname}&sz=128`,
            color: '#f3f4f6',
            category: category,
            canonicalUrl: canonical,
            customTitle: customTitle !== currentTab.title ? customTitle : undefined,
            // Preserve existing logo info if no new file
            customLogoHash: logoFile ? undefined : existingLink?.customLogoHash,
            customLogoPath: logoFile ? undefined : existingLink?.customLogoPath,
            customLogoUrl: logoFile ? undefined : existingLink?.customLogoUrl,
            customLogoSignedUrl: logoFile ? undefined : existingLink?.customLogoSignedUrl,
        };

        // If file uploaded, we only store it locally in this popup context (limitations of extension vs app sync)
        // Real sync would require uploading to Supabase here. 
        // For MVP extension, we'll cache the data URL locally so it shows up on this machine.
        if (logoFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                // Generate a pseudo-hash
                const hash = `local_${Date.now()}`;
                newLink.customLogoHash = hash;

                // Save to local cache
                // We need to access the module from the window or import it.
                // Since we imported getLocalLogoDataUrl, we can use the cache service helpers.
                // But verify they are available.
                // Actually, we can just save it to the cache manually or use the service if it stores to localStorage.
                try {
                    const cacheKey = 'focus_tab_gateway_logo_cache';
                    const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                    cache[canonical] = {
                        dataUrl,
                        hash,
                        updatedAt: Date.now()
                    };
                    localStorage.setItem(cacheKey, JSON.stringify(cache));
                } catch (e) {
                    console.error("Failed to save logo locally", e);
                }

                finishSave(newState, newLink);
            };
            reader.readAsDataURL(logoFile);
        } else {
            finishSave(newState, newLink);
        }
    };

    const finishSave = (state: AppState, link: QuickLink) => {
        // Update links array
        const existingIndex = state.links.findIndex(l => {
            try {
                return (l.canonicalUrl || canonicalizeUrl(l.url)) === link.canonicalUrl!;
            } catch {
                return l.id === link.id;
            }
        });

        if (existingIndex >= 0) {
            state.links[existingIndex] = link;
        } else {
            state.links.push(link);
        }

        // Save back to localStorage
        // NOTE: We do NOT plain replace the user. We try to preserve the user object if it exists in the storage.
        // But verify if we parsed it correctly earlier.

        localStorage.setItem('focus_tab_state', JSON.stringify(state));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        setExistingLink(link);
    };

    const openDashboard = () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: 'index.html' });
        }
    };

    const handleAddCategory = () => {
        if (newCategory.trim()) {
            setCategories([...categories, newCategory.trim()]);
            setCategory(newCategory.trim());
            setNewCategory('');
            setIsAddingCategory(false);
        }
    };

    if (!currentTab) return <div className="p-8 flex items-center justify-center">Loading...</div>;

    return (
        <div className="w-[360px] bg-white dark:bg-[#0F0F0F] min-h-[400px] flex flex-col font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center font-bold text-xs">F</div>
                    <span className="font-semibold text-sm">FocusTab</span>
                </div>
                <button onClick={openDashboard} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors" title="Open Dashboard">
                    <Settings size={16} />
                </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
                {/* Preview Card */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain" />
                        ) : (
                            currentTab.favIconUrl ?
                                <img src={currentTab.favIconUrl} alt="Favicon" className="w-8 h-8 opacity-80" /> :
                                <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                        )}

                        <input
                            type="file"
                            id="logo-upload"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept="image/*"
                            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-[10px] text-white font-bold uppercase">Edit</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-base font-semibold focus:ring-0 placeholder-gray-400 truncate"
                            placeholder="Enter name..."
                        />
                        <div className="text-xs text-gray-500 truncate mt-1">{currentTab.url}</div>
                    </div>
                </div>

                {/* Category Selector */}
                <div className="mb-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Group</label>

                    {!isAddingCategory ? (
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === cat
                                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-md'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                            <button
                                onClick={() => setIsAddingCategory(true)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 flex items-center gap-1 transition-all"
                            >
                                <Plus size={12} /> New
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="New category name"
                                className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-black/30"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            />
                            <button onClick={handleAddCategory} className="p-1.5 bg-black text-white rounded-lg"><Check size={12} /></button>
                            <button onClick={() => setIsAddingCategory(false)} className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><X size={12} /></button>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaved}
                    className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-black/5 ${isSaved
                            ? 'bg-green-500 text-white'
                            : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                >
                    {isSaved ? 'Saved!' : existingLink ? 'Update Gateway' : 'Add to FocusTab'}
                </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-black/5 dark:border-white/5 text-center">
                <p className="text-[10px] text-gray-400">
                    Changes will sync to your new tab automatically.
                </p>
            </div>
        </div>
    );
};

export default Popup;
