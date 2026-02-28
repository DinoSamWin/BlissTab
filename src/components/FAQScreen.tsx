import React, { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';

const FAQScreen: React.FC = () => {
    // 0 is the first item, default expanded
    const [openIndex, setOpenIndex] = useState<number>(0);

    const faqs = [
        {
            question: "Will this slow down my browser or add more friction to my day?",
            answer: "Not at all. StartlyTab is engineered to be incredibly lightweight and completely passive. There is no complicated setup or daily tasks to complete. It simply waits for you to open a tab, offering a moment of calm without disrupting your workflow."
        },
        {
            question: "Why invest in StartlyTab when other new tabs are free?",
            answer: "Most free tabs are either cluttered with ads or focus solely on making you work faster. StartlyTab is a dedicated emotional workspace. You are investing in a psychological buffer that tracks your burnout patterns, offering personalized micro-resets to keep your mind clear over the long term."
        },
        {
            question: "Can I still access my everyday bookmarks and shortcuts?",
            answer: "Yes. We believe in calm, not compromise. Your essential shortcuts and bookmarks are elegantly integrated, accessible with a single click, but quietly tucked away so they don't add to your visual noise."
        }
    ];

    const toggleFAQ = (index: number) => {
        setOpenIndex(index === openIndex ? -1 : index);
    };

    // Construct the JSON-LD schema for FAQPage
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <section className="w-full relative py-24 bg-[#FAFAFA] z-10 border-t border-gray-100">
            {/* Inject FAQ Schema for SEO */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 relative z-10">
                {/* Header Section */}
                <div className="text-center mb-20 animate-reveal">
                    <h2 className="serif text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight mb-6 font-medium tracking-tight">
                        The Gentle Ask <span className="italic text-gray-400 font-light">&</span> Clarity
                    </h2>
                    <p className="text-gray-500 text-lg md:text-xl font-light max-w-2xl mx-auto leading-relaxed">
                        Before you decide, let's clear your mind of any lingering doubts.
                    </p>
                </div>

                {/* Two-Column Layout */}
                <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start mb-32">

                    {/* Left Column: Image */}
                    <div className="flex-1 w-full rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-200/60 sticky top-24">
                        <img
                            src="https://images.unsplash.com/photo-1542435503-956c469947f6?q=80&w=1000&auto=format&fit=crop"
                            alt="A calm, minimalist workspace representing clarity and focus"
                            className="w-full h-[500px] object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out"
                        />
                    </div>

                    {/* Right Column: FAQ Accordion */}
                    <div className="flex-1 w-full">
                        <div className="space-y-4">
                            {faqs.map((faq, index) => {
                                const isOpen = index === openIndex;
                                return (
                                    <div
                                        key={index}
                                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen
                                                ? 'bg-white border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]'
                                                : 'bg-transparent border-transparent hover:bg-gray-50'
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleFAQ(index)}
                                            className="w-full flex items-center justify-between px-6 py-6 text-left focus:outline-none"
                                            aria-expanded={isOpen}
                                        >
                                            <span className={`text-lg md:text-xl font-medium pr-8 transition-colors ${isOpen ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {faq.question}
                                            </span>
                                            <span className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                                                <ChevronDown className={`w-6 h-6 ${isOpen ? 'text-gray-900' : 'text-gray-400'}`} />
                                            </span>
                                        </button>

                                        <div
                                            className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0 pb-0'
                                                } px-6`}
                                        >
                                            <p className="text-gray-500 font-light leading-relaxed text-[15px] md:text-base">
                                                {faq.answer}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* The Final Whisper (Bottom CTA Section) */}
                <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto pt-10 border-t border-gray-100 animate-reveal">

                    <p className="serif text-2xl md:text-3xl lg:text-4xl text-gray-800 leading-snug mb-12 font-light italic">
                        "You've scrolled to the end.<br />
                        Take a deep breath.<br />
                        Whenever you're ready, your new workspace is waiting."
                    </p>

                    <button
                        className="group relative px-10 py-5 bg-black text-white rounded-full font-bold uppercase tracking-[0.15em] text-sm shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.4)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 overflow-hidden"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        {/* Shine effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>

                        <span className="relative flex items-center gap-3">
                            Start My Mindful 7-Day Trial
                            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </span>
                    </button>

                    {/* Trust Micro-copy */}
                    <div className="mt-6 flex items-center justify-center gap-2 text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Secure payment via Stripe. Available on Google Chrome Web Store.</span>
                    </div>

                </div>
            </div>

            <style>{`
                @keyframes shine {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </section>
    );
};

export default FAQScreen;
