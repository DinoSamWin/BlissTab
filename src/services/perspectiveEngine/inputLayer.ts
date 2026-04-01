import { EngineInput, TimeBlock } from './types';
import { PerspectiveRouterContext } from '../../types';

/**
 * Maps HH:MM string to a specific TimeBlock.
 */
function determineTimeBlock(localTimeStr: string): TimeBlock {
    const [hours, minutes] = localTimeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 5 * 60 && totalMinutes < 8 * 60) return 'early_morning';       // 05:00 - 08:00
    if (totalMinutes >= 8 * 60 && totalMinutes < 11 * 60 + 30) return 'morning';       // 08:00 - 11:30
    if (totalMinutes >= 11 * 60 + 30 && totalMinutes < 13 * 60 + 30) return 'midday';  // 11:30 - 13:30
    if (totalMinutes >= 13 * 60 + 30 && totalMinutes < 17 * 60) return 'afternoon';    // 13:30 - 17:00
    if (totalMinutes >= 17 * 60 && totalMinutes < 21 * 60) return 'evening';           // 17:00 - 21:00
    if (totalMinutes >= 21 * 60 && totalMinutes <= 23 * 60 + 59) return 'night';       // 21:00 - 23:59
    return 'late_night';                                                               // 00:00 - 04:59
}

/**
 * Transforms the raw generic application context into the strict EngineInput required by the pipeline.
 * Ensures we strip out subjective metrics and minute-level precision for generation purposes.
 */
export function buildEngineInput(context: PerspectiveRouterContext): EngineInput {
    // Determine TimeBlock strictly (without exposing raw minutes to the generator)
    const timeBlock = determineTimeBlock(context.local_time || '12:00');

    // Mute/Audio state translation
    const hasAudibleTab = !!context.audio_playing;
    const audibleTabCount = hasAudibleTab ? 1 : 0;

    // Tab Count Buckets
    const rawTabCount = context.tab_count ?? 1;
    let tabCountBucket: 'light' | 'normal' | 'heavy' | 'overloaded' = 'normal';
    if (rawTabCount <= 4) tabCountBucket = 'light';
    else if (rawTabCount <= 10) tabCountBucket = 'normal';
    else if (rawTabCount <= 15) tabCountBucket = 'heavy';
    else tabCountBucket = 'overloaded';

    // Idle Buckets & Reentry State
    const idleTimeSeconds = context.idle_time_seconds ?? 0;
    let idleBucket: 'active' | 'away' | 'long_away' = 'active';
    let reentryState: 'recent_return' | 'continuous' = 'continuous';

    if (idleTimeSeconds >= 30 * 60) {
        idleBucket = 'long_away';
        reentryState = 'recent_return'; // Assume regaining focus after a long absence
    } else if (idleTimeSeconds >= 5 * 60) {
        idleBucket = 'away';
        reentryState = 'recent_return'; // Regaining focus after short absence
    }

    return {
        timeBlock,
        isWeekend: !!context.is_weekend,
        tabCountBucket,
        hasAudibleTab,
        audibleTabCount,
        idleBucket,
        reentryState,
        clickedEmotion: context.clickedEmotion,
        // Optional properties depending on backend/calendar integrations
        // isHoliday: (to be injected if available)
    };
}
