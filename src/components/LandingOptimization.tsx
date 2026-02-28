import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Activity, Moon } from 'lucide-react';

const CARDS = [
    {
        id: "tab-hopping",
        title: "The Tab-Hopping Reflex",
        description: "You open 20 tabs before finishing one task, searching for a distraction that never satisfies.",
        answers: "1.2k",
        views: "45k",
        avatar: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "busy-empty",
        title: "Busy But Empty",
        description: "You feel busy all day — yet you lack the sense of true accomplishment at sunset.",
        answers: "850",
        views: "32k",
        avatar: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "digital-escape",
        title: "Digital Escape",
        description: "You subconsciously check messages or social media just to escape the pressure of a hard task.",
        answers: "2.1k",
        views: "68k",
        avatar: "https://images.unsplash.com/photo-1512428559083-a400a6b5a067?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "morning-burnout",
        title: "Morning Burnout",
        description: "You start your day already feeling drained, dreading the noise of your digital environment.",
        answers: "1.5K",
        views: "54k",
        avatar: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    },
    {
        id: "silent-stress",
        title: "Silent Stress",
        description: "You don’t notice your heart racing or your breath shallowing until it’s already too late.",
        answers: "920",
        views: "41k",
        avatar: "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?q=80&w=200&h=200&auto=format&fit=crop",
        icon: "🌑"
    }
];

const LandingOptimization: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [activeBottomSlide, setActiveBottomSlide] = useState(0);
    const [isBottomPaused, setIsBottomPaused] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

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
        <section className="w-full relative py-10 overflow-hidden bg-transparent -mt-[500px] z-0">
            {/* Seamless Transition Background Layer - Softened Colors */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-gradient-to-br from-[#E2E4FF] via-[#F8F9FF] to-[#FFFBEB] dark:from-[#0F112B] dark:via-[#0B0C1A] dark:to-[#1A180B]"
                    style={{
                        maskImage: 'linear-gradient(to bottom, transparent 0%, transparent 40%, black 70%, black 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, transparent 40%, black 70%, black 100%)'
                    }}
                />
            </div>

            {/* Seamless Grid Pattern Overlay - Faded behind content */}
            <div className="absolute inset-0 z-10 opacity-[0.6] dark:opacity-[0.1]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'linear-gradient(to bottom, transparent 10%, black 40%, transparent 70%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 10%, black 40%, transparent 70%)'
                }}
            />

            {/* Ambient Vibrant Glows - Moved to z-0, behind content & grid */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute top-[10%] -left-[5%] w-[1200px] h-[1200px] bg-purple-400/25 dark:bg-purple-900/20 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[0%] -right-[5%] w-[1200px] h-[1200px] bg-yellow-300/25 dark:bg-yellow-900/20 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '10s' }} />
            </div>

            <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 relative z-20 pt-[520px]">

                {/* Floating Decorative Elements - Clearly in front */}
                <div className="absolute top-[500px] right-[10%] animate-bounce opacity-80 z-30" style={{ animationDuration: '6s' }}>
                    <div className="w-16 h-16 bg-purple-500/10 backdrop-blur-3xl rounded-full flex items-center justify-center shadow-lg border border-white/20">
                        <span className="text-xl">💜</span>
                    </div>
                </div>
                <div className="absolute top-[650px] left-[5%] animate-pulse opacity-80 z-30">
                    <div className="w-14 h-14 bg-yellow-400/10 backdrop-blur-3xl rounded-full flex items-center justify-center shadow-md border border-white/30">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-[0_0_20px_rgba(250,204,21,1)]"></div>
                    </div>
                </div>

                {/* SEO-Driven Mindful Header */}
                <div className="text-center mb-16 animate-reveal z-20 relative">
                    <h2 className="serif text-5xl md:text-7xl lg:text-8xl text-gray-900 dark:text-white leading-tight mb-8 font-medium tracking-tight">
                        Does your workday <br />
                        feel like <span className="italic text-purple-600 dark:text-purple-400">this?</span>
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-xl md:text-2xl max-w-3xl mx-auto font-light leading-relaxed">
                        Most productivity tools manage your tasks. <br />
                        <span className="font-medium text-gray-900 dark:text-gray-100 italic">StartlyTab helps you manage your emotional rhythm.</span>
                    </p>
                </div>

                {/* Staggered "Peek-in" Carousel - Cards are on Z-20/Z-30 */}
                <div className="relative flex justify-center items-center h-[560px] z-30"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    {/* The Character / Blob Glow behind the active card */}
                    <div className="absolute transform -translate-y-1/2 top-1/2 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-purple-500/10 to-yellow-500/10 rounded-full blur-[120px] z-0 opacity-40" />

                    <div className="flex items-center justify-center w-full relative h-full">
                        {CARDS.map((card, index) => {
                            const isCenter = index === currentIndex;
                            const isLeft = index === (currentIndex - 1 + CARDS.length) % CARDS.length;
                            const isRight = index === (currentIndex + 1) % CARDS.length;

                            let positionStyles = "";
                            if (isCenter) positionStyles = "z-40 scale-110 opacity-100 translate-x-0 rotate-0";
                            else if (isLeft) positionStyles = "z-20 -translate-x-[80%] -rotate-[12deg] opacity-30 scale-[0.75] translate-y-12 pointer-events-none md:pointer-events-auto blur-[1px]";
                            else if (isRight) positionStyles = "z-20 translate-x-[80%] rotate-[12deg] opacity-30 scale-[0.75] translate-y-12 pointer-events-none md:pointer-events-auto blur-[1px]";
                            else positionStyles = "opacity-0 scale-50 z-0 pointer-events-none";

                            return (
                                <div
                                    key={card.id}
                                    className={`absolute transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] w-[360px] md:w-[480px] cursor-pointer ${positionStyles}`}
                                    onClick={() => !isCenter && setCurrentIndex(index)}
                                >
                                    <div className="bg-white/95 dark:bg-[#1C1E36]/95 backdrop-blur-[32px] rounded-[4rem] p-12 shadow-[0_80px_160px_-40px_rgba(0,0,0,0.15)] dark:shadow-[0_80px_160px_-40px_rgba(0,0,0,1)] border border-white/60 dark:border-white/10 group">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#2A2D4F] px-8 py-3.5 rounded-full shadow-xl border border-gray-100 dark:border-white/5 flex items-center gap-3">
                                                <span className="text-xl">{card.icon}</span>
                                                <h3 className="serif text-base md:text-lg text-gray-900 dark:text-gray-100 font-semibold tracking-wide whitespace-nowrap">{card.title}</h3>
                                            </div>

                                            <div className="w-28 h-28 rounded-full overflow-hidden mt-6 mb-8 border-[6px] border-[#F2F4FF] dark:border-[#2D3154] shadow-lg group-hover:scale-110 transition-transform duration-500">
                                                <img
                                                    src={card.avatar}
                                                    alt="Depiction of digital burnout and work anxiety in a browser environment"
                                                    className="w-full h-full object-cover grayscale-[0.2]"
                                                />
                                            </div>

                                            <p className="serif text-2xl md:text-3xl text-gray-700 dark:text-white leading-[1.4] mb-12 min-h-[140px] px-2 font-medium">
                                                {card.description}
                                            </p>

                                            <div className="flex items-center gap-10 text-[10px] font-bold tracking-[0.2em] text-gray-400 dark:text-gray-500">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)]"></span>
                                                    {card.answers} ANSWERS
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]"></span>
                                                    {card.views} VIEWS
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Final SEO Context & CTA */}
                <div className="mt-20 text-center animate-reveal max-w-4xl mx-auto z-20 relative" style={{ animationDelay: '0.4s' }}>
                    <div className="mb-14">
                        <button
                            onClick={handleCTAClick}
                            aria-label="Start reducing work anxiety with StartlyTab mindful new tab"
                            className="px-14 py-6 bg-[#121212] dark:bg-white text-white dark:text-black rounded-full text-lg font-bold uppercase tracking-[0.15em] shadow-2xl hover:scale-105 active:scale-95 transition-all mb-4"
                        >
                            I want a gentler workday
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide mb-12">
                            Free to try. No complex setup. Just peace of mind
                        </p>
                    </div>

                    <div className="space-y-6">
                        <h4 className="serif text-3xl md:text-4xl text-gray-800 dark:text-white">
                            A path to feeling better
                        </h4>
                        <p className="text-gray-500 dark:text-gray-400 text-lg md:text-xl font-light leading-relaxed max-w-3xl mx-auto">
                            Traditional Starter Page focus on speed, shortcuts, and endless output — often increasing your hidden anxiety.
                            <span className="text-gray-900 dark:text-white font-normal mx-1 italic underline decoration-purple-500/30 underline-offset-8">We provide a mindful intervention between tasks,</span>
                            helping you break the cycle of digital noise and performance anxiety.
                        </p>
                    </div>

                    {/* App Dashboard Mockup */}
                    <div className="mt-20 relative w-full max-w-5xl mx-auto bg-[#FAFAFA] dark:bg-[#0B0C1A] rounded-[2rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-gray-200 dark:border-white/10" style={{ height: '640px' }}>
                        {/* Top Bar */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                                        <path d="M12 4V2M12 22V20M4 12H2M22 12H20M5.636 5.636L4.222 4.222M19.778 19.778L18.364 18.364M5.636 18.364L4.222 19.778M19.778 5.636L18.364 4.222" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white tracking-widest text-sm">StartlyTab</span>
                            </div>

                            <div className="flex-1 max-w-xl mx-8 hidden md:block">
                                <div className="flex items-center bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full px-4 py-2.5 shadow-sm">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 via-red-500 to-yellow-500 flex items-center justify-center text-[10px] font-bold text-white mr-3">G</div>
                                    <input type="text" placeholder="Search" className="bg-transparent border-none focus:outline-none text-sm text-gray-400 dark:text-gray-500 w-full" disabled />
                                    <Search className="w-4 h-4 text-gray-400" />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 shadow-sm cursor-not-allowed">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 shadow-sm cursor-not-allowed">
                                    <Moon className="w-4 h-4" />
                                </div>
                                <button className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-md pointer-events-none">
                                    Studio
                                </button>
                            </div>
                        </div>

                        {/* Main Content Area (Carousel) */}
                        <div
                            className="absolute inset-0 pt-16 px-4 md:px-8 w-full flex items-center justify-center overflow-hidden"
                            onMouseEnter={() => setIsBottomPaused(true)}
                            onMouseLeave={() => setIsBottomPaused(false)}
                        >
                            {/* Slide 0: The Original Dashboard View */}
                            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ${activeBottomSlide === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12 pointer-events-none'}`}>
                                <h1 className="serif text-4xl md:text-5xl lg:text-6xl text-center text-gray-900 dark:text-gray-100 max-w-4xl tracking-tight leading-[1.1] mb-12">
                                    Even one completed task can make today meaningful.
                                </h1>

                                <div className="flex items-center justify-center gap-4 mb-20 relative z-10 w-full">
                                    <button className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-2xl pointer-events-none">
                                        New Perspective
                                    </button>
                                    <button className="w-14 h-14 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-full flex items-center justify-center text-2xl shadow-xl pointer-events-none">
                                        <span className="opacity-90">😊</span>
                                    </button>
                                </div>

                                {/* Gateway Mini Box at the bottom */}
                                <div className="absolute bottom-12 w-full max-w-5xl px-8 z-20">
                                    <div className="bg-white/80 dark:bg-white/[0.02] backdrop-blur-2xl border border-gray-200/60 dark:border-white/10 rounded-[2rem] p-5 shadow-xl flex justify-center">
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 justify-items-center w-full">
                                            {[
                                                { name: 'Gmail', icon: 'https://www.google.com/s2/favicons?domain=gmail.com&sz=64' },
                                                { name: 'Slack', icon: 'https://www.google.com/s2/favicons?domain=slack.com&sz=64' },
                                                { name: 'Notion', icon: 'https://www.google.com/s2/favicons?domain=notion.so&sz=64' },
                                                { name: 'ChatGPT', icon: 'https://www.google.com/s2/favicons?domain=chat.openai.com&sz=64' },
                                                { name: 'GitHub', icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64' },
                                                { name: 'Figma', icon: 'https://www.google.com/s2/favicons?domain=figma.com&sz=64' },
                                                { name: 'Linear', icon: 'https://www.google.com/s2/favicons?domain=linear.app&sz=64' },
                                                { name: 'Zoom', icon: 'https://www.google.com/s2/favicons?domain=zoom.us&sz=64' },
                                                { name: 'Drive', icon: 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64' },
                                                { name: 'LinkedIn', icon: 'https://www.google.com/s2/favicons?domain=linkedin.com&sz=64' }
                                            ].map((link, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm hover:-translate-y-1 transition-transform cursor-pointer w-full max-w-[170px]">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5">
                                                        <img src={link.icon} alt={link.name} className="w-5 h-5 object-contain" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">{link.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Slide 1: All Gateways Full Screen View */}
                            <div className={`absolute inset-0 flex flex-col transition-all duration-700 pt-10 h-full overflow-hidden bg-[#FAFAFA] dark:bg-[#0B0C1A] ${activeBottomSlide === 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none z-10'}`}>
                                <div className="px-8 md:px-16 w-full max-w-6xl mx-auto flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-20">
                                    <div className="flex justify-between items-start mb-10 w-full">
                                        <div className="text-left w-full pl-2">
                                            <div className="inline-block border-2 border-[#E95454] px-6 py-3 bg-white/50 dark:bg-black/20 rounded-lg shadow-sm">
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Shortcuts</h2>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-medium">Frequently used tools & collections</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 hidden md:flex pt-2">
                                            <button className="px-5 py-2 text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 rounded-full shadow-sm hover:bg-blue-100 transition-colors uppercase tracking-widest">+ New Group</button>
                                            <button className="px-5 py-2 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 rounded-full shadow-sm hover:bg-orange-100 transition-colors uppercase tracking-widest">+ Add Gateway</button>
                                            <button className="px-6 py-2 text-xs font-bold text-gray-600 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full shadow-sm uppercase tracking-widest">Edit</button>
                                        </div>
                                    </div>

                                    <div className="space-y-12 w-full flex flex-col items-start px-2">
                                        {/* Group 1 */}
                                        <div className="w-full text-left">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 justify-items-start">
                                                {[
                                                    { name: 'Start.me', icon: 'https://www.google.com/s2/favicons?domain=start.me&sz=64' },
                                                    { name: 'Gmail', icon: 'https://www.google.com/s2/favicons?domain=gmail.com&sz=64' },
                                                    { name: 'ChatGPT', icon: 'https://www.google.com/s2/favicons?domain=chat.openai.com&sz=64' },
                                                    { name: 'YouTube', icon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64' },
                                                    { name: 'StartlyTab', icon: 'https://www.google.com/s2/favicons?domain=google.com&sz=64' },
                                                    { name: 'Dribbble', icon: 'https://www.google.com/s2/favicons?domain=dribbble.com&sz=64' },
                                                    { name: 'Pinterest', icon: 'https://www.google.com/s2/favicons?domain=pinterest.com&sz=64' },
                                                    { name: 'Baidu', icon: 'https://www.google.com/s2/favicons?domain=baidu.com&sz=64' }
                                                ].map((link, i) => (
                                                    <div key={`a-${i}`} className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer w-full max-w-[170px]">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5">
                                                            <img src={link.icon} alt={link.name} className="w-5 h-5 object-contain" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">{link.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Group 2 */}
                                        <div className="w-full text-left">
                                            <div className="inline-block border-2 border-[#E95454] px-6 py-2 bg-white/50 dark:bg-black/20 rounded-lg mb-6 shadow-sm">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 m-0">Vibe Coding</h3>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 justify-items-start">
                                                {[
                                                    { name: 'GitHub', icon: 'https://www.google.com/s2/favicons?domain=github.com&sz=64' },
                                                    { name: 'Supabase', icon: 'https://www.google.com/s2/favicons?domain=supabase.com&sz=64' },
                                                    { name: 'Vercel', icon: 'https://www.google.com/s2/favicons?domain=vercel.com&sz=64' },
                                                    { name: 'AI Studio', icon: 'https://www.google.com/s2/favicons?domain=aistudio.google.com&sz=64' },
                                                    { name: 'Claude', icon: 'https://www.google.com/s2/favicons?domain=anthropic.com&sz=64' },
                                                    { name: 'DS API', icon: 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=64' }
                                                ].map((link, i) => (
                                                    <div key={`b-${i}`} className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer w-full max-w-[170px]">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5">
                                                            <img src={link.icon} alt={link.name} className="w-5 h-5 object-contain" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">{link.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Group 3 */}
                                        <div className="w-full text-left">
                                            <div className="inline-block border-2 border-[#E95454] px-8 py-2 bg-white/50 dark:bg-black/20 rounded-lg mb-6 shadow-sm">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 m-0">Work</h3>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 justify-items-start">
                                                {[
                                                    { name: 'Notion', icon: 'https://www.google.com/s2/favicons?domain=notion.so&sz=64' },
                                                    { name: 'Slack', icon: 'https://www.google.com/s2/favicons?domain=slack.com&sz=64' },
                                                    { name: 'Figma', icon: 'https://www.google.com/s2/favicons?domain=figma.com&sz=64' },
                                                    { name: 'Linear', icon: 'https://www.google.com/s2/favicons?domain=linear.app&sz=64' },
                                                    { name: 'Zoom', icon: 'https://www.google.com/s2/favicons?domain=zoom.us&sz=64' }
                                                ].map((link, i) => (
                                                    <div key={`c-${i}`} className="flex items-center gap-3 p-3 bg-white dark:bg-white/5 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer w-full max-w-[170px]">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-black/20 flex items-center justify-center shrink-0 border border-black/5 dark:border-white/5">
                                                            <img src={link.icon} alt={link.name} className="w-5 h-5 object-contain" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate pr-2">{link.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Slide 2: Trend Hub Specific View Modal */}
                            <div className={`absolute inset-0 flex flex-col items-center justify-center px-4 md:px-12 transition-all duration-700 bg-gray-900/20 dark:bg-black/40 backdrop-blur-md ${activeBottomSlide === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none z-20'}`}>
                                <div className="w-full max-w-4xl bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden relative transform transition-transform duration-700 delay-100 scale-100">
                                    {/* Modal Header */}
                                    <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-gray-50 dark:border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                                <Activity className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Trend Hub</h3>
                                                <p className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">Your Emotional Footprint</p>
                                            </div>
                                        </div>
                                        <button className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                                            <span className="text-lg leading-none">×</span>
                                        </button>
                                    </div>

                                    {/* Modal Content - Text Only */}
                                    <div className="p-6 md:p-12 relative overflow-hidden">
                                        <div className="bg-white dark:bg-[#252527] rounded-3xl p-8 md:p-12 border border-gray-100 dark:border-white/5 shadow-sm relative">
                                            {/* Top Quotes Decoration */}
                                            <div className="absolute top-8 right-10 text-6xl text-gray-100 dark:text-gray-700/50 font-serif leading-none opacity-50">"</div>

                                            <h4 className="serif text-2xl md:text-3xl font-medium text-gray-900 dark:text-gray-100 mb-8 max-w-xl relative z-10">
                                                To the one who has felt a persistent heaviness lately:
                                            </h4>

                                            <div className="space-y-6 text-gray-600 dark:text-gray-300 font-light leading-relaxed text-[15px] relative z-10">
                                                <p>Your emotional footprint over the past week shows a recurring pattern of exhaustion and sadness. Please know that this is entirely human—you are not broken, you are simply carrying more than your energetic capacity allows. When your baseline is low, productivity cannot be the metric for self-worth. Lower the bar for today. Achieving the bare minimum is an absolute victory.</p>

                                                {/* Bottom Box Decor */}
                                                <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                                                    <p className="italic text-indigo-900/80 dark:text-indigo-200">For now, strip away the non-essentials. Practice 'Fractional Living'—don't look at the whole day, just look at the next hour. Can you manage one small, comforting act for yourself in this current hour?</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Indicators */}
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-30">
                                {[0, 1, 2].map(idx => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveBottomSlide(idx)}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${activeBottomSlide === idx ? 'bg-gray-800 dark:bg-gray-200 w-6' : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 shadow-sm'}`}
                                        aria-label={`Go to slide ${idx + 1}`}
                                    />
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LandingOptimization;
