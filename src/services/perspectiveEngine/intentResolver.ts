import { SceneResolution, Intent, Scene } from './types';

/**
 * Resolves the Intent (objective) based on the current Scene.
 * Intent is strictly determined by the Scene.
 */
export function resolveIntent(sceneResolution: SceneResolution): Intent {
    const { scene } = sceneResolution;

    switch (scene) {
        // Overrides
        case 'emotional_checkin':
            return 'emotional_acknowledgment';
        case 'quiet_return':
            return 'gentle_re_entry';
        case 'overloaded_browser':
            return 'light_focus_support';

        // Time-based specific intents
        case 'morning_buffer':
        case 'evening_exhale':
            return 'rhythm_mirroring';

        case 'late_day_drag':
        case 'night_overhang':
            return 'soft_closure';

        case 'afternoon_scatter':
            return 'soft_grounding';

        // Fallbacks / Contextual Greetings for general time flows
        case 'workday_ramp_up':
        case 'late_morning_flow':
        case 'midday_transition':
            return 'contextual_greeting';
            
        default:
            return 'contextual_greeting';
    }
}
