import React, { useMemo } from 'react';
import { AppState } from '../types';
import { getEmotionLogs, calculateEmotionalBaseline } from '../services/emotionService';
import { isSubscribed } from '../services/usageLimitsService';
import { useDeepCareAI } from '../hooks/useDeepCareAI';
import { BRAND_CONFIG } from '../constants';
import { Activity, History, Lock, Unlock, Zap, Shield, Sparkles } from 'lucide-react';
import { getInternalUrl } from '../services/environmentService';

interface TrendHubProps {
    isOpen: boolean;
    onClose: () => void;
    state: AppState;
}

const TrendHub: React.FC<TrendHubProps> = ({ isOpen, onClose, state }) => {
    if (!isOpen) return null;

    const hasPro = isSubscribed(state);
    const logs = getEmotionLogs();
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    // Calculate usage days based on first log
    const firstLog = sortedLogs[sortedLogs.length - 1];
    const actualDaysUsed = firstLog ? Math.floor((Date.now() - firstLog.timestamp) / (1000 * 60 * 60 * 24)) : 0;

    const daysUsed = actualDaysUsed;
    const forceHasPro = hasPro;

    const activeLogs = sortedLogs;
    const last7DaysLogs = sortedLogs.filter(l => Date.now() - l.timestamp <= 7 * 24 * 60 * 60 * 1000);

    const isSeniorPro = forceHasPro && daysUsed >= 7;
    const isNewPro = forceHasPro && daysUsed < 7;
    const isFree = !forceHasPro;

    // Day 7 threshold logic
    const isDay7Plus = daysUsed >= 7;

    // Pro variables
    const last24hLogs = activeLogs.filter(l => Date.now() - l.timestamp <= 24 * 60 * 60 * 1000);
    const calibrationProgress = Math.min(100, Math.round((Math.max(1, daysUsed) / 7) * 100));

    // Deep Care AI integration
    const { loading: aiLoading, content: aiContent, error: aiError, fetchAdvice } = useDeepCareAI();

    const getCalibrationText = () => {
        if (calibrationProgress < 30) return "正在感知你的输入频率... (Sensing your input frequency...)";
        if (calibrationProgress <= 70) return "正在绘制你的情绪地形图... (Mapping your emotional landscape...)";
        return "压力节律分析即将完成... (Stress rhythm analysis nearing completion...)";
    };

    // Senior Pro variables are now handled above with last7DaysLogs


    // Narrative text logic for Day 7+
    const getNarrativeText = () => {
        if (state.language === 'Chinese (Simplified)') {
            return "过去的一周，你经历了许多起伏，这些日子似乎承载了比平时更多的重量。";
        }
        return "Over the past week, you've experienced many ups and downs. These days seem to carry more weight than usual.";
    };

    // Calculate daily undertone for Day 0-6
    const getDailyUndertone = () => {
        const defaultUndertone = { color: 'bg-blue-200 dark:bg-blue-900', label: state.language === 'Chinese (Simplified)' ? '平稳' : 'Grounded', shadow: 'shadow-blue-500/20' };
        if (last24hLogs.length === 0) return defaultUndertone;

        const eAvg = last24hLogs.reduce((sum, log) => sum + log.score, 0) / last24hLogs.length;

        if (eAvg > 0.8) {
            return { color: 'bg-amber-300 dark:bg-amber-500', label: state.language === 'Chinese (Simplified)' ? '明媚' : 'Bright', shadow: 'shadow-amber-500/30' };
        } else if (eAvg >= -0.5 && eAvg <= 0.8) {
            return { color: 'bg-blue-200 dark:bg-blue-800', label: state.language === 'Chinese (Simplified)' ? '平稳' : 'Grounded', shadow: 'shadow-blue-500/20' };
        } else {
            return { color: 'bg-purple-500 dark:bg-purple-800', label: state.language === 'Chinese (Simplified)' ? '沉重' : 'Heavy', shadow: 'shadow-purple-500/30' };
        }
    };

    const undertone = getDailyUndertone();

    // State for interactive tooltip
    const [activeTooltip, setActiveTooltip] = React.useState<{ x: number, y: number, emotion: string, time: string } | null>(null);

    // Generate points for the SVG Wave based on actual logs
    const generateWavePoints = () => {
        const width = 800; // max width of the SVG container
        const height = 240; // max height of the SVG container
        const paddingX = 40;
        const paddingY = 60; // More padding for emoji nodes

        const now = new Date();
        now.setHours(0, 0, 0, 0); // start of today

        const minScore = -2;
        const maxScore = 2;

        const points: { x: number, y: number, isNode: boolean, emotionType?: string, timestamp?: number }[] = [];

        // Loop over the last 7 days (dayIndex 0 to 6)
        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);

            const dayLogs = last7DaysLogs.filter(l => {
                const logDate = new Date(l.timestamp);
                logDate.setHours(0, 0, 0, 0);
                return logDate.getTime() === targetDate.getTime();
            });

            if (dayLogs.length > 0) {
                // Determine daily average score
                const avgScore = dayLogs.reduce((sum, l) => sum + l.score, 0) / dayLogs.length;

                // Amplify the score to exaggerate the curve amplitude (like Ref 2)
                const amplifiedScore = avgScore * 1.8;
                const clampedScore = Math.max(minScore, Math.min(maxScore, amplifiedScore));

                // Determine dominant emotion
                const counts = dayLogs.reduce((acc, log) => {
                    acc[log.emotionType] = (acc[log.emotionType] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const dominant = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as string;

                // Find a representative timestamp (the latest log of the dominant emotion)
                const representativeLog = dayLogs.slice().reverse().find(l => l.emotionType === dominant) || dayLogs[dayLogs.length - 1];

                const x = paddingX + (i / 6) * (width - paddingX * 2);
                const normalizedY = (clampedScore - minScore) / (maxScore - minScore);
                const y = height - paddingY - (normalizedY * (height - paddingY * 2));

                points.push({ x, y, isNode: true, emotionType: dominant, timestamp: representativeLog.timestamp });
            }
        }

        if (points.length === 0) {
            // Flat neutral line if no logs at all
            const y = height / 2;
            points.push({ x: paddingX, y, isNode: false });
            points.push({ x: width - paddingX, y, isNode: false });
        } else if (points.length === 1) {
            // Horizontal line through the single point
            points.unshift({ x: paddingX, y: points[0].y, isNode: false });
            points.push({ x: width - paddingX, y: points[0].y, isNode: false });
        } else {
            // Extend the curve to the edges if needed
            if (points[0].x > paddingX) {
                points.unshift({ x: paddingX, y: points[0].y, isNode: false });
            }
            if (points[points.length - 1].x < width - paddingX) {
                points.push({ x: width - paddingX, y: points[points.length - 1].y, isNode: false });
            }
        }

        // Construct bezier curved path string
        let pathStr = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const xMid = (points[i].x + points[i + 1].x) / 2;
            pathStr += ` C ${xMid},${points[i].y} ${xMid},${points[i + 1].y} ${points[i + 1].x},${points[i + 1].y}`;
        }

        let pathFillStr = `${pathStr} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

        const isEmpty = last7DaysLogs.length === 0;
        const isSparse = last7DaysLogs.length > 0 && last7DaysLogs.length <= 2;

        return { pathStr, pathFillStr, points, width, height, paddingX, isEmpty, isSparse };
    };

    const waveData = useMemo(() => isDay7Plus ? generateWavePoints() : null, [isDay7Plus, last7DaysLogs]);

    // Calculate emotion proportions for Day 7+
    const getEmotionProportions = () => {
        if (last7DaysLogs.length === 0) return [];
        const counts = last7DaysLogs.reduce((acc, log) => {
            acc[log.emotionType] = (acc[log.emotionType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const total = last7DaysLogs.length;

        const getColor = (type: string) => {
            switch (type) {
                case 'happy': return { bg: 'bg-amber-400', text: 'text-amber-400' };
                case 'neutral': return { bg: 'bg-emerald-400', text: 'text-emerald-400' };
                case 'angry': return { bg: 'bg-red-500', text: 'text-red-500' };
                case 'anxious': return { bg: 'bg-orange-400', text: 'text-orange-400' };
                case 'sad': return { bg: 'bg-blue-400', text: 'text-blue-400' };
                case 'exhausted': return { bg: 'bg-indigo-400', text: 'text-indigo-400' };
                default: return { bg: 'bg-gray-300', text: 'text-gray-300' };
            }
        };

        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .map(([type, count]) => ({
                type,
                percentage: (count / total) * 100,
                theme: getColor(type)
            }));
    };

    const proportions = useMemo(() => isDay7Plus ? getEmotionProportions() : [], [isDay7Plus, last7DaysLogs]);

    React.useEffect(() => {
        if (isOpen && isDay7Plus && proportions.length > 0) {
            // Prevent refetching if we already have it
            if (!aiContent && !aiLoading && !aiError) {
                fetchAdvice(proportions, state.language);
            }
        }
    }, [isOpen, isDay7Plus, proportions, state.language, fetchAdvice, aiContent, aiLoading, aiError]);

    const whisperScene = useMemo(() => {
        if (!isDay7Plus || !forceHasPro || proportions.length === 0) return null;

        const getPercent = (types: string[]) => {
            return proportions.filter(p => types.includes(p.type)).reduce((sum, p) => sum + p.percentage, 0);
        };

        const exhausted = getPercent(['exhausted']);
        if (exhausted > 40) return 'A';

        const anxiousAngry = getPercent(['anxious', 'angry']);
        if (anxiousAngry > 30) return 'B';

        const calmHappy = getPercent(['neutral', 'happy']);
        if (calmHappy > 60) return 'C';

        // Fallback: pick the highest proportion's corresponding scene
        const dominant = proportions[0]?.type;
        if (['exhausted', 'sad'].includes(dominant)) return 'A';
        if (['anxious', 'angry'].includes(dominant)) return 'B';
        return 'C';
    }, [proportions, isDay7Plus, forceHasPro]);

    const renderDeepCareWhisper = () => {
        if (!isDay7Plus) return null;

        // While fetching, show skeleton
        if (aiLoading) {
            return (
                <div className="mt-12 animate-reveal pb-16">
                    <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-6 px-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> AI 深度洞察生成中...
                    </h3>
                    <div className="mx-4 p-8 md:p-12 bg-white/50 dark:bg-[#1C1A17] rounded-[2rem] border border-[#EBE5D9] dark:border-white/5 shadow-xl flex flex-col justify-center items-center min-h-[300px]">
                        <div className="w-8 h-8 rounded-full border-2 border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/10 animate-spin mb-4" />
                        <p className="text-sm text-gray-500">正在查阅你过去七天的情绪档案...</p>
                    </div>
                </div>
            );
        }

        if (waveData?.isEmpty) {
            return (
                <div className="mt-12 animate-reveal pb-16">
                    <div className="mx-4 p-8 md:p-12 text-center relative overflow-hidden flex flex-col items-center justify-center">
                        <div className="max-w-xl mx-auto space-y-8 font-serif">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-[#EAE5D9]">致这七天保持沉默的你：</h4>
                            <div className="space-y-6 text-[15px] text-gray-700 dark:text-[#D4CFC4] leading-[2.2] text-left">
                                <p>我看了下，过去这一周，你在这里留下了 0 条情绪印记。</p>
                                <p>很多打卡软件在这个时候会提醒你“你已经断签 7 天了”，但我不想那么做。没有记录，通常只有两种情况：要么是你这周被现实生活里的工作填满了，根本顾不上别的；要么，是你这几天过得足够平静，平静到不需要向任何外物倾诉。</p>
                                <p>无论哪一种，都不需要觉得抱歉。你不需要对一个浏览器插件负责，你只需要对你的生活负责。</p>
                                <div className="p-6 bg-[#F5F2EA] dark:bg-[#2A2621] rounded-2xl border-l-[4px] border-[#D9D1C0] dark:border-[#5C5446] mt-8 shadow-inner shadow-black/5">
                                    <p className="italic text-gray-800 dark:text-[#EAE5D9]">只要你觉得值得被记住的瞬间，再点开我就行。在这之前，祝你接下来的工作一切顺利。喝口水，继续去忙你的吧。</p>
                                </div>
                            </div>
                        </div>
                        {!forceHasPro && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-12 max-w-sm mx-auto">
                                当你准备好重新开始记录时，Pro 版本会永远为你安全地保存每一次心理轨迹。
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        if (waveData?.isSparse) {
            return (
                <div className="mt-12 animate-reveal pb-16">
                    <div className="mx-4 bg-white dark:bg-[#1C1A17] rounded-[2rem] border border-[#EBE5D9] dark:border-white/5 shadow-xl shadow-[#D9D1C0]/20 dark:shadow-black/20 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                        <div className="p-8 md:p-12 relative z-10">
                            <h4 className="text-xl font-serif text-gray-900 dark:text-[#EAE5D9] mb-8 font-bold leading-relaxed">这周的湖面很平静。</h4>
                            <div className="space-y-6 text-[15px] text-gray-700 dark:text-[#D4CFC4] leading-[2.2] max-w-2xl font-serif">
                                <p>过去七天，你只留下了微弱的情绪涟漪。</p>
                                <p>看来除了少数几个瞬间让你觉得稍有波动之外，其余的时间你都掌控得不错。不需要为了填满这张图表而刻意点击。记住那些引发涟漪的瞬间，并在下周提前绕开它们就好。</p>
                            </div>
                        </div>
                        {!forceHasPro && (
                            <div className="absolute inset-x-0 bottom-0 top-32 bg-gradient-to-t from-white via-white/95 to-white/10 dark:from-[#1C1A17] dark:via-[#1C1A17]/95 dark:to-[#1C1A17]/10 backdrop-blur-[12px] flex flex-col items-center justify-center pt-8 z-20">
                                <div className="text-center px-4">
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">记录未完待续</h4>
                                    <button
                                        onClick={() => window.open(getInternalUrl('/subscription'), '_blank')}
                                        className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold text-sm tracking-wide mt-6 shadow-lg shadow-indigo-500/20"
                                    >
                                        解锁完整处方 ($4.99/mo)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        let activeContent = aiContent;

        if (aiError || !activeContent) {
            activeContent = {
                title: whisperScene === 'A' ? '致过去七天总是感到疲惫的你：' : whisperScene === 'B' ? '关于过去七天的那些紧绷时刻：' : '记住过去七天的轻盈节律：',
                p1: whisperScene === 'A' ? '我注意到，这七天你多次留下了疲惫的印记。你可能会因为效率下降而感到内疚，但从心理学的角度看，这是你的大脑在发出保护信号。' : whisperScene === 'B' ? '过去的一周，你经历了比平时更多的高压震荡。那条曲线记录了你在非常努力地试图掌控那些不断涌来的混乱。' : '很高兴看到你这周的曲线保持在了一个极其漂亮、稳固的区间。这意味着你在这七天里，找到了属于自己的秩序感。',
                p2: whisperScene === 'A' ? '职场中的耗竭往往不是因为体力透支，而是因为隐藏的“情绪劳动”。' : whisperScene === 'B' ? '焦虑感通常来源于对未知和失控的恐惧。' : '心理学上有一种“巅峰状态留存”现象。当你在周末回顾这周时，请用力记住那个充满成就感的瞬间。',
                p3: whisperScene === 'A' ? '请尝试给自己开一张“非生产性休息”的处方：允许自己去做一件毫无意义、没有目标的事情。' : whisperScene === 'B' ? '下次当这种紧绷感再次袭来时，试着启动“5-4-3-2-1 物理着陆法”。' : '将这种掌控感打包存好，它将成为你的心理护城河。'
            };
        }

        return (
            <div className="mt-12 animate-reveal pb-16" style={{ animationDelay: '0.4s' }}>
                <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-6 px-4">过去7天关键觉察与心理建议 <span className="text-[10px] opacity-70 font-medium normal-case ml-2">Deep Care Whisper</span></h3>
                <div className="mx-4 bg-white dark:bg-[#1C1A17] rounded-[2rem] border border-[#EBE5D9] dark:border-white/5 shadow-xl shadow-[#D9D1C0]/20 dark:shadow-black/20 relative overflow-hidden group hover:shadow-2xl transition-all duration-500 min-h-[400px]">
                    <div className="p-8 md:p-12 relative z-10">
                        <div className="absolute top-4 right-8 text-9xl text-black/5 dark:text-white/5 font-serif select-none pointer-events-none text-shadow-sm">"</div>

                        <h4 className="text-xl font-serif text-gray-900 dark:text-[#EAE5D9] mb-8 font-bold leading-relaxed">{activeContent.title}</h4>

                        <div className="space-y-6 text-[15px] text-gray-700 dark:text-[#D4CFC4] leading-[2.2] max-w-2xl font-serif relative">
                            <p>{activeContent.p1}</p>
                            <p>{activeContent.p2}</p>
                            <div className="p-6 bg-indigo-50/50 dark:bg-[#2A2621] rounded-2xl border-l-[4px] border-indigo-200 dark:border-[#5C5446] mt-8 shadow-inner shadow-black/5">
                                <p className="italic text-gray-800 dark:text-[#EAE5D9]">{activeContent.p3}</p>
                            </div>
                        </div>
                    </div>

                    {!forceHasPro && (
                        <div className="absolute inset-x-0 bottom-0 top-32 bg-gradient-to-t from-white via-white/95 to-white/10 dark:from-[#1C1A17] dark:via-[#1C1A17]/95 dark:to-[#1C1A17]/10 backdrop-blur-[12px] flex flex-col items-center justify-center pt-8 z-20">
                            <div className="text-center px-4">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">解读未完待续</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
                                    你的情绪地图还有 70% 的深度内容未解锁。升级 Pro，获取专属定制的完整心理处方。
                                </p>
                                <button
                                    onClick={() => window.open(getInternalUrl('/subscription'), '_blank')}
                                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold text-sm tracking-wide hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all animate-pulse shadow-lg shadow-indigo-500/20"
                                >
                                    解锁完整处方 ($4.99/mo)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Assuming today's index is end of the array, shift labels to match
    const currentDayOfWeek = new Date().getDay(); // 0 is Sunday
    const adjustedDayLabels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        adjustedDayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/40 dark:bg-black/80 backdrop-blur-xl animate-reveal">
            <div className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] dark:from-[#111111] dark:to-[#0A0A0A] w-full max-w-4xl rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] relative border border-white/50 dark:border-white/5">

                {/* Header */}
                <div className="px-12 pt-12 pb-6 flex justify-between items-center flex-shrink-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Trend Hub</h2>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
                                Your Emotional Footprint
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all active:scale-95">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-12 py-6 no-scrollbar relative z-10 w-full">

                    {/* DAY 0-6 VIEW (Default for all users < 7 days) */}
                    {!isDay7Plus && (
                        <div className="max-w-3xl mx-auto space-y-8 pb-10">
                            {activeLogs.length === 0 ? (
                                // SCENARIO 1: Day 0-6 Empty State
                                <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4 animate-reveal">
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-12">
                                        空白也是一种好状态。
                                    </h1>

                                    {/* Breathing Glow Orb */}
                                    <div className="relative w-48 h-48 flex items-center justify-center mb-16">
                                        <div className="absolute w-full h-full rounded-full bg-emerald-100 dark:bg-emerald-900/30 blur-3xl opacity-80 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                                        <div className="absolute w-32 h-32 rounded-full bg-emerald-50 dark:bg-emerald-800/20 blur-xl opacity-60 animate-[pulse_6s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                                        <div className="w-4 h-4 rounded-full bg-emerald-200 dark:bg-emerald-700/50 shadow-[0_0_20px_rgba(167,243,208,1)]" />
                                    </div>

                                    <div className="max-w-md space-y-4">
                                        <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed font-serif">
                                            {(() => {
                                                const texts = [
                                                    "还没习惯我的存在吧？完全没关系。这几天先专注你手头的事，等哪天遇到特别想吐槽、或者特别开心的瞬间，再点我就行。",
                                                    "不需要为了记录而记录。把我当成你桌上的盆栽就好，不用天天浇水，想起来了看一眼就行。",
                                                    "没有情绪波动，说明这几天过得很平稳。继续保持你的节奏，不用管我。"
                                                ];
                                                // Consistent random based on component mount to prevent flickering, using modulus of timestamp to keep it constant per render
                                                const idx = Math.floor(Date.now() / 1000000) % 3;
                                                return texts[idx];
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                // NORMAL DAY 0-6 VIEW
                                <>
                                    <div className="text-center mb-10 mt-4">
                                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                                            Learning your emotional rhythm...
                                        </h1>
                                        <p className="text-gray-500 dark:text-gray-400">
                                            Record your feelings for 7 days to unlock your personalized insights and wave history.
                                        </p>
                                    </div>

                                    <div className="p-8 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/10 relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Calibration Progress</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getCalibrationText()}</p>
                                            </div>
                                            <span className="text-2xl font-light text-indigo-500">{calibrationProgress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 mb-6 overflow-hidden relative">
                                            <div className="bg-indigo-500 h-3 rounded-full transition-all duration-1000 relative" style={{ width: `${calibrationProgress}%` }}>
                                                <div className="absolute top-0 right-0 w-4 h-full bg-white/40 blur-sm animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white/50 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 text-sm text-center italic text-gray-600 dark:text-gray-300">
                                            <span className="mr-2">🌱</span>
                                            感谢这瞬间的诚实。这能让我下周更懂你。(Thank you for your honesty. This helps me understand you better next week.)
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[200px]">
                                            <div className={`absolute w-32 h-32 rounded-full blur-2xl opacity-60 dark:opacity-40 animate-pulse ${undertone.color} ${undertone.shadow}`} style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                                            <div className="relative z-10 flex flex-col items-center">
                                                <h3 className="text-xs font-bold text-gray-500 tracking-[0.2em] uppercase mb-4">今日心理底色<br /><span className="text-[10px] font-medium opacity-70">Psychological Undertone</span></h3>
                                                <span className="text-2xl font-serif text-gray-800 dark:text-gray-100 mb-2">{undertone.label}</span>
                                                {last24hLogs.length > 0 ? (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">基于你今天的 {last24hLogs.length} 次记录分析。</p>
                                                ) : (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">记录后即可解锁底色分析。</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-6 bg-transparent border border-dashed border-gray-300 dark:border-gray-700/50 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="w-8 h-8 rounded-full border-2 border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/10 animate-spin" />
                                            <div>
                                                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">正在绘制你的地形图...<br /><span className="text-xs font-normal opacity-70">Mapping landscape...</span></h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 max-w-xs mx-auto leading-relaxed">AI 还需要 {Math.max(1, 7 - daysUsed)} 天的数据来识别压力节律。现在，先感受当下的呼吸。</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* DAY 7+ VIEW (The Aha Moment) */}
                    {isDay7Plus && (
                        <div className="max-w-4xl mx-auto space-y-12 pb-10">
                            <style>{`
                                @keyframes svgRipple {
                                    0%, 100% { transform: translateY(0px); }
                                    50% { transform: translateY(-4px); }
                                }
                                .animate-svg-ripple {
                                    animation: svgRipple 8s ease-in-out infinite;
                                }
                            `}</style>

                            {/* Head: The Insight Narrative or Free User Banner */}
                            <div className="text-center mt-8 mb-10 px-8 animate-reveal">
                                {forceHasPro ? (
                                    <h1 className="text-2xl md:text-3xl font-serif leading-relaxed text-gray-800 dark:text-gray-200" style={{ textWrap: 'balance' }}>
                                        "{getNarrativeText()}"
                                    </h1>
                                ) : (
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
                                            探索你的过去7天情绪地图
                                        </h1>
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-full border border-indigo-100 dark:border-indigo-500/20">
                                            <Sparkles className="w-4 h-4 text-indigo-500" />
                                            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                                                付费后，您将获得下述的过去7天专业心理学洞察与记录
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Middle & Bottom: The Wave and The Boundary */}
                            <div className="relative animate-reveal" style={{ animationDelay: '0.2s' }}>
                                {/* The Wave Chart & Spectrum Container */}
                                <div className="relative">
                                    {/* The Wave Chart */}
                                    <div className="relative w-full overflow-hidden bg-white/60 dark:bg-white/[0.02] backdrop-blur-md rounded-[3rem] py-10 border border-white/80 dark:border-white/5 shadow-xl shadow-black/5">

                                        {waveData && (
                                            <div className="relative w-full aspect-[3/1] min-h-[300px] flex flex-col items-center justify-center">

                                                {/* Tooltip */}
                                                {activeTooltip && forceHasPro && (
                                                    <div
                                                        className="absolute z-30 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs py-1 px-3 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 whitespace-nowrap opacity-100 transition-opacity"
                                                        style={{
                                                            left: `${(activeTooltip.x / waveData.width) * 100}%`,
                                                            top: `${(activeTooltip.y / waveData.height) * 100}%`,
                                                            marginTop: '-16px'
                                                        }}
                                                    >
                                                        <span className="font-bold capitalize">{activeTooltip.emotion}</span><span className="opacity-70 mx-2">·</span>{activeTooltip.time}
                                                        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900 dark:border-t-white" />
                                                    </div>
                                                )}

                                                <svg
                                                    viewBox={`0 0 ${waveData.width} ${waveData.height}`}
                                                    className="w-full h-full overflow-visible drop-shadow-[0_10px_20px_rgba(99,102,241,0.15)]"
                                                    preserveAspectRatio="none"
                                                >
                                                    <g className={waveData.isEmpty || waveData.isSparse ? "animate-svg-ripple object-center transform-gpu" : ""}>
                                                        {/* Soft Grid Line for Neutral Baseline */}
                                                        <line x1={waveData.paddingX} y1={waveData.height / 2} x2={waveData.width - waveData.paddingX} y2={waveData.height / 2} stroke="currentColor" className="text-black/5 dark:text-white/5" strokeWidth="1" strokeDasharray="5,5" />

                                                        {/* The Fill Gradient */}
                                                        <path
                                                            d={waveData.pathFillStr}
                                                            fill="url(#waveFillGradient)"
                                                        />

                                                        {/* The Spline Curve */}
                                                        <path
                                                            d={waveData.pathStr}
                                                            fill="none"
                                                            stroke="url(#waveStrokeGradient)"
                                                            strokeWidth="8"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            style={{ filter: 'drop-shadow(0px 15px 15px rgba(99,102,241,0.4))' }}
                                                        />
                                                    </g>

                                                    {/* Gradient Definitions */}
                                                    <defs>
                                                        <linearGradient id="waveStrokeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                            <stop offset="0%" stopColor="#4F46E5" />
                                                            <stop offset="50%" stopColor="#3B82F6" />
                                                            <stop offset="100%" stopColor="#2DD4BF" />
                                                        </linearGradient>
                                                        <linearGradient id="waveFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                                                            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.05" />
                                                        </linearGradient>
                                                    </defs>
                                                </svg>

                                                {/* HTML Nodes for Emojis Overlay */}
                                                {waveData.points.filter(pt => pt.isNode).map((pt, i) => (
                                                    <div
                                                        key={`emoji-${i}`}
                                                        className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full bg-white dark:bg-[#1A1A1A] shadow-md border border-black/5 dark:border-white/5 flex items-center justify-center transform transition-transform hover:scale-125 z-20 cursor-crosshair"
                                                        style={{
                                                            left: `${(pt.x / waveData.width) * 100}%`,
                                                            top: `${(pt.y / waveData.height) * 100}%`
                                                        }}
                                                        onMouseEnter={() => pt.timestamp && pt.emotionType && setActiveTooltip({
                                                            x: pt.x,
                                                            y: pt.y,
                                                            emotion: pt.emotionType,
                                                            time: new Date(pt.timestamp).toLocaleTimeString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
                                                        })}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                    >
                                                        <img src={`/icons/emotions/${pt.emotionType}.png`} className="w-5 h-5 object-contain" alt={pt.emotionType} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* X-Axis Labels */}
                                        <div className="flex justify-between w-full mt-8 px-10 relative z-10">
                                            {adjustedDayLabels.map((label, idx) => (
                                                <span key={idx} className={`text-[10px] font-bold tracking-widest uppercase ${idx === 6 ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    {label}
                                                </span>
                                            ))}
                                        </div>

                                    </div>
                                </div>

                                {/* 7-Day Emotion Pie Chart (Donut) */}
                                {proportions.length > 0 && (
                                    <div className="mt-8 px-4 animate-reveal relative z-10 pb-6" style={{ animationDelay: '0.3s' }}>
                                        <div className="flex justify-between items-end mb-6">
                                            <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500">本周情绪谱系 <span className="text-[10px] opacity-70 font-medium normal-case ml-2">Emotional Spectrum</span></h3>
                                            <span className="text-xs text-gray-400">{last7DaysLogs.length} Records</span>
                                        </div>

                                        <div className="flex items-center gap-10 px-4 md:px-8">
                                            {/* Donut Chart SVG */}
                                            <div className="relative w-36 h-36 flex-shrink-0">
                                                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 drop-shadow-[0_8px_16px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                                                    {(() => {
                                                        const circum = 2 * Math.PI * 35; // r=35
                                                        let currentOffset = 0;
                                                        return proportions.map((p, idx) => {
                                                            const strokeDasharray = `${(p.percentage / 100) * circum} ${circum}`;
                                                            const strokeDashoffset = -currentOffset;
                                                            currentOffset += (p.percentage / 100) * circum;
                                                            return (
                                                                <circle
                                                                    key={idx}
                                                                    cx="50"
                                                                    cy="50"
                                                                    r="35"
                                                                    fill="none"
                                                                    className={`${p.theme.text} transition-all duration-1000 origin-center hover:scale-[1.03] cursor-pointer`}
                                                                    stroke="currentColor"
                                                                    strokeWidth="20" // thickness of donut
                                                                    strokeDasharray={strokeDasharray}
                                                                    strokeDashoffset={strokeDashoffset}
                                                                />
                                                            );
                                                        });
                                                    })()}
                                                </svg>
                                                {/* Center Label */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-gray-700 to-gray-500 dark:from-gray-200 dark:to-gray-400 leading-none">
                                                        {Math.round(proportions[0]?.percentage || 0)}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Legend List */}
                                            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2">
                                                {proportions.map((p, idx) => (
                                                    <div key={idx} className="flex flex-col gap-1 group relative">
                                                        <div className="flex items-center justify-between pointer-events-none">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-3 h-3 rounded-full ${p.theme.bg} shadow-sm border border-black/5 dark:border-white/5`}></div>
                                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 capitalize tracking-wide">{p.type}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 pl-5">
                                                            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{Math.round(p.percentage)}%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}


                            </div>

                            {/* Unified Deep Care Whisper Interface (handles Free & Pro states) */}
                            {renderDeepCareWhisper()}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default TrendHub;
