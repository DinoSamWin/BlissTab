import React, { useState, useEffect } from 'react';

const SUGGESTED_INPUTS = [
    "My manager needs everything 'EOD'...",
    "Another meeting that could've been an email.",
    "They rejected my PTO.",
    "Corporate synergy is a myth."
];

const PREDEFINED_RESPONSES: Record<string, string[]> = {
    "My manager needs everything 'EOD'...": [
        "'EOD' is just a suggestion when the request was made at 4:30 PM. Close the laptop.",
        "Artificial urgency is their lack of planning, not your emergency. Breathe.",
        "The world won't end if that spreadsheet is sent tomorrow at 9 AM. Go home.",
        "Unless you're performing open-heart surgery, it can wait until tomorrow.",
        "Friendly reminder: Your salary covers your hours, not your sanity. Log off.",
        "Plot twist: They won't even read it until next Tuesday. Save your evening.",
        "Repeat after me: I am a human being, not a vending machine for deliverables.",
        "Let them experience the consequences of their own poor time management.",
        "'End of Day' means the end of your day. You are off the clock.",
        "You've done enough. Mute Slack and go touch some grass."
    ],
    "Another meeting that could've been an email.": [
        "You survived 45 minutes of someone reading a PowerPoint. You are a warrior. Now, go on DND.",
        "That meeting was a masterclass in saying nothing. Reclaim your focus.",
        "Block your calendar for the rest of the day. Call it 'Deep Work.' You earned it.",
        "Mentally refund yourself that hour. Take a real break before your next task.",
        "The 'Leave Meeting' button is the highest form of self-care right now.",
        "If they schedule another sync to align on the alignment, we riot. Breathe in, breathe out.",
        "Your time is valuable, even if their agenda wasn't. Reset your rhythm.",
        "Fun fact: 90% of Zoom calls are just podcasts you have to look attentive for. Relax your shoulders.",
        "Close the tab. Shake off the corporate jargon. Find your actual flow.",
        "You are officially pardoned from pretending to take notes. Go get a coffee."
    ],
    "They rejected my PTO.": [
        "PTO is part of your compensation, not a favor they grant. Take your break mentally today.",
        "A company that denies your rest doesn't deserve your burnout. Work your wage today.",
        "Rejected PTO just means 'Actively Quiet Quitting for the next 48 hours'.",
        "Your well-being doesn't need a manager's approval. Be incredibly gentle with yourself today.",
        "They can reject the dates, but they can't reject your boundaries. Log off exactly at 5.",
        "Reminder: The company will survive without you, but you need you. Don't push hard today.",
        "Time to switch to 'Low Power Mode'. Only do the bare minimum until you get your time off.",
        "Denying rest is a red flag. Update your resume, but first, take a long lunch.",
        "You don't owe them 110% when they won't even give you 0% time off. Deep breaths.",
        "If they won't let you recharge on a beach, recharge right here at your desk. Do nothing for 10 minutes."
    ],
    "Corporate synergy is a myth.": [
        "'Synergy' is just a fancy word for 'we want you to do two jobs'. Stick to your boundaries.",
        "Let's 'circle back' to the fact that you need a nap. Ignore the jargon.",
        "The only 'alignment' you need right now is your spine against a comfortable chair.",
        "If someone says 'move the needle' one more time... take a deep breath. You are doing great.",
        "You are a person, not a 'resource' or 'human capital'. Protect your peace.",
        "Let's 'take this offline'—permanently. Go get a glass of water.",
        "We've reached maximum 'bandwidth' for corporate buzzwords today. Mute notifications.",
        "There is no synergy, only caffeine and willpower. Refine the former, rest the latter.",
        "Translate 'we're a family' to 'we lack boundaries.' Keep your armor on, but relax your jaw.",
        "Today's KPI: Keeping your sanity intact. You're exceeding expectations."
    ],
    "default": [
        "Take a deep breath. Their chaos does not define your worth.",
        "You are allowed to disconnect, care less, and prioritize your own peace right now.",
        "Gentle reminder: You are not a machine. You are a human being who needs rest."
    ]
};

interface VentingModePromoProps {
    onRequireLogin?: () => void;
}

const VentingModePromo: React.FC<VentingModePromoProps> = ({ onRequireLogin }) => {
    const [inputValue, setInputValue] = useState("");
    const [customInputCount, setCustomInputCount] = useState(0);
    const [response, setResponse] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Focus effect for input ring
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput) return;

        const isSuggested = SUGGESTED_INPUTS.includes(trimmedInput);

        // If it's a custom input and they already used their free try, prompt login
        if (!isSuggested && customInputCount >= 1) {
            onRequireLogin?.();
            return;
        }

        setIsGenerating(true);
        setResponse(null);

        if (isSuggested) {
            // Predefined Logic
            setTimeout(() => {
                const options = PREDEFINED_RESPONSES[trimmedInput] || PREDEFINED_RESPONSES["default"];
                const randomIndex = Math.floor(Math.random() * options.length);
                setResponse(options[randomIndex]);
                setIsGenerating(false);
            }, 1200);
        } else {
            // Custom Input - Call DeepSeek
            try {
                const deepseekKey = (import.meta.env as any)?.VITE_DEEPSEEK_API_KEY || (import.meta.env as any)?.VITE_SILICONFLOW_API_KEY || (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY;

                let apiBase = 'https://api.deepseek.com';
                let model = 'deepseek-chat';

                if (!deepseekKey && (import.meta.env as any)?.VITE_SILICONFLOW_API_KEY) {
                    apiBase = 'https://api.siliconflow.cn/v1';
                    model = 'deepseek-ai/DeepSeek-V3';
                } else if (!deepseekKey && (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY) {
                    apiBase = 'https://open.bigmodel.cn/api/paas/v4';
                    model = 'glm-4-flash';
                }

                if (!deepseekKey) throw new Error("No API key available");

                const res = await fetch(`${apiBase}/chat/completions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekKey}` },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: 'You are a highly empathetic, concise anti-anxiety buddy. The user is venting about work or life. Reply in 1 or 2 short sentences. Be validating, somewhat witty, and encourage them to take a break or let it go. DO NOT give generic advice. Keep it under 25 words. Reply in the same language the user uses.' },
                            { role: 'user', content: trimmedInput }
                        ]
                    })
                });

                if (!res.ok) throw new Error("API error");
                const data = await res.json();
                setResponse(data.choices?.[0]?.message?.content || PREDEFINED_RESPONSES["default"][0]);
                setCustomInputCount(prev => prev + 1);
            } catch (e) {
                console.error("Venting mode API error:", e);
                setResponse(PREDEFINED_RESPONSES["default"][0]);
            } finally {
                setIsGenerating(false);
            }
        }
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
                                    <div className="flex flex-col items-center animate-reveal">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-6 shadow-inner border border-indigo-100 dark:border-indigo-500/20">
                                            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <h4 className="serif text-xl md:text-2xl font-medium text-gray-800 dark:text-gray-200 mb-2">
                                            Ready when you are
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[250px]">
                                            Type what's bothering you or select a scenario to get your customized response.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Hidden SEO Text - High Performance Anti-Burnout Keywords */}
                <div className="sr-only" aria-hidden="true">
                    <h3>Anti-Burnout Corporate Affirmations and Workplace Boundary Tools</h3>
                    <p>Stop burnout and toxic workplace culture with StartlyTab. Deals with artificial urgency, unnecessary meetings, rejected PTO anxiety, and corporate jargon.</p>

                    <h4>Dealing with toxic workplace culture & manager EOD requests</h4>
                    <ul>
                        {PREDEFINED_RESPONSES["My manager needs everything 'EOD'..."].map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <h4>Stopping unnecessary meetings & corporate sync fatigue</h4>
                    <ul>
                        {PREDEFINED_RESPONSES["Another meeting that could've been an email."].map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <h4>How to cope with rejected PTO & toxic PTO policy</h4>
                    <ul>
                        {PREDEFINED_RESPONSES["They rejected my PTO."].map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <h4>Navigating corporate buzzwords and synergy fatigue</h4>
                    <ul>
                        {PREDEFINED_RESPONSES["Corporate synergy is a myth."].map((s, i) => <li key={i}>{s}</li>)}
                    </ul>

                    <p>StartlyTab is the sanctuary for tech sector burnout, helping developers and knowledge workers protect their peace of mind against toxic management and corporate PUA.</p>
                </div>
            </div>
        </section>
    );
};

export default VentingModePromo;
