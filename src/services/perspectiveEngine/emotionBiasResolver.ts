import type { EmotionType } from '../../types';
import type { EmotionBias, EmotionTransition, EngineInput, SceneResolution } from './types';

const DIFFICULT_EMOTIONS = new Set<EmotionType>(['angry', 'anxious', 'sad', 'exhausted']);

export function resolveEmotionTransition(
  currentEmotion: EmotionType | undefined,
  previousEmotion: EmotionType | undefined
): EmotionTransition {
  if (!currentEmotion) return 'none';
  if (!previousEmotion) return 'first_signal';
  if (currentEmotion === previousEmotion) return 'same_emotion';

  const previousIsDifficult = DIFFICULT_EMOTIONS.has(previousEmotion);
  const currentIsDifficult = DIFFICULT_EMOTIONS.has(currentEmotion);
  if (currentEmotion === 'happy' && previousEmotion !== 'happy') return 'uplift';
  if (currentEmotion === 'neutral' && previousIsDifficult) return 'settling';
  if (currentIsDifficult && (previousEmotion === 'happy' || previousEmotion === 'neutral')) return 'drop';
  if (previousIsDifficult && currentIsDifficult) return 'difficult_shift';
  return 'other_shift';
}

/**
 * Bias controls pacing only. It must never be surfaced as a claim unless the
 * user explicitly selected an emotion.
 */
export function resolveEmotionBias(input: EngineInput, resolution: SceneResolution): EmotionBias {
  if (input.activeEmotion) {
    switch (input.activeEmotion) {
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
