import React, { useEffect, useRef, useState } from 'react';

const TIME_BLOCKS = [
    {
        id: 'morning',
        time: '10:00 AM',
        title: 'Morning | The Gentle Launch',
        content: "Start slow to go far. You don't have to conquer the world in the first hour. Take a breath—the best work happens when you're steady, not rushed.",
        bgLight: "linear-gradient(135deg, #FDF4ED 0%, #FAEDE6 100%)",
        bgDark: "linear-gradient(135deg, #241916 0%, #171110 100%)",
        textColorLight: "#3B2D2A",
        textColorDark: "#F3E5E3",
        glow: (
            <div className="relative flex items-center justify-center w-full h-full">
                <div style={{ position: 'absolute', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, #EF4444 0%, #F97316 40%, transparent 70%)', filter: 'blur(60px)', opacity: 0.8 }} />
            </div>
        )
    },
    {
        id: 'midday',
        time: '11:50 AM',
        title: 'Midday | The Soul Fuel',
        content: "Task almost done? You've earned a real break. Go get a nourishing meal. You are the engine—treat yourself with the high-quality fuel you deserve.",
        bgLight: "linear-gradient(135deg, #E6F3FB 0%, #E8F5FC 100%)",
        bgDark: "linear-gradient(135deg, #101B27 0%, #070B10 100%)",
        textColorLight: "#1F2F3D",
        textColorDark: "#E1EDF8",
        glow: (
            <div className="relative flex items-center justify-center w-full h-full">
                <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, #FFFFFF 0%, #FDE047 30%, #EAB308 50%, transparent 70%)', filter: 'blur(60px)', opacity: 0.9 }} />
            </div>
        )
    },
    {
        id: 'afternoon',
        time: '03:15 PM',
        title: 'Afternoon | The Flow State Hack',
        content: "Feeling the fog? Don't push through it—work with it. Try the 5-minute reset: Close your eyes, clear one thought, and return with a fresh perspective.",
        bgLight: "linear-gradient(135deg, #F3EEFF 0%, #F4EEFF 100%)",
        bgDark: "linear-gradient(135deg, #1A1329 0%, #0F0A1A 100%)",
        textColorLight: "#2B223D",
        textColorDark: "#E7DEFA",
        glow: (
            <div className="relative flex items-center justify-center w-full h-full">
                <div style={{ position: 'absolute', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, #FDE047 0%, transparent 70%)', filter: 'blur(50px)', opacity: 0.85 }} />
                <div className="absolute w-[600px] h-[600px] animate-spin-slow opacity-60" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, #FDE047 10deg, transparent 20deg, transparent 40deg, #FDE047 50deg, transparent 60deg, transparent 80deg, #FDE047 90deg, transparent 100deg, transparent 120deg, #FDE047 130deg, transparent 140deg, transparent 160deg, #FDE047 170deg, transparent 180deg, transparent 200deg, #FDE047 210deg, transparent 220deg, transparent 240deg, #FDE047 250deg, transparent 260deg, transparent 280deg, #FDE047 290deg, transparent 300deg, transparent 320deg, #FDE047 330deg, transparent 340deg)', maskImage: 'radial-gradient(circle, black 10%, transparent 60%)', WebkitMaskImage: 'radial-gradient(circle, black 10%, transparent 60%)', filter: 'blur(4px)' }} />
            </div>
        )
    },
    {
        id: 'night',
        time: '09:45 PM',
        title: 'Late Night | The Permission to Unplug',
        content: "Still here? Your dedication is incredible, but you are not a machine. It's okay to sign off. The world can wait; your rest cannot.",
        bgLight: "linear-gradient(135deg, #1E1A25 0%, #15121B 100%)",
        bgDark: "linear-gradient(135deg, #100E15 0%, #050409 100%)",
        textColorLight: "#F8F7FF",
        textColorDark: "#F8F7FF",
        glow: (
            <div className="relative flex items-center justify-center w-full h-full">
                <div style={{ position: 'absolute', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, #FEF08A 0%, transparent 60%)', filter: 'blur(60px)', opacity: 0.35 }} />
                {/* Precise Crescent Moon rendering */}
                <svg width="260" height="260" viewBox="0 0 100 100" className="z-10" style={{ filter: 'drop-shadow(0px 0px 25px rgba(253,224,71,0.7))' }}>
                    <path d="M 50 5 A 40 40 0 1 0 95 60 A 35 35 0 1 1 50 5 Z" fill="#FCE588" />
                </svg>
            </div>
        )
    }
];

const DailyRhythm: React.FC = () => {
    const containerRef = useRef<HTMLElement>(null);
    const progressRef = useRef(0);
    const targetProgressRef = useRef(0);
    const [visualProgress, setVisualProgress] = useState(0);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
        checkDark();
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let reqId: number;

        const handleScroll = () => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const scrollSpace = rect.height - window.innerHeight;
            const scrolled = Math.max(0, -rect.top);
            let p = scrolled / scrollSpace;
            p = Math.max(0, Math.min(1, p));
            targetProgressRef.current = p;
        };

        const tick = () => {
            // Moderated damper (0.05) to be responsive yet smooth
            progressRef.current += (targetProgressRef.current - progressRef.current) * 0.05;
            setVisualProgress(progressRef.current);
            reqId = requestAnimationFrame(tick);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        tick();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(reqId);
        };
    }, []);

    /**
     * Implements the "Interrupt/Locking" logic:
     * 0.0 - 0.2: Locked at first frame (buffer entering zone)
     * 0.2 - 0.8: Active internal frames interpolation
     * 0.8 - 1.0: Locked at last frame (exit buffer zone)
     */
    let animationProgress = 0;
    if (visualProgress > 0.2 && visualProgress < 0.8) {
        animationProgress = (visualProgress - 0.2) / 0.6;
    } else if (visualProgress >= 0.8) {
        animationProgress = 1;
    }

    const floatIndex = animationProgress * 3;
    const activeIndex = Math.min(3, Math.max(0, Math.round(floatIndex)));
    const activeBlock = TIME_BLOCKS[activeIndex] || TIME_BLOCKS[0];
    const textColor = isDark ? activeBlock.textColorDark : activeBlock.textColorLight;

    return (
        // Changed to 800vh for a less "heavy" feel while still supporting the locking mechanic
        <section ref={containerRef} className="relative w-full h-[800vh] z-10 bg-[#FAFAFA] dark:bg-black">

            {/* 100svh guarantees full screen height even on mobile browser toolbars */}
            <div className="sticky top-0 w-full h-[100svh] overflow-hidden flex flex-col items-center pt-[8vh] pb-[10vh]">

                {/* 1. Background Layers */}
                {TIME_BLOCKS.map((block, idx) => (
                    <React.Fragment key={'bg-' + block.id}>
                        <div
                            className="absolute inset-0 transition-opacity duration-[1500ms] ease-out dark:hidden z-0"
                            style={{ opacity: activeIndex === idx ? 1 : 0, background: block.bgLight }}
                        />
                        <div
                            className="absolute inset-0 transition-opacity duration-[1500ms] ease-out hidden dark:block z-0"
                            style={{ opacity: activeIndex === idx ? 1 : 0, background: block.bgDark }}
                        />
                    </React.Fragment>
                ))}

                {/* --- TOP SECTION: TITLE & GLOW --- */}
                <div className="relative w-full flex-shrink-0 flex flex-col items-center justify-center z-10">

                    {/* The Glow Assets Layer - Centered precisely behind the Title */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] pointer-events-none z-0">
                        {TIME_BLOCKS.map((block, idx) => (
                            <div
                                key={'glow-' + block.id}
                                className={`absolute inset-0 flex items-center justify-center transition-all duration-[1500ms] ease-out ${activeIndex === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-75 blur-3xl'}`}
                            >
                                {block.glow}
                            </div>
                        ))}
                    </div>

                    {/* Main Interactive Title - Reduced to "Normal" size */}
                    <h2 className="relative z-10 font-serif text-[42px] leading-[1.1] md:text-[60px] lg:text-[72px] text-center px-6 transition-colors duration-[1500ms] drop-shadow-lg" style={{ color: textColor }}>
                        Your Day, Reimagined through<br className="max-md:hidden" /> Compassion.
                    </h2>
                    <p className="relative z-10 mt-4 text-[14px] md:text-[16px] font-medium tracking-[0.05em] text-center px-6 transition-colors duration-[1500ms] opacity-[0.7]" style={{ color: textColor }}>
                        Because productivity shouldn't cost you your mental peace.
                    </p>
                </div>

                {/* --- BOTTOM SECTION: LARGE QUOTE CARD & PROGRESS --- */}
                {/* Moved up higher by reducing top mt and using flex centering instead of justify-end with huge pb */}
                <div className="relative w-full max-w-[1000px] flex-1 flex flex-col items-center justify-center z-20 perspective-[1500px] px-6 mt-[-2vh]">

                    <div className="relative w-full h-[450px] md:h-[550px] flex flex-col items-center justify-center mb-8">
                        {TIME_BLOCKS.map((block, idx) => {
                            const isActive = activeIndex === idx;
                            const isPast = idx < activeIndex;

                            let transformY = "0px";
                            let scaleOffset = "1";
                            let opacity = "1";

                            if (!isActive) {
                                transformY = isPast ? "-100px" : "100px";
                                scaleOffset = isPast ? "1.1" : "0.9";
                                opacity = "0";
                            }

                            return (
                                <div
                                    key={'card-' + block.id}
                                    className="absolute inset-0 w-full flex flex-col items-center justify-center pointer-events-none transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                                    style={{
                                        opacity,
                                        transform: `translateY(${transformY}) scale(${scaleOffset})`,
                                        pointerEvents: isActive ? 'auto' : 'none'
                                    }}
                                >
                                    {/* Time Pill */}
                                    <div
                                        className="px-6 py-2 rounded-full text-[13px] md:text-[14px] font-medium tracking-[0.15em] mb-6 transition-colors duration-[1500ms] shadow-md"
                                        style={{
                                            background: 'rgba(0,0,0,0.2)',
                                            backdropFilter: 'blur(10px)',
                                            color: 'rgba(255,255,255,0.9)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        {block.time}
                                    </div>

                                    {/* Block Title - Reduced size */}
                                    <h3 className="font-serif text-[28px] md:text-[36px] mb-6 transition-colors duration-[1500ms] drop-shadow-md font-medium" style={{ color: textColor }}>
                                        {block.title}
                                    </h3>

                                    {/* Glass Quote Card - Very Large Content */}
                                    <div
                                        className="relative w-full rounded-[3rem] md:rounded-[4rem] p-10 md:p-16 border transition-all duration-[1500ms]"
                                        style={{
                                            backdropFilter: 'blur(40px)',
                                            WebkitBackdropFilter: 'blur(40px)',
                                            background: idx === 3 ? 'rgba(30, 26, 35, 0.4)' : 'rgba(255, 255, 255, 0.12)',
                                            borderColor: idx === 3 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.4)',
                                            boxShadow: idx === 3 ? '0 40px 80px rgba(0,0,0,0.6)' : '0 40px 80px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        {/* Quote Mark */}
                                        <span className="absolute top-6 left-10 font-serif text-[80px] md:text-[100px] leading-none opacity-20 transition-colors duration-[1500ms]" style={{ color: textColor }}>
                                            “
                                        </span>
                                        {/* Quote Text - High impact large size */}
                                        <p className="font-serif text-[24px] md:text-[34px] leading-[1.6] pt-4 tracking-wide text-center text-balance opacity-[0.95] transition-colors duration-[1500ms]" style={{ color: textColor }}>
                                            {block.content}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress Bar Line immediately tucked under the cards */}
                    <div className="w-full max-w-[500px] md:max-w-[700px] h-2 rounded-full overflow-hidden z-20" style={{ background: 'rgba(255,255,255,0.15)' }}>
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 transition-all duration-300"
                            style={{ width: `${animationProgress * 100}%` }}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default DailyRhythm;
