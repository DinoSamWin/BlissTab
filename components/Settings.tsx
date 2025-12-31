
import React, { useState, useEffect } from 'react';
import { AppState, QuickLink, SnippetRequest } from '../types';
import { fetchSiteMetadata } from '../services/metadataService';
import { COLORS, SUPPORTED_LANGUAGES } from '../constants';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  updateState: (newState: AppState) => void;
  addToast: (msg: string, type?: any) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, state, updateState, addToast, onSignIn, onSignOut }) => {
  const [newUrl, setNewUrl] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'links' | 'snippets' | 'language' | 'account'>('links');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    
    const meta = await fetchSiteMetadata(newUrl);
    if (meta) {
      const newLink: QuickLink = {
        id: Date.now().toString(),
        url: meta.url,
        title: meta.title,
        icon: meta.icon,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
      updateState({
        ...state,
        links: [...state.links, newLink]
      });
      setNewUrl('');
      addToast('Link added successfully');
    }
  };

  const removeLink = (id: string) => {
    updateState({
      ...state,
      links: state.links.filter(l => l.id !== id)
    });
  };

  const handleAddSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt) return;
    const newItem: SnippetRequest = {
      id: Date.now().toString(),
      prompt: newPrompt,
      active: true
    };
    updateState({
      ...state,
      requests: [...state.requests, newItem]
    });
    setNewPrompt('');
    addToast('Snippet request added');
  };

  const toggleSnippetActive = (id: string) => {
    updateState({
      ...state,
      requests: state.requests.map(r => r.id === id ? { ...r, active: !r.active } : r)
    });
  };

  const removeSnippet = (id: string) => {
    updateState({
      ...state,
      requests: state.requests.filter(r => r.id !== id)
    });
  };

  const handleLanguageChange = (lang: string) => {
    updateState({
      ...state,
      language: lang
    });
    addToast(`Language set to ${lang}`);
  };

  const handleSignInClick = () => {
    setIsAuthLoading(true);
    onSignIn();
    setTimeout(() => setIsAuthLoading(false), 2000);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focustab-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    addToast('Configuration exported');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-gray-900/10 dark:bg-black/50 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1A1A17] w-full max-w-xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-white/10 transition-colors duration-500">
        <div className="px-10 pt-10 pb-6 flex justify-between items-center border-b border-gray-50/80 dark:border-white/5">
          <div>
            <h2 className="serif text-3xl font-normal text-gray-800 dark:text-gray-100 tracking-tight">Focus Studio</h2>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">Personalize your space</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-95 group">
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex px-10 border-b border-gray-50/80 dark:border-white/5 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('links')}
            className={`py-5 px-2 mr-8 whitespace-nowrap text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'links' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
          >
            Links
          </button>
          <button 
            onClick={() => setActiveTab('snippets')}
            className={`py-5 px-2 mr-8 whitespace-nowrap text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'snippets' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
          >
            AI Prompts
          </button>
          <button 
            onClick={() => setActiveTab('language')}
            className={`py-5 px-2 mr-8 whitespace-nowrap text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'language' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
          >
            Language
          </button>
          <button 
            onClick={() => setActiveTab('account')}
            className={`py-5 px-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'account' ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white' : 'border-transparent text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'}`}
          >
            Account
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
          {activeTab === 'links' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <form onSubmit={handleAddLink} className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Add New Gateway</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Enter URL..." 
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="flex-1 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100/50 dark:focus:ring-white/5 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-800 dark:text-gray-100"
                  />
                  <button type="submit" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-7 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-gray-100 hover:shadow-lg transition-all active:scale-95">
                    Add
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Curated Destinations</label>
                <div className="grid grid-cols-1 gap-3">
                  {state.links.map(link => (
                    <div key={link.id} className="flex items-center justify-between p-4 bg-gray-50/30 dark:bg-white/5 rounded-2xl group border border-transparent hover:border-gray-100 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                          {link.icon ? (
                            <img src={link.icon} className="w-6 h-6 object-contain grayscale opacity-60" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: link.color }} />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{link.title}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-[200px] tracking-tight">{link.url}</span>
                        </div>
                      </div>
                      <button onClick={() => removeLink(link.id)} className="p-3 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-xl">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'snippets' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <form onSubmit={handleAddSnippet} className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">New Thought Seed</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="e.g. A calm morning reflection" 
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    className="flex-1 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-gray-100/50 dark:focus:ring-white/5 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-800 dark:text-gray-100"
                  />
                  <button type="submit" className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-7 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-gray-100 hover:shadow-lg transition-all active:scale-95">
                    Plant
                  </button>
                </div>
              </form>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Active Seeds</label>
                <div className="grid grid-cols-1 gap-3">
                  {state.requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-5 bg-gray-50/30 dark:bg-white/5 rounded-2xl group hover:bg-white dark:hover:bg-white/10 hover:border-gray-100 dark:hover:border-white/10 border border-transparent transition-all duration-300">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleSnippetActive(req.id)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${req.active ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900' : 'bg-white dark:bg-transparent border-gray-200 dark:border-gray-700 text-transparent'}`}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <span className={`text-sm font-medium transition-all ${req.active ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600 italic'}`}>
                          {req.prompt}
                        </span>
                      </div>
                      <button onClick={() => removeSnippet(req.id)} className="p-3 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-xl">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'language' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Content Language</label>
                <div className="grid grid-cols-2 gap-3">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`p-4 rounded-2xl text-sm font-semibold transition-all text-left border ${state.language === lang.code ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white shadow-md' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-transparent hover:border-gray-100 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/10'}`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-600 italic mt-4">Generation will happen in your selected language. Some interface labels may remain in English.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="space-y-6">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Google Account</label>
                
                {state.user ? (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4 p-5 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 transition-all">
                            {state.user.picture ? (
                                <img src={state.user.picture} alt="" className="w-14 h-14 rounded-full shadow-sm border border-white dark:border-gray-800" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest border border-white dark:border-gray-800">
                                    {state.user.name?.charAt(0)}
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-base font-semibold text-gray-800 dark:text-gray-200">{state.user.name}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{state.user.email}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-green-50/30 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase tracking-widest">Cloud Sync Active</span>
                                </div>
                                <span className="text-[9px] text-green-600 dark:text-green-600 font-medium">Verified Session</span>
                            </div>

                            <button 
                                onClick={onSignOut}
                                className="w-full p-4 bg-white dark:bg-white/5 border border-red-100 dark:border-red-900/30 text-red-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-95"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-10 bg-gray-50/50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 leading-relaxed">Sign in to securely sync your links, prompts, and preferences across all your devices.</p>
                        <button 
                            onClick={handleSignInClick}
                            disabled={isAuthLoading}
                            className={`inline-flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-6 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group ${isAuthLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className={`w-5 h-5 ${isAuthLoading ? 'animate-spin opacity-50' : ''}`} viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.77l3.39-3.39C17.85 1.5 15.15 0 12 0 7.31 0 3.25 2.69 1.25 6.64l3.96 3.07C6.16 6.94 8.86 5.04 12 5.04z" />
                                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.91c2.2-2.02 3.46-4.99 3.46-8.73z" />
                                <path fill="#FBBC05" d="M5.21 14.71c-.24-.7-.37-1.44-.37-2.21s.13-1.51.37-2.21L1.25 7.22C.45 8.71 0 10.33 0 12s.45 3.29 1.25 4.78l3.96-3.07z" />
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.76-2.91c-1.08.72-2.45 1.16-4.17 1.16-3.14 0-5.84-1.9-6.84-4.73L1.25 17.68C3.25 21.31 7.31 24 12 24z" />
                            </svg>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest group-hover:text-black dark:group-hover:text-white">
                              {isAuthLoading ? 'Connecting...' : 'Sign in with Google'}
                            </span>
                        </button>
                    </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-10 bg-gray-50/50 dark:bg-black/20 flex justify-between items-center transition-colors">
          <button 
            onClick={exportConfig}
            className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-2 uppercase tracking-widest transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Backup
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-white/20 transition-all active:scale-95"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
