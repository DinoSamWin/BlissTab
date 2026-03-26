import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { QuickLink, AppState } from '../types';
import { syncToCloud } from '../services/supabaseService';

// Helper to read app state from localStorage
const getAppState = (): AppState | null => {
    try {
        const saved = localStorage.getItem('focus_tab_state');
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error('Failed to read app state', e);
        return null;
    }
};

const SidePanel: React.FC = () => {
    // 1. Initial State from URL
    const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
    const tabId = parseInt(queryParams.get('tabId') || '0', 10);

    // 2. Form State
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('Quick Access');
    const [customCategory, setCustomCategory] = useState<string>('');

    // UI states
    const [categories, setCategories] = useState<string[]>(['Quick Access']);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [shortcut, setShortcut] = useState<string>('');

    // Authentication state
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('focus_tab_user');
        return saved ? JSON.parse(saved) : null;
    });

    const refreshShortcut = useCallback(() => {
        if (typeof chrome !== 'undefined' && chrome.commands) {
            chrome.commands.getAll((commands) => {
                const actionCommand = commands.find(c => c.name === '_execute_side_panel' || c.name === '_execute_action');
                if (actionCommand && actionCommand.shortcut) {
                    setShortcut(actionCommand.shortcut);
                } else {
                    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                    setShortcut(isMac ? 'Command+Shift+S' : 'Ctrl+Shift+S');
                }
            });
        } else {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            setShortcut(isMac ? 'Command+Shift+S' : 'Ctrl+Shift+S');
        }
    }, []);

    const refreshCategories = useCallback(() => {
        const appState = getAppState();
        if (appState && appState.links) {
            const existingCats = Array.from(new Set(
                appState.links
                    .filter(l => !l.id.startsWith('ghost-'))
                    .map(l => l.category)
                    .filter(c => c && c !== 'Shortcuts' && c !== '快捷指令')
            )) as string[];
            
            // Unify default categories
            const defaultCats = ['Quick Access'];
            const merged = Array.from(new Set([...defaultCats, ...existingCats]));
            setCategories(merged);

            // If "Shortcuts" exists in app state, and user is currently on "快捷指令", maybe switch?
            // For now, just ensure both are in the dropdown.
        }
    }, []);

    // Effect to handle initialization and URL parameter syncing
    useEffect(() => {
        const initialParams = new URLSearchParams(window.location.search);
        const urlParam = initialParams.get('url') || '';
        const titleParam = initialParams.get('title') || '';
        const iconParam = initialParams.get('icon') || null;

        if (!urlParam && typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    const activeTab = tabs[0];
                    setUrl(activeTab.url || '');
                    setTitle(activeTab.title || '');
                    setIconUrl(activeTab.favIconUrl || null);
                }
            });
        } else {
            setUrl(urlParam);
            setTitle(titleParam);
            setIconUrl(iconParam);
        }

        refreshShortcut();
        refreshCategories();
    }, [refreshShortcut, refreshCategories]);

    useEffect(() => {
        // Listen for navigations in THIS SPECIFIC tab to update the form
        // This handles the "Refresh Page" case while the panel is open
        const handleTabUpdate = (id: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            if (id === tabId && changeInfo.status === 'complete') {
                console.log('[SidePanel] Tab refreshed, updating data...');
                setUrl(tab.url || '');
                setTitle(tab.title || '');
                if (tab.favIconUrl) setIconUrl(tab.favIconUrl);
            }
        };

        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.onUpdated.addListener(handleTabUpdate);
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'focus_tab_user') {
                setUser(e.newValue ? JSON.parse(e.newValue) : null);
            }
        };
        window.addEventListener('storage', handleStorageChange);

        window.addEventListener('focus', () => {
            refreshShortcut();
            refreshCategories();
            const savedUser = localStorage.getItem('focus_tab_user');
            if (savedUser) setUser(JSON.parse(savedUser));
        });

        return () => {
            chrome.tabs.onUpdated.removeListener(handleTabUpdate);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [tabId, refreshShortcut, refreshCategories]);

    const handleSave = async () => {
        setIsSaving(true);
        setStatus('idle');

        try {
            const appState = getAppState();
            if (!appState) throw new Error('Could not load app state');

            const categoryToUse = customCategory.trim() || selectedCategory || 'Quick Access';

            const newLink: QuickLink = {
                id: Date.now().toString(),
                url: url,
                title: title,
                icon: iconUrl,
                color: '#E5E7EB',
                category: categoryToUse,
                type: 'link'
            };

            const updatedLinks = [...(appState.links || []), newLink];
            const updatedState = { ...appState, links: updatedLinks, user: user };
            localStorage.setItem('focus_tab_state', JSON.stringify({ ...updatedState, user: null }));

            if (user) {
                try {
                    await syncToCloud(updatedState);
                } catch (cloudError) {
                    console.error('[SidePanel] Cloud sync failed:', cloudError);
                }
            }

            setStatus('success');
            setTimeout(() => {
                setStatus('idle');
                window.close();
            }, 800);
            refreshCategories();
        } catch (error) {
            console.error('Failed to save link', error);
            setStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setIconUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white dark:bg-[#0F0F0F] text-gray-900 dark:text-gray-100 font-sans">
            <div className="flex-1 px-8 py-10 overflow-y-auto space-y-8 no-scrollbar">
                {/* Header */}
                <div>
                    <h1 className="serif text-[32px] font-medium leading-tight text-gray-900 dark:text-gray-100 italic">Add Gateway</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Customize details. Leave empty to use default.</p>
                </div>

                {/* URL Field */}
                <div>
                    <label className="text-[10px] font-extrabold text-black dark:text-white uppercase tracking-[0.2em] mb-3 block">URL</label>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-gray-100 placeholder-gray-400 transition-all font-medium"
                        placeholder="https://..."
                    />
                </div>

                {/* Group Selection Chips */}
                <div className="space-y-4">
                    <label className="text-[10px] font-extrabold text-black dark:text-white uppercase tracking-[0.2em]">Group</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setSelectedCategory(cat);
                                    setCustomCategory('');
                                }}
                                className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${(selectedCategory === cat && !customCategory)
                                        ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-black/10'
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    {/* Custom Group Input */}
                    <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Create or enter new group name..."
                        className="w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-gray-100 placeholder-gray-400 transition-all font-medium"
                    />
                </div>

                {/* Custom Name & Icon Row */}
                <div className="flex items-end gap-5">
                    <div className="w-16 h-16 shrink-0 rounded-[24px] bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center overflow-hidden">
                        {iconUrl ? (
                            <img src={iconUrl} alt="Icon" className="w-10 h-10 object-contain opacity-90" />
                        ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />
                        )}
                    </div>

                    <div className="flex-1">
                        <label className="text-[10px] font-extrabold text-black dark:text-white uppercase tracking-[0.2em] mb-3 block">Custom Name</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Site Title"
                            className="w-full bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-gray-100 font-medium"
                        />
                    </div>
                </div>

                {/* Upload Logo */}
                <div>
                    <label className="text-[10px] font-extrabold text-black dark:text-white uppercase tracking-[0.2em] mb-3 block">Upload logo</label>
                    <div className="flex items-center gap-4">
                        <label className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleIconUpload}
                                className="hidden"
                            />
                            <span className="text-xs text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                {iconUrl ? 'Click to change image' : 'Choose local image...'}
                            </span>
                        </label>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 leading-relaxed">
                        We'll store the uploaded image locally for fast display and back it up to Supabase.
                    </p>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-8 py-8 space-y-6 border-t border-gray-100 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl">
                <div className="flex gap-4">
                    <button
                        onClick={() => window.close()}
                        className="flex-1 py-4 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:opacity-80 transition-all border border-transparent"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !title || !url}
                        className={`flex-1 py-4 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] transition-all ${status === 'success'
                                ? 'bg-green-500 text-white'
                                : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-[0.98] shadow-xl shadow-black/20 dark:shadow-white/5'
                            }`}
                    >
                        {status === 'success' ? 'Saved' : isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Hotkey Link at the bottom */}
                <button 
                    onClick={() => {
                        if (typeof chrome !== 'undefined' && chrome.tabs) {
                            chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
                        }
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-white/5 rounded-lg shadow-sm border border-black/5 dark:border-white/10 group-hover:scale-110 transition-transform">
                            <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Global Shortcut</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-gray-800 dark:text-gray-200">{shortcut}</span>
                        <svg className="w-3 h-3 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default SidePanel;
