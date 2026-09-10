import { EmotionBias, Intent, ResponseStrategy, SceneResolution } from './types';

export function selectResponseStrategy(
  resolution: SceneResolution,
  intent: Intent,
  emotionBias: EmotionBias
): ResponseStrategy {
  if (resolution.scene === 'quiet_return') return 'reentry';
  if (resolution.scene === 'refresh_loop') return 'interrupt';
  if (resolution.scene === 'overloaded_browser') return 'reduce';

  if (resolution.scene === 'emotional_checkin' || resolution.scene === 'emotional_followup') {
    if (emotionBias === 'anxious' || emotionBias === 'scattered') return 'ground';
    if (emotionBias === 'tired' || emotionBias === 'heavy') return 'soothe';
    return 'mirror';
  }

  switch (intent) {
    case 'rhythm_mirroring': return 'rhythm';
    case 'soft_grounding': return 'ground';
    case 'reduce_scope': return 'reduce';
    case 'permission_to_pause':
    case 'work_life_boundary':
    case 'soft_closure':
      return 'release';
    case 'gentle_re_entry': return 'reentry';
    case 'interrupt_autopilot': return 'interrupt';
    case 'emotional_acknowledgment': return 'soothe';
    case 'contextual_greeting':
    default:
      return 'mirror';
  }
}
