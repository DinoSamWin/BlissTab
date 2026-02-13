import React, { useState } from 'react';

interface ExtensionGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
}

const ExtensionGuideModal: React.FC<ExtensionGuideModalProps> = ({ isOpen, onClose, theme }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText('chrome://extensions');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 bg-black/5 dark:bg-black/40 backdrop-blur-md animate-reveal">
            <div className="bg-white dark:bg-[#0F0F0F] w-full max-w-md rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border-none relative flex flex-col">
                {/* Subtle close button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-all text-xl z-20"
                >
                    ×
                </button>

                <div className="p-10 pb-8 text-center flex flex-col items-center">
                    <h3 className="serif text-3xl text-gray-900 dark:text-gray-100 italic mb-2">Almost there!</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Complete the installation in two clicks.</p>

                    {/* Drag & Drop Animation Area - Adjusted height and scaling to ensure visibility */}
                    <div className="mt-8 mb-8 relative w-full h-44 bg-gray-50 dark:bg-white/[0.02] rounded-[2rem] overflow-hidden border border-black/5 dark:border-white/5 flex items-center justify-center">
                        <style>{`
                    @keyframes drag-file {
                        0% { transform: translate(-80px, 30px) scale(0.8); opacity: 0; }
                        20% { transform: translate(-80px, 30px) scale(1); opacity: 1; }
                        50% { transform: translate(60px, -10px) scale(1.05); }
                        80% { transform: translate(60px, -10px) scale(1); opacity: 1; }
                        100% { transform: translate(60px, -10px) scale(0.9); opacity: 0; }
                    }
                    @keyframes drop-pulse {
                        0%, 40% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); }
                        50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.6); background: rgba(99, 102, 241, 0.05); }
                        60%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); }
                    }
                    .animate-drag {
                        animation: drag-file 3.5s infinite ease-in-out;
                    }
                    .animate-pulse-drop {
                        animation: drop-pulse 3.5s infinite ease-in-out;
                    }
                `}</style>

                        {/* Simulated Target Window */}
                        <div className="w-44 h-24 border-2 border-dashed border-indigo-500/20 rounded-2xl flex items-center justify-center relative animate-pulse-drop">
                            <span className="text-[9px] uppercase tracking-widest text-indigo-500/40 font-bold">Extensions Page</span>
                        </div>

                        {/* Simulated File being dragged */}
                        <div className="absolute w-12 h-14 bg-white dark:bg-indigo-500 rounded-lg shadow-xl flex items-center justify-center flex-col gap-1 border border-indigo-500/20 animate-drag">
                            <div className="w-6 h-1 bg-indigo-500/20 dark:bg-white/20 rounded-full"></div>
                            <div className="w-4 h-1 bg-indigo-500/10 dark:bg-white/10 rounded-full"></div>
                            <span className="text-[8px] font-bold text-indigo-600 dark:text-white mt-1">CRX</span>
                        </div>
                    </div>

                    <div className="space-y-6 text-left w-full max-w-[280px] mx-auto">
                        <div className="flex gap-4">
                            <div className="w-6 h-6 shrink-0 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">1</div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">Open Extensions</h4>
                                <button
                                    onClick={handleCopy}
                                    className="text-xs text-indigo-500 hover:text-indigo-600 underline underline-offset-4 mt-1 block transition-colors"
                                >
                                    {copied ? 'Address Copied!' : 'Click to copy address'}
                                </button>
                                <p className="text-[10px] text-gray-400 mt-1 italic">Then paste it in a new tab</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-6 h-6 shrink-0 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">2</div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">Enable Developer Mode</h4>
                                <p className="text-xs text-gray-400 mt-1">Toggle the switch in the top right.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-6 h-6 shrink-0 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">3</div>
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">Drag & Drop</h4>
                                <p className="text-xs text-gray-400 mt-1">Drop the downloaded .crx file.</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-10 w-full py-4 rounded-full text-xs font-bold uppercase tracking-[0.2em] bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        Start Focusing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExtensionGuideModal;
