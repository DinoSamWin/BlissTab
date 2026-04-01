import React, { useState, useEffect } from 'react';
import { PerspectiveHistory, AppState, PersonaType } from '../types';
import { submitPerspectiveFeedback } from '../services/supabaseService';
import { clearAllPerspectivePools } from '../services/geminiService';
import { useUser } from '../contexts/UserContext';

interface DevFeedbackUIProps {
    currentSnippet: string | null;
    selectedPersona: PersonaType;
    setAppState: React.Dispatch<React.SetStateAction<AppState>>;
}

export const DevFeedbackUI: React.FC<DevFeedbackUIProps> = ({ currentSnippet, selectedPersona, setAppState }) => {
    const { user } = useUser();
    const [feedbackState, setFeedbackState] = useState<'idle' | 'reason' | 'saved'>('idle');
    const [isSyncing, setIsSyncing] = useState(false);
    const [reason, setReason] = useState('');
    const [isGood, setIsGood] = useState<boolean | null>(null);

    // Reset state when text changes
    useEffect(() => {
        setFeedbackState('idle');
        setReason('');
        setIsGood(null);
    }, [currentSnippet]);

    // Only render in dev mode and when there is text
    if (!import.meta.env.DEV || !currentSnippet) {
        return null;
    }

    const handleVote = (voteIsGood: boolean) => {
        setIsGood(voteIsGood);
        if (voteIsGood) {
            saveFeedback(voteIsGood, '');
        } else {
            setFeedbackState('reason');
        }
    };

    const handleReasonSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isGood !== null) {
            saveFeedback(isGood, reason);
        }
    };

    const changePersona = (p: PersonaType) => {
        setAppState(prev => ({
            ...prev,
            selectedPersona: p
        }));
        // Clear all pools so next generation uses new persona rules
        clearAllPerspectivePools();
        console.log(`[DevFeedback] Persona changed to: ${p}. All pools cleared!`);
    };

    const saveFeedback = async (vote: boolean, voteReason: string) => {
        try {
            setIsSyncing(true);
            const historyStr = localStorage.getItem('focus_tab_perspective_history');
            let metadata: any = {};

            if (historyStr) {
                const history = JSON.parse(historyStr) as PerspectiveHistory[];
                const match = history.find(h => h.text.trim() === currentSnippet.trim());
                if (match) {
                    metadata = match;
                }
            }

            const timestamp = Date.now();
            const record = {
                text: currentSnippet,
                isGood: vote,
                reason: voteReason,
                metadata: {
                    ...metadata,
                    activePersona: selectedPersona
                },
                timestamp: timestamp
            };

            const existingStr = localStorage.getItem('focus_tab_dev_feedback');
            const existing = existingStr ? JSON.parse(existingStr) : [];
            existing.unshift(record);
            localStorage.setItem('focus_tab_dev_feedback', JSON.stringify(existing));

            await submitPerspectiveFeedback({
                userId: user?.id || null,
                text: currentSnippet,
                isGood: vote,
                reason: voteReason,
                metadata: record.metadata,
                timestamp: timestamp
            });

            setFeedbackState('saved');
        } catch (e) {
            console.error('[DevFeedback] Error saving feedback:', e);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div
            className="absolute left-[calc(100%+3rem)] top-1/2 -translate-y-1/2 w-[240px] flex flex-col items-start z-[9999] pointer-events-auto font-sans text-left"
            style={{ WebkitTextFillColor: 'initial', background: 'none', backgroundClip: 'unset' }}
        >

            {/* Persona Selector (New V8.0 Feature) */}
            <div className="w-full bg-white/40 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-2 border border-black/5 dark:border-white/10 mb-5 shadow-2xl">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2">Switch Persona</div>
                <div className="grid grid-cols-2 gap-1.5">
                    {[
                        { id: 'soulmate', label: '灵魂伴侣', emoji: '👩‍❤️‍👨' },
                        { id: 'motivator', label: '鼓励师', emoji: '🔥' },
                        { id: 'bestie', label: '清醒闺蜜', emoji: '💅' },
                        { id: 'mentor', label: '导师', emoji: '🧠' }
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => changePersona(p.id as PersonaType)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${selectedPersona === p.id
                                ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg scale-[1.05]'
                                : 'bg-white/50 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-white/10'}`}
                        >
                            <span>{p.emoji}</span>
                            <span>{p.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Dev tag indicator */}
            <div className="flex items-center gap-2 mb-3">
                <div className="text-[10px] font-bold tracking-widest text-[#FF9500] bg-orange-500/10 px-2.5 py-1.5 rounded-lg border border-orange-500/20 shadow-sm backdrop-blur-sm">
                    FEEDBACK 评测入口
                </div>
            </div>

            {feedbackState === 'idle' && (
                <div className="flex flex-col gap-2 p-1">
                    <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200 mb-1 drop-shadow-sm">这就话感觉对了吗？</div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleVote(true)}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-green-500/30 text-green-600 dark:text-green-400 shadow-xl hover:scale-110 active:scale-95 transition-all text-[13px] font-bold group cursor-pointer disabled:opacity-50"
                        >
                            <span className="text-xl group-hover:rotate-[-10deg] transition-transform">👍</span>
                            <span>挺好</span>
                        </button>

                        <button
                            onClick={() => handleVote(false)}
                            disabled={isSyncing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-red-500/30 text-red-600 dark:text-red-400 shadow-xl hover:scale-110 active:scale-95 transition-all text-[13px] font-bold group cursor-pointer disabled:opacity-50"
                        >
                            <span className="text-xl group-hover:rotate-[10deg] transition-transform">👎</span>
                            <span>不行</span>
                        </button>
                    </div>
                </div>
            )}

            {feedbackState === 'reason' && (
                <form onSubmit={handleReasonSubmit} className="flex flex-col gap-3 w-[220px] bg-white dark:bg-gray-800 p-4 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl relative animate-reveal">
                    <div className="text-[12px] text-gray-500 font-bold mb-1">具体的槽点是？</div>

                    <div className="flex flex-wrap gap-2 mb-1">
                        {[
                            { id: 'hollow', label: '空洞自嗨', value: '太自嗨/空洞' },
                            { id: 'preachy', label: '说教感', value: '像说教' },
                            { id: 'vague', label: '没代入感', value: '完全没代入感' },
                            { id: 'weird', label: '逻辑不通', value: '逻辑生硬' }
                        ].map(tag => (
                            <button
                                key={tag.id}
                                type="button"
                                onClick={() => setReason(tag.value)}
                                className={`text-[11px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${reason === tag.value ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                            >
                                {tag.label}
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="告诉我想怎么改..."
                        className="w-full h-[80px] text-[13px] p-3 bg-gray-50 dark:bg-gray-900 border border-black/5 dark:border-white/10 rounded-2xl resize-none focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-gray-800 dark:text-gray-200 transition-all font-medium"
                        autoFocus
                    />

                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setFeedbackState('idle')}
                            className="flex-1 py-2.5 text-xs text-gray-500 font-bold hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={isSyncing}
                            className="flex-[2] py-2.5 text-xs bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-black/20 disabled:opacity-50"
                        >
                            {isSyncing ? '同步中...' : '确认提交'}
                        </button>
                    </div>
                </form>
            )}

            {feedbackState === 'saved' && (
                <div className="px-5 py-3 bg-green-500 text-white rounded-2xl text-[13px] font-black shadow-2xl shadow-green-500/30 flex items-center gap-2 animate-reveal-bounce">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    已同步到后端
                </div>
            )}
        </div>
    );
};
