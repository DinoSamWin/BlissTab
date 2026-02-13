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
    const [selectedCategory, setSelectedCategory] = useState<string>('快捷指令');
    const [customCategory, setCustomCategory] = useState<string>('');

    // UI states
    const [categories, setCategories] = useState<string[]>(['快捷指令']);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [shortcut, setShortcut] = useState<string>('');

    // Authentication state
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('focus_tab_user');
        return saved ? JSON.parse(saved) : null;
    });

    const refreshShortcut = useCallback(() => {
        chrome.commands.getAll((commands) => {
            const actionCommand = commands.find(c => c.name === '_execute_action');
            if (actionCommand && actionCommand.shortcut) {
                setShortcut(actionCommand.shortcut);
            } else {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                setShortcut(isMac ? 'Command+Shift+A' : 'Ctrl+Shift+A');
            }
        });
    }, []);

    const refreshCategories = useCallback(() => {
        const appState = getAppState();
        if (appState && appState.links) {
            const existingCats = Array.from(new Set(
                appState.links
                    .filter(l => !l.id.startsWith('ghost-'))
                    .map(l => l.category)
                    .filter(Boolean)
            )) as string[];
            setCategories(Array.from(new Set(['快捷指令', ...existingCats])));
        }
    }, []);

    // Effect to handle initialization and URL parameter syncing
    useEffect(() => {
        const initialParams = new URLSearchParams(window.location.search);
        setUrl(initialParams.get('url') || '');
        setTitle(initialParams.get('title') || '');
        setIconUrl(initialParams.get('icon') || null);

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

        chrome.tabs.onUpdated.addListener(handleTabUpdate);

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

            const categoryToUse = customCategory.trim() || selectedCategory || '快捷指令';

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
            setTimeout(() => setStatus('idle'), 2000);
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
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleIconUpload}
                            className="flex-1 text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:rounded-full file:border-0 file:bg-gray-100 file:px-5 file:py-2.5 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-gray-700 dark:file:bg-white/10 dark:file:text-gray-200 cursor-pointer"
                        />
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

                {/* Shortcut Display Area */}
                <div
                    className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl select-none"
                >
                    <div className="flex items-center gap-3">
                        <span className="bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 rounded-lg px-2 py-1 font-mono text-[10px] text-gray-600 dark:text-gray-300 shadow-sm">
                            {shortcut || '...'}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">to open</span>
                    </div>

                    <button
                        onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
                        className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all group"
                    >
                        <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Settings</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidePanel;
