import { EmotionLog, EmotionType } from '../types';

const EMOTION_LOG_KEY = 'focus_tab_emotion_log';

export const EMOTION_SCORES: Record<EmotionType, number> = {
    happy: 2,
    neutral: 1,
    angry: -1,
    anxious: -2,
    sad: -1,
    exhausted: -2
};

export function saveEmotionLog(emotionType: EmotionType, timeSlot: string): EmotionLog {
    const log: EmotionLog = {
        id: `emotion_${Date.now()}`,
        emotionType,
        score: EMOTION_SCORES[emotionType],
        timeSlot,
        timestamp: Date.now()
    };

    const logs = getEmotionLogs();
    logs.push(log);

    // Keep only logs from the last 30 days
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filteredLogs = logs.filter(l => l.timestamp >= cutoff);

    try {
        localStorage.setItem(EMOTION_LOG_KEY, JSON.stringify(filteredLogs));
    } catch (e) {
        console.error('Failed to save emotion log', e);
    }

    return log;
}

export function getEmotionLogs(): EmotionLog[] {
    try {
        const data = localStorage.getItem(EMOTION_LOG_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

/**
 * Calculate the user's emotional baseline over the last 48 hours.
 * Based on EmotionLog scores.
 */
export function calculateEmotionalBaseline(): number {
    const logs = getEmotionLogs();
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const validLogs = logs.filter(l => l.timestamp >= cutoff);

    if (validLogs.length === 0) return 0;

    const sum = validLogs.reduce((acc, log) => acc + log.score, 0);
    return Number((sum / validLogs.length).toFixed(2));
}

export function analyzeEmotionalPatterns(): string[] {
    const logs = getEmotionLogs();
    if (logs.length < 2) return [];

    const patterns: Set<string> = new Set();

    // Group logs by local date string (YYYY-MM-DD)
    const logsByDate: Record<string, EmotionLog[]> = {};
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
        logsByDate[dateStr].push(log);
    });

    const sortedDates = Object.keys(logsByDate).sort();

    // Helper to get logs for the last N consecutive days
    const getLogsForDays = (daysFromEnd: number) => {
        if (sortedDates.length < daysFromEnd) return null;
        const targetDates = sortedDates.slice(-daysFromEnd);
        // Check if dates are consecutive
        for (let i = 1; i < targetDates.length; i++) {
            const d1 = new Date(targetDates[i - 1]);
            const d2 = new Date(targetDates[i]);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 1) return null; // Not consecutive
        }
        return targetDates.map(dateStr => logsByDate[dateStr]);
    };

    // 1. Afternoon Dip: Consecutive 2 days afternoon (14:00-18:00) clicking exhausted/anxious
    const last2DaysLogs = getLogsForDays(2);
    if (last2DaysLogs) {
        const hasAfternoonDip = last2DaysLogs.every(dayLogs => {
            return dayLogs.some(log => {
                const hour = new Date(log.timestamp).getHours();
                const isAfternoon = hour >= 14 && hour < 18;
                const isDipEmotion = log.emotionType === 'exhausted' || log.emotionType === 'anxious';
                return isAfternoon && isDipEmotion;
            });
        });
        if (hasAfternoonDip) patterns.add('AFTERNOON_DIP');
    }

    // 2. Late Night Overwork: Consecutive 3 days active after 23:00 clicking negative
    const last3DaysLogs = getLogsForDays(3);
    if (last3DaysLogs) {
        const hasLateNightOverwork = last3DaysLogs.every(dayLogs => {
            return dayLogs.some(log => {
                const hour = new Date(log.timestamp).getHours();
                // 23:00 to 05:00 next day
                const isLateNight = hour >= 23 || hour < 5;
                const isNegative = ['angry', 'anxious', 'sad', 'exhausted'].includes(log.emotionType);
                return isLateNight && isNegative;
            });
        });
        if (hasLateNightOverwork) patterns.add('LATE_NIGHT_OVERWORK');
    }

    // 3. Energy Depletion: Morning happy but evening angry/sad (for the most recent 2 days)
    const recentDays = sortedDates.slice(-2);
    for (const dateStr of recentDays) {
        const dayLogs = logsByDate[dateStr];
        const hasMorningHappy = dayLogs.some(log => {
            const hour = new Date(log.timestamp).getHours();
            return hour >= 6 && hour < 12 && log.emotionType === 'happy';
        });
        const hasEveningSad = dayLogs.some(log => {
            const hour = new Date(log.timestamp).getHours();
            const isEvening = hour >= 18 || hour < 5;
            const isDepleted = log.emotionType === 'angry' || log.emotionType === 'sad' || log.emotionType === 'exhausted';
            return isEvening && isDepleted;
        });
        if (hasMorningHappy && hasEveningSad) {
            patterns.add('ENERGY_DEPLETION');
            break; // found pattern
        }
    }

    return Array.from(patterns);
}

/**
 * Get how many times the user has clicked an emotion button today.
 */
export function getTodayEmotionClickCount(): number {
    const logs = getEmotionLogs();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTs = startOfDay.getTime();

    return logs.filter(l => l.timestamp >= startTs).length;
}
