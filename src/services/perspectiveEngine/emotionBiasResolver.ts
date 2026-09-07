import { EmotionBias, EngineInput, SceneResolution } from './types';

/**
 * Bias controls pacing only. It must never be surfaced as a claim unless the
 * user explicitly selected an emotion.
 */
export function resolveEmotionBias(input: EngineInput, resolution: SceneResolution): EmotionBias {
  if (input.clickedEmotion) {
    switch (input.clickedEmotion) {
      case 'happy': return 'positive';
      case 'neutral': return 'okay';
      case 'anxious': return 'anxious';
      case 'exhausted': return 'tired';
      case 'angry':
      case 'sad':
        return 'heavy';
    }
  }

  if (resolution.scene === 'overloaded_browser' || resolution.baseScene === 'afternoon_stretch') {
    return 'scattered';
  }
  if (resolution.baseScene === 'late_evening_boundary' || resolution.baseScene === 'night_guard') {
    return 'tired';
  }
  return 'okay';
}
