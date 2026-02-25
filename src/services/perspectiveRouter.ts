import { PerspectiveRouterContext, PerspectivePlan, PerspectivePoolItem, TrackType } from '../types';
import { getAllTrackAffinitiesSync } from './recommendationEngine';

/**
 * Perspective Strategy Router (v3.0)
 * "Competitive Selection" Logic for Intent, Style, and Topic Source.
 */

// 1. Time Slot -> Base Intent Configuration
const TIME_SLOTS = [
    { range: [6, 9], intent: 'kickstart' },
    { range: [9, 11], intent: 'focus', endMin: 30 },
    { range: [11, 13], intent: 'lighten', startMin: 30, endMin: 30 },
    { range: [13, 15], intent: 'focus', startMin: 30 },
    { range: [15, 18], intent: 'decompress' },
    { range: [18, 20], intent: 'celebrate' },
    { range: [20, 23], intent: 'care' },
    { range: [23, 6], intent: 'sleep' }, // Wraps around
];

// 2. Style Weights Configuration (V3)
const STYLE_WEIGHTS: Record<string, Record<string, number>> = {
    // V3.5 Dual-Track Weights (A: Interactive, B: Observational)
    kickstart: {
        micro_action: 30, // A
        reframe: 20,      // A
        micro_story: 30,  // B
        witty: 20         // B
    },
    focus: {
        micro_action: 35, // A
        reframe: 25,      // A
        sensory: 25,      // B (New)
        gentle_question: 15 // A
    },
    lighten: {
        witty: 30,       // B
        micro_story: 25, // B
        permission: 25,  // A
        reframe: 20      // A
    },
    decompress: {
        permission: 30,  // A
        reframe: 20,     // A
        sensory: 25,     // B (New)
        micro_story: 25  // B
    },
    celebrate: {
        witty: 35,       // B
        micro_story: 25, // B
        permission: 20,  // A
        reframe: 20      // A
    },
    care: {
        permission: 40,   // A
        micro_story: 30,  // B
        reframe: 30       // A
    },
    sleep: {
        permission: 40,   // A
        sensory: 35,      // B (New)
        gentle_question: 25 // A
    },
    weekend: {
        micro_story: 35, // B
        witty: 30,       // B
        permission: 20,  // A
        gentle_question: 15 // A
    },
};

const LANGUAGE_CONSTRAINTS: Record<string, number> = {
    'zh-CN': 42,
    'ja-JP': 42,
    'en-US': 90,
    'de-DE': 120,
};

function getTimeSlot(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    for (const slot of TIME_SLOTS) {
        let [startH, endH] = slot.range;

        let startMin = (slot.startMin || 0) + startH * 60;
        let endMin = (slot.endMin || 0) + endH * 60;

        if (startH > endH) {
            // Wraps midnight (e.g. 23:00 to 06:00)
            if (totalMinutes >= startMin || totalMinutes < endMin) return slot.intent;
        } else {
            if (totalMinutes >= startMin && totalMinutes < endMin) return slot.intent;
        }
    }
    return 'focus';
}

function weightedPick(weights: Record<string, number>, cooldowns: Record<string, number> = {}): string {
    const entries = Object.entries(weights).map(([key, weight]) => {
        let finalWeight = weight;
        if (cooldowns[key]) {
            finalWeight *= cooldowns[key];
        }
        return { key, weight: finalWeight };
    });

    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    if (total === 0) return entries[0].key;

    let r = Math.random() * total;
    for (const { key, weight } of entries) {
        r -= weight;
        if (r <= 0) return key;
    }
    return entries[0].key;
}

export function routePerspective(ctx: PerspectiveRouterContext, pool?: PerspectivePoolItem[]): PerspectivePlan & { cached_item?: PerspectivePoolItem } {
    let intent = getTimeSlot(ctx.local_time);
    const hours = parseInt(ctx.local_time.split(':')[0]);

    // ... (Existing Overrides) ...
    // Note: I will need to re-include the existing overrides here or splice carefully.
    // To avoid deleting the overrides, I will target the function start and end carefully.
    // Actually, I should use multi_replace or view the file again to be safe.
    // But I have the file content in history.

    // 1. Weekend Override
    if (ctx.is_weekend && (hours >= 6 && hours < 20)) {
        intent = 'weekend';
    }

    // 2. Work Mode Disabled Override
    if (ctx.work_mode_disabled && ['focus', 'decompress', 'care'].includes(intent)) {
        intent = 'lighten';
    }

    // 3. Late Night Streak Override
    if (ctx.late_night_streak >= 2) {
        if (hours >= 20 && hours < 23) {
            intent = 'care';
        } else if (hours >= 23 || hours < 6) {
            intent = 'sleep';
        }
    }

    // 3.5. Pattern Recognition Overrides
    const activePatterns = ctx.emotionalPatterns || [];
    let overrideTrack: TrackType | undefined;
    if (activePatterns.includes('AFTERNOON_DIP') && hours >= 14 && hours < 16) {
        overrideTrack = 'B_TIME_ECHO';
    }

    // 4. Session Count Override
    if (ctx.session_count_today >= 6 && intent !== 'sleep' && intent !== 'care') {
        const intentShiftWeights: Record<string, number> = { [intent]: 40, lighten: 30, decompress: 30 };
        intent = weightedPick(intentShiftWeights);
    }

    // --- Topic Source Selection (Competitive Selection) ---
    const customThemes = ctx.custom_themes || [];
    let topicSource: 'custom' | 'context' = 'context';

    if (ctx.theme_only && customThemes.length > 0) {
        topicSource = 'custom';
    } else if (customThemes.length > 0) {
        let pCustom = 0.55 + 0.05 * customThemes.length;
        pCustom = Math.max(0.55, Math.min(0.85, pCustom));
        if (['sleep', 'care'].includes(intent)) pCustom -= 0.15;
        if (ctx.session_count_today >= 6) pCustom += 0.10;
        pCustom = Math.max(0, Math.min(1, pCustom));

        if (Math.random() < pCustom) topicSource = 'custom';
    }

    // --- Selected Theme Logic ---
    let selectedTheme: string | undefined;
    if (topicSource === 'custom' && customThemes.length > 0) {
        // Theme Cooldown Logic (Simplified for brevity as we need to support pool)
        const recentThemes = ctx.recent_history.slice(0, 5).map(h => h.theme);
        const themeCooldowns: Record<string, number> = {};
        const themeCounts: Record<string, number> = {};
        recentThemes.forEach(t => { if (t) themeCounts[t] = (themeCounts[t] || 0) + 1; });
        Object.entries(themeCounts).forEach(([t, count]) => { if (count >= 2) themeCooldowns[t] = 0.4; });

        const themeWeights = Object.fromEntries(customThemes.map(t => [t, 100]));
        selectedTheme = weightedPick(themeWeights, themeCooldowns);
    }

    // --- Style Selection Logic (Advanced Cooldowns) ---
    const baseWeights = STYLE_WEIGHTS[intent] || STYLE_WEIGHTS['focus'];
    const recentStyles = ctx.recent_history.slice(0, 5).map(h => h.style);
    const styleCooldowns: Record<string, number> = {};

    // 1. Immediate Repetition
    recentStyles.slice(0, 2).forEach(s => { if (s) styleCooldowns[s] = 0.2; });

    // 2. Frequency Fatigue
    const styleCounts: Record<string, number> = {};
    recentStyles.forEach(s => { if (s) styleCounts[s] = (styleCounts[s] || 0) + 1; });
    Object.entries(styleCounts).forEach(([s, count]) => { if (count >= 3) styleCooldowns[s] = 0.3; });

    // 3. Forced Variation
    if (ctx.minutes_since_last <= 3 && recentStyles.length > 0) {
        const lastStyle = recentStyles[0];
        if (lastStyle) styleCooldowns[lastStyle] = 0.01;
    }

    // POOL CHECK: If pool provided, try to find a match
    let cached_item: PerspectivePoolItem | undefined;
    if (pool && pool.length > 0) {

        // --- Epsilon-Greedy ECRA Selection (V7.0) ---
        const EPSILON = 0.15; // 15% exploration, 85% exploitation
        const affinities = getAllTrackAffinitiesSync();

        const poolTracks = Array.from(new Set(pool.map(p => p.track).filter(Boolean))) as TrackType[];

        if (poolTracks.length > 0) {
            let targetTrack: TrackType | undefined;

            // Exploration vs Exploitation
            if (Math.random() < EPSILON) {
                targetTrack = poolTracks[Math.floor(Math.random() * poolTracks.length)];
                console.log('[ECRA] Exploring track:', targetTrack);
            } else {
                let maxAff = -1;
                for (const t of poolTracks) {
                    const aff = affinities[t] ?? 1.0;
                    if (aff > maxAff) {
                        maxAff = aff;
                        targetTrack = t;
                    }
                }
                console.log('[ECRA] Exploiting track:', targetTrack, 'Affinity:', maxAff);
            }

            // Apply specific pattern override if any
            if (overrideTrack && poolTracks.includes(overrideTrack)) {
                targetTrack = overrideTrack;
                console.log('[ECRA] Pattern Override active, forcing track:', targetTrack);
            }

            if (targetTrack) {
                const matchingIndices = pool
                    .map((item, idx) => ({ item, idx }))
                    .filter(x => x.item.track === targetTrack);

                if (matchingIndices.length > 0) {
                    // Random pick among matches for variety
                    const randomMatch = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
                    cached_item = randomMatch.item;
                    pool.splice(randomMatch.idx, 1);
                }
            }
        }

        // Fallback for empty/legacy pools
        if (!cached_item) {
            cached_item = pool.shift();
        }

        if (cached_item) {
            return {
                intent,
                style: cached_item.style,
                topic_source: topicSource,
                selected_theme: selectedTheme,
                language: ctx.language,
                max_length_chars: LANGUAGE_CONSTRAINTS[ctx.language] || 42,
                allow_one_comma: true,
                cached_item
            };
        }
    }

    // Normal Path (No pool or empty pool)
    const style = weightedPick(baseWeights, styleCooldowns);

    return {
        intent,
        style,
        topic_source: topicSource,
        selected_theme: selectedTheme,
        language: ctx.language,
        max_length_chars: LANGUAGE_CONSTRAINTS[ctx.language] || 42,
        allow_one_comma: true
    };
}
