import { Intent, SceneResolution } from './types';

/** Intent is a response job, not a diagnosis of the user. */
export function resolveIntent(resolution: SceneResolution): Intent {
  switch (resolution.scene) {
    case 'emotional_checkin': return 'emotional_acknowledgment';
    case 'refresh_loop': return 'interrupt_autopilot';
    case 'quiet_return': return 'gentle_re_entry';
    case 'overloaded_browser': return 'reduce_scope';
  }

  switch (resolution.baseScene) {
    case 'early_buffer':
    case 'arrival_buffer':
      return 'rhythm_mirroring';
    case 'morning_sustained':
      return 'contextual_greeting';
    case 'pre_lunch_transition':
      return 'work_life_boundary';
    case 'midday_release':
      return 'permission_to_pause';
    case 'post_lunch_reentry':
      return 'gentle_re_entry';
    case 'afternoon_stretch':
      return 'soft_grounding';
    case 'closing_runway':
    case 'evening_transition':
      return 'work_life_boundary';
    case 'late_evening_boundary':
    case 'night_guard':
      return 'soft_closure';
  }
}
