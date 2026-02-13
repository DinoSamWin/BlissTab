import React, { useState } from 'react';
import ExtensionGuideModal from './ExtensionGuideModal';

interface ExtensionInstallPromptProps {
    theme: 'light' | 'dark';
}

const AnimatedFace: React.FC = () => {
    return (
        <div className="relative w-6 h-6 flex items-center justify-center mr-2">
            <style>{`
                @keyframes blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                @keyframes smile-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-1px); }
                }
                .eye {
                    animation: blink 4s infinite;
                }
                .face-container {
                    animation: smile-float 3s ease-in-out infinite;
                }
            `}</style>
            <div className="face-container relative w-full h-full flex items-center justify-center">
                {/* Yellow circle background with soft glow */}
                <div className="absolute inset-0 bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full blur-[4px]"></div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Eyes */}
                    <circle cx="8" cy="10" r="1.5" fill="currentColor" className="eye text-yellow-600 dark:text-yellow-500" />
                    <circle cx="16" cy="10" r="1.5" fill="currentColor" className="eye text-yellow-600 dark:text-yellow-500" />
                    {/* Mouth - Smiling Path */}
                    <path
                        d="M7 15C7 15 9 18 12 18C15 18 17 15 17 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="text-yellow-600 dark:text-yellow-500"
                    />
                </svg>
            </div>
        </div>
    );
};

const ExtensionInstallPrompt: React.FC<ExtensionInstallPromptProps> = ({ theme }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    if (!isVisible) return null;

    const handleDownload = () => {
        // Trigger file download
        const link = document.createElement('a');
        link.href = '/focustab.crx';
        link.download = 'focustab.crx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Open guide modal
        setIsGuideOpen(true);
    };

    return (
        <>
            <div className="flex items-center bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-full px-5 py-2 animate-reveal h-[48px] transition-all hover:bg-white/60 dark:hover:bg-white/10 group">
                <div className="flex items-center whitespace-nowrap">
                    <AnimatedFace />
                    <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium tracking-tight">
                        Experience the full power!
                    </span>
                    <button
                        onClick={handleDownload}
                        className="ml-3 text-[13px] font-bold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 transition-colors underline underline-offset-4 decoration-1"
                    >
                        Get Extension
                    </button>
                </div>
                <div className="mx-4 h-3 w-px bg-black/5 dark:bg-white/10"></div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors opacity-40 hover:opacity-100"
                    aria-label="Close"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <ExtensionGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                theme={theme}
            />
        </>
    );
};

export default ExtensionInstallPrompt;
