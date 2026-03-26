import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, EmotionType } from '../types';
import { getEmotionLogs } from '../services/emotionService';
import { isSubscribed } from '../services/usageLimitsService';
import { useDeepCareAI, DeepCareContent } from '../hooks/useDeepCareAI';
import { useUser } from '../contexts/UserContext';
import {
    Activity,
    ArrowLeft,
    Sparkles,
    TrendingUp,
    PieChart,
    Calendar,
    Lock,
    Zap,
    Shield,
    Clock,
    ChevronRight,
    BrainCircuit,
    RefreshCw,
    AlertCircle,
    Info,
    CheckCircle2
} from 'lucide-react';

const Toast: React.FC<{ message: string; type: 'success' | 'info' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getStyles = () => {
        switch (type) {
            case 'success': return 'bg-emerald-500 text-white';
            case 'error': return 'bg-red-500 text-white';
            default: return 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 size={16} />;
            case 'error': return <AlertCircle size={16} />;
            default: return <Info size={16} />;
        }
    };

    return (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-reveal-bounce ${getStyles()}`}>
            {getIcon()}
            <span className="text-sm">{message}</span>
        </div>
    );
};

const EchoLand: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();

    // Mocking AppState subset needed for logic
    const getStoredLanguage = () => {
        try {
            const savedState = localStorage.getItem('focus_tab_state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                return parsed.language || 'Chinese (Simplified)';
            }
        } catch (e) {
            console.error('[EchoLand] Failed to parse app state', e);
        }
        return localStorage.getItem('focus_tab_language') || 'Chinese (Simplified)';
    };

    const language = getStoredLanguage();
    const isCN = language === 'Chinese (Simplified)';
    const theme = (localStorage.getItem('focus_tab_theme') as any) || 'light';

    // Synchronize i18n language
    useEffect(() => {
        const langMap: Record<string, string> = {
            'Chinese (Simplified)': 'zh-CN',
            'English': 'en-US',
            'German': 'en-US',
            'French': 'en-US',
            'Spanish': 'en-US',
            'Italian': 'en-US',
            'Portuguese': 'en-US',
            'Japanese': 'en-US'
        };
        const i18nCode = langMap[language] || 'en-US';
        import('../i18n').then(module => {
            module.default.changeLanguage(i18nCode);
        });
    }, [language]);

    const state: Partial<AppState> = {
        user,
        language,
        theme
    };

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

    const hasPro = isSubscribed(state as AppState);
    const logs = getEmotionLogs();
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    // Calculate usage days based on first log
    const firstLog = sortedLogs[sortedLogs.length - 1];
    const daysUsed = firstLog ? Math.floor((Date.now() - firstLog.timestamp) / (1000 * 60 * 60 * 24)) : 0;

    const activeLogs = sortedLogs;
    const last7DaysLogs = sortedLogs.filter(l => Date.now() - l.timestamp <= 7 * 24 * 60 * 60 * 1000);

    // Comprehensive logs override for UI stats
    const displayedLogs = logs;

    // Day 7 threshold logic
    const isDay7Plus = daysUsed >= 7;

    const last24hLogs = activeLogs.filter(l => Date.now() - l.timestamp <= 24 * 60 * 60 * 1000);
    const calibrationProgress = Math.min(100, Math.round((Math.max(1, daysUsed) / 7) * 100));

    // Deep Care AI integration
    const { loading: aiLoading, content: aiContent, error: aiError, fetchAdvice } = useDeepCareAI();

    // Psychological Undertone logic
    const getDailyUndertone = () => {
        const defaultUndertone = { color: 'bg-blue-300 dark:bg-blue-900', label: isCN ? '平稳' : 'Grounded', shadow: 'shadow-blue-500/20' };
        if (last24hLogs.length === 0) return defaultUndertone;

        const eAvg = last24hLogs.reduce((sum, log) => sum + log.score, 0) / last24hLogs.length;

        if (eAvg > 0.8) {
            return { color: 'bg-amber-300 dark:bg-amber-500', label: isCN ? '明媚' : 'Bright', shadow: 'shadow-amber-500/30' };
        } else if (eAvg >= -0.5 && eAvg <= 0.8) {
            return { color: 'bg-blue-300 dark:bg-blue-800', label: isCN ? '平稳' : 'Grounded', shadow: 'shadow-blue-500/20' };
        } else {
            return { color: 'bg-indigo-400 dark:bg-indigo-800', label: isCN ? '深沉' : 'Deep', shadow: 'shadow-indigo-500/30' };
        }
    };

    const undertone = getDailyUndertone();

    // Poetic narrative header logic
    const getNarrativeText = () => {
        if (isCN) {
            return "过去的一周，你经历了许多起伏，这些日子似乎承载了比平时更多的重量。";
        }
        return "Over the past week, you've experienced many ups and downs. These days seem to carry more weight than usual.";
    };

    // Check last refresh date logic
    const canRefreshToday = () => {
        const lastRefresh = localStorage.getItem('last_echo_refresh_date');
        const todayStr = new Date().toDateString();
        return lastRefresh !== todayStr;
    };

    const handleRefresh = async () => {
        if (!canRefreshToday()) {
            setToast({
                message: isCN ? '今天的数据深度洞见已就绪，请在休息充分后，等待次日生成更新报告。' : 'Insights and analytics are ready. A fresh report will arrive tomorrow.',
                type: 'info'
            });
            return;
        }

        if (isDay7Plus && last7DaysLogs.length > 0) {
            await fetchAdvice(proportions as any, language);
            localStorage.setItem('last_echo_refresh_date', new Date().toDateString());
            setToast({ message: isCN ? '报告已刷新，深度感知同步成功' : 'Report refreshed, deep perception synchronized.', type: 'success' });
        } else {
            setToast({ message: isCN ? '记录不足，分析力正在积攒中...' : 'Insufficient logs to generate analysis.', type: 'info' });
        }
    };

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
                case 'happy': return { bg: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-100' };
                case 'neutral': return { bg: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-100' };
                case 'angry': return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-100' };
                case 'anxious': return { bg: 'bg-orange-400', text: 'text-orange-400', border: 'border-orange-100' };
                case 'sad': return { bg: 'bg-blue-400', text: 'text-blue-400', border: 'border-blue-100' };
                case 'exhausted': return { bg: 'bg-indigo-400', text: 'text-indigo-400', border: 'border-indigo-100' };
                default: return { bg: 'bg-gray-300', text: 'text-gray-300', border: 'border-gray-100' };
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

    useEffect(() => {
        if (isDay7Plus && proportions.length > 0) {
            if (!aiContent && !aiLoading && !aiError) {
                fetchAdvice(proportions as any, language);
            }
        }
    }, [isDay7Plus, proportions, language, fetchAdvice, aiContent, aiLoading, aiError]);

    // Generate points for the SVG Wave based on actual logs
    const generateWavePoints = () => {
        const width = 800;
        const height = 240;
        const paddingX = 40;
        const paddingY = 60;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const minScore = -2;
        const maxScore = 2;

        const points: { x: number, y: number, isNode: boolean, emotionType?: string, timestamp?: number }[] = [];

        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
            const dayLogs = last7DaysLogs.filter(l => {
                const logDate = new Date(l.timestamp);
                logDate.setHours(0, 0, 0, 0);
                return logDate.getTime() === targetDate.getTime();
            });

            if (dayLogs.length > 0) {
                const avgScore = dayLogs.reduce((sum, l) => sum + l.score, 0) / dayLogs.length;
                const amplifiedScore = avgScore * 1.8;
                const clampedScore = Math.max(minScore, Math.min(maxScore, amplifiedScore));

                const counts = dayLogs.reduce((acc, log) => {
                    acc[log.emotionType] = (acc[log.emotionType] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const dominant = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) as string;
                const representativeLog = dayLogs.slice().reverse().find(l => l.emotionType === dominant) || dayLogs[dayLogs.length - 1];

                const x = paddingX + (i / 6) * (width - paddingX * 2);
                const normalizedY = (clampedScore - minScore) / (maxScore - minScore);
                const y = height - paddingY - (normalizedY * (height - paddingY * 2));

                points.push({ x, y, isNode: true, emotionType: dominant, timestamp: representativeLog.timestamp });
            }
        }

        if (points.length === 0) {
            const y = height / 2;
            points.push({ x: paddingX, y, isNode: false });
            points.push({ x: width - paddingX, y, isNode: false });
        } else if (points.length === 1) {
            points.unshift({ x: paddingX, y: points[0].y, isNode: false });
            points.push({ x: width - paddingX, y: points[0].y, isNode: false });
        } else {
            if (points[0].x > paddingX) points.unshift({ x: paddingX, y: points[0].y, isNode: false });
            if (points[points.length - 1].x < width - paddingX) points.push({ x: width - paddingX, y: points[points.length - 1].y, isNode: false });
        }

        let pathStr = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const xMid = (points[i].x + points[i + 1].x) / 2;
            pathStr += ` C ${xMid},${points[i].y} ${xMid},${points[i + 1].y} ${points[i + 1].x},${points[i + 1].y}`;
        }
        let pathFillStr = `${pathStr} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

        return { pathStr, pathFillStr, points, width, height, isEmpty: last7DaysLogs.length === 0 };
    };

    const waveData = useMemo(() => isDay7Plus ? generateWavePoints() : null, [isDay7Plus, last7DaysLogs]);
    const [activeTooltip, setActiveTooltip] = React.useState<{ x: number, y: number, emotion: string, time: string } | null>(null);

    const adjustedDayLabels = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        adjustedDayLabels.push(d.toLocaleDateString(language.includes('Chinese') ? 'zh-CN' : 'en-US', { weekday: 'short' }));
    }



    return (
        <div className="min-h-[100vh] bg-[#F8FAFC] dark:bg-[#0A0A0A] text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden flex flex-col">
            <style>{`
                @keyframes reveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-reveal { animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .kanto-card {
                    background: #FFFFFF;
                    border-radius: 24px;
                    border: 1px solid rgba(0, 0, 0, 0.03);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
                }
                .dark .kanto-card {
                    background: #141414;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes morph {
                    0% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
                    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                    100% { border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%; }
                }
                @keyframes flow {
                    0% { transform: translate(-30%, -30%) rotate(0deg); }
                    50% { transform: translate(10%, 20%) rotate(180deg); }
                    100% { transform: translate(-30%, -30%) rotate(360deg); }
                }
                .liquid-blob {
                    animation: morph 4s ease-in-out infinite, flow 8s linear infinite;
                    filter: blur(40px);
                }
            `}</style>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Viewport Sides Navigation (Absolute Positioning) */}
            <div className="fixed top-12 left-8 z-40 hidden md:block">
                <button
                    onClick={() => navigate(-1)}
                    className="group w-14 h-14 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl transition-all active:scale-90 flex items-center justify-center translate-y-0 hover:-translate-y-1"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </button>
            </div>

            <div className="fixed top-12 right-8 z-40 hidden md:block flex items-center gap-4">
                <button
                    onClick={handleRefresh}
                    className="group w-14 h-14 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl transition-all active:scale-90 flex items-center justify-center translate-y-0 hover:-translate-y-1"
                >
                    <RefreshCw className={`w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-all ${aiLoading ? 'animate-spin' : ''}`} />
                </button>
                <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_20px_rgba(79,70,229,0.5)]" />
                </div>
            </div>

            <main className="flex-1 flex flex-col justify-center items-center py-12">
                <div className="max-w-7xl w-full px-6 md:px-12">
                    {/* Header Section */}
                    <div className="mb-14 text-center animate-reveal" style={{ animationDelay: '0s' }}>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-[0.4em] mb-4">{isCN ? '深度洞见中心' : 'Deep Insight Center'}</div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white mb-6">
                            {isCN ? '所有情绪数据' : 'All Emotion Data'}
                        </h1>
                        <p className="max-w-3xl mx-auto text-gray-400 font-medium text-lg leading-relaxed italic font-serif">
                            {isDay7Plus && hasPro
                                ? `"${getNarrativeText()}"`
                                : isCN
                                    ? '你的过去7天情绪地图与深度感知。我们正在通过你的点滴记录，构建属于你的情绪节律模型。'
                                    : 'Your 7-day emotional footprint and deep perception. We are building your rhythmic model through your whispers.'
                            }
                        </p>
                    </div>

                    <div className="grid grid-cols-12 gap-10 items-start">
                        {/* Left Column: Visuals & Metrics */}
                        <div className="col-span-12 lg:col-span-7 space-y-6 animate-reveal" style={{ animationDelay: '0.1s' }}>

                            {/* 1. Main Trend Chart (The Wave) */}
                            <div className="kanto-card p-8 md:p-10 relative overflow-hidden group h-[450px] flex flex-col">
                                <div className="flex justify-between items-center mb-8 flex-shrink-0">
                                    <div>
                                        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                                            {isCN ? '情绪脉动图' : 'Emotional Rhythm'}
                                        </h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                                            {isCN ? '最近7天波动趋势' : '7-Day Amplitude Trend'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-center">
                                    {isDay7Plus && waveData && !waveData.isEmpty ? (
                                        <div className="relative">
                                            {/* Wave Chart */}
                                            <div className="relative w-full aspect-[2.5/1] min-h-[260px] flex items-center justify-center">
                                                {activeTooltip && (
                                                    <div
                                                        className="absolute z-30 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold py-1.5 px-3 rounded-xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4 whitespace-nowrap transition-all duration-300"
                                                        style={{
                                                            left: `${(activeTooltip.x / waveData!.width) * 100}%`,
                                                            top: `${(activeTooltip.y / waveData!.height) * 100}%`,
                                                        }}
                                                    >
                                                        {activeTooltip.emotion} · {activeTooltip.time}
                                                        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900 dark:border-t-white" />
                                                    </div>
                                                )}

                                                <svg
                                                    viewBox={`0 0 ${waveData!.width} ${waveData!.height}`}
                                                    className="w-full h-full overflow-visible"
                                                    preserveAspectRatio="none"
                                                >
                                                    <defs>
                                                        <linearGradient id="waveFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                                            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.1" />
                                                            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                                                        </linearGradient>
                                                    </defs>

                                                    <path d={waveData!.pathFillStr} fill="url(#waveFill)" />
                                                    <path d={waveData!.pathStr} fill="none" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>

                                                {/* Nodes */}
                                                {waveData!.points.filter(pt => pt.isNode).map((pt, i) => (
                                                    <div
                                                        key={`emoji-${i}`}
                                                        className="absolute w-8 h-8 -ml-4 -mt-4 rounded-xl bg-white dark:bg-[#1A1A1A] shadow-md border border-gray-100 dark:border-white/10 flex items-center justify-center transform transition-all hover:scale-110 cursor-crosshair z-10"
                                                        style={{
                                                            left: `${(pt.x / waveData!.width) * 100}%`,
                                                            top: `${(pt.y / waveData!.height) * 100}%`
                                                        }}
                                                        onMouseEnter={() => pt.timestamp && pt.emotionType && setActiveTooltip({
                                                            x: pt.x,
                                                            y: pt.y,
                                                            emotion: pt.emotionType.toUpperCase(),
                                                            time: new Date(pt.timestamp).toLocaleTimeString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
                                                        })}
                                                        onMouseLeave={() => setActiveTooltip(null)}
                                                    >
                                                        <img src={`/icons/emotions/${pt.emotionType}.png`} className="w-5 h-5 object-contain" alt={pt.emotionType} />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* X-Axis Labels */}
                                            <div className="flex justify-between w-full mt-6 px-4">
                                                {adjustedDayLabels.map((label, idx) => (
                                                    <span key={idx} className={`text-[10px] font-bold ${idx === 6 ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                        {label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center py-10">
                                            <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 opacity-40">
                                                <Activity className="w-8 h-8 text-indigo-300 animate-pulse" />
                                            </div>
                                            <h4 className="text-xl font-serif font-black mb-3">{isCN ? '感谢这瞬间的诚实' : 'Thank you for your honesty'}</h4>
                                            <p className="text-sm text-gray-400 max-w-xs leading-relaxed font-serif">
                                                {isCN
                                                    ? ` 这能让我下周更懂你。还需记录 ${7 - daysUsed} 天以生成完整波动图。`
                                                    : `This helps me understand you better next week. Need ${7 - daysUsed} more days to generate wave.`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Secondary Metrics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Spectrum Card */}
                                <div className="kanto-card p-8 relative overflow-hidden flex flex-col justify-center min-h-[180px]">
                                    {/* Liquid Background Blobs */}
                                    <div className="absolute inset-0 pointer-events-none opacity-[0.2] dark:opacity-[0.15]">
                                        <div
                                            className="liquid-blob absolute w-40 h-40 -top-4 -left-4"
                                            style={{ backgroundColor: undertone.label === '明媚' || undertone.label === 'Bright' ? '#FCD34D' : undertone.label === '平稳' || undertone.label === 'Grounded' ? '#93C5FD' : '#818CF8' }}
                                        />
                                        <div
                                            className="liquid-blob absolute w-48 h-48 -bottom-10 -right-10"
                                            style={{
                                                backgroundColor: undertone.label === '明媚' || undertone.label === 'Bright' ? '#FBBF24' : undertone.label === '平稳' || undertone.label === 'Grounded' ? '#60A5FA' : '#6366F1',
                                                animationDelay: '-2s',
                                                animationDuration: '10s'
                                            }}
                                        />
                                    </div>

                                    <div className="relative z-10">
                                        <h3 className="text-[10px] font-bold text-gray-400 mb-8 flex items-center gap-2 uppercase tracking-[0.2em] opacity-70">
                                            <Shield className="w-4 h-4 text-indigo-400" />
                                            {isCN ? '今日心理底色' : 'Daily Undertone'}
                                        </h3>

                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="text-4xl font-serif font-black text-gray-900 dark:text-white tracking-tight">{undertone.label}</div>
                                                <p className="text-[11px] text-gray-400 font-bold opacity-60">
                                                    {isCN ? 'AI 综合感知完成同步' : 'AI Aggregate Synced'}
                                                </p>
                                            </div>
                                            <div className={`w-14 h-14 rounded-[1.25rem] ${undertone.color} ${undertone.shadow} shadow-2xl flex items-center justify-center text-white transform hover:rotate-6 transition-transform duration-500`}>
                                                <Sparkles size={28} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Card */}
                                <div className="kanto-card p-8 flex flex-col justify-between">
                                    <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {isCN ? '感知颗粒度' : 'Sensory Granularity'}
                                    </h3>
                                    <div>
                                        <div className="text-4xl font-bold text-indigo-600 mb-1">{displayedLogs.length}</div>
                                        <p className="text-xs font-bold text-gray-400">
                                            {isCN ? '累计情绪印记' : 'Captured Moments'}
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span className="text-emerald-500">↑ 12% vs {isCN ? '上周' : 'last week'}</span>
                                            <span className="text-gray-300">{isCN ? '节律捕捉正常' : 'Rhythm Normal'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Deep Analysis Copy */}
                        <div className="col-span-12 lg:col-span-5 animate-reveal" style={{ animationDelay: '0.2s' }}>
                            <div className="h-full flex flex-col">
                                <div className="glass-card rounded-[2.5rem] p-10 flex-1 border border-indigo-100/50 dark:border-white/5 relative overflow-hidden group flex flex-col max-h-[calc(100vh-280px)]">
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] dark:opacity-[0.1] text-indigo-500 group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                                        <BrainCircuit size={180} />
                                    </div>

                                    <div className="relative z-10 flex flex-col h-full overflow-hidden">
                                        <div className="flex items-center gap-3 mb-8 flex-shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg">
                                                <Sparkles size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold">Deep Care Whisper</h2>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {isCN ? 'AI 深度心理洞察' : 'AI Psychological Perception'}
                                                </p>
                                            </div>
                                        </div>

                                        {aiLoading ? (
                                            <div className="flex-1 flex flex-col items-center justify-center py-20">
                                                <div className="w-8 h-8 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin mb-6" />
                                                <p className="text-gray-400 font-bold animate-pulse text-sm text-center">
                                                    {isCN ? '正在检索你本周的心色记录...' : 'Retrieving your emotional patterns...'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col h-full overflow-hidden">
                                                <div className={`flex-1 overflow-y-auto pr-2 no-scrollbar transition-all duration-700 relative ${!hasPro ? 'pointer-events-none select-none pb-40' : ''}`}>
                                                    {(aiContent && last7DaysLogs.length > 0) ? (
                                                        <div className="space-y-8 pb-10">
                                                            <h4 className="text-2xl font-black leading-tight text-gray-900 dark:text-white pb-2">
                                                                {aiContent.title}
                                                            </h4>
                                                            <div className="space-y-8 text-[15px] text-gray-800 dark:text-[#D4CFC4] leading-[2.4] font-serif tracking-wide">
                                                                <p className="animate-reveal" style={{ animationDelay: '0.1s' }}>{aiContent.p1}</p>
                                                                <p className="animate-reveal" style={{ animationDelay: '0.2s' }}>{aiContent.p2}</p>
                                                            </div>
                                                            <div className="p-8 bg-[#F8FAFC] dark:bg-[#151515] rounded-3xl border-l-[3px] border-indigo-400 mt-10 shadow-sm animate-reveal" style={{ animationDelay: '0.3s' }}>
                                                                <div className="flex items-center gap-2 mb-4 text-indigo-500">
                                                                    <Zap size={16} />
                                                                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-80">
                                                                        {isCN ? '心理处方' : 'Psychological Prescription'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[15px] md:text-[16px] text-indigo-900/90 dark:text-indigo-200/90 italic font-serif leading-[2.2]">
                                                                    {aiContent.p3}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="animate-reveal" style={{ animationDelay: '0.1s' }}>
                                                            {(() => {
                                                                const isEmpty = last7DaysLogs.length === 0;
                                                                if (!isDay7Plus && isEmpty) {
                                                                    return (
                                                                        <div className="space-y-8 pb-10 font-serif text-left">
                                                                            <h4 className="text-2xl font-black leading-tight text-gray-900 dark:text-white">
                                                                                {isCN ? '空白也是一种好状态。' : 'Blank is a Good State.'}
                                                                            </h4>
                                                                            <div className="space-y-6 text-base text-gray-600 dark:text-gray-400 leading-[2] font-medium">
                                                                                <p>{isCN ? '还没习惯我的存在吧？完全没关系。这几天先专注你手头的事，等哪天遇到特别想吐槽、或者特别开心的瞬间，再点我就行。' : 'Not used to me yet? That\'s okay. Focus on your work for now. Come back when you have something to vent or celebrate.'}</p>
                                                                                <p>{isCN ? '不需要为了记录而记录。把我当成你桌上的盆栽就好，不用天天浇水，想起来了看一眼就行。' : 'No need to record for the sake of recording. Treat me like a desk plant; you don\'t need to water me daily, just look over when you feel like it.'}</p>
                                                                                <p>{isCN ? '没有情绪波动，说明这几天过得很平稳。继续保持你的节奏，不用管我。' : 'No emotional swings just means you\'re steady. Keep your rhythm, don\'t mind me.'}</p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                if (isEmpty) {
                                                                    return (
                                                                        <div className="space-y-8 pb-10 font-serif text-left">
                                                                            <h4 className="text-2xl font-black leading-tight text-gray-900 dark:text-white">
                                                                                {isCN ? '致这七天保持沉默的你：' : 'To the Silent One:'}
                                                                            </h4>
                                                                            <div className="space-y-6 text-base text-gray-600 dark:text-gray-400 leading-[2] font-medium">
                                                                                <p>{isCN ? '我看了下，过去这一周，你在这里留下了 0 条情绪印记。' : 'I noticed you haven\'t left any emotional imprints this past week.'}</p>
                                                                                <p>{isCN ? '很多打卡软件在这个时候会提醒你“你已经断签 7 天了”，但我不想那么做。没有记录，通常只有两种情况：要么是你这周被现实生活里的工作填满了，根本顾不上别的；要么，是你这几天过得足够平静，平静到不需要向任何外物倾诉。' : 'Most apps would tell you that you\'ve "missed a streak," but I won\'t. Silence usually means either you\'re too busy living, or too at peace to need to vent.'}</p>
                                                                                <p>{isCN ? '无论哪一种，都不需要觉得抱歉。你不需要对一个浏览器插件负责，你只需要对你的生活负责。' : 'Either way, no need for apologies. You aren\'t responsible to an app; you\'re responsible to your life.'}</p>
                                                                            </div>
                                                                            <div className="p-6 bg-indigo-50/50 dark:bg-white/5 rounded-3xl border-l-4 border-indigo-200 dark:border-indigo-500/30">
                                                                                <p className="text-sm md:text-base text-indigo-900/80 dark:text-indigo-200/80 italic font-bold leading-relaxed">
                                                                                    {isCN ? '只要你觉得值得被记住的瞬间，再点开我就行。在这之前，祝你接下来的工作一切顺利。喝口水，继续去忙你的吧。' : 'Come back whenever a moment feels worth remembering. Until then, have a good week. Go on, keep at it.'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                // Sparse
                                                                return (
                                                                    <div className="space-y-8 pb-10 font-serif text-left">
                                                                        <h4 className="text-2xl font-black leading-tight text-gray-900 dark:text-white">
                                                                            {isCN ? '这周的湖面很平静。' : 'The Lake is Calm.'}
                                                                        </h4>
                                                                        <div className="space-y-6 text-base text-gray-600 dark:text-gray-400 leading-[2] font-medium">
                                                                            <p>{isCN ? '过去七天，你只留下了微弱的情绪涟漪。' : 'Over the last seven days, you\'ve only left faint emotional ripples.'}</p>
                                                                            <p>{isCN ? '看来除了少数几个瞬间让你觉得稍有波动之外，其余的时间你都掌控得不错。不需要为了填满这张图表而刻意点击。记住那些引发涟漪的瞬间，并在下周提前绕开它们就好。' : 'It seems you\'re managing well except for a few moments. No need to click just to fill a chart. Remember what caused the ripples and navigate around them next week.'}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                {!hasPro && last7DaysLogs.length > 0 && (
                                                    <div className="absolute inset-x-0 bottom-0 top-[100px] z-20 pointer-events-none flex flex-col justify-end">
                                                        <div className="absolute inset-0 backdrop-blur-[12px] bg-gradient-to-t from-white via-white/95 to-transparent dark:from-[#0A0A0A] dark:via-[#0A0A0A]/95 dark:to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_40%)] -webkit-[mask-image:linear-gradient(to_bottom,transparent_0%,black_40%)] pointer-events-auto flex flex-col items-center justify-end text-center px-10 pb-12">
                                                            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-600/40 transform transition-transform hover:scale-105">
                                                                <Lock size={32} />
                                                            </div>
                                                            <h4 className="text-xl font-black mb-4 text-gray-900 dark:text-white">
                                                                {isCN ? '解锁 Deep Care 专属洞察' : 'Unlock Deep Care Analysis'}
                                                            </h4>
                                                            <p className="text-[14px] text-gray-500 dark:text-gray-400 font-medium max-w-[320px] leading-relaxed mb-10">
                                                                {isCN
                                                                    ? '本周的底层心理动因已初步识别。订阅专业版后，我们将为您揭开这一抹心色背后的深度心理画像。'
                                                                    : 'Your psychological drivers are identified. Pro reveals the deep mapping behind these colors.'
                                                                }
                                                            </p>
                                                            <button
                                                                onClick={() => navigate('/subscription')}
                                                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-base md:text-lg tracking-wide shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1 hover:bg-indigo-500 transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group pointer-events-auto"
                                                            >
                                                                <span>{isCN ? '成为 PRO 获取深度洞见' : 'Upgrade to Pro'}</span>
                                                                <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};


export default EchoLand;
