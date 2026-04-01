import { EngineInput, SceneResolution, Scene, BaseTimeScene, OverrideScene } from './types';

// Constants for threshold tuning
const OVERLOADED_TAB_COUNT = 15;
const QUIET_RETURN_IDLE_SECONDS = 30 * 60; // 30 minutes

/**
 * Resolves the 8 base time scenes strictly based on time block.
 */
function resolveBaseTimeScene(input: EngineInput): BaseTimeScene {
    switch (input.timeBlock) {
        case 'early_morning':
            return 'morning_buffer';
        case 'morning':
            return 'workday_ramp_up'; // Note: In future, could check late_morning_flow if we refine TimeBlocks
        case 'midday':
            return 'midday_transition';
        case 'afternoon':
            return 'afternoon_scatter';
        case 'evening':
            return 'evening_exhale';
        case 'night':
        case 'late_night':
            // Distinguish late_day_drag from night_overhang based on time or behavior, 
            // but for simplicity let's map night -> night_overhang
            return 'night_overhang';
        default:
            return 'midday_transition';
    }
}

/**
 * Resolves day-level modifiers (calendar specific tones).
 */
function resolveDayTone(input: EngineInput): SceneResolution['dayToneModifier'] {
    if (input.isWeekend) {
        // Simple trick: Saturday is weekend, Sunday is weekend. 
        // We might need weekday 0-6 to perfectly distinguish Sunday.
        // Assuming we pass weekday in the future, but for now we fallback to soft_weekend.
        return 'soft_weekend';
    }
    if (input.isHoliday) {
        return 'holiday_drift';
    }
    return undefined;
}

/**
 * Resolves the final Scene according to prioritization (Overrides > Base).
 */
export function resolveScene(input: EngineInput): SceneResolution {
    // 1. Highest Priority Override: explicit emotion check-in
    if (input.clickedEmotion) {
        return {
            scene: 'emotional_checkin',
            isOverride: true
        };
    }

    // 2. Secondary Override: Quiet returning user (Reentry event + Away state)
    // Now depends on abstracted buckets rather than a hardcoded 30 minutes.
    if (input.reentryState === 'recent_return' && (input.idleBucket === 'away' || input.idleBucket === 'long_away')) {
        return {
            scene: 'quiet_return',
            isOverride: true,
            dayToneModifier: resolveDayTone(input)
        };
    }

    // 3. Tertiary Override: Overloaded browser
    if (input.tabCountBucket === 'heavy' || input.tabCountBucket === 'overloaded') {
        return {
            scene: 'overloaded_browser',
            isOverride: true,
            dayToneModifier: resolveDayTone(input)
        };
    }

    // 4. Fallback exactly to the Base Time Scene
    return {
        scene: resolveBaseTimeScene(input),
        isOverride: false,
        dayToneModifier: resolveDayTone(input)
    };
}
