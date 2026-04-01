
import React, { useState, useEffect } from 'react';
import { Bookmark, Globe, ArrowRight, Check, X, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { QuickLink } from '../types';
import { fetchChromeBookmarks, formatToQuickLinks, triggerInfinityImport, triggerStartMeImport, isExtensionInstalled } from '../services/importService';

interface Props {
    onImport: (links: QuickLink[]) => void;
    onClose: () => void;
}

type ImportSource = 'bookmarks' | 'infinity' | 'start.me';
type Step = 'initial' | 'loading' | 'consent' | 'detection_failed' | 'selection' | 'success' | 'error';

const EXTENSION_IDS = {
    infinity: 'dbjbhpbeganmclhfmdbclihhndojihne',
    'start.me': 'mndofabnbpcanlbbebekhlabbfobcaob'
};

export default function QuickImportModule({ onImport, onClose }: Props) {
    const [step, setStep] = useState<Step>('initial');
    const [source, setSource] = useState<ImportSource | null>(null);
    const [bookmarks, setBookmarks] = useState<QuickLink[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [errorMessage, setErrorMessage] = useState('');

    const handleSourceClick = async (src: ImportSource) => {
        setSource(src);
        if (src === 'bookmarks') {
            setStep('loading');
            try {
                // Artificial delay for "warmth"
                await new Promise(r => setTimeout(r, 1200));
                const raw = await fetchChromeBookmarks();
                if (raw.length === 0) {
                    setErrorMessage('No bookmarks found in your browser.');
                    setStep('error');
                    return;
                }
                const links = formatToQuickLinks(raw.slice(0, 100)); // Increased limit
                setBookmarks(links);
                setSelectedIds(new Set(links.map(l => l.id)));
                setStep('selection');
            } catch (err) {
                setErrorMessage('Failed to access browser bookmarks.');
                setStep('error');
            }
        } else {
            setStep('consent');
        }
    };

    const handleConsent = async () => {
        if (!source) return;
        setStep('loading');
        
        try {
            // Check if extension is installed
            const extId = EXTENSION_IDS[source as keyof typeof EXTENSION_IDS];
            // Skip check if not in extension environment (for testing)
            const isInstalled = typeof chrome !== 'undefined' && chrome.management ? await isExtensionInstalled(extId) : true;

            if (!isInstalled) {
                setStep('detection_failed');
                return;
            }

            // Proceed to extraction
            await new Promise(r => setTimeout(r, 1000)); // Brief pause for "Next step..." message feel
            const raw = source === 'infinity' ? await triggerInfinityImport() : await triggerStartMeImport();
            
            if (raw.length === 0) {
                setErrorMessage(`We couldn't find any gateways on your ${source} dashboard.`);
                setStep('error');
                return;
            }

            const links = formatToQuickLinks(raw);
            setBookmarks(links);
            setSelectedIds(new Set(links.map(l => l.id)));
            setStep('selection');
        } catch (err: any) {
            setErrorMessage(err.message || 'Automation failed. Please try again or import manually.');
            setStep('error');
        }
    };

    const handleConfirm = () => {
        const filtered = bookmarks.filter(b => selectedIds.has(b.id));
        onImport(filtered);
        setStep('success');
        setTimeout(onClose, 2000);
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    return (
        <div className="w-full mb-8 animate-reveal">
            <div className="relative overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm p-8 md:p-10">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 transition-colors z-20"
                    title="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Background Accents - Subtle */}
                
                {step === 'initial' && (
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Welcome Home.
                                </h2>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                                    FocusTab feels best when it's yours. Import your world from Chrome, Infinity, or Start.me in seconds.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 justify-center md:justify-start">
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                Privacy First. Your data stays local.
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto shrink-0">
                            <ImportButton 
                                icon={<Bookmark className="w-5 h-5" />}
                                label="Bookmarks"
                                onClick={() => handleSourceClick('bookmarks')}
                            />
                            <ImportButton 
                                icon={<Globe className="w-5 h-5" />}
                                label="Infinity"
                                onClick={() => handleSourceClick('infinity')}
                            />
                            <ImportButton 
                                icon={<Globe className="w-5 h-5" />}
                                label="Start.me"
                                onClick={() => handleSourceClick('start.me')}
                            />
                        </div>
                    </div>
                )}

                {step === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
                        <div className="relative">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                            <div className="absolute inset-0 bg-indigo-500/20 blur-xl animate-pulse" />
                        </div>
                        <p className="mt-8 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
                            Gathering your favorites...
                        </p>
                        <p className="mt-2 text-xs text-gray-400 uppercase tracking-widest font-bold">
                            Local & Secure Processing
                        </p>
                    </div>
                )}

                {step === 'selection' && (
                    <div className="relative z-10 animate-reveal">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white serif">Which ones speak to you?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Select the bookmarks you'd like to import as Gateways.</p>
                            </div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {selectedIds.size} / {bookmarks.length} Selected
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {bookmarks.map((b) => (
                                <div 
                                    key={b.id}
                                    onClick={() => toggleSelect(b.id)}
                                    className={`
                                        group relative p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-300
                                        ${selectedIds.has(b.id) 
                                            ? 'bg-indigo-500/10 border-indigo-500/50 scale-[0.98]' 
                                            : 'bg-white/50 dark:bg-white/5 border-transparent hover:bg-white/80 dark:hover:bg-white/10'}
                                        border
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                        ${selectedIds.has(b.id) ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}
                                    `}>
                                        {selectedIds.has(b.id) ? <Check className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{b.title}</div>
                                        <div className="text-[10px] text-gray-500 truncate">
                                            {(() => {
                                                try { return new URL(b.url).hostname; }
                                                catch { return b.url; }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button 
                                onClick={() => setStep('initial')}
                                className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleConfirm}
                                disabled={selectedIds.size === 0}
                                className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
                            >
                                Import Selected
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-6">
                            <Check className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white serif">Import Successful!</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">Your favorites are ready and waiting for you.</p>
                    </div>
                )}

                {step === 'consent' && (
                    <div className="relative z-10 flex flex-col items-center text-center space-y-8 animate-reveal">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div className="max-w-md">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Secure Migration</h2>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                We'll temporarily open your {source} page to automatically collect your gateways. 
                                <span className="font-bold text-gray-900 dark:text-white"> No data ever leaves your computer.</span>
                            </p>
                            <p className="mt-3 text-xs text-gray-400">By clicking Agree, you authorize FocusTab to read your {source} bookmarks during this session.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setStep('initial')} className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
                            <button onClick={handleConsent} className="px-8 py-3 bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-500/20">Agree & Continue</button>
                        </div>
                    </div>
                )}

                {step === 'detection_failed' && (
                    <div className="relative z-10 flex flex-col items-center text-center space-y-6 animate-reveal">
                        <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <X className="w-8 h-8" />
                        </div>
                        <div className="max-w-md">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Extension Not Found</h2>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                We couldn't detect the {source} extension in your browser. Please make sure it's installed and enabled to use automatic import.
                            </p>
                        </div>
                        <button onClick={() => setStep('initial')} className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">Back to Options</button>
                    </div>
                )}

                {step === 'error' && (
                    <div className="relative z-10 flex flex-col items-center text-center space-y-6 animate-reveal">
                        <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center">
                            <X className="w-8 h-8" />
                        </div>
                        <div className="max-w-md">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Something went wrong</h2>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{errorMessage}</p>
                        </div>
                        <button onClick={() => setStep('initial')} className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">Try Another Way</button>
                    </div>
                )}

                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

function ImportButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="group flex flex-col items-center gap-3 p-5 bg-white/50 dark:bg-white/5 rounded-2xl border border-white/50 dark:border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all duration-300 min-w-[120px]"
        >
            <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-colors shadow-sm">
                {icon}
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-indigo-500 tracking-tight">{label}</span>
        </button>
    );
}
