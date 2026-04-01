import { SceneResolution, Intent, EmotionBias, ResponseStrategy } from './types';

/**
 * Selects the final Response Strategy based on Scene, Intent, and Emotion Bias.
 */
export function selectResponseStrategy(resolution: SceneResolution, intent: Intent, emotionBias: EmotionBias): ResponseStrategy {
    // 1. Direct mappings based on override scenes
    if (resolution.scene === 'quiet_return') {
        return 'reentry';
    }
    
    if (resolution.scene === 'emotional_checkin') {
        // Break down emotional_checkin by emotionBias rather than blanket mapping
        if (emotionBias === 'anxious' || emotionBias === 'scattered') return 'ground';
        if (emotionBias === 'tired' || emotionBias === 'heavy') return 'soothe';
        return 'mirror';
    }
    
    if (resolution.scene === 'overloaded_browser') {
        return 'focus';
    }

    // 2. Mappings based on Intent / Base Scenes
    switch (intent) {
        case 'rhythm_mirroring':
            return 'rhythm';
            
        case 'soft_grounding':
            return 'ground';
            
        case 'soft_closure':
            return 'soothe'; // Changed from 'rhythm' based on user feedback
            
        case 'light_focus_support':
            return 'focus';
            
        case 'contextual_greeting':
        default:
            // Standard fallback is Mirror for default cases
            return 'mirror';
    }
}
