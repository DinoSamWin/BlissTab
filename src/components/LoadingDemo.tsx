import React, { useState, useRef, useEffect } from 'react';

// --- Variant A: Shimmering Text ---
const ShimmerText: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-950 rounded-2xl w-full h-80 relative overflow-hidden transition-colors" role="status">
            <style>{`
        @keyframes shimmer-slide {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(150%); }
        }
        .shimmer-mask {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg, 
            transparent 0%, 
            rgba(255,255,255,0.8) 50%, 
            transparent 100%
          );
          opacity: 0.6;
          transform: skewX(-20deg) translateX(-150%);
          animation: shimmer-slide 2s infinite ease-in-out; 
          pointer-events: none;
        }
        .dark .shimmer-mask {
           background: linear-gradient(
            90deg, 
            transparent 0%, 
            rgba(255,255,255,0.1) 50%, 
            transparent 100%
          );
        }
      `}</style>

            <div className="relative">
                <div className="text-2xl font-light tracking-[0.2em] text-gray-400 dark:text-gray-500 font-sans">
                    REFLECTING...
                </div>
                <div
                    className="absolute inset-0 text-2xl font-light tracking-[0.2em] font-sans text-transparent bg-gradient-to-r from-transparent via-gray-800 to-transparent dark:via-gray-200 bg-clip-text"
                    style={{
                        backgroundSize: '200% 100%',
                        animation: 'text-shimmer 2s infinite linear'
                    }}
                >
                    REFLECTING...
                </div>
                <style>{`
            @keyframes text-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
          `}</style>
            </div>

            <p className="mt-20 text-xs text-gray-400 font-light tracking-wide uppercase opacity-60">
                Variant A: Breathing Light
            </p>
        </div>
    );
};

// --- Variant B: Liquid Thought (CSS) ---
const LiquidThought: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-950 rounded-2xl w-full h-80 relative transition-colors overflow-hidden">
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix
                            in="blur"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                            result="goo"
                        />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <style>{`
        @keyframes blob-move-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes blob-move-2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-30px, 50px) scale(0.9); }
            66% { transform: translate(20px, -20px) scale(1.1); }
        }
        @keyframes blob-move-3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(20px, 30px) scale(1.2); }
            66% { transform: translate(-40px, -10px) scale(0.8); }
        }
        .liquid-container {
            filter: url(#goo);
            width: 200px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        .blob {
            position: absolute;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 50%;
            opacity: 0.8;
        }
        .dark .blob {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
             opacity: 0.6;
        }
        .ai-core {
             background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0));
             mix-blend-mode: overlay;
        }
      `}</style>

            <div className="relative mb-6">
                <div className="liquid-container">
                    <div className="blob w-20 h-20 bg-indigo-500" style={{ animation: 'blob-move-1 5s infinite ease-in-out' }}></div>
                    <div className="blob w-24 h-24 bg-purple-500 dark:bg-blue-500" style={{ animation: 'blob-move-2 6s infinite ease-in-out', animationDelay: '-1.5s' }}></div>
                    <div className="blob w-16 h-16 bg-amber-400 dark:bg-amber-500" style={{ animation: 'blob-move-3 5.5s infinite ease-in-out', animationDelay: '-3s' }}></div>
                    <div className="blob w-12 h-12 bg-white/90 dark:bg-white/80 blur-[2px] z-10 ai-core" itemID=''></div>
                </div>
            </div>

            <div className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 font-medium tracking-widest uppercase animate-pulse">
                Reflecting
            </div>

            <p className="mt-8 text-xs text-gray-400 font-light tracking-wide uppercase opacity-60">
                Variant B: Liquid Thought
            </p>
        </div>
    )
}

// --- Variant E: Particle Wind (Text-to-Text) ---
const ParticleMorph: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // High DPI setup
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        // Configuration
        const fontSize = 80;
        const fontFamily = '"Zain", sans-serif';
        const particleSize = 1.2; // Very fine particles
        const particleGap = 3;    // Density

        const isDark = document.documentElement.classList.contains('dark');
        const particleColor = isDark ? '#ffffff' : '#1a1a1a';

        interface Point {
            x: number;
            y: number;
        }

        interface Particle {
            x: number;
            y: number;
            targetX: number;
            targetY: number;
            vx: number;
            vy: number;
            size: number;
            alpha: number;
            locked: boolean; // If true, stays at target
            delay: number;   // For staggering effects
        }

        // Helper to get pixel coordinates of text
        const getTextCoordinates = (text: string): Point[] => {
            const hiddenCanvas = document.createElement('canvas');
            hiddenCanvas.width = width;
            hiddenCanvas.height = height;
            const hCtx = hiddenCanvas.getContext('2d');
            if (!hCtx) return [];

            hCtx.font = `800 ${fontSize}px ${fontFamily}`; // Extra Bold for logo feel
            hCtx.textAlign = 'center';
            hCtx.textBaseline = 'middle';
            hCtx.fillStyle = 'white';
            hCtx.fillText(text, width / 2, height / 2);

            const imageData = hCtx.getImageData(0, 0, width, height);
            const { data } = imageData;
            const points: Point[] = [];

            for (let y = 0; y < height; y += particleGap) {
                for (let x = 0; x < width; x += particleGap) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha > 200) { // Only high opacity pixels for sharpness
                        points.push({ x, y });
                    }
                }
            }
            return points;
        };

        const pointsA = getTextCoordinates('Loading...');
        const pointsB = getTextCoordinates('StartlyTab');

        // Initialize with A
        let particles: Particle[] = pointsA.map(p => ({
            x: p.x,
            y: p.y,
            targetX: p.x,
            targetY: p.y,
            vx: 0,
            vy: 0,
            size: Math.random() * 0.5 + particleSize, // Slight size variation
            alpha: 1,
            locked: true,
            delay: Math.random() * 50 // Random delay for "wind peeling" effect
        }));

        let animationFrameId: number;
        let phase = 'HOLD_A'; // HOLD_A -> BLOW_AWAY -> REASSEMBLE -> HOLD_B -> RESET
        let timer = 0;

        const update = () => {
            ctx.clearRect(0, 0, width, height);
            timer++;

            // Phase Management
            if (phase === 'HOLD_A') {
                if (timer > 60) { // 1s hold
                    phase = 'BLOW_AWAY';
                    timer = 0;
                    // Unlock all
                    particles.forEach(p => {
                        p.locked = false;
                        // Initial disperse velocity (Wind blowing Right and slightly Up)
                        p.vx = (Math.random() * 2) + 2;
                        p.vy = (Math.random() - 0.5) * 4 - 1;
                    });
                }
            } else if (phase === 'BLOW_AWAY') {
                // Particles are flying away
                if (timer > 80) {
                    phase = 'REASSEMBLE';
                    timer = 0;

                    // Remap particles to Target B
                    // We need to handle count mismatch
                    const targetPoints = pointsB;

                    // Shuffle current particles to random targets in B for "reassembling from chaos"
                    // Or keep some spatial coherence? Random looks more "magical".

                    // Adjust particle count
                    if (particles.length < targetPoints.length) {
                        // Add needed particles (spawn offscreen)
                        const needed = targetPoints.length - particles.length;
                        for (let i = 0; i < needed; i++) {
                            particles.push({
                                x: -100, // Spawn from left (wind source)
                                y: Math.random() * height,
                                targetX: targetPoints[particles.length + i].x, // Temporarily incorrect index, will fix in loop below
                                targetY: targetPoints[particles.length + i].y,
                                vx: (Math.random() * 5) + 5,
                                vy: 0,
                                size: Math.random() * 0.5 + particleSize,
                                alpha: 0,
                                locked: false,
                                delay: Math.random() * 30
                            });
                        }
                    }

                    // Assign targets
                    // We shuffle the assignment so it doesn't look like distinct lines moving
                    const shakenIndices = Array.from({ length: targetPoints.length }, (_, i) => i).sort(() => Math.random() - 0.5);

                    particles.forEach((p, i) => {
                        if (i < targetPoints.length) {
                            const target = targetPoints[shakenIndices[i]];
                            p.targetX = target.x;
                            p.targetY = target.y;
                            p.locked = false;
                        } else {
                            // Excess particles fly away
                            p.targetX = width + 100;
                            p.targetY = p.y + (Math.random() - 0.5) * 50;
                            p.locked = false;
                        }
                    });
                }
            } else if (phase === 'REASSEMBLE') {
                if (timer > 100) {
                    phase = 'HOLD_B';
                    timer = 0;
                }
            } else if (phase === 'HOLD_B') {
                if (timer > 80) {
                    phase = 'RESET';
                    timer = 0;
                    // Reset to A
                    // Similar logic to BLOW_AWAY but to A
                    const targetPoints = pointsA;
                    // const shakenIndices = Array.from({length: targetPoints.length}, (_, i) => i).sort(() => Math.random() - 0.5);

                    particles.forEach((p, i) => {
                        if (i < targetPoints.length) {
                            // Teleport some? No, fly them.
                            // Actually, let's just blow B away first?
                            // User wants Loop. Let's blow B away then reform A.
                            p.locked = false;
                            p.vx = (Math.random() * 2) + 2;
                            p.vy = (Math.random() - 0.5) * 4 - 1;
                        }
                    });
                }
            } else if (phase === 'RESET') {
                if (timer > 60) { // Wait for blow away
                    phase = 'REFORM_A';
                    timer = 0;

                    const targetPoints = pointsA;
                    const shakenIndices = Array.from({ length: targetPoints.length }, (_, i) => i).sort(() => Math.random() - 0.5);

                    // Adjust count again
                    if (particles.length < targetPoints.length) {
                        const needed = targetPoints.length - particles.length;
                        for (let i = 0; i < needed; i++) {
                            particles.push({
                                x: -100,
                                y: Math.random() * height,
                                targetX: 0, targetY: 0, // Set later
                                vx: 5, vy: 0,
                                size: particleSize,
                                alpha: 0, locked: false, delay: 0
                            });
                        }
                    }

                    particles.forEach((p, i) => {
                        if (i < targetPoints.length) {
                            const target = targetPoints[shakenIndices[i]];
                            p.targetX = target.x;
                            p.targetY = target.y;
                            p.locked = false;
                        } else {
                            p.targetX = width + 200;
                            p.targetY = p.y;
                        }
                    });
                }
            } else if (phase === 'REFORM_A') {
                if (timer > 100) {
                    phase = 'HOLD_A';
                    timer = 0;
                }
            }

            // Physics Update
            particles.forEach(p => {
                if (phase === 'BLOW_AWAY' || (phase === 'RESET' && timer <= 60)) {
                    // Wind Physics
                    // Add turbulence noise
                    const noise = Math.sin(p.y * 0.05 + timer * 0.1) * 0.5;
                    p.x += p.vx + noise;
                    p.y += p.vy;
                    p.vx *= 1.02; // Accelerate
                    p.alpha -= 0.02; // Fade out as they fly
                    if (p.alpha < 0) p.alpha = 0;
                } else if (phase === 'REASSEMBLE' || phase === 'REFORM_A') {
                    // Seek Physics (Spring)
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 1) {
                        p.x = p.targetX;
                        p.y = p.targetY;
                        p.locked = true;
                    } else {
                        // Ease in
                        p.x += dx * 0.1;
                        p.y += dy * 0.1;
                    }

                    // Fade In
                    if (p.alpha < 1) p.alpha += 0.05;
                }

                // Draw
                if (p.alpha > 0.01) {
                    ctx.globalAlpha = p.alpha;
                    ctx.fillStyle = particleColor;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1;

            animationFrameId = requestAnimationFrame(update);
        };

        const t = setTimeout(update, 100);

        return () => {
            clearTimeout(t);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-gray-950 rounded-2xl w-full h-80 relative transition-colors overflow-hidden">
            {/* Font loader trick - ensure Zain is loaded */}
            <div className="absolute opacity-0 font-bold" style={{ fontFamily: '"Zain", sans-serif' }}>
                Loading... StartlyTab
            </div>

            <div className="relative w-full h-48 flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                />
            </div>

            <p className="mt-8 text-xs text-gray-400 font-light tracking-wide uppercase opacity-60">
                Variant E: Wind Particle Morph
            </p>
        </div>
    );
};


const LoadingDemo: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'A' | 'B' | 'E'>('E');

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Loading Effect Concepts</h1>
            <p className="mb-8 text-gray-500 dark:text-gray-400">Select a variation below to preview</p>

            <div className="w-full max-w-md shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                {activeTab === 'A' && <ShimmerText />}
                {activeTab === 'B' && <LiquidThought />}
                {activeTab === 'E' && <ParticleMorph />}
            </div>

            <div className="flex gap-4 mt-8 flex-wrap justify-center">
                <button
                    onClick={() => setActiveTab('A')}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'A'
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105'
                        }`}
                >
                    Simple
                </button>
                <button
                    onClick={() => setActiveTab('B')}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'B'
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105'
                        }`}
                >
                    Liquid
                </button>
                <button
                    onClick={() => setActiveTab('E')}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'E'
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg scale-105'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-105'
                        }`}
                >
                    Particles
                </button>
            </div>

            <div className="mt-12 text-center max-w-lg text-sm text-gray-500 space-y-2">
                <p><strong>Simple</strong> — Minimalist text with a shimmering focus.</p>
                <p><strong>Liquid</strong> — Fluid morphing blobs (CSS Filters).</p>
                <p><strong>Particles</strong> — Text dissolving into wind and reassembling.</p>
            </div>

            <a href="/" className="mt-8 text-sm text-gray-400 hover:text-gray-900 dark:hover:text-white underline underline-offset-4">
                Back to Home
            </a>
        </div>
    );
};

export default LoadingDemo;
