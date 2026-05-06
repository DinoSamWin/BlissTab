import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Activity, Moon } from 'lucide-react';

const CARDS = [
    {
        id: "tab-hopping",
        title: "The Tab-Hopping Reflex",
        description: "You open 20 tabs before finishing one task, searching for a distraction that never satisfies.",
        leftLabel: "Restless tabs",
        rightLabel: "One small step",
        avatar: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "busy-empty",
        title: "Busy But Empty",
        description: "You feel busy all day — yet you lack the sense of true accomplishment at sunset.",
        leftLabel: "All motion",
        rightLabel: "Quiet clarity",
        avatar: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "digital-escape",
        title: "Digital Escape",
        description: "You subconsciously check messages or social media just to escape the pressure of a hard task.",
        leftLabel: "Digital noise",
        rightLabel: "Breathing room",
        avatar: "https://images.unsplash.com/photo-1512428559083-a400a6b5a067?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "morning-burnout",
        title: "Morning Burnout",
        description: "You start your day already feeling drained, dreading the noise of your digital environment.",
        leftLabel: "Low energy",
        rightLabel: "Gentle reset",
        avatar: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "silent-stress",
        title: "Silent Stress",
        description: "You don’t notice your heart racing or your breath shallowing until it’s already too late.",
        leftLabel: "Quiet tension",
        rightLabel: "Optional check-in",
        avatar: "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    }
];

interface LandingOptimizationProps {
    onRequireLogin?: () => void;
}

const LandingOptimization: React.FC<LandingOptimizationProps> = ({ onRequireLogin }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [activeBottomSlide, setActiveBottomSlide] = useState(0);
    const [isBottomPaused, setIsBottomPaused] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();
    const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;

    useEffect(() => {
        if (isBottomPaused) return;
        const interval = setInterval(() => {
            setActiveBottomSlide(prev => (prev + 1) % 3);
        }, 4000);
        return () => clearInterval(interval);
    }, [isBottomPaused]);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % CARDS.length);
        }, 5000);
    };

    useEffect(() => {
        if (!isPaused) {
            startTimer();
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isPaused]);

    const handleCTAClick = () => {
        navigate('/subscription');
    };

    return (
        <main className="w-full relative overflow-hidden bg-[#FBFBFE] dark:bg-[#0A0A0B]">
            {/* Hero Section */}
            <section 
                aria-labelledby="hero-title"
                className="relative w-full flex flex-col items-center justify-start pt-16 md:pt-20 pb-0 px-6 overflow-hidden"
            >
                {/* Background Layer with Redesign Asset */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/images/redesign/homepage-1-background.webp" 
                        alt="" 
                        className="w-full h-full object-cover opacity-60 dark:opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FBFBFE]/50 to-[#FBFBFE] dark:via-[#0A0A0B]/50 dark:to-[#0A0A0B]" />
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center text-center">
                    {/* Brand Logo Area - Absolute Top Left in the designated corner */}
                    <div className="absolute top-[-60px] left-[-30px] md:left-[-40px] flex items-center gap-4 animate-reveal">
                        <img 
                            src="/icons/icon-64x64.png" 
                            alt="StartlyTab Logo" 
                            className="w-12 h-12 rounded-xl shadow-md"
                        />
                        <span className="font-bold text-gray-900 dark:text-white tracking-widest text-2xl logo-text">StartlyTab</span>
                    </div>

                    {/* Main SEO Content with Precise Gradient and Refined Shadow */}
                    <h1 
                        id="hero-title"
                        className="font-['Poltawski_Nowy',serif] mb-6 font-normal w-full max-w-[1200px] xl:max-w-[1400px] px-4 animate-reveal mx-auto -mt-[30px]"
                        style={{
                            fontSize: 'clamp(2.2rem, 3.8vw, 3.5625rem)',
                            lineHeight: '1.178',
                            letterSpacing: '0',
                            background: 'linear-gradient(90deg, #346739 0%, #79AE6F 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0px 0px 1.5px rgba(0, 0, 0, 0.08))'
                        }}
                    >
                        A Minimalist Productivity New Tab <br className="hidden md:block" /> for Focused Work
                    </h1>

                    <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg max-w-2xl mx-auto font-light leading-relaxed mb-6 animate-reveal" style={{ animationDelay: '0.1s' }}>
                        Your Chrome New Tab—as a quiet mental buffer between busy tabs and a calmer workday.
                    </p>

                    {/* CTA Section */}
                    <div className={`flex flex-col sm:flex-row items-center gap-4 mb-10 animate-reveal ${isExtension ? 'justify-center' : ''}`} style={{ animationDelay: '0.2s' }}>
                        {!isExtension && (
                            <a 
                                href="https://chromewebstore.google.com/detail/pfjfdnaopfaampmgaalfafhodcafbelm" 
                                aria-label="Add StartlyTab to Chrome"
                                className="flex items-center gap-3 px-8 py-3.5 bg-[#121212] dark:bg-white text-white dark:text-black rounded-full text-sm font-bold uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                            >
                                <img src="/images/redesign/logos_chrome.webp" alt="" className="w-4 h-4" />
                                Add to Chrome
                            </a>
                        )}

                        <button 
                            onClick={onRequireLogin}
                            className={`${isExtension ? 'px-16 py-5 text-lg bg-[#121212] text-white' : 'px-10 py-3.5 text-sm bg-white/80 text-gray-900'} dark:bg-white/5 backdrop-blur-md border border-black dark:border-white/20 dark:text-white rounded-full font-bold uppercase tracking-widest shadow-sm hover:opacity-90 transition-all`}
                        >
                            Try It For Free
                        </button>
                    </div>

                    {/* Product Preview Image - Optimized for MacBook Air viewport */}
                    <div className="relative w-full max-w-[730px] lg:max-w-[850px] mx-auto animate-reveal" style={{ animationDelay: '0.3s' }}>
                        <div className="absolute -inset-4 bg-gradient-to-tr from-purple-500/10 to-yellow-500/10 rounded-[3rem] blur-3xl opacity-50 z-0" />
                        <img
                            id="preview"
                            src="/images/redesign/homepage-1-pic.webp"
                            alt="StartlyTab Chrome new tab preview with search, shortcuts, and focus message"
                            width="1000"
                            height="633"
                            fetchPriority="high"
                            className="relative z-10 w-full h-auto rounded-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] border border-gray-200/50 dark:border-white/10"
                        />
                    </div>
                </div>
            </section>
        </main>
    );
};

export default LandingOptimization;
