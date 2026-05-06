import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const PERSONAS = [
    {
        id: 'maya',
        name: 'Maya',
        role: 'Marketing Manager',
        image: '/images/redesign/Maya  Marketing Manager.webp',
        bgImage: '/images/redesign/homepage-2-pic-1.webp',
        mainQuote: 'Sometimes I open my laptop and the tabs alone make me tense.',
        subQuote: 'Too many tabs, too many unfinished things — and I haven\'t even started yet.',
        ctaText: 'When Too Many Tabs Feel Overwhelming',
        ctaLink: '/stories/maya-tab-overload-mental-buffer',
        gradient: 'linear-gradient(90deg, #AC6202 0%, #05040A 100%)',
        altDesc: 'Portrait of Maya, Marketing Manager',
    },
    {
        id: 'daniel',
        name: 'Daniel',
        role: 'Operations Lead',
        image: '/images/redesign/Daniel Operations Lead.webp',
        bgImage: '/images/redesign/homepage-2-pic-2.webp',
        mainQuote: 'One unfair comment from my manager can sit in my chest all day.',
        subQuote: 'I keep working, keep replying, keep acting normal — but part of me is still stuck in that moment.',
        ctaText: 'Everything Keeps Pulling Me Away',
        ctaLink: '/stories/daniel-workplace-frustration-emotional-buffer',
        gradient: 'linear-gradient(90deg, #976C47 0%, #4A3C2F 100%)',
        altDesc: 'Portrait of Daniel, Operations Lead',
    },
    {
        id: 'rachel',
        name: 'Rachel',
        role: 'Account Manager',
        image: '/images/redesign/Rachel Account Manager.webp',
        bgImage: '/images/redesign/homepage-2-pic-2.webp',
        mainQuote: 'It\'s Monday morning, and I already want to disappear for a while.',
        subQuote: 'I haven\'t even replied to anything yet, but the week already feels like it\'s sitting on top of me.',
        ctaText: 'Starting the Week Already Exhausted',
        ctaLink: '/stories/rachel-monday-blues-post-holiday-slump',
        gradient: 'linear-gradient(90deg, #163305 0%, #131C21 100%)',
        altDesc: 'Portrait of Rachel, Account Manager',
    },
    {
        id: 'lena',
        name: 'Lena',
        role: 'Project Manager',
        image: '/images/redesign/Lena Project Manager.webp',
        bgImage: '/images/redesign/homepage-2-pic-2.webp',
        mainQuote: 'By the time I finally pause, I feel like I\'ve been bracing all day.',
        subQuote: 'Messages, meetings, and small requests keep breaking the day apart until even opening my laptop again feels heavy.',
        ctaText: 'Busy All Day, No Time to Breathe',
        ctaLink: '/stories/lena-project-manager-fragmented-workday',
        gradient: 'linear-gradient(90deg, #163305 0%, #131C21 100%)',
        altDesc: 'Portrait of Lena, Project Manager',
    }
];

const FamiliarScenarios: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % PERSONAS.length);
        }, 10000);
    };

    useEffect(() => {
        startTimer();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleManualChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            setCurrentIndex((prev) => (prev - 1 + PERSONAS.length) % PERSONAS.length);
        } else {
            setCurrentIndex((prev) => (prev + 1) % PERSONAS.length);
        }
        startTimer();
    };

    const nextIndex = (currentIndex + 1) % PERSONAS.length;
    const nextPersona = PERSONAS[nextIndex];
    const currentPersona = PERSONAS[currentIndex];

    return (
        <section
            id="familiar"
            aria-labelledby="familiar-title"
            className="w-full relative pt-[50px] pb-10 md:pt-[82px] md:pb-12 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #f0fbff 0%, #e8f8f5 30%, #f8fffe 100%)' }}
        >
            {/* Section-level background decoration */}
            <div
                className="absolute inset-0 bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: `url('/images/redesign/homepage-2-background.webp')` }}
                aria-hidden="true"
            />

            <div className="max-w-[1228px] w-full mx-auto px-6 lg:px-12 relative z-10 flex flex-col">

                {/* ── Header ── */}
                <div className="relative mb-12 lg:mb-16 flex flex-col md:block">
                    <h2
                        id="familiar-title"
                        className="font-['Poltawski_Nowy',serif] font-medium"
                        style={{
                            fontSize: 'clamp(2.1rem, 3.6vw, 3.38rem)',
                            lineHeight: '1.178',
                            letterSpacing: '0',
                            background: 'linear-gradient(135deg, #005A75 0%, #00A5D7 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0px 0px 1.5px rgba(0, 0, 0, 0.08))'
                        }}
                    >
                        Does this feel <br className="hidden md:block" /> familiar?
                    </h2>
                    {/* Align left with 'f' in "feel" and top aligned with "familiar?". */}
                    <p className="hidden md:block absolute bottom-1 lg:bottom-2 md:left-[13rem] lg:left-[15rem] xl:left-[16rem] text-base xl:text-lg text-gray-600 dark:text-gray-400 font-light max-w-sm leading-relaxed">
                        Real workdays rarely feel organized. They feel crowded, noisy, and mentally unfinished.
                    </p>
                    <p className="md:hidden text-gray-600 dark:text-gray-400 text-lg font-light max-w-sm leading-relaxed mt-4">
                        Real workdays rarely feel organized. They feel crowded, noisy, and mentally unfinished.
                    </p>
                </div>

                {/* ── Main content area ── */}
                {/*
                    Design spec: 1387×677 px total area split left/right at ~50%.
                    Left = white card with text. Right = persona shaped photo area.
                    The homepage-2-pic-1/2 images (2774×1354, same 2:1 ratio) fill the RIGHT half
                    of this row as a positioned background. The persona photo sits on top.
                    The shaped bg image's RGBA transparency creates the "blob/irregular shape" frame.
                */}
                {/* ── Main content row ── */}
                <div className="relative flex flex-col lg:flex-row items-end gap-6 lg:gap-8">

                    {/* LEFT: homepage-2-pic-1/2 placed directly. */}
                    {/* No overflow-hidden so the wide image naturally extends underneath the right persona card. */}
                    {/* height: 570px matches right persona card. */}
                    <div className="flex-1 min-w-0 relative h-[428px] lg:h-[570px]">
                        {PERSONAS.map((persona, index) => {
                            const isActive = index === currentIndex;
                            return (
                                <div
                                    key={persona.id}
                                    className={`transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100 absolute inset-0 z-0' : 'opacity-0 absolute inset-0 -z-10 pointer-events-none'}`}
                                    aria-hidden={!isActive}
                                >
                                    {/* max-w-none is CRITICAL: it bypasses Tailwind's max-width: 100% so the image isn't compressed! */}
                                    <img
                                        src={persona.bgImage}
                                        alt=""
                                        aria-hidden="true"
                                        className="absolute top-0 left-0 max-w-none h-full w-auto block"
                                    />

                                    {/* Text overlaid absolutely on top of the image */}
                                    {/* Constrain width to 608px to align properly, CTA centered */}
                                    <div className="absolute top-0 left-0 w-full lg:max-w-[608px] h-full flex flex-col justify-between px-8 lg:px-14 py-10 lg:py-14 z-10">
                                        <div>
                                            <img
                                                src="/images/redesign/tabler_quote-filled.webp"
                                                alt="quote"
                                                className="w-7 h-7 md:w-9 md:h-9 mb-5 opacity-40"
                                            />
                                            <blockquote>
                                                <p
                                                    id={`story-title-${persona.id}`}
                                                    className="font-['Poltawski_Nowy',serif] text-[30px] md:text-[36px] lg:text-[42px] leading-tight tracking-normal font-medium mb-5"
                                                    style={{
                                                        background: persona.gradient,
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                    }}
                                                >
                                                    {persona.mainQuote}
                                                </p>
                                                <p className="text-[0.95rem] lg:text-base text-gray-500 dark:text-gray-400 font-light italic leading-relaxed">
                                                    {persona.subQuote}
                                                </p>
                                                <div className="mt-6 flex justify-end items-center gap-3 pr-2 lg:pr-8">
                                                    <span className="w-8 h-[2px] rounded-full opacity-70" style={{ background: persona.gradient }}></span>
                                                    <span className="font-['Poltawski_Nowy',serif] font-medium italic text-lg" style={{ background: persona.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                                        {persona.name}
                                                    </span>
                                                </div>
                                            </blockquote>
                                        </div>

                                        <div className="flex justify-center w-full">
                                            <Link
                                                to={persona.ctaLink}
                                                aria-label={persona.ctaText}
                                                className="inline-flex items-center justify-between gap-4 px-7 py-4 bg-[#111111] text-white rounded-full hover:bg-black transition-colors shadow-lg w-max group/cta mt-8"
                                            >
                                                <span className="text-[0.85rem] md:text-[0.95rem] font-bold tracking-wide">{persona.ctaText}</span>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transform group-hover/cta:translate-x-1 transition-transform flex-shrink-0">
                                                    <path d="M9 18l6-6-6-6" />
                                                </svg>
                                            </Link>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* RIGHT: Tall portrait pill persona card + controls — desktop only */}
                    <div className="hidden lg:flex flex-shrink-0 items-end gap-10 relative z-10 -ml-[6px] -top-10" style={{ width: '513px' }}>
                        {/* Persona photo — moved right (ml-11) to match the gap between personas */}
                        <div className="relative mb-4.5 ml-11" style={{ width: '290px', height: '478px' }}>
                            {PERSONAS.map((persona, index) => {
                                const isActive = index === currentIndex;
                                return (
                                    <figure
                                        key={persona.id}
                                        aria-labelledby={`story-title-${persona.id}`}
                                        aria-hidden={!isActive}
                                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out rounded-[12rem] overflow-hidden shadow-2xl ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                                    >
                                        <img
                                            src={persona.image}
                                            alt={persona.altDesc}
                                            loading="lazy"
                                            className="w-full h-full object-cover object-center"
                                        />
                                        {/* Bottom gradient for name readability */}
                                        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />
                                        <figcaption className="absolute bottom-10 left-0 w-full text-center z-10 flex flex-col">
                                            <strong className="text-white text-[1.75rem] font-medium serif tracking-wide mb-1">
                                                {persona.name}
                                            </strong>
                                            <span className="text-[#EAB308] text-xs font-bold tracking-[0.15em] uppercase">
                                                {persona.role}
                                            </span>
                                        </figcaption>
                                    </figure>
                                );
                            })}
                        </div>

                        {/* Controls + Next Preview column */}
                        <div className="flex flex-col items-center gap-6 pb-12 flex-shrink-0" style={{ width: '120px' }}>
                            <div className="flex gap-3" aria-label="Story carousel controls">
                                <button
                                    type="button"
                                    aria-label="Previous story"
                                    onClick={() => handleManualChange('prev')}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#111111] hover:bg-black transition-colors text-white shadow-lg"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next story"
                                    onClick={() => handleManualChange('next')}
                                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#111111] hover:bg-black transition-colors text-white shadow-lg"
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            </div>

                            {/* Preview image: Slightly wider, removed white border */}
                            <figure
                                className="w-[136px] h-[239px] rounded-[4.5rem] overflow-hidden shadow-2xl cursor-pointer hover:-translate-y-2 transition-transform duration-300"
                                onClick={() => handleManualChange('next')}
                                aria-hidden="true"
                            >
                                <img
                                    src={nextPersona.image}
                                    alt={`Preview of next story: ${nextPersona.name}`}
                                    loading="lazy"
                                    className="w-full h-full object-cover object-center"
                                />
                            </figure>
                        </div>
                    </div>

                    {/* Mobile: stacked layout */}
                    <div className="lg:hidden w-full">
                        <div className="relative w-full rounded-[2.5rem] overflow-hidden" style={{ height: '400px' }}>
                            {PERSONAS.map((persona, index) => {
                                const isActive = index === currentIndex;
                                return (
                                    <figure
                                        key={`mobile-${persona.id}`}
                                        aria-hidden={!isActive}
                                        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                                    >
                                        <img src={persona.image} alt={persona.altDesc} loading="lazy" className="w-full h-full object-cover object-center" />
                                        <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black/85 to-transparent" />
                                        <figcaption className="absolute bottom-8 left-0 w-full text-center z-10 flex flex-col">
                                            <strong className="text-white text-2xl font-medium serif tracking-wide mb-0.5">{persona.name}</strong>
                                            <span className="text-[#EAB308] text-xs font-bold tracking-[0.15em] uppercase">{persona.role}</span>
                                        </figcaption>
                                    </figure>
                                );
                            })}
                        </div>
                        <div className="flex justify-center gap-4 mt-6" aria-label="Story carousel controls">
                            <button type="button" aria-label="Previous story" onClick={() => handleManualChange('prev')} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#111111] text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            <button type="button" aria-label="Next story" onClick={() => handleManualChange('next')} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#111111] text-white">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default FamiliarScenarios;
