import React, { useState, useEffect } from 'react';

const SUGGESTED_INPUTS = [
    "My manager needs everything 'EOD'...",
    "Another meeting that could've been an email.",
    "They rejected my PTO.",
    "Corporate synergy is a myth."
];

const PREDEFINED_RESPONSES: Record<string, string> = {
    "My manager needs everything 'EOD'...": "Their lack of planning is not your emergency. Do what you can, then close the laptop. The sun will still rise tomorrow.",
    "Another meeting that could've been an email.": "You endured 45 minutes of someone reading a PowerPoint. You are a survivor. Now go mute Slack for an hour.",
    "They rejected my PTO.": "Remember: PTO is part of your compensation, not a favor they grant. Take your break when you need it, legally or mentally.",
    "Corporate synergy is a myth.": "Synergy is just a fancy word for 'we want you to do two jobs'. Stick to your boundaries, you're doing great.",
    "default": "Take a deep breath. Their chaos does not define your worth. You are allowed to disconnect, care less, and prioritize your own peace right now."
};

const VentingModePromo: React.FC = () => {
    const [inputValue, setInputValue] = useState("");
    const [response, setResponse] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Focus effect for input ring
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        setIsGenerating(true);
        setResponse(null);

        // Simulate API call/processing time
        setTimeout(() => {
            const foundResponse = PREDEFINED_RESPONSES[inputValue];
            setResponse(foundResponse || PREDEFINED_RESPONSES["default"]);
            setIsGenerating(false);
        }, 1200);
    };

    const handleSuggestionClick = (text: string) => {
        setInputValue(text);
        // Don't auto-submit so they feel they are doing it, but maybe slight delay then focus
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <section className="w-full relative py-24 md:py-32 bg-[#FAFAFA] dark:bg-[#0A0A0B] overflow-hidden border-t border-black/5 dark:border-white/5">
            {/* Decorative Background blur */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 dark:bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-7xl mx-auto px-8 lg:px-12 relative z-10 flex flex-col items-center">

                <div className="text-center max-w-3xl mx-auto mb-16 animate-reveal">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-widest mb-6">
                        Customizable Affirmations
                    </span>
                    <h2 className="serif text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-gray-900 dark:text-white mb-6">
                        Your Sanctuary. Your Rules. <br />
                        <span className="italic text-gray-500 dark:text-gray-400 text-3xl md:text-4xl">(Even the spicy ones)</span>
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 font-light leading-relaxed">
                        Tired of corporate jargon? Sick of leaders who overpromise and underdeliver? Custom-tune your StartlyTab to say exactly what you need to hear. Whether it's a gentle hug or a sharp reality check against "toxic managers," we've got your back.
                    </p>
                </div>

                {/* Interactive "Venting" Mockup */}
                <div className="w-full max-w-4xl bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 md:p-12 shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-black/5 dark:border-white/10 relative overflow-hidden">

                    {/* Subtle Inner glow for the terminal look */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

                        {/* Left: Input Area */}
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">
                                Try the Venting Mode:
                            </h3>

                            <form onSubmit={handleSubmit} className="relative mb-6">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="If your manager is annoying, type it here..."
                                    className="w-full bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isGenerating}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </form>

                            <div className="flex flex-wrap gap-2">
                                {SUGGESTED_INPUTS.map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 rounded-lg transition-colors border border-black/5 dark:border-white/5"
                                    >
                                        "{suggestion}"
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right: Mock StartlyTab Response Area */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>
                            <div className="bg-[#F8F9FF] dark:bg-[#15161C] border border-indigo-100 dark:border-indigo-500/20 rounded-3xl p-8 min-h-[220px] flex flex-col items-center justify-center text-center relative z-10 shadow-lg">

                                {isGenerating ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                                        <span className="text-xs font-bold tracking-widest text-indigo-500 uppercase">Consulting your Sanctuary...</span>
                                    </div>
                                ) : response ? (
                                    <div className="animate-reveal">
                                        <span className="text-3xl mb-4 block">✨</span>
                                        <h4 className="serif text-2xl md:text-3xl font-medium text-gray-900 dark:text-indigo-50 leading-snug">
                                            "{response}"
                                        </h4>
                                        <button className="mt-8 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 mx-auto">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                            Share this Vibe
                                        </button>
                                    </div>
                                ) : (
                                    <div className="opacity-50 flex flex-col items-center">
                                        <span className="text-3xl mb-4 opacity-50 grayscale">💭</span>
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">Your customized perspective will appear here.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Hidden SEO Text */}
                <span className="sr-only">anti-toxic workplace tools, personalized AI prompts, maintain your mental clarity, prioritize your well-being</span>
            </div>
        </section>
    );
};

export default VentingModePromo;
