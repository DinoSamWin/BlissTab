import React, { useState } from 'react';
import { AppState, QuickLink, SnippetRequest } from '../types';
import { fetchSiteMetadata } from '../services/metadataService';
import { COLORS, SUPPORTED_LANGUAGES, BRAND_CONFIG } from '../constants';
import { canAddGateway, canAddIntention, getSubscriptionTier, SUBSCRIPTION_LIMITS, isSubscribed } from '../services/usageLimitsService';
import { redeemCode, toggleRedeemFeature, RedeemErrorCode } from '../services/redeemService';
import SubscriptionUpsellModal from './SubscriptionUpsellModal';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  updateState: (newState: AppState | ((prev: AppState) => AppState)) => Promise<void>;
  addToast: (msg: string, type?: any) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, state, updateState, addToast, onSignIn, onSignOut }) => {
  const [newUrl, setNewUrl] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'links' | 'snippets' | 'language' | 'redeem' | 'account'>('links');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionModalFeature, setSubscriptionModalFeature] = useState<'gateways' | 'intentions'>('gateways');
  // Redeem code state
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  if (!isOpen) return null;

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || isFetchingMetadata) return;
    
    // Handler-level guard: Prevent bypass via Enter key, fast clicks, or devtools
    const tier = getSubscriptionTier(state);
    const isAuthed = !!state.user;
    const gatewayCount = state.links.length;
    
    // Explicit check: Only block if authenticated, not subscribed, and at/above limit
    if (isAuthed && !isSubscribed(state) && gatewayCount >= SUBSCRIPTION_LIMITS.GATEWAYS.FREE) {
      setSubscriptionModalFeature('gateways');
      setIsSubscriptionModalOpen(true);
      return;
    }
    
    // Check usage limits before adding (secondary check)
    const limitCheck = canAddGateway(state);
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'limit_reached') {
        setSubscriptionModalFeature('gateways');
        setIsSubscriptionModalOpen(true);
      } else if (limitCheck.reason === 'requires_auth') {
        addToast('Please sign in to add gateways', 'info');
        onSignIn();
      }
      return;
    }
    
    setIsFetchingMetadata(true);
    // Generate stable UUID-like ID
    const tempId = `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setPendingLinkId(tempId);
    
    // Normalize URL immediately
    let normalizedUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Extract domain for fallback
    let fallbackTitle = 'Gateway';
    try {
      const domain = new URL(normalizedUrl).hostname;
      const domainParts = domain.split('.');
      fallbackTitle = domainParts.length > 1 
        ? domainParts[domainParts.length - 2].charAt(0).toUpperCase() + domainParts[domainParts.length - 2].slice(1)
        : domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      // Keep default fallback
    }
    
    // Create optimistic link with loading state - ALWAYS keep this item
    const optimisticLink: QuickLink = {
      id: tempId,
      url: normalizedUrl,
      title: 'Fetching details...',
      icon: null,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
    
    // Optimistic update - add link immediately for responsive UI
    const optimisticState = { ...state, links: [...state.links, optimisticLink] };
    updateState(optimisticState);
    const currentUrl = normalizedUrl;
    setNewUrl('');
    
    try {
      // Fetch metadata
      const meta = await fetchSiteMetadata(currentUrl);
      
      // Always update the link - never remove it
      // Use functional update to work with latest state
      const updatedLink = {
        id: tempId,
        url: meta?.url || normalizedUrl,
        title: meta?.title || fallbackTitle,
        icon: meta?.icon || null,
        color: optimisticLink.color
      };
      
      // Build updated state
      const updatedLinks = state.links.map(link => 
        link.id === tempId ? updatedLink : link
      );
      const updatedState = {
        ...state,
        links: updatedLinks
      };
      
      // Update state and wait for sync to complete
      try {
        await updateState(updatedState);
        console.log('[Settings] Gateway added and synced to Supabase:', updatedLink.url);
        if (meta) {
          addToast('Gateway added', 'success');
        } else {
          addToast('Gateway added (using fallback details)', 'info');
        }
      } catch (error) {
        console.error('[Settings] Failed to sync gateway:', error);
        addToast('Gateway added locally, but sync failed. Please refresh and try again.', 'error');
      }
    } catch (error) {
      // NEVER remove the item - keep it with fallback data
      const fallbackLink = {
        id: tempId,
        url: normalizedUrl,
        title: fallbackTitle,
        icon: null,
        color: optimisticLink.color
      };
      const fallbackLinks = state.links.map(link => 
        link.id === tempId ? fallbackLink : link
      );
      const fallbackState = { ...state, links: fallbackLinks };
      try {
        await updateState(fallbackState);
        addToast('Gateway added (using fallback details)', 'info');
      } catch (syncError) {
        console.error('[Settings] Failed to sync fallback gateway:', syncError);
        addToast('Gateway added locally, but sync failed.', 'error');
      }
    } finally {
      setIsFetchingMetadata(false);
      setPendingLinkId(null);
    }
  };

  const removeLink = async (id: string) => {
    // Build updated state
    const updatedState = { ...state, links: state.links.filter(l => l.id !== id) };
    
    // Update state and wait for sync to complete
    try {
      await updateState(updatedState);
      console.log('[Settings] Gateway removed and synced to Supabase:', id);
      addToast('Gateway removed', 'success');
    } catch (error) {
      console.error('[Settings] Failed to sync removal:', error);
      addToast('Failed to remove gateway. Please try again.', 'error');
      // Revert optimistic update on error
      updateState(state);
    }
  };

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt) return;
    
    // Handler-level guard: Prevent bypass via Enter key, fast clicks, or devtools
    const tier = getSubscriptionTier(state);
    const isAuthed = !!state.user;
    const activeIntentionCount = state.requests.filter(r => r.active).length;
    
    // Explicit check: Only block if authenticated, not subscribed, and at/above limit
    if (isAuthed && !isSubscribed(state) && activeIntentionCount >= SUBSCRIPTION_LIMITS.INTENTIONS.FREE) {
      setSubscriptionModalFeature('intentions');
      setIsSubscriptionModalOpen(true);
      return;
    }
    
    // Check usage limits before adding (secondary check)
    const limitCheck = canAddIntention(state);
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'limit_reached') {
        setSubscriptionModalFeature('intentions');
        setIsSubscriptionModalOpen(true);
      } else if (limitCheck.reason === 'requires_auth') {
        addToast('Please sign in to add intentions', 'info');
        onSignIn();
      }
      return;
    }
    
    const newItem: SnippetRequest = { id: Date.now().toString(), prompt: newPrompt, active: true };
    const updatedState = { ...state, requests: [...state.requests, newItem] };
    try {
      await updateState(updatedState);
      setNewPrompt('');
      addToast('Seed planted', 'success');
    } catch (error) {
      console.error('[Settings] Failed to sync snippet:', error);
      addToast('Failed to save. Please try again.', 'error');
    }
  };
  
  const handleUpgrade = () => {
    // For now, just show a message that subscription is coming soon
    // In the future, this would redirect to a payment/subscription page
    addToast('Subscription coming soon', 'info');
  };

  const toggleSnippetActive = async (id: string) => {
    const targetRequest = state.requests.find(r => r.id === id);
    if (!targetRequest) return;
    
    // If activating, check if it would exceed the limit
    if (!targetRequest.active) {
      const isAuthed = !!state.user;
      const activeIntentionCount = state.requests.filter(r => r.active).length;
      
      // Handler-level guard: Only block if authenticated, not subscribed, and at/above limit
      if (isAuthed && !isSubscribed(state) && activeIntentionCount >= SUBSCRIPTION_LIMITS.INTENTIONS.FREE) {
        setSubscriptionModalFeature('intentions');
        setIsSubscriptionModalOpen(true);
        return;
      }
      
      // Secondary check using service function
      const limitCheck = canAddIntention(state);
      if (!limitCheck.allowed && limitCheck.reason === 'limit_reached') {
        setSubscriptionModalFeature('intentions');
        setIsSubscriptionModalOpen(true);
        return;
      }
    }
    
    // Allow deactivation or activation if within limits
    const updatedState = {
      ...state,
      requests: state.requests.map(r => r.id === id ? { ...r, active: !r.active } : r)
    };
    try {
      await updateState(updatedState);
    } catch (error) {
      console.error('[Settings] Failed to sync snippet toggle:', error);
      addToast('Failed to save. Please try again.', 'error');
    }
  };

  const removeSnippet = async (id: string) => {
    const updatedState = {
      ...state,
      requests: state.requests.filter(r => r.id !== id)
    };
    try {
      await updateState(updatedState);
      addToast('Seed removed', 'success');
    } catch (error) {
      console.error('[Settings] Failed to sync snippet removal:', error);
      addToast('Failed to remove. Please try again.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 dark:bg-black/80 backdrop-blur-xl animate-reveal">
      <div className="bg-white dark:bg-[#0F0F0F] w-full max-w-2xl rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col" style={{ maxHeight: 'min(80vh, 720px)' }}>
        
        {/* Header Section */}
        <div className="px-12 pt-12 pb-8 flex justify-between items-end flex-shrink-0">
          <div>
            <h2 className="logo-text text-4xl md:text-5xl font-normal text-gray-800 dark:text-gray-100 tracking-tight">{BRAND_CONFIG.name}</h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em] mt-2">{BRAND_CONFIG.slogan}</p>
          </div>
          <button onClick={onClose} className="p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-95">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tab Navigation - Sticky */}
        <div className="flex px-12 border-b border-black/5 dark:border-white/5 no-scrollbar overflow-x-auto flex-shrink-0 sticky top-0 z-10 bg-white dark:bg-[#0F0F0F]">
          {['links', 'snippets', 'language', 'account'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-6 px-1 mr-10 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              {tab === 'links' ? 'Gateways' : tab === 'snippets' ? 'Intentions' : tab}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-12 py-10 no-scrollbar space-y-12">
          
          {activeTab === 'links' && (
            <div className="space-y-10 animate-reveal">
              {(() => {
                const gatewayLimitCheck = canAddGateway(state);
                const isLimitReached = !gatewayLimitCheck.allowed && gatewayLimitCheck.reason === 'limit_reached';
                const requiresAuth = !gatewayLimitCheck.allowed && gatewayLimitCheck.reason === 'requires_auth';
                
                if (requiresAuth) {
                  return (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Add Gateway</label>
                      <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                        <div className="flex flex-col items-center text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            Sign in to add and sync your gateways across devices.
                          </p>
                          <button
                            onClick={onSignIn}
                            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (isLimitReached) {
                  return (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Add Gateway</label>
                      <div className="p-8 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Gateway limit reached</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                              You've reached the maximum of 5 gateways on the free plan. Upgrade to unlock unlimited gateways and organize all your important destinations.
                            </p>
                            <button
                              onClick={() => {
                                setSubscriptionModalFeature('gateways');
                                setIsSubscriptionModalOpen(true);
                              }}
                              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                            >
                              Upgrade to Pro
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <form onSubmit={handleAddLink} className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Add Gateway</label>
                    <div className="flex gap-4">
                      <input 
                        type="text" placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-3xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-gray-100"
                      />
                      <button type="submit" className="bg-black dark:bg-white text-white dark:text-black px-8 rounded-3xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all">Add</button>
                    </div>
                  </form>
                );
              })()}

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Active Gateways</label>
                <div className="grid grid-cols-1 gap-3">
                  {state.links.map(link => {
                    const isPending = link.id === pendingLinkId && isFetchingMetadata;
                    return (
                      <div key={link.id} className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-transparent hover:border-black/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                            {isPending ? (
                              <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : link.icon ? (
                              <img src={link.icon} className="w-6 h-6 object-contain opacity-60" alt="" onError={(e) => {
                                // Fallback to colored dot if icon fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-3 h-3 rounded-full';
                                  fallback.style.backgroundColor = link.color;
                                  parent.appendChild(fallback);
                                }
                              }} />
                            ) : (
                              <div className="w-3 h-3 rounded-full" style={{backgroundColor: link.color}} />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-sm font-semibold ${isPending ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'}`}>
                              {link.title}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[200px]">{link.url}</span>
                          </div>
                        </div>
                        <button onClick={() => removeLink(link.id)} className="p-3 text-gray-300 hover:text-red-500 transition-colors" disabled={isPending}>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'snippets' && (
            <div className="space-y-10 animate-reveal">
              {(() => {
                const intentionLimitCheck = canAddIntention(state);
                const isLimitReached = !intentionLimitCheck.allowed && intentionLimitCheck.reason === 'limit_reached';
                const requiresAuth = !intentionLimitCheck.allowed && intentionLimitCheck.reason === 'requires_auth';
                
                if (requiresAuth) {
                  return (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">New Seed</label>
                      <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                        <div className="flex flex-col items-center text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                            Sign in to create and manage your intentions.
                          </p>
                          <button
                            onClick={onSignIn}
                            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (isLimitReached) {
                  return (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">New Seed</label>
                      <div className="p-8 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Intention limit reached</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                              You can have 1 active intention on the free plan. Upgrade to create and manage multiple intentions for different days or contexts.
                            </p>
                            <button
                              onClick={() => {
                                setSubscriptionModalFeature('intentions');
                                setIsSubscriptionModalOpen(true);
                              }}
                              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                            >
                              Upgrade to Pro
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <form onSubmit={handleAddSnippet} className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">New Seed</label>
                    <div className="flex gap-4">
                      <input 
                        type="text" placeholder="e.g. Tips for deep focus" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)}
                        className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-3xl px-6 py-4 text-sm focus:outline-none text-gray-800 dark:text-gray-100"
                      />
                      <button type="submit" className="bg-black dark:bg-white text-white dark:text-black px-8 rounded-3xl text-[11px] font-bold uppercase tracking-widest transition-all">Plant</button>
                    </div>
                  </form>
                );
              })()}
              <div className="space-y-4">
                {state.requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-white/5 rounded-3xl transition-all">
                        <div className="flex items-center gap-4">
                            <button onClick={() => toggleSnippetActive(req.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${req.active ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-200 dark:border-gray-800'}`}>
                                {req.active && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </button>
                            <span className={`text-sm font-medium ${req.active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>{req.prompt}</span>
                        </div>
                        <button onClick={() => removeSnippet(req.id)} className="p-3 text-gray-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" /></svg></button>
                    </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'redeem' && (
            <div className="space-y-10 animate-reveal">
              {!state.user ? (
                <div className="text-center p-12 bg-gray-50/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    Sign in to redeem a code and unlock membership.
                  </p>
                  <button
                    onClick={onSignIn}
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <>
                  {/* Redeem Feature Toggle */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Redeem Feature</label>
                    <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-white/5 rounded-3xl">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Enable Redeem Code</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Turn on to use redeem codes</span>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !state.user?.redeemEnabled;
                          const success = await toggleRedeemFeature(state.user!.id, newValue);
                          if (success) {
                            updateState({
                              ...state,
                              user: { ...state.user!, redeemEnabled: newValue },
                            });
                            addToast(newValue ? 'Redeem enabled' : 'Redeem disabled', 'info');
                          } else {
                            addToast('Failed to update setting', 'error');
                          }
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          state.user?.redeemEnabled !== false ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            state.user?.redeemEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Redeem Code Input */}
                  {state.user?.redeemEnabled !== false ? (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Redeem Code</label>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!redeemCodeInput.trim() || isRedeeming) return;

                          setIsRedeeming(true);
                          setRedeemStatus({ type: null, message: '' });

                          const result = await redeemCode(state.user!, redeemCodeInput.trim());

                          if (result.ok) {
                            setRedeemStatus({ type: 'success', message: 'Code redeemed successfully! Membership unlocked.' });
                            setRedeemCodeInput('');
                            addToast('Membership unlocked via redeem code', 'success');
                            
                            // Refresh membership state
                            // This will be handled by App.tsx fetching updated user data
                            // For now, update local state optimistically
                            updateState({
                              ...state,
                              user: {
                                ...state.user!,
                                memberViaRedeem: true,
                                membershipSince: new Date().toISOString(),
                              },
                            });
                          } else {
                            const errorMessages: Record<RedeemErrorCode, string> = {
                              INVALID_CODE: 'Invalid code. Please check and try again.',
                              DISABLED_CODE: 'This code has been disabled.',
                              ALREADY_REDEEMED: 'This code has already been redeemed.',
                              EXPIRED_CODE: 'This code has expired.',
                              NOT_AUTHENTICATED: 'Please sign in to redeem a code.',
                              NETWORK_ERROR: 'Network error. Please try again later.',
                              UNKNOWN_ERROR: 'An error occurred. Please try again.',
                            };
                            setRedeemStatus({
                              type: 'error',
                              message: result.message || errorMessages[result.error_code!] || 'Failed to redeem code.',
                            });
                          }

                          setIsRedeeming(false);
                        }}
                        className="space-y-4"
                      >
                        <div className="flex gap-4">
                          <input
                            type="text"
                            placeholder="ST-XXXX-XXXX-XXXX"
                            value={redeemCodeInput}
                            onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                            className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-3xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-gray-100 uppercase"
                            disabled={isRedeeming}
                          />
                          <button
                            type="submit"
                            disabled={isRedeeming || !redeemCodeInput.trim()}
                            className="bg-black dark:bg-white text-white dark:text-black px-8 rounded-3xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isRedeeming ? 'Redeeming...' : 'Redeem'}
                          </button>
                        </div>
                        {redeemStatus.type && (
                          <div
                            className={`p-4 rounded-2xl ${
                              redeemStatus.type === 'success'
                                ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30'
                                : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30'
                            }`}
                          >
                            <p
                              className={`text-sm ${
                                redeemStatus.type === 'success'
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {redeemStatus.message}
                            </p>
                          </div>
                        )}
                      </form>
                    </div>
                  ) : (
                    <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Redeem is disabled. Turn it on to use codes.
                      </p>
                    </div>
                  )}

                  {/* Membership Status */}
                  {state.user?.memberViaRedeem && (
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Membership Active</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                            Unlocked via redeem code
                            {state.user.membershipSince && (
                              <> • {new Date(state.user.membershipSince).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'language' && (
            <div className="grid grid-cols-2 gap-4 animate-reveal">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { updateState({...state, language: lang.code}); addToast(`Language: ${lang.name}`); }}
                  className={`p-6 rounded-[2rem] text-sm font-bold transition-all text-left border-2 ${state.language === lang.code ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600' : 'border-transparent bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'redeem' && (
            <div className="space-y-10 animate-reveal">
              {!state.user ? (
                <div className="text-center p-12 bg-gray-50/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    Sign in to redeem a code and unlock membership.
                  </p>
                  <button
                    onClick={onSignIn}
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Sign In
                  </button>
                </div>
              ) : (
                <>
                  {/* Redeem Feature Toggle */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Redeem Feature</label>
                    <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-white/5 rounded-3xl">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Enable Redeem Code</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Turn on to use redeem codes</span>
                      </div>
                      <button
                        onClick={async () => {
                          const newValue = !state.user?.redeemEnabled;
                          const success = await toggleRedeemFeature(state.user!.id, newValue);
                          if (success) {
                            updateState({
                              ...state,
                              user: { ...state.user!, redeemEnabled: newValue },
                            });
                            addToast(newValue ? 'Redeem enabled' : 'Redeem disabled', 'info');
                          } else {
                            addToast('Failed to update setting', 'error');
                          }
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          state.user?.redeemEnabled !== false ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                            state.user?.redeemEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Redeem Code Input */}
                  {state.user?.redeemEnabled !== false ? (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Redeem Code</label>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!redeemCodeInput.trim() || isRedeeming) return;

                          setIsRedeeming(true);
                          setRedeemStatus({ type: null, message: '' });

                          const result = await redeemCode(state.user!, redeemCodeInput.trim());

                          if (result.ok) {
                            setRedeemStatus({ type: 'success', message: 'Code redeemed successfully! Membership unlocked.' });
                            setRedeemCodeInput('');
                            addToast('Membership unlocked via redeem code', 'success');
                            
                            // Refresh membership state
                            updateState({
                              ...state,
                              user: {
                                ...state.user!,
                                memberViaRedeem: true,
                                membershipSince: new Date().toISOString(),
                              },
                            });
                          } else {
                            const errorMessages: Record<RedeemErrorCode, string> = {
                              INVALID_CODE: 'Invalid code. Please check and try again.',
                              DISABLED_CODE: 'This code has been disabled.',
                              ALREADY_REDEEMED: 'This code has already been redeemed.',
                              EXPIRED_CODE: 'This code has expired.',
                              NOT_AUTHENTICATED: 'Please sign in to redeem a code.',
                              NETWORK_ERROR: 'Network error. Please try again later.',
                              UNKNOWN_ERROR: 'An error occurred. Please try again.',
                            };
                            setRedeemStatus({
                              type: 'error',
                              message: result.message || errorMessages[result.error_code!] || 'Failed to redeem code.',
                            });
                          }

                          setIsRedeeming(false);
                        }}
                        className="space-y-4"
                      >
                        <div className="flex gap-4">
                          <input
                            type="text"
                            placeholder="ST-XXXX-XXXX-XXXX"
                            value={redeemCodeInput}
                            onChange={(e) => setRedeemCodeInput(e.target.value.toUpperCase())}
                            className="flex-1 bg-gray-50 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-3xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-800 dark:text-gray-100 uppercase"
                            disabled={isRedeeming}
                          />
                          <button
                            type="submit"
                            disabled={isRedeeming || !redeemCodeInput.trim()}
                            className="bg-black dark:bg-white text-white dark:text-black px-8 rounded-3xl text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isRedeeming ? 'Redeeming...' : 'Redeem'}
                          </button>
                        </div>
                        {redeemStatus.type && (
                          <div
                            className={`p-4 rounded-2xl ${
                              redeemStatus.type === 'success'
                                ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30'
                                : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30'
                            }`}
                          >
                            <p
                              className={`text-sm ${
                                redeemStatus.type === 'success'
                                  ? 'text-green-700 dark:text-green-300'
                                  : 'text-red-700 dark:text-red-300'
                              }`}
                            >
                              {redeemStatus.message}
                            </p>
                          </div>
                        )}
                      </form>
                    </div>
                  ) : (
                    <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Redeem is disabled. Turn it on to use codes.
                      </p>
                    </div>
                  )}

                  {/* Membership Status */}
                  {state.user?.memberViaRedeem && (
                    <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex items-center gap-3">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Membership Active</p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                            Unlocked via redeem code
                            {state.user.membershipSince && (
                              <> • {new Date(state.user.membershipSince).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-8 animate-reveal">
                {state.user ? (
                    <div className="flex flex-col gap-8">
                        <div className="flex items-center gap-6 p-8 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-[3rem] border border-indigo-500/10">
                            {state.user.picture ? <img src={state.user.picture} className="w-16 h-16 rounded-full shadow-lg" alt="" /> : <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold">{state.user.name?.charAt(0)}</div>}
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{state.user.name}</span>
                                <span className="text-sm text-gray-400">{state.user.email}</span>
                            </div>
                        </div>
                        <button onClick={onSignOut} className="w-full py-5 bg-white dark:bg-white/5 border border-red-500/20 text-red-500 rounded-[2rem] text-[11px] font-bold uppercase tracking-widest hover:bg-red-500/5 transition-all">Sign Out</button>
                    </div>
                ) : (
                    <div className="text-center p-12 bg-gray-50/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10">
                        <p className="text-sm text-gray-500 mb-10 leading-relaxed max-w-xs mx-auto">Sign in to securely sync your Studio settings and gateways across all devices.</p>
                        <button onClick={() => { setIsAuthLoading(true); onSignIn(); setTimeout(()=>setIsAuthLoading(false), 2000); }} disabled={isAuthLoading} className="inline-flex items-center gap-4 bg-white dark:bg-white/10 border border-black/5 px-10 py-4 rounded-full shadow-xl hover:scale-105 transition-all">
                             <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.77l3.39-3.39C17.85 1.5 15.15 0 12 0 7.31 0 3.25 2.69 1.25 6.64l3.96 3.07C6.16 6.94 8.86 5.04 12 5.04z" /><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.02 3.46-4.99 3.46-8.73z" /><path fill="#FBBC05" d="M5.21 14.71c-.24-.7-.37-1.44-.37-2.21s.13-1.51.37-2.21L1.25 7.22C.45 8.71 0 10.33 0 12s.45 3.29 1.25 4.78l3.96-3.07z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.14 0-5.84-1.9-6.84-4.73L1.25 17.68C3.25 21.31 7.31 24 12 24z" /></svg>
                             <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">{isAuthLoading ? 'Connecting...' : 'Continue with Google'}</span>
                        </button>
                    </div>
                )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-12 bg-gray-50/50 dark:bg-black/40 flex justify-between items-center">
            <button onClick={onClose} className="px-10 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full text-[11px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10">Close Studio</button>
            <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">StartlyTab v{state.version}</span>
        </div>
      </div>

      <SubscriptionUpsellModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onUpgrade={handleUpgrade}
        feature={subscriptionModalFeature}
        theme={state.theme}
      />
    </div>
  );
};

export default Settings;
