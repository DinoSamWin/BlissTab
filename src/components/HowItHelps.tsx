import React, { useState, useEffect, useRef, useCallback } from 'react';

const AUTOPLAY_MS = 10000;

// ─── Tab meta ──────────────────────────────────────────────────────────────────
const TABS = [
    { id: 'cleaner', label: 'A Cleaner Starting Point',  panelId: 'reset-panel-cleaner', tabId: 'reset-tab-cleaner' },
    { id: 'noise',   label: 'A Small Reset in the Noise', panelId: 'reset-panel-noise',   tabId: 'reset-tab-noise'   },
    { id: 'yours',   label: 'Made to Feel Like Yours',    panelId: 'reset-panel-yours',   tabId: 'reset-tab-yours'   },
] as const;

// ─── Tab Icons (exact SVG paths from Figma) ────────────────────────────────────
// Tab 1: streamline-flex:soft-drink-can
const CanIcon = () => (
    <svg width="22" height="22" viewBox="0 0 27 27" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M5.72404 5.68928H19.9453M11.421 5.68928L8.55133 1.66821M8.8329 5.71242C7.51183 7.16271 5.31905 10.3371 5.22647 11.4981C5.09722 12.9875 5.02774 14.4814 5.01819 15.9763C5.01819 17.3263 5.08955 20.1767 5.18597 21.4804C5.40583 24.4118 7.5504 25.3376 10.2388 25.6307C11.0855 25.7233 11.9456 25.785 12.8154 25.785C13.6833 25.785 14.5434 25.7233 15.39 25.6307C18.0785 25.3376 20.223 24.4118 20.4429 21.4804C20.5393 20.1786 20.6126 17.3263 20.6126 15.9763C20.6031 14.4814 20.5336 12.9875 20.4043 11.4981C20.3117 10.3371 18.117 7.16271 16.796 5.71242" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12.8347 19.2356C15.0738 19.2356 16.3351 17.9762 16.3351 15.7352C16.3351 13.4942 15.0738 12.2349 12.8347 12.2349C10.5956 12.2349 9.33435 13.4961 9.33435 15.7371C9.33435 17.9781 10.5937 19.2375 12.8347 19.2375" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
// Tab 2: fluent:water-48-regular
const WaterIcon = () => (
    <svg width="22" height="22" viewBox="0 0 27 27" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M21.4678 5.22952C21.4165 5.09748 21.3264 4.98403 21.2095 4.90404C21.0926 4.82405 20.9542 4.78125 20.8125 4.78125C20.6708 4.78125 20.5325 4.82405 20.4155 4.90404C20.2986 4.98403 20.2085 5.09748 20.1572 5.22952C19.5216 6.86583 18.2959 7.58977 17.1563 7.58977C16.0166 7.58977 14.7909 6.86583 14.1553 5.23008C14.104 5.09804 14.0139 4.98459 13.897 4.9046C13.7801 4.82461 13.6417 4.78181 13.5 4.78181C13.3583 4.78181 13.22 4.82461 13.103 4.9046C12.9861 4.98459 12.896 5.09804 12.8447 5.23008C12.2091 6.86583 10.9834 7.59033 9.84375 7.59033C8.70413 7.59033 7.47844 6.86583 6.84282 5.23008C6.79146 5.09804 6.70142 4.98459 6.58449 4.9046C6.46755 4.82461 6.32918 4.78181 6.1875 4.78181C6.04583 4.78181 5.90745 4.82461 5.79052 4.9046C5.67358 4.98459 5.58354 5.09804 5.53219 5.23008C4.87575 6.92265 3.67031 7.59371 2.95313 7.59371C2.76665 7.59371 2.5878 7.66779 2.45594 7.79965C2.32408 7.93151 2.25 8.11035 2.25 8.29683C2.25 8.48331 2.32408 8.66215 2.45594 8.79402C2.5878 8.92588 2.76665 8.99996 2.95313 8.99996C4.08938 8.99996 5.3235 8.27546 6.19313 6.99015C7.10494 8.29796 8.44819 8.99658 9.84375 8.99658C11.2421 8.99658 12.5876 8.29514 13.5 6.98283C14.4124 8.29514 15.7579 8.99658 17.1563 8.99658C18.5518 8.99658 19.8956 8.29739 20.8074 6.98846C21.6765 8.27433 22.9106 8.99996 24.0469 8.99996C24.2334 8.99996 24.4122 8.92588 24.5441 8.79402C24.6759 8.66215 24.75 8.48331 24.75 8.29683C24.75 8.11035 24.6759 7.93151 24.5441 7.79965C24.4122 7.66779 24.2334 7.59371 24.0469 7.59371C23.3303 7.59371 22.1243 6.91983 21.4678 5.22952ZM20.8125 11.5312C21.1028 11.5312 21.3626 11.7095 21.4678 11.9795C22.1243 13.6698 23.3297 14.3437 24.0469 14.3437C24.2334 14.3437 24.4122 14.4178 24.5441 14.5496C24.6759 14.6815 24.75 14.8603 24.75 15.0468C24.75 15.2333 24.6759 15.4122 24.5441 15.544C24.4122 15.6759 24.2334 15.75 24.0469 15.75C22.9101 15.75 21.6765 15.0243 20.8074 13.739C19.8956 15.0474 18.5518 15.746 17.1568 15.7466C15.7579 15.7466 14.4124 15.0451 13.5 13.7328C12.5876 15.0451 11.2421 15.7466 9.84375 15.7466C8.44819 15.7466 7.10494 15.048 6.19313 13.7401C5.32294 15.0255 4.08938 15.75 2.95313 15.75C2.76665 15.75 2.5878 15.6759 2.45594 15.544C2.32408 15.4122 2.25 15.2333 2.25 15.0468C2.25 14.8603 2.32408 14.6815 2.45594 14.5496C2.5878 14.4178 2.76665 14.3437 2.95313 14.3437C3.67031 14.3437 4.87575 13.6721 5.53219 11.9806C5.58354 11.8486 5.67358 11.7352 5.79052 11.6552C5.90745 11.5752 6.04583 11.5324 6.1875 11.5324C6.32918 11.5324 6.46755 11.5752 6.58449 11.6552C6.70142 11.7352 6.79146 11.8486 6.84282 11.9806C7.47844 13.6158 8.70413 14.3403 9.84375 14.3403C10.9834 14.3403 12.2091 13.6158 12.8447 11.9801C12.896 11.848 12.9861 11.7346 13.103 11.6546C13.22 11.5746 13.3583 11.5318 13.5 11.5318C13.6417 11.5318 13.7801 11.5746 13.897 11.6546C14.0139 11.7346 14.104 11.848 14.1553 11.9801C14.7909 13.6158 16.0166 14.3403 17.1563 14.3403C18.2959 14.3403 19.5216 13.6158 20.1572 11.9795C20.2085 11.8475 20.2986 11.734 20.4155 11.654C20.5325 11.574 20.6708 11.5312 20.8125 11.5312ZM20.8125 18.2812C21.1028 18.2812 21.3626 18.4595 21.4678 18.7295C22.1243 20.4198 23.3297 21.0937 24.0469 21.0937C24.2334 21.0937 24.4122 21.1678 24.5441 21.2996C24.6759 21.4315 24.75 21.6103 24.75 21.7968C24.75 21.9833 24.6759 22.1621 24.5441 22.294C24.4122 22.4259 24.2334 22.5 24.0469 22.5C22.9101 22.5 21.6765 21.7743 20.8074 20.489C19.8956 21.7974 18.5518 22.496 17.1568 22.4966C15.7579 22.4966 14.4124 21.7951 13.5 20.4828C12.5876 21.7951 11.2421 22.4966 9.84375 22.4966C8.44819 22.4966 7.10494 21.7979 6.19313 20.4896C5.32294 21.776 4.08938 22.5 2.95313 22.5C2.76665 22.5 2.5878 22.4259 2.45594 22.294C2.32408 22.1621 2.25 21.9833 2.25 21.7968C2.25 21.6103 2.32408 21.4315 2.45594 21.2996C2.5878 21.1678 2.76665 21.0937 2.95313 21.0937C3.67031 21.0937 4.87575 20.4221 5.53219 18.7306C5.58354 18.5986 5.67358 18.4851 5.79052 18.4052C5.90745 18.3252 6.04583 18.2824 6.1875 18.2824C6.32918 18.2824 6.46755 18.3252 6.58449 18.4052C6.70142 18.4851 6.79146 18.5986 6.84282 18.7306C7.47844 20.3658 8.70413 21.0903 9.84375 21.0903C10.9834 21.0903 12.2091 20.3658 12.8447 18.7301C12.896 18.598 12.9861 18.4846 13.103 18.4046C13.22 18.3246 13.3583 18.2818 13.5 18.2818C13.6417 18.2818 13.7801 18.3246 13.897 18.4046C14.0139 18.4846 14.104 18.598 14.1553 18.7301C14.7909 20.3658 16.0166 21.0903 17.1563 21.0898C18.2959 21.0892 19.5216 20.3658 20.1572 18.7295C20.2085 18.5975 20.2986 18.484 20.4155 18.404C20.5325 18.324 20.6708 18.2812 20.8125 18.2812Z" fill="currentColor"/>
    </svg>
);
// Tab 3: heart + message bubble (Group 74)
const HeartChatIcon = () => (
    <svg width="22" height="22" viewBox="0 0 23 23" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M16.8053 10.2122C16.8053 9.42699 16.4934 8.67395 15.9382 8.11872C15.3829 7.5635 14.6299 7.25158 13.8447 7.25158C13.3344 7.25195 12.8328 7.38437 12.3888 7.63596C11.9448 7.88754 11.5734 8.24974 11.3108 8.68733C11.0481 8.24968 10.6767 7.88744 10.2326 7.63585C9.78851 7.38426 9.28686 7.25188 8.77645 7.25158C7.99124 7.25158 7.23819 7.5635 6.68297 8.11872C6.12774 8.67395 5.81582 9.42699 5.81582 10.2122C5.81582 10.5862 5.8882 10.9422 6.01454 11.2715C6.99346 14.0873 11.3108 17.1772 11.3108 17.1772C11.3108 17.1772 15.6281 14.0873 16.607 11.2715C16.7382 10.9337 16.8052 10.5745 16.8053 10.2122Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.5 0.923835C5.65908 0.923835 0.92396 5.65896 0.92396 11.4999C0.92396 13.5659 1.52557 15.4878 2.55021 17.1165L1.73217 21.2289L6.22921 20.6597C7.83109 21.587 9.64913 22.0755 11.5 22.076C17.341 22.076 22.0761 17.3408 22.0761 11.4999C22.0761 5.65896 17.341 0.923835 11.5 0.923835Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const TAB_ICONS = [CanIcon, WaterIcon, HeartChatIcon];

// ─── Mood chips (Panel 2) ──────────────────────────────────────────────────────
const MOODS = [
    { label: 'Morning',         icon: '☀️', active: false },
    { label: 'Afternoon Slump', icon: '☁️', active: false },
    { label: 'Work Stress',     icon: '💼', active: true  },
    { label: 'Late Night',      icon: '🌙', active: false },
] as const;

// ─── Checklist items (Panel 3) ─────────────────────────────────────────────────
const LIST_ITEMS = [
    'A practical tip for staying focused at work',
    'Tell me I am allowed to rest without guilt',
    'Say it like a clingy but sweet girlfriend',
    'Talk to me like you are gently fussing over me',
] as const;

const Tick = () => (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// ─── Panel captions ────────────────────────────────────────────────────────────
const CAPTIONS = [
    <>You don't open into a wall of tabs anymore. You open into something quieter, lighter, and easier to take in. <strong>So your day doesn't start with pressure.</strong></>,
    <>Instead of another tool asking for your attention, you see a few words that feel calm, familiar, and a little more human. <strong>Like someone quietly saying — it's okay, you can slow down for a second.</strong></>,
    <>Choose what you want to see — a calm thought, a light joke, or just a few gentle words. Set the tone, even the mood — whether it feels like a close friend. <strong>All it takes is a simple line.</strong></>,
] as const;

// ─── Panel 1 ── A Cleaner Starting Point ──────────────────────────────────────
const Panel1 = () => (
    <div className="relative rounded-[2rem] overflow-hidden shadow-2xl bg-white aspect-square">
        {/* Product screenshot — fills entire card */}
        <img
            src="/images/redesign/homepage-3-pic-1.webp"
            alt="StartlyTab cleaner new tab screen — a calm message and quick-access shortcuts"
            width={820}
            height={820}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Caption overlaid on the image, 40px from bottom (reduced from 50px) */}
        <div className="absolute w-full px-8 md:px-10" style={{ bottom: '40px' }}>
            <p className="text-[#0A0A0A] text-[14px] md:text-[15px] leading-[1.7]">
                You don't open into a wall of tabs anymore.<br />
                You open into something quieter, lighter, and easier to take in. 😊<br />
                <strong className="font-bold">So your day doesn't start with pressure.</strong>
            </p>
        </div>
    </div>
);

// ─── Panel 2 ── A Small Reset in the Noise ────────────────────────────────────
const Panel2 = () => (
    <div className="relative w-full aspect-square">
        {/* Layer 1: Background decoration (ARIA-hidden, empty alt) */}
        <img
            src="/images/redesign/homepage-moment-card-bg.webp"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain z-0 pointer-events-none"
            loading="lazy"
            decoding="async"
        />

        {/* Layer 2: Content overlay */}
        <div className="relative z-10 h-full flex flex-col p-[64px_36px_42px] md:p-[64px_48px_42px]">
            {/* Title - Real HTML for SEO */}
            <h3
                className="m-0 text-center text-[#0A0A0A] font-semibold text-[22px] md:text-[25px] leading-tight"
                style={{ fontFamily: "'Poltawski Nowy', serif" }}
            >
                Words that match the moment
            </h3>

            {/* Layer 3: Tabs Composite Image */}
            <img
                src="/images/redesign/homepage-moment-tabs-work-stress.webp"
                alt="StartlyTab moment tabs for morning, afternoon slump, work stress, and late night"
                className="block w-full h-auto mt-[28px] object-contain"
                loading="lazy"
                decoding="async"
                width={536}
                height={52}
            />

            {/* Layer 4: Message Card Composite Image */}
            <img
                src="/images/redesign/homepage-work-stress-message-card.webp"
                alt="StartlyTab calming message card for work stress"
                className="block w-full h-auto mt-[16px] object-contain"
                loading="lazy"
                decoding="async"
                width={536}
                height={290}
            />

            {/* Caption Text - Real HTML for SEO */}
            <div className="mt-[22px] px-2">
                <p className="text-[#353331] text-[15px] md:text-[16px] leading-relaxed font-medium">
                    Instead of another tool asking for your attention,<br className="hidden md:block" />
                    you see a few words that feel calm, familiar, and a little more human.
                </p>
                <p className="mt-3 text-[#353331] text-[15px] md:text-[16px] leading-relaxed">
                    <strong className="font-bold">
                        Like someone quietly saying — it’s okay, you can slow down for a second.
                    </strong>
                </p>
            </div>
        </div>
    </div>
);

// ─── Panel 3 ── Made to Feel Like Yours ───────────────────────────────────────
const Panel3 = () => (
    <div className="relative w-full aspect-square bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 p-[28px_32px_32px] md:p-[32px_40px_40px]">
            {/* Top: Input Area composite image */}
            <img
                src="/images/redesign/homepage-3-feel-yours-input.webp"
                alt="Custom message input in StartlyTab"
                className="block w-full h-auto object-contain"
                loading="lazy"
                decoding="async"
            />

            {/* Hint below input */}
            <p className="flex items-center gap-1.5 mt-2 text-[#4B4B4B] dark:text-gray-500 text-[11px] md:text-[12px] font-medium">
                <img src="/images/redesign/star3.webp" alt="" className="w-3 h-3 object-contain" aria-hidden="true" />
                Use any words you want — short or specific.
            </p>

            {/* Middle: Checklist (Real HTML) - Reduced margin */}
            <ul 
                className="mt-4 flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden bg-white"
                aria-label="Example personalized message styles"
            >
                {LIST_ITEMS.map((item, idx) => (
                    <li key={item} className="flex items-center gap-3 px-4 py-2.5 md:py-3 bg-white">
                        <span aria-hidden="true" className="w-[18px] h-[18px] rounded flex-shrink-0 bg-[#6466F1] flex items-center justify-center">
                            <Tick />
                        </span>
                        <span className="flex-1 text-[13px] md:text-[14px] text-[#070707] font-medium">{item}</span>
                        {/* Delete icon visual (gray cross placeholder) */}
                        <span aria-hidden="true" className="text-gray-300 text-lg leading-none select-none opacity-50">×</span>
                    </li>
                ))}
            </ul>

            {/* Preview Header - Reduced margin */}
            <div className="flex items-center gap-1.5 mt-4 mb-1.5">
                <img src="/images/redesign/star3.webp" alt="" className="w-3 h-3 object-contain" aria-hidden="true" />
                <span className="text-[10px] md:text-[11px] font-bold text-[#6466F1] uppercase tracking-widest">Preview</span>
            </div>

            {/* Bottom-ish: Preview Area composite image */}
            <img
                src="/images/redesign/homepage-3-feel-yours-preview.webp"
                alt="StartlyTab preview of a personalized gentle message"
                className="block w-full h-auto object-contain"
                loading="lazy"
                decoding="async"
            />

            {/* Caption Text (Real HTML) - Positioned up and aligned to content width */}
            <div className="mt-5 text-[#545454] dark:text-gray-400 text-[14px] md:text-[15px] leading-relaxed">
                <p>
                    Choose what you want to see — a calm thought, a random fact, a light joke, or just a few gentle words.
                    <br className="hidden md:block" />
                    Set the tone, even the mood — whether it feels like a close friend.
                </p>
                <p className="mt-2">
                    <strong className="font-bold text-[#0A0A0A]">All it takes is a simple line.</strong>
                </p>
            </div>
        </div>
    </div>
);

const PANELS = [Panel1, Panel2, Panel3];

// ─── Main Component ────────────────────────────────────────────────────────────
const HowItHelps: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % TABS.length);
        }, AUTOPLAY_MS);
    }, []);

    useEffect(() => {
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [startTimer]);

    const handleTabClick = (i: number) => { setActiveIndex(i); startTimer(); };

    const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
        let next: number | null = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { e.preventDefault(); next = (i + 1) % TABS.length; }
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    { e.preventDefault(); next = (i - 1 + TABS.length) % TABS.length; }
        if (next !== null) {
            setActiveIndex(next);
            startTimer();
            document.getElementById(TABS[next].tabId)?.focus();
        }
    };

    return (
        <section
            id="reset"
            aria-labelledby="reset-title"
            className="w-full relative pt-20 pb-20 md:pt-28 md:pb-32 overflow-hidden bg-white dark:bg-[#0A0A0E]"
        >
            {/* Background image from Figma (image 28) */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('/images/redesign/homepage-3-background.webp')` }}
            />

            <div className="max-w-[1120px] w-full mx-auto px-6 lg:px-12 relative z-10">
                {/*
                  Mobile reading order: eyebrow → h2 → subtitle → tabs → panel content
                  Desktop: left column (440px) | right column (flex-1)
                */}
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-11 xl:gap-16 items-start">

                    {/* ── Left column ────────────────────────────────────── */}
                    <div className="w-full lg:w-[352px] flex-shrink-0">

                        {/* Eyebrow pill — Figma: bg #EFEFFE, text #8A44F3, 20px */}
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{ background: '#EFEFFE' }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#8A44F3" aria-hidden="true">
                                <path d="M12 2c0 0-1 5.5-2 7S2 12 2 12s7.5 1 8 2.5S12 22 12 22s1-6 2-7.5S22 12 22 12s-7.5-1-8-2.5S12 2 12 2z"/>
                            </svg>
                            <p className="text-base font-normal" style={{ color: '#8A44F3' }}>
                                A calmer place to start
                            </p>
                        </div>

                        {/* h2 — Figma: Poltawski Nowy 57px fw=600 lineH=67.15px letterSpacing=0 */}
                        <h2
                            id="reset-title"
                            className="font-semibold text-[#000000] dark:text-white mb-6"
                            style={{
                                fontFamily: "'Poltawski Nowy', 'Instrument Serif', serif",
                                fontSize: 'clamp(1.75rem, 3.05vw, 2.85rem)',
                                lineHeight: '1.178',
                                letterSpacing: '0',
                            }}
                        >
                            How StartlyTab Helps You Reset
                        </h2>

                        {/* Subtitle — Reduced size by ~20% */}
                        <p className="text-[#545454] dark:text-gray-400 text-lg mb-8" style={{ lineHeight: '1.5', letterSpacing: '0' }}>
                            It softens the next moment through a cleaner screen, gentler words, and a space that feels more like your own.
                        </p>

                        {/* Tablist */}
                        <div
                            role="tablist"
                            aria-label="StartlyTab reset features"
                            className="flex flex-col gap-4"
                        >
                            {TABS.map((tab, index) => {
                                const isActive = activeIndex === index;
                                const Icon = TAB_ICONS[index];
                                return (
                                    <div key={tab.id}>
                                        {/* Tab button — Figma: 440×63px, fw=600, 24px */}
                                        <button
                                            type="button"
                                            role="tab"
                                            id={tab.tabId}
                                            aria-selected={isActive}
                                            aria-controls={tab.panelId}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => handleTabClick(index)}
                                            onKeyDown={e => handleKeyDown(e, index)}
                                            className={[
                                                'w-full flex items-center gap-3 px-4 h-[50px] rounded-xl text-left font-semibold text-xl',
                                                'transition-all duration-300 outline-none',
                                                'focus-visible:ring-2 focus-visible:ring-[#8A44F3] focus-visible:ring-offset-2',
                                                isActive
                                                    ? 'bg-[#131C21] text-white shadow-lg'
                                                    : 'bg-white dark:bg-white/5 text-[#131C21] dark:text-gray-200 shadow-sm',
                                            ].join(' ')}
                                            style={isActive ? {} : { border: '1px solid #F0F0F0' }}
                                        >
                                            <Icon />
                                            <span className="leading-tight">{tab.label}</span>
                                        </button>

                                        {/* Autoplay progress bar */}
                                        <div
                                            aria-hidden="true"
                                            className={`mx-5 h-[2px] rounded-full overflow-hidden transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                                            style={{ background: '#E8E8E8', marginTop: '-2px' }}
                                        >
                                            <div
                                                key={`${tab.id}-${activeIndex}`}
                                                className="h-full rounded-full"
                                                style={{
                                                    background: '#131C21',
                                                    animation: isActive ? `howItHelpsProgress ${AUTOPLAY_MS}ms linear forwards` : 'none',
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right column ─────────────────────────────────────
                      CSS Grid stacking: all 3 articles live in the same grid cell
                      so they all occupy identical space (no height differences).
                      Non-active panels hidden via opacity (SEO-safe, no display:none).
                    ────────────────────────────────────────────────────── */}
                    <div
                        className="flex-1 w-full"
                        style={{ display: 'grid', gridTemplateRows: '1fr', gridTemplateColumns: '1fr' }}
                    >
                        {TABS.map((tab, index) => {
                            const isActive = activeIndex === index;
                            const Panel = PANELS[index];
                            return (
                                <article
                                    key={tab.id}
                                    id={tab.panelId}
                                    role="tabpanel"
                                    aria-labelledby={tab.tabId}
                                    aria-hidden={!isActive}
                                    /*
                                     * All panels stay in DOM for SEO.
                                     * Grid area 1/1/2/2 means they all stack in the same cell.
                                     * Non-active: opacity-0, pointer-events-none (never display:none).
                                     */
                                    style={{ gridArea: '1 / 1 / 2 / 2' }}
                                    className={[
                                        'transition-all duration-500 ease-in-out',
                                        isActive
                                            ? 'opacity-100 translate-y-0 pointer-events-auto z-10'
                                            : 'opacity-0 translate-y-1 pointer-events-none z-0',
                                    ].join(' ')}
                                >
                                    <Panel />
                                </article>
                            );
                        })}
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes howItHelpsProgress {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
            `}</style>
        </section>
    );
};

export default HowItHelps;
