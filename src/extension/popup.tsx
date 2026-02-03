import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import GatewayCreateModal from '../components/GatewayCreateModal';
import '../index.css'; // Ensure utility classes are available
import { QuickLink } from '../types';

function PopupApp() {
    const [currentTab, setCurrentTab] = useState<{ url: string, title: string, favIconUrl: string } | null>(null);
    const [categories, setCategories] = useState<string[]>(['Shortcuts', 'Work', 'Personal']);

    // Auth & Quota State
    const [user, setUser] = useState<any>(null);
    const [subscriptionTier, setSubscriptionTier] = useState<string>('unauthenticated');
    const [limits, setLimits] = useState<any>(null);
    const [gatewayCount, setGatewayCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Get current tab info
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                const tab = tabs[0];
                setCurrentTab({
                    url: tab.url || '',
                    title: tab.title || '',
                    favIconUrl: tab.favIconUrl || ''
                });
            }
        });

        // 2. Load data from storage (User, Tier, Limits, Gateways)
        chrome.storage.local.get(['gateways', 'user', 'subscriptionTier', 'limits'], (result) => {
            const links: QuickLink[] = result.gateways || [];

            setUser(result.user || null);
            setSubscriptionTier(result.subscriptionTier || 'unauthenticated');
            setLimits(result.limits || null);
            setGatewayCount(links.length);

            const cats = new Set<string>();
            cats.add('Shortcuts');
            links.forEach(link => {
                if (link.category) cats.add(link.category);
            });
            setCategories(Array.from(cats));
            setIsLoading(false);
        });
    }, []);

    const handleSave = (data: { url: string; title: string; logoFile: File | null; category: string }) => {
        // Create new link object
        const newLink: QuickLink = {
            id: crypto.randomUUID(),
            url: data.url,
            title: data.title || new URL(data.url).hostname,
            icon: currentTab?.favIconUrl || null,
            color: '#cbd5e1',
            category: data.category,
            customLogoUrl: data.logoFile ? URL.createObjectURL(data.logoFile) : undefined
        };

        const saveToPending = (link: QuickLink) => {
            // We save to 'pendingGateway' so the Main App (New Tab) can pick it up, 
            // add it to state, and sync to Cloud.
            // This is better than overwriting 'gateways' directly which might cause conflicts.
            chrome.storage.local.set({ pendingGateway: link }, () => {
                window.close();
            });
        };

        if (data.logoFile) {
            const reader = new FileReader();
            reader.onloadend = () => {
                newLink.customLogoUrl = reader.result as string;
                saveToPending(newLink);
            };
            reader.readAsDataURL(data.logoFile);
        } else {
            saveToPending(newLink);
        }
    };

    const openShortcuts = () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    };

    const openNewTab = () => {
        chrome.tabs.create({ url: 'chrome://newtab' });
    };

    if (isLoading || !currentTab) return <div className="p-8 text-gray-500 text-sm flex items-center justify-center h-screen bg-gray-50">Loading...</div>;

    // --- State 1: Not Logged In ---
    if (!user) {
        return (
            <div className="w-full h-full bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Login Required</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Please sign in on your new tab page to add gateways.
                </p>
                <button
                    onClick={openNewTab}
                    className="px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:scale-105 transition-transform"
                >
                    Open New Tab
                </button>
            </div>
        );
    }

    // --- State 2: Quota Exceeded ---
    // Default limit if not synced is 5 (Free tier equivalent)
    const limit = (limits && limits.GATEWAYS)
        ? (subscriptionTier === 'authenticated_subscribed' ? limits.GATEWAYS.SUBSCRIBED : limits.GATEWAYS.FREE)
        : 5;

    if (gatewayCount >= limit) {
        return (
            <div className="w-full h-full bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Limit Reached</h3>
                <p className="text-sm text-gray-500 mb-6">
                    You've reached the free limit of {limit} gateways. Upgrade to Pro for unlimited access.
                </p>
                <button
                    onClick={openNewTab}
                    className="px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:scale-105 transition-transform"
                >
                    Manage Subscription
                </button>
            </div>
        );
    }

    // --- State 3: Content (Add Gateway) ---
    return (
        <div className="w-full h-full bg-black/90 relative">
            <GatewayCreateModal
                isOpen={true}
                onClose={() => window.close()}
                onSave={handleSave}
                initialCategory="Shortcuts"
                categories={categories}
                initialUrl={currentTab.url}
                initialTitle={currentTab.title}
                initialIcon={currentTab.favIconUrl}
            />
            {/* Footer with Shortcut Link */}
            <div className="absolute bottom-4 left-0 w-full flex justify-center pointer-events-none z-[100020]">
                <button
                    onClick={openShortcuts}
                    className="text-[10px] text-gray-500 hover:text-white underline cursor-pointer pointer-events-auto"
                >
                    Change Shortcut Key
                </button>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <PopupApp />
    </React.StrictMode>
);
