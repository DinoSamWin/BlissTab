import { PerspectiveRouterContext, PerspectivePlan, PerspectivePoolItem, TrackType } from '../types';
import { getAllTrackAffinitiesSync } from './recommendationEngine';
import { isTooSimilar } from './perspectiveService';

/**
 * Perspective Strategy Router (v3.0)
 * "Competitive Selection" Logic for Intent, Style, and Topic Source.
 */

// 1. Time Slot -> Base Intent (8 Micro-Scenes Configuration)
const TIME_SLOTS = [
    { range: [6, 9], intent: 'buffer_resistance', endMin: 30 },        // 06:00 - 08:30 (Extending the buffer early)
    { range: [8, 11], intent: 'buffer_resistance', startMin: 30, endMin: 30 }, // 08:30 - 09:30
    { range: [9, 11], intent: 'noise_deep_water', startMin: 30, endMin: 30 },  // 09:30 - 11:30
    { range: [11, 13], intent: 'human_return', startMin: 30, endMin: 30 },     // 11:30 - 13:30
    { range: [13, 15], intent: 'brain_fog', startMin: 30 },                    // 13:30 - 15:00
    { range: [15, 17], intent: 'last_sprint' },                                // 15:00 - 17:00
    { range: [17, 19], intent: 'severance_escape' },                           // 17:00 - 19:00
    { range: [19, 23], intent: 'compensatory_labor' },                         // 19:00 - 23:00
    { range: [23, 6], intent: 'guard_retreat' },                               // 23:00 - 06:00 (Wraps around)
];

// 2. Style Weights Configuration (V4 based on 8 Micro-Scenes)
const STYLE_WEIGHTS: Record<string, Record<string, number>> = {
    buffer_resistance: {
        micro_action: 30, // A
        reframe: 20,      // A
        micro_story: 30,  // B
        witty: 20         // B
    },
    noise_deep_water: {
        micro_action: 35, // A
        reframe: 25,      // A
        sensory: 25,      // B
        gentle_question: 15 // A
    },
    human_return: {
        witty: 30,       // B
        micro_story: 25, // B
        permission: 25,  // A
        reframe: 20      // A
    },
    brain_fog: {
        permission: 40,  // A
        sensory: 20,     // B
        gentle_question: 20, // A
        micro_story: 20  // B
    },
    last_sprint: {
        micro_action: 35, // A
        reframe: 25,      // A
        sensory: 25,      // B
        gentle_question: 15 // A
    },
    severance_escape: {
        permission: 35,  // A
        reframe: 20,     // A
        sensory: 25,     // B
        micro_story: 20  // B
    },
    compensatory_labor: {
        permission: 40,   // A
        micro_story: 30,  // B
        reframe: 30       // A
    },
    guard_retreat: {
        permission: 40,   // A
        sensory: 35,      // B 
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

    // --- New User Onboarding (The 8 Micro-Scenes Tour) ---
    // For the first 15 generations, ensure the user experiences different scenes.
    if (ctx.recent_history && ctx.recent_history.length < 15) {
        const seenIntents = new Set(ctx.recent_history.map(h => h.intent));
        if (seenIntents.has(intent) && seenIntents.size < TIME_SLOTS.length) {
            // Find intents the user hasn't seen yet
            const unseenIntents = TIME_SLOTS.map(t => t.intent).filter(i => !seenIntents.has(i));
            // Prefer adjacent or any randomly, to showcase the engine's capability
            if (unseenIntents.length > 0) {
                intent = unseenIntents[Math.floor(Math.random() * unseenIntents.length)];
            }
        }
    }

    // --- Overrides ---

    // 1. Weekend Override
    if (ctx.is_weekend && (hours >= 6 && hours < 20)) {
        intent = 'weekend';
    }

    // 2. Work Mode Disabled Override
    if (ctx.work_mode_disabled && ['noise_deep_water', 'last_sprint', 'compensatory_labor'].includes(intent)) {
        intent = 'human_return';
    }

    // 3. Late Night Streak Override
    if (ctx.late_night_streak >= 2) {
        if (hours >= 20 && hours < 23) {
            intent = 'compensatory_labor';
        } else if (hours >= 23 || hours < 6) {
            intent = 'guard_retreat';
        }
    }

    // 3.5. Pattern Recognition Overrides
    const activePatterns = ctx.emotionalPatterns || [];
    let overrideTrack: TrackType | undefined;
    if (activePatterns.includes('AFTERNOON_DIP') && hours >= 14 && hours < 16) {
        overrideTrack = 'B_TIME_ECHO';
    }

    // 4. Session Count Override
    if (ctx.session_count_today >= 6 && intent !== 'guard_retreat' && intent !== 'compensatory_labor') {
        const intentShiftWeights: Record<string, number> = { [intent]: 40, human_return: 30, severance_escape: 30 };
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
        if (['guard_retreat', 'compensatory_labor'].includes(intent)) pCustom -= 0.15;
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
                // 1. Get recent dimensions (last 5) for thematic variety
                const historyDimensions = new Set(ctx.recent_history.slice(0, 5).map(h => h.dimension).filter(Boolean));

                // 2. Get recent texts (last 15) for exact string deduplication
                const recentHistoryForDedupe = ctx.recent_history.slice(0, 15);

                const matchingItems = pool
                    .map((item, idx) => ({ item, idx }))
                    .filter(x => x.item.track === targetTrack);

                if (matchingItems.length > 0) {
                    // Filter 1: Strictly remove anything too similar in text to recently seen items
                    let textUniqueMatches = matchingItems.filter(x => !isTooSimilar(x.item.text, recentHistoryForDedupe, 0.6));

                    // If everything in this track is a repeat, just use whatever is text-unique from anywhere in the pool
                    if (textUniqueMatches.length === 0) {
                        textUniqueMatches = pool
                            .map((item, idx) => ({ item, idx }))
                            .filter(x => !isTooSimilar(x.item.text, recentHistoryForDedupe, 0.6));
                    }

                    // Filter 2: Try to avoid recently seen dimensions (classification codes)
                    let finalMatches = textUniqueMatches;
                    if (textUniqueMatches.length > 0) {
                        const dimensionUniqueMatches = textUniqueMatches.filter(x => !x.item.dimension || !historyDimensions.has(x.item.dimension));
                        if (dimensionUniqueMatches.length > 0) {
                            finalMatches = dimensionUniqueMatches;
                        }
                    }

                    if (finalMatches.length > 0) {
                        const randomMatch = finalMatches[Math.floor(Math.random() * finalMatches.length)];
                        cached_item = randomMatch.item;
                        pool.splice(randomMatch.idx, 1);
                    }
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
