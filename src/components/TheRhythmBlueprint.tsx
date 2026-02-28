import React, { useState, useEffect } from 'react';

const EmotionIcon = ({ type }: { type: string }) => (
    <div className="w-8 h-8 hover:scale-125 transition-transform cursor-pointer opacity-70 hover:opacity-100 grayscale-[0.2] hover:grayscale-0 select-none drop-shadow-sm">
        <img src={`/icons/emotions/${type}.png`} alt={type} className="w-full h-full object-contain" />
    </div>
);
interface TheRhythmBlueprintProps {
    onRequireLogin?: () => void;
}

const TheRhythmBlueprint: React.FC<TheRhythmBlueprintProps> = ({ onRequireLogin }) => {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Auto-rotate the frames
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!isHovered) {
            interval = setInterval(() => {
                setCurrentFrame((prev) => (prev === 0 ? 1 : 0));
            }, 5500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isHovered]);

    const setFrame = (index: number) => {
        setCurrentFrame(index);
    };

    return (
        <section className="w-full relative py-24 overflow-hidden z-10">
            {/* Warm, empathetic background gradient layout */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5F0] via-[#FFFBF6] to-[#FDF8ED] dark:from-[#171212] dark:via-[#13100B] dark:to-[#0A0705]" />

                {/* Soft ambient glows feeling like "temperature" and "human warmth" */}
                <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-rose-200/30 dark:bg-rose-900/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] bg-amber-100/40 dark:bg-amber-900/10 rounded-full blur-[140px] mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
            </div>

            <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">

                {/* Left Side: The Architecture (Textual Core) */}
                <div className="flex-1 max-w-xl animate-reveal">
                    {/* H2 Visual Focus */}
                    <h2 className="serif text-5xl md:text-6xl text-gray-900 dark:text-gray-50 leading-[1.15] mb-8 font-medium tracking-tight">
                        It starts as a moment.<br />
                        <span className="italic text-rose-800/80 dark:text-rose-200/80">It becomes a rhythm.</span>
                    </h2>

                    {/* Body Typography - Poetic Presentation */}
                    <p className="text-gray-700 dark:text-gray-300 text-lg md:text-xl font-light leading-[1.7] space-y-2">
                        <span className="block">A quiet tap when you feel stressed.</span>
                        <span className="block">A gentle line when you feel tired.</span>
                        <span className="block">Over days, small patterns begin to form.</span>
                        <span className="block font-medium text-gray-900 dark:text-white mt-4 italic">Not to judge you. Just to understand you.</span>
                    </p>

                    {/* Added CTA Button */}
                    <div className="mt-12">
                        <button
                            className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold uppercase tracking-[0.15em] text-xs shadow-xl shadow-rose-900/10 dark:shadow-rose-100/10 hover:scale-105 active:scale-95 transition-all text-center w-auto inline-flex items-center gap-2"
                            onClick={onRequireLogin}
                            aria-label="Experience the Rhythm"
                        >
                            Experience the space
                            <span className="text-lg leading-none">✨</span>
                        </button>
                    </div>
                </div>

                {/* Right Side: Mockup Frame */}
                <div
                    className="flex-1 w-full max-w-2xl relative"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <div className="w-full bg-white dark:bg-[#1C1C1E] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] min-h-[460px] flex flex-col relative overflow-hidden transition-all duration-700">

                        {/* Frame 1: Emotion Input State */}
                        <div className={`absolute inset-0 px-8 py-10 md:p-14 flex flex-col items-center justify-center transition-all duration-700 delay-100 ${currentFrame === 0 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                            <h3 className="serif text-[32px] md:text-[38px] text-gray-800 dark:text-gray-100 text-center leading-[1.3] mb-16 max-w-[440px]">
                                How are you feeling right now?<br />
                                <span className="text-xl md:text-2xl text-gray-500 font-light italic mt-2 block">Just shown to you</span>
                            </h3>

                            {/* Simulated Emoji Drawer */}
                            <div className="flex items-center justify-center gap-4 md:gap-6 px-8 md:px-10 py-5 bg-[#FAFAFA] dark:bg-[#2A2A2C] rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-white/5 relative z-20">
                                <EmotionIcon type="angry" />
                                <EmotionIcon type="sad" />
                                <EmotionIcon type="exhausted" />

                                <div className="relative z-10">
                                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-black text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider font-bold shadow-lg animate-bounce">
                                        Anxious
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-white rotate-45"></div>
                                    </div>
                                    <div className="w-[64px] h-[64px] bg-white dark:bg-[#1C1C1E] rounded-full flex items-center justify-center shadow-md border border-gray-100 dark:border-white/10 scale-110 cursor-pointer -mt-1 hover:scale-125 transition-transform">
                                        <img src="/icons/emotions/anxious.png" alt="Anxious" className="w-10 h-10 object-contain drop-shadow-md" />
                                    </div>
                                </div>

                                <EmotionIcon type="neutral" />
                                <EmotionIcon type="happy" />
                            </div>
                        </div>

                        {/* Frame 2: Emotion Rhythm Curve */}
                        <div className={`absolute inset-0 flex flex-col justify-start transition-all duration-700 delay-100 ${currentFrame === 1 ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-8 pointer-events-none'}`}>

                            {/* SVG Trend Line */}
                            <div className="w-full h-[220px] relative mt-4 px-10">
                                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.2)" />
                                            <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
                                        </linearGradient>
                                        <linearGradient id="lineColor" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#818CF8" />
                                            <stop offset="30%" stopColor="#38BDF8" />
                                            <stop offset="70%" stopColor="#34D399" />
                                            <stop offset="100%" stopColor="#FBBF24" />
                                        </linearGradient>
                                    </defs>

                                    {/* Irregular Wavy 7-day pattern background fill */}
                                    <path
                                        d="M 0 120 L 0 60 C 22 60, 44 100, 66 100 C 88 100, 111 60, 133 60 C 155 60, 177 80, 200 80 C 222 80, 244 50, 266 50 C 288 50, 311 20, 333 20 C 355 20, 377 30, 400 30 L 400 120 Z"
                                        fill="url(#curveGradient)"
                                    />
                                    {/* The Wavy Stroke */}
                                    <path
                                        d="M 0 60 C 22 60, 44 100, 66 100 C 88 100, 111 60, 133 60 C 155 60, 177 80, 200 80 C 222 80, 244 50, 266 50 C 288 50, 311 20, 333 20 C 355 20, 377 30, 400 30"
                                        fill="none"
                                        stroke="url(#lineColor)"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        className="path-animate"
                                    />
                                </svg>

                                {/* Points on the curve mapping to the wavy path intersections roughly */}
                                {/* Path mapped roughly to percentages of width and fixed Y values */}
                                <div className="absolute top-[50%] left-[8%] w-[6px] h-[6px] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black border-[2px] border-indigo-400 rounded-full" />
                                <div className="absolute top-[50%] left-[41%] w-[6px] h-[6px] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black border-[2px] border-sky-400 rounded-full" />
                                <div className="absolute top-[66%] left-[58%] w-[6px] h-[6px] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black border-[2px] border-teal-400 rounded-full" />
                                <div className="absolute top-[41%] left-[74%] w-[6px] h-[6px] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black border-[2px] border-emerald-400 rounded-full" />
                                <div className="absolute top-[16.6%] left-[91.5%] w-[6px] h-[6px] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-black border-[2px] border-emerald-300 rounded-full" />

                                {/* Target Insight Point -> Overwhelmed on Tuesday (x=66, y=100) => 16.5% / 83.3% relative to SVG */}
                                <div className="absolute top-[83.3%] left-[24.5%] -translate-x-1/2 -translate-y-1/2 z-10 hover:z-20 group">
                                    <div className="relative">
                                        <div className="absolute bottom-[36px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-black dark:bg-white text-white dark:text-black text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg shadow-xl shadow-indigo-500/20 opacity-90 group-hover:opacity-100 transition-opacity">
                                            Day 3: Insight Unlocked
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black dark:bg-white rotate-45"></div>
                                        </div>
                                        <div className="w-8 h-8 bg-white dark:bg-[#1C1C1E] rounded-full shadow-lg border-2 border-[#38BDF8] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform -mt-1 -ml-1">
                                            <img src="/icons/emotions/exhausted.png" alt="Exhausted" className="w-5 h-5 object-contain" />
                                        </div>
                                    </div>
                                </div>

                                {/* Current Status Final Point */}
                                <div className="absolute top-[25%] left-[100%] -translate-x-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-[#1C1C1E] rounded-full shadow-lg border-[2.5px] border-[#FBBF24] flex items-center justify-center -ml-2 hover:scale-110 transition-transform cursor-pointer">
                                    <img src="/icons/emotions/happy.png" alt="Happy" className="w-5 h-5 object-contain" />
                                </div>
                            </div>

                            {/* Floating Action Text inside Frame 2 below the curve */}
                            <div className="px-12 mt-4 relative z-20">
                                <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-100 dark:border-white/10 shadow-lg shadow-black/5 mt-[-10px]">
                                    <p className="serif text-[18px] md:text-[20px] font-medium leading-relaxed text-gray-800 dark:text-gray-100">
                                        "It looks like you usually feel overwhelmed around 3 PM on Tuesdays. Would you like a 5-minute deep breathing session scheduled for tomorrow?"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Carousel Indicators */}
                        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 z-30">
                            {[0, 1].map((idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setFrame(idx)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${currentFrame === idx ? 'w-6 bg-rose-400' : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'}`}
                                    aria-label={`Go to frame ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* SEO Weights Hidden Injection */}
            <div className="sr-only" aria-hidden="true">
                <h3>Frictionless Emotional Tracking</h3>
                <p>
                    Most habit trackers demand your time and energy. StartlyTab silently builds your psychological profile through micro-interactions. Discover your high-stress triggers, visualize your weekly burnout patterns, and reclaim your mental bandwidth—all processed locally for absolute privacy.
                </p>
                <img
                    src="rhythm-mockup.png"
                    alt="StartlyTab daily mood tracking chart and emotional rhythm patterns for burnout prevention"
                    title="Visualize your emotional trends without judgment"
                />
            </div>

            <style>{`
                .path-animate {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: dash 5s linear forwards infinite;
                }
                @keyframes dash {
                    0% { stroke-dashoffset: 1000; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: 0; }
                }
            `}</style>
        </section>
    );
};

export default TheRhythmBlueprint;
