export * from './types';
export * from './inputLayer';
export * from './sceneResolver';
export * from './intentResolver';
export * from './emotionBiasResolver';
export * from './strategySelector';
export * from './noveltyPlanner';
export * from './generator';
export * from './candidateValidator';
export * from './fallbackLibrary';

import { PerspectiveRouterContext } from '../../types';
import { buildCompanionPrompt } from './generator';
import { resolveEmotionBias } from './emotionBiasResolver';
import { buildEngineInput } from './inputLayer';
import { resolveIntent } from './intentResolver';
import { buildNoveltyPlan } from './noveltyPlanner';
import { resolveScene } from './sceneResolver';
import { selectResponseStrategy } from './strategySelector';
import { Dimension, PipelineState } from './types';

function dimensionForTrack(track: PipelineState['noveltyPlan']['targetTrack']): Dimension {
  if (track === 'sensory_reset') return 'sensory';
  return 'mixed';
}

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function refreshStage(input: PipelineState['input']): string {
  if (!input.isManualRefresh) return 'none';
  if (input.consecutiveClicks <= 2) return 'alternate';
  if (input.consecutiveClicks === 3) return 'interrupt';
  if (input.consecutiveClicks === 4) return 'offscreen_shift';
  if (input.consecutiveClicks === 5) return 'leave_permission';
  return 'wide_perspective';
}

function buildStateFingerprint(state: Omit<PipelineState, 'stateFingerprint'>): string {
  const { input, sceneResolution } = state;
  return [
    input.localDate,
    input.dayKind,
    input.weekday,
    sceneResolution.baseScene,
    sceneResolution.scene,
    [...sceneResolution.modifiers].sort().join('+') || 'plain',
    input.clickedEmotion || 'no_emotion',
    input.tabCountBucket,
    input.tabCountScope,
    input.reentryState,
    input.confirmedWorkStatus || 'work_status_unknown',
    `refresh:${refreshStage(input)}`,
    `holiday_day:${input.holidayDayIndex ?? 'none'}`,
    `days_to_holiday:${input.daysToHoliday ?? 'none'}`,
    `days_since_holiday:${input.daysSinceHoliday ?? 'none'}`,
    input.selectedPersona,
    `themes:${compactHash([...input.customThemes].sort().join('|') || 'none')}`,
    input.userLanguage
  ].join('|');
}

function buildFactBoundary(input: PipelineState['input'], resolution: PipelineState['sceneResolution']) {
  const knownFacts = [
    `time_block:${input.timeBlock}`,
    `base_scene:${resolution.baseScene}`,
    `weekday:${input.weekday}`,
    `day_kind:${input.dayKind}`,
    `trigger:${input.trigger}`
  ];

  if (input.tabCountBucket !== 'unknown') knownFacts.push(`tab_bucket:${input.tabCountBucket}`);
  if (input.audibleStateKnown) knownFacts.push(`audio:${input.hasAudibleTab ? 'present' : 'absent'}`);
  if (input.reentryState !== 'unknown') knownFacts.push(`reentry:${input.reentryState}`);
  if (input.clickedEmotion) knownFacts.push(`explicit_emotion:${input.clickedEmotion}`);
  if (input.holidayPhase !== 'none') knownFacts.push(`holiday_phase:${input.holidayPhase}`);
  if (input.holidayDayIndex !== undefined) knownFacts.push(`holiday_day_index:${input.holidayDayIndex}`);
  if (input.daysToHoliday !== undefined) knownFacts.push(`days_to_holiday:${input.daysToHoliday}`);
  if (input.daysSinceHoliday !== undefined) knownFacts.push(`days_since_holiday:${input.daysSinceHoliday}`);
  if (input.confirmedWorkStatus) knownFacts.push(`confirmed_work_status:${input.confirmedWorkStatus}`);
  if (input.isFirstInTimeBlock) knownFacts.push('first_content_in_time_block:true');
  if (input.customThemes.length > 0) knownFacts.push(`user_themes:${input.customThemes.slice(0, 3).join(',')}`);

  const forbiddenAssumptions = [
    'Do not claim the user is at work, in an office, or in a meeting unless explicitly provided.',
    'Do not claim the user is hungry, has just eaten, or has taken a nap.',
    'Do not diagnose fatigue, anxiety, sadness, anger, or burnout without an explicit emotion click.',
    'Do not state exact clock time, exact tab count, URLs, battery percentage, or refresh count.',
    'Do not claim the user has finished work or is working overtime from clock time alone.'
  ];
  if (input.confirmedWorkStatus !== 'workplace_arrival') {
    forbiddenAssumptions.push('Do not claim the user has arrived at a company, office, or workstation.');
  }
  if (input.confirmedWorkStatus !== 'off_work') {
    forbiddenAssumptions.push('Do not claim the user has just finished work.');
  }
  if (input.confirmedWorkStatus !== 'overtime') {
    forbiddenAssumptions.push('Do not state that the user is working overtime; late activity is only a weak signal.');
  }
  if (input.tabCountBucket === 'unknown') {
    forbiddenAssumptions.push('Tab load is unknown; do not describe a crowded screen or many open tabs.');
  }
  if (!input.weatherKnown) forbiddenAssumptions.push('Weather is unknown; do not mention weather.');
  if (!input.audibleStateKnown || !input.hasAudibleTab) {
    forbiddenAssumptions.push('Do not mention music, audio, headphones, or background sound.');
  }
  if (!resolution.modifiers.includes('possible_work_overhang')) {
    forbiddenAssumptions.push('Do not label the current moment as overtime.');
  }

  return { knownFacts, forbiddenAssumptions };
}

/** Resolves every deterministic decision without invoking the language model. */
export function resolveCompanionState(context: PerspectiveRouterContext): PipelineState {
  const input = buildEngineInput(context);
  const sceneResolution = resolveScene(input);
  const intent = resolveIntent(sceneResolution);
  const emotionBias = resolveEmotionBias(input, sceneResolution);
  const strategy = selectResponseStrategy(sceneResolution, intent, emotionBias);
  const noveltyPlan = buildNoveltyPlan(input, sceneResolution, strategy, context.recent_history || []);
  const dimension = dimensionForTrack(noveltyPlan.targetTrack);
  const { knownFacts, forbiddenAssumptions } = buildFactBoundary(input, sceneResolution);
  const isChinese = /chinese|zh/i.test(input.userLanguage);

  const stateWithoutFingerprint: Omit<PipelineState, 'stateFingerprint'> = {
    input,
    sceneResolution,
    intent,
    emotionBias,
    strategy,
    dimension,
    noveltyPlan,
    knownFacts,
    forbiddenAssumptions,
    constraints: {
      englishWordsRange: [7, 16],
      chineseCharsRange: [12, 28],
      maxLengthChars: isChinese ? 60 : 90
    }
  };

  return {
    ...stateWithoutFingerprint,
    stateFingerprint: buildStateFingerprint(stateWithoutFingerprint)
  };
}

/**
 * Main entry point. The model receives only a resolved policy packet and may
 * render wording; it is not allowed to reinterpret the user's state.
 */
export function runCompanionPipeline(
  context: PerspectiveRouterContext,
  language: string,
  batchSize: number = 8
): { system: string; user: string; state: PipelineState } {
  const state = resolveCompanionState(context);
  const { system, user } = buildCompanionPrompt(state, language, batchSize);
  return { system, user, state };
}
