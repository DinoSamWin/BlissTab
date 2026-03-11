import { EngineInput, SceneResolution, EmotionBias } from './types';

/**
 * Resolves the Emotion Bias based on raw inputs and the resolved Scene.
 * The system infers a "bias" or "tilt" rather than diagnosing the user's emotion.
 */
export function resolveEmotionBias(input: EngineInput, resolution: SceneResolution): EmotionBias {
    // 1. Highest Priority: Explicit User Emotion Selection
    if (input.clickedEmotion) {
        switch (input.clickedEmotion) {
            case 'happy':
                return 'positive';
            case 'neutral':
                return 'okay';
            case 'angry':
            case 'sad':
                return 'heavy';
            case 'anxious':
                return 'anxious';
            case 'exhausted':
                return 'tired';
            default:
                return 'okay';
        }
    }

    // 2. Secondary Priority: Derived from Scene Bias
    switch (resolution.scene) {
        case 'overloaded_browser':
        case 'afternoon_scatter':
            return 'scattered';
            
        case 'late_day_drag':
        case 'night_overhang':
            return 'tired';
            
        case 'morning_buffer':
        case 'workday_ramp_up':
        case 'late_morning_flow':
        case 'midday_transition':
        case 'evening_exhale':
        case 'quiet_return':
            // Assume neutrally okay or calm
            return 'okay';
            
        default:
            return 'okay';
    }
}
