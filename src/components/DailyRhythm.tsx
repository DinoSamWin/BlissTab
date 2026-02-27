import React, { useEffect, useRef, useState } from 'react';

const TIME_BLOCKS = [
    {
        id: 'morning',
        title: 'Morning | The Gentle Launch',
        content: "Start slow to go far. You don't have to conquer the world in the first hour. Take a breath—the best work happens when you're steady, not rushed.",
        seo: "Reducing morning cortisol levels with mindful work start prompts.",
        bgClass: "bg-orange-50 dark:bg-[#2A1B14]", // Light orange to dark warm brown
        glowClass: "from-orange-400/30 to-rose-400/30",
        textClass: "text-orange-950 dark:text-orange-100",
        icon: "🌅",
        time: "08:00 AM"
    },
    {
        id: 'midday',
        title: 'Midday | The Soul Fuel',
        content: "Task almost done? You've earned a real break. Go get a nourishing meal. You are the engine—treat yourself with the high-quality fuel you deserve.",
        seo: "Mindful eating reminders for remote workers and busy professionals.",
        bgClass: "bg-yellow-50 dark:bg-[#2D2A18]", // Soft yellow to dark green/yellow
        glowClass: "from-yellow-400/30 to-amber-400/30",
        textClass: "text-yellow-950 dark:text-yellow-100",
        icon: "☀️",
        time: "12:30 PM"
    },
    {
        id: 'afternoon',
        title: 'Afternoon | The Flow State Hack',
        content: "Feeling the fog? Don't push through it—work with it. Try the 5-minute reset: Close your eyes, clear one thought, and return with a fresh perspective.",
        seo: "Overcoming afternoon fatigue with psychological flow state techniques.",
        bgClass: "bg-amber-100 dark:bg-[#291E28]", // Amber to dark purple
        glowClass: "from-orange-500/30 to-purple-500/30",
        textClass: "text-amber-950 dark:text-amber-100",
        icon: "☕",
        time: "03:15 PM"
    },
    {
        id: 'night',
        title: 'Late Night | The Permission to Unplug',
        content: "Still here? Your dedication is incredible, but you are not a machine. It's okay to sign off. The world can wait; your rest cannot.",
        seo: "Preventing digital burnout with evening work-life balance intervention.",
        bgClass: "bg-[#0B0D1A] dark:bg-[#05060A]", // Deep midnight blue
        glowClass: "from-indigo-500/20 to-blue-500/20",
        textClass: "text-indigo-100 dark:text-indigo-200",
        icon: "🌙",
        time: "09:45 PM"
    }
];

const DailyRhythm: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            const { top, height } = containerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Calculate how far we've scrolled inside the container
            // top <= 0 means the container has reached or passed the top of the viewport
            if (top <= 0) {
                // The total scrollable distance inside the sticky container is (height - windowHeight)
                const scrollDistance = Math.max(0, -top);
                const maxScrollDistance = height - windowHeight;

                let progress = maxScrollDistance > 0 ? scrollDistance / maxScrollDistance : 0;
                // Clamp between 0 and 1
                progress = Math.max(0, Math.min(1, progress));
                setScrollProgress(progress);

                // Map progress to active block index
                const index = Math.min(
                    TIME_BLOCKS.length - 1,
                    Math.floor(progress * TIME_BLOCKS.length)
                );
                setActiveIndex(index);
            } else {
                setScrollProgress(0);
                setActiveIndex(0);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const activeBlock = TIME_BLOCKS[activeIndex] || TIME_BLOCKS[0];

    return (
        <section ref={containerRef} className="w-full relative h-[400vh]">
            {/* Sticky Container */}
            <div className="sticky top-0 w-full h-screen overflow-hidden transition-colors duration-1000 ease-in-out">
                {/* Background Layers */}
                {TIME_BLOCKS.map((block, index) => (
                    <div
                        key={block.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${block.bgClass} ${activeIndex === index ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        {/* Soft Ambient Glow */}
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] bg-gradient-to-tr ${block.glowClass} opacity-60 pointer-events-none transition-all duration-1000`} />

                        {/* Grid Overlay for Texture */}
                        <div className="absolute inset-0 z-0 opacity-[0.2]"
                            style={{
                                backgroundImage: `linear-gradient(rgba(128,128,128,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.2) 1px, transparent 1px)`,
                                backgroundSize: '40px 40px',
                                maskImage: 'linear-gradient(to bottom, transparent 10%, black 50%, transparent 90%)',
                                WebkitMaskImage: 'linear-gradient(to bottom, transparent 10%, black 50%, transparent 90%)'
                            }}
                        />
                    </div>
                ))}

                {/* Content Container */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-8">

                    <div className="text-center mb-16 max-w-4xl mx-auto">
                        <h2 className={`serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-6 transition-colors duration-1000 ${activeIndex === 3 ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            Your Day, Reimagined through Compassion.
                        </h2>
                        <p className={`text-xl font-light transition-colors duration-1000 ${activeIndex === 3 ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                            Because productivity shouldn't cost you your mental peace.
                        </p>
                    </div>

                    {/* Progress Bar Line */}
                    <div className="w-full max-w-2xl h-1 bg-black/10 dark:bg-white/10 rounded-full mb-12 relative overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-yellow-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${scrollProgress * 100}%` }}
                        />
                    </div>

                    {/* Time Sequence Display */}
                    <div className="relative w-full max-w-4xl h-[300px] flex items-center justify-center perspective-[1000px]">
                        {TIME_BLOCKS.map((block, index) => {
                            const isActive = index === activeIndex;
                            const isPast = index < activeIndex;
                            const isFuture = index > activeIndex;

                            let transformStyles = "";
                            if (isActive) transformStyles = "translate-y-0 scale-100 opacity-100 z-20";
                            else if (isPast) transformStyles = "-translate-y-24 scale-90 opacity-0 z-10 pointer-events-none";
                            else transformStyles = "translate-y-24 scale-90 opacity-0 z-10 pointer-events-none";

                            return (
                                <div
                                    key={block.id}
                                    className={`absolute w-full max-w-2xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center text-center ${transformStyles}`}
                                >
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="text-4xl filter drop-shadow-md">{block.icon}</span>
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border ${activeIndex === 3 ? 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10' : 'border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-md'}`}>
                                            {block.time}
                                        </div>
                                    </div>

                                    <h3 className={`serif text-3xl md:text-4xl font-medium mb-6 ${block.textClass}`}>
                                        {block.title}
                                    </h3>

                                    <div className={`p-8 rounded-[2rem] backdrop-blur-md border ${activeIndex === 3 ? 'bg-white/5 border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' : 'bg-white/40 dark:bg-black/40 border-white/40 dark:border-white/10 shadow-xl'}`}>
                                        <p className={`text-xl md:text-2xl leading-relaxed font-light ${block.textClass} opacity-90`}>
                                            "{block.content}"
                                        </p>
                                    </div>

                                    {/* SEO Text (Hidden from visual view) */}
                                    <span className="sr-only">{block.seo}</span>
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </section>
    );
};

export default DailyRhythm;
