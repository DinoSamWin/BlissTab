import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface DailyGreetingLoadingProps {
    onComplete?: () => void;
}

const DailyGreetingLoading: React.FC<DailyGreetingLoadingProps> = ({ onComplete }) => {
    const { i18n } = useTranslation();
    const [displayText, setDisplayText] = useState('');
    const [isTypingComplete, setIsTypingComplete] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const currentLang = i18n.language || 'zh-CN';

    const greetingData = useMemo(() => {
        const hour = new Date().getHours();
        const lang = currentLang.startsWith('zh') ? 'zh' : 'en';

        const greetings = {
            zh: {
                morning: ['早上好，新的一天，愿你与美好不期而遇。', '晨光微熹，愿你今日心中有光，步履从容。', '早安，在这个安静的清晨，开启属于你的专注时刻。'],
                afternoon: ['中午好，稍微停歇一下，感受当下的宁静。', '午后阳光正好，愿你在这里找到一份属于自己的平静。', '午安，深呼吸，让思绪在这一刻慢慢靠岸。'],
                evening: ['晚上好，繁忙的一天辛苦了，让心在此刻安放。', '夜幕降临，愿这一方天地能为你带来温柔的慰藉。', '晚安，愿你在温柔的夜色中，遇见最真实、最放松的自己。']
            },
            en: {
                morning: ['Good morning. May your day be filled with light and clarity.', 'Morning has broken. Take a deep breath and start your journey.', 'Good morning. This is your quiet space to begin something beautiful.'],
                afternoon: ['Good afternoon. Take a moment to breathe and find your center.', 'The sun is high. May you find peace in the flow of the afternoon.', 'Good afternoon. Letting your thoughts settle in this gentle moment.'],
                evening: ['Good evening. The day is winding down; let your heart find rest.', 'Night falls softly. May this space be your sanctuary of peace.', 'Good evening. Rest your soul and embrace the quiet beauty of the night.']
            }
        };

        let period: 'morning' | 'afternoon' | 'evening' = 'morning';
        if (hour >= 12 && hour < 18) period = 'afternoon';
        else if (hour >= 18 || hour < 5) period = 'evening';

        const options = greetings[lang][period];
        return options[Math.floor(Math.random() * options.length)];
    }, [currentLang]);

    useEffect(() => {
        let currentIndex = 0;
        const typingSpeed = 70;

        const interval = setInterval(() => {
            if (currentIndex < greetingData.length) {
                currentIndex++;
                setDisplayText(greetingData.slice(0, currentIndex));
            } else {
                clearInterval(interval);
                setIsTypingComplete(true);
                setTimeout(() => {
                    setIsExiting(true);
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 2200);
                }, 2500);
            }
        }, typingSpeed);

        return () => clearInterval(interval);
    }, [greetingData, onComplete]);

    const renderSmoothText = () => {
        return greetingData.split('').map((char, index) => {
            const isVisible = index < displayText.length;
            return (
                <span
                    key={index}
                    className={`inline-block transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-4 blur-xl'}`}
                    style={{
                        transitionDelay: isVisible ? '0ms' : '0ms',
                        marginRight: char === ' ' ? '0.25em' : '0'
                    }}
                >
                    {char}
                </span>
            );
        });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--bg-light)' }}>

            {/* Cloud Partition - Left Door */}
            <div className={`absolute top-0 left-0 w-1/2 h-full z-[15] transition-transform duration-[2200ms] ease-in-out ${isExiting ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[100px]"></div>
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-[1200px] h-[1200px] bg-white rounded-full -left-[400px] -top-[200px] blur-[120px] opacity-60 animate-breathing-slow"></div>
                    <div className="absolute w-[800px] h-[800px] bg-sky-100/40 rounded-full -left-[200px] bottom-[100px] blur-[100px] opacity-40 animate-perceive"></div>
                </div>
            </div>

            {/* Cloud Partition - Right Door */}
            <div className={`absolute top-0 right-0 w-1/2 h-full z-[15] transition-transform duration-[2200ms] ease-in-out ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[100px]"></div>
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-[1200px] h-[1200px] bg-white rounded-full -right-[400px] -bottom-[200px] blur-[120px] opacity-60 animate-breathing-slow"></div>
                    <div className="absolute w-[800px] h-[800px] bg-indigo-50/40 rounded-full -right-[200px] top-[100px] blur-[100px] opacity-40 animate-perceive"></div>
                </div>
            </div>

            {/* Liquid Background - Enhanced Cloud Flow */}
            <div className={`absolute inset-0 z-0 pointer-events-none transition-all duration-[2000ms] ${isExiting ? 'opacity-0 scale-125' : 'opacity-100 scale-100'}`}>
                <svg width="0" height="0" className="absolute">
                    <defs>
                        <filter id="cloud-gooey">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="45" result="blur" />
                            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 32 -10" result="gooey" />
                            <feComposite in="SourceGraphic" in2="cloud-gooey" operator="atop" />
                        </filter>
                    </defs>
                </svg>

                <div className="absolute inset-0 flex items-center justify-center scale-110" style={{ filter: 'url(#cloud-gooey)' }}>
                    <style>{`
                        @keyframes cloud-flow-1 {
                            0% { transform: translate(-10%, -10%) scale(1); }
                            50% { transform: translate(10%, 10%) scale(1.4); }
                            100% { transform: translate(-10%, -10%) scale(1); }
                        }
                        @keyframes cloud-flow-2 {
                            0% { transform: translate(15%, 5%) scale(1.1); }
                            50% { transform: translate(-15%, -5%) scale(0.8); }
                            100% { transform: translate(15%, 5%) scale(1.1); }
                        }
                        .cloud-blob {
                            position: absolute;
                            border-radius: 50%;
                            mix-blend-mode: multiply;
                            background: white;
                        }
                        .dark .cloud-blob {
                            mix-blend-mode: plus-lighter;
                            opacity: 0.15;
                            background: #2a2a2a;
                        }
                    `}</style>

                    <div className="cloud-blob w-[1000px] h-[1000px] shadow-[inset_0_0_120px_rgba(99,102,241,0.05)]" style={{ animation: 'cloud-flow-1 35s infinite ease-in-out' }}></div>
                    <div className="cloud-blob w-[800px] h-[800px] bg-sky-50" style={{ animation: 'cloud-flow-2 30s infinite ease-in-out', animationDelay: '-5s' }}></div>
                    <div className="cloud-blob w-[1100px] h-[1100px] bg-indigo-50/50" style={{ animation: 'cloud-flow-1 40s infinite ease-in-out reverse', animationDelay: '-10s' }}></div>
                </div>

                {/* Visual Polish */}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[40px]"></div>
            </div>

            {/* Content */}
            <div className={`relative z-20 max-w-4xl px-12 text-center transition-all duration-[2000ms] ease-in-out ${isExiting ? 'opacity-0 scale-90 blur-xl' : 'opacity-100 scale-100'}`}>

                {/* Branding Element */}
                <div className="mb-14 flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="w-14 h-14 rounded-[2rem] bg-indigo-500/10 blur-2xl animate-pulse absolute inset-0"></div>
                        <svg width="48" height="48" viewBox="0 0 40 40" fill="none" className="text-indigo-600/80 dark:text-sky-400/80 drop-shadow-sm animate-perceive">
                            <path d="M20 5C11.7 5 5 11.7 5 20C5 28.3 11.7 35 20 35C28.3 35 35 28.3 35 20C35 11.7 28.3 5 20 5ZM20 31C13.9 31 9 26.1 9 20C9 13.9 13.9 9 20 9C26.1 9 31 13.9 31 20C31 26.1 26.1 31 20 31Z" fill="currentColor" />
                            <circle cx="20" cy="20" r="4" fill="currentColor" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-light tracking-tight text-slate-800 dark:text-slate-100 leading-[1.7] min-h-[4.5em] serif select-none italic">
                    {renderSmoothText()}
                </h1>

                <div className={`mt-24 transition-all duration-[3000ms] ease-out ${isTypingComplete ? 'opacity-30' : 'opacity-0'}`}>
                    <div className="flex items-center justify-center gap-6">
                        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800"></div>
                        <span className="text-[10px] uppercase tracking-[0.8em] font-bold text-slate-400">
                            STARTLY TAB
                        </span>
                        <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800"></div>
                    </div>
                </div>
            </div>

            {/* Subtle Gradient Radial */}
            <div className={`absolute inset-0 z-[10] pointer-events-none transition-opacity duration-[2000ms] ${isExiting ? 'opacity-0' : 'opacity-100'}`}
                style={{ background: 'radial-gradient(circle at 50% 50%, white 0%, rgba(255,255,255,0) 70%)' }}></div>
        </div>
    );
};

export default DailyGreetingLoading;
