import { PerspectiveHistory, TrackType } from '../types';

const HISTORY_RETENTION_DAYS = 14;
const MAX_RETRIES = 3;
const SIMILARITY_THRESHOLD = 0.7; // 0-1, higher = more strict

/**
 * Normalizes text for comparison by removing tags and extra whitespace
 */
function normalizeText(text: string): string {
    return text
        .replace(/\[h\](.*?)\[\/h\]/g, '$1') // Remove highlight tags but keep content
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Calculates simple word-based similarity between two texts
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateSimilarity(text1: string, text2: string): number {
    const normalized1 = normalizeText(text1);
    const normalized2 = normalizeText(text2);

    if (normalized1 === normalized2) return 1.0;

    const words1 = new Set(normalized1.split(/\s+/));
    const words2 = new Set(normalized2.split(/\s+/));

    const intersection = new Set(Array.from(words1).filter(w => words2.has(w)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);

    return intersection.size / union.size;
}

/**
 * Checks if a perspective is too similar to recent history
 */
export function isTooSimilar(
    text: string,
    history: PerspectiveHistory[],
    threshold: number = SIMILARITY_THRESHOLD
): boolean {
    if (!history || history.length === 0) return false;

    return history.some(entry => {
        const similarity = calculateSimilarity(text, entry.text);
        return similarity >= threshold;
    });
}

/**
 * Filters history to keep only entries within retention period
 */
export function filterRecentHistory(
    history: PerspectiveHistory[],
    days: number = HISTORY_RETENTION_DAYS
): PerspectiveHistory[] {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    return history.filter(entry => entry.timestamp >= cutoffTime);
}

/**
 * Adds a new perspective to history with optional metadata
 */
export function addToHistory(
    text: string,
    promptId: string,
    history: PerspectiveHistory[] = [],
    metadata?: { intent?: string; style?: string; theme?: string; trackType?: TrackType }
): PerspectiveHistory[] {
    const filtered = filterRecentHistory(history);
    return [
        {
            text,
            timestamp: Date.now(),
            promptId,
            ...metadata
        },
        ...filtered
    ].slice(0, 50); // Keep max 50 entries
}

/**
 * Loads history from localStorage
 */
export function loadHistory(): PerspectiveHistory[] {
    try {
        const stored = localStorage.getItem('focus_tab_perspective_history');
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        return filterRecentHistory(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
        console.error('Failed to load perspective history', e);
        return [];
    }
}

/**
 * Saves history to localStorage
 */
export function saveHistory(history: PerspectiveHistory[]): void {
    try {
        localStorage.setItem('focus_tab_perspective_history', JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save perspective history', e);
    }
}

/**
 * Calculates how many days in the last 7 days the user opened between 23:00 - 06:00
 */
export function getLateNightStreak(history: PerspectiveHistory[]): number {
    const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const lateNightDates = new Set<string>();

    history.forEach(entry => {
        if (entry.timestamp < last7Days) return;

        const date = new Date(entry.timestamp);
        const hours = date.getHours();

        // Late night defined as 23:00 - 06:00
        if (hours >= 23 || hours < 6) {
            lateNightDates.add(date.toDateString());
        }
    });

    return lateNightDates.size;
}

/**
 * Calculates minutes since the last generated perspective
 */
export function getMinutesSinceLast(history: PerspectiveHistory[]): number {
    if (history.length === 0) return 999;
    const last = history[0].timestamp;
    return Math.floor((Date.now() - last) / (1000 * 60));
}

/**
 * Calculates how many perspectives were generated today
 */
export function getSessionCountToday(history: PerspectiveHistory[]): number {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTs = startOfDay.getTime();

    return history.filter(h => h.timestamp >= startTs).length;
}
