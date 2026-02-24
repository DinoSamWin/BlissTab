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

/**
 * Activate a background check for recurring emotional patterns 
 * (e.g., multiple "tired" clicks in the afternoon) to tag the user.
 * Returns a list of identified mood patterns.
 */
export function analyzeEmotionalPatterns(): string[] {
    const logs = getEmotionLogs();
    if (logs.length < 5) return [];

    const patterns: string[] = [];
    const hourCounts: Record<string, Record<EmotionType, number>> = {};

    logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        let slot = 'late-night';
        if (hour >= 6 && hour < 12) slot = 'morning';
        else if (hour >= 12 && hour < 14) slot = 'noon';
        else if (hour >= 14 && hour < 18) slot = 'afternoon';
        else if (hour >= 18 && hour < 22) slot = 'evening';

        if (!hourCounts[slot]) hourCounts[slot] = {} as any;
        hourCounts[slot][log.emotionType] = (hourCounts[slot][log.emotionType] || 0) + 1;
    });

    // Patterns detection
    if ((hourCounts['afternoon']?.exhausted || 0) >= 3) {
        patterns.push('Afternoon Slump');
    }
    if ((hourCounts['morning']?.happy || 0) >= 3) {
        patterns.push('Early Bird Focus');
    }
    if ((hourCounts['late-night']?.anxious || 0) >= 2) {
        patterns.push('Night Owl Anxiety');
    }
    if ((hourCounts['evening']?.neutral || 0) >= 4) {
        patterns.push('Evening Zen');
    }

    return patterns;
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
