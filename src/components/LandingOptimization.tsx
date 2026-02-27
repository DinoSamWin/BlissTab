import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

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
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

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
        <section className="w-full relative py-32 pb-40 overflow-hidden bg-transparent -mt-[500px] z-0">
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
            <div className="absolute inset-0 z-10 opacity-[0.25] dark:opacity-[0.08]"
                style={{
                    backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'linear-gradient(to bottom, transparent 20%, black 50%, transparent 80%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 20%, black 50%, transparent 80%)'
                }}
            />

            {/* Ambient Vibrant Glows - Moved to z-0, behind content & grid */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute top-[10%] -left-[5%] w-[1200px] h-[1200px] bg-purple-400/25 dark:bg-purple-900/20 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[0%] -right-[5%] w-[1200px] h-[1200px] bg-yellow-300/25 dark:bg-yellow-900/20 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '10s' }} />
            </div>

            <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 relative z-20 pt-[550px]">

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
                </div>
            </div>
        </section>
    );
};

export default LandingOptimization;
