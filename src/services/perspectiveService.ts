import { PerspectiveHistory, TrackType } from '../types';

const HISTORY_RETENTION_DAYS = 14;
const MAX_RETRIES = 3;
const SIMILARITY_THRESHOLD = 0.58; // 0-1, tuned for short CJK copy

/**
 * Normalizes text for comparison by removing tags and extra whitespace
 */
function normalizeText(text: string): string {
    return text
        .replace(/\[h\](.*?)\[\/h\]/g, '$1') // Remove highlight tags but keep content
        .toLowerCase()
        .trim()
        .replace(/[\s\p{P}\p{S}]+/gu, '');
}

function createNgrams(text: string, size: number): Set<string> {
    const result = new Set<string>();
    if (text.length <= size) {
        if (text) result.add(text);
        return result;
    }
    for (let i = 0; i <= text.length - size; i += 1) {
        result.add(text.slice(i, i + size));
    }
    return result;
}

function jaccard(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    setA.forEach(value => {
        if (setB.has(value)) intersection += 1;
    });
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function longestCommonSubsequenceRatio(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    const row = new Array<number>(text2.length + 1).fill(0);
    for (const char of text1) {
        let diagonal = 0;
        for (let index = 1; index <= text2.length; index += 1) {
            const previous = row[index];
            row[index] = char === text2[index - 1]
                ? diagonal + 1
                : Math.max(row[index], row[index - 1]);
            diagonal = previous;
        }
    }
    return (2 * row[text2.length]) / (text1.length + text2.length);
}

/**
 * Calculates simple word-based similarity between two texts
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarity(text1: string, text2: string): number {
    const normalized1 = normalizeText(text1);
    const normalized2 = normalizeText(text2);

    if (normalized1 === normalized2) return 1.0;

    const containsCjk = /[\u3400-\u9fff\uf900-\ufaff]/.test(`${normalized1}${normalized2}`);
    if (containsCjk) {
        const bigramScore = jaccard(createNgrams(normalized1, 2), createNgrams(normalized2, 2));
        const trigramScore = jaccard(createNgrams(normalized1, 3), createNgrams(normalized2, 3));
        const ngramScore = bigramScore * 0.65 + trigramScore * 0.35;
        // Short Chinese paraphrases can preserve most of the sentence while
        // changing enough adjacent pairs to defeat n-gram Jaccard. LCS catches
        // that case; the discount avoids treating merely shared particles as a
        // full duplicate.
        const sequenceScore = longestCommonSubsequenceRatio(normalized1, normalized2) * 0.86;
        return Math.max(ngramScore, sequenceScore);
    }

    const words1 = new Set(text1.toLowerCase().trim().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().trim().split(/\s+/));

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
    metadata?: {
        intent?: string;
        style?: string;
        theme?: string;
        trackType?: TrackType;
        dimension?: string;
        contentTrack?: PerspectiveHistory['contentTrack'];
        semanticCore?: string;
        actionTag?: string;
        objectTag?: string;
        metaphorTag?: string;
        openerTag?: string;
        sentenceShape?: string;
        stateFingerprint?: string;
        environmentFingerprint?: string;
        promptVersion?: string;
        timeBlock?: string;
    }
): PerspectiveHistory[] {
    const filtered = filterRecentHistory(history);
    // Synthetic Dimension (Classification Code) for deduplication if missing
    let finalMetadata = { ...metadata };
    if (!finalMetadata.dimension) {
        // Fallback code format: inferred_[intent]_[style]
        const fallbackId = `${metadata?.intent || 'unknown'}_${metadata?.style || 'generic'}`;
        finalMetadata.dimension = `inferred_${fallbackId}`;
    }

    return [
        {
            text,
            timestamp: Date.now(),
            promptId,
            ...finalMetadata
        },
        ...filtered
    ].slice(0, 100); // Keep max 100 entries
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
