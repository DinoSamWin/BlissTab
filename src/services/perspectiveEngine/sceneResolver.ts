import {
  BaseTimeScene,
  EngineInput,
  Scene,
  SceneModifier,
  SceneResolution,
  SignalConfidence
} from './types';

function resolveBaseTimeScene(input: EngineInput): BaseTimeScene {
  switch (input.timeBlock) {
    case 'early_morning': return 'early_buffer';
    case 'arrival_window': return 'arrival_buffer';
    case 'morning_focus': return 'morning_sustained';
    case 'pre_lunch': return 'pre_lunch_transition';
    case 'midday_break': return 'midday_release';
    case 'post_lunch_reset': return 'post_lunch_reentry';
    case 'afternoon': return 'afternoon_stretch';
    case 'closing_window': return 'closing_runway';
    case 'evening': return 'evening_transition';
    case 'late_evening': return 'late_evening_boundary';
    case 'late_night': return 'night_guard';
  }
}

function resolveModifiers(input: EngineInput): { modifiers: SceneModifier[]; evidence: string[] } {
  const modifiers: SceneModifier[] = [];
  const evidence: string[] = [`time_block:${input.timeBlock}`];

  if (input.dayKind === 'adjusted_workday') modifiers.push('adjusted_workday');
  if (input.dayKind === 'rest_day') modifiers.push('soft_weekend');
  if (input.dayKind === 'public_holiday') modifiers.push('public_holiday');
  if ((input.dayKind === 'workday' || input.dayKind === 'adjusted_workday') && input.weekday === 1) {
    modifiers.push('monday_return');
  }
  if ((input.dayKind === 'workday' || input.dayKind === 'adjusted_workday') && input.weekday === 5) {
    modifiers.push('friday_release');
  }

  if (input.holidayPhase !== 'none') {
    modifiers.push(input.holidayPhase);
    evidence.push(`holiday_phase:${input.holidayPhase}`);
  }

  if (input.tabCountBucket === 'heavy') {
    modifiers.push('tab_heavy');
    evidence.push('tab_bucket:heavy');
  } else if (input.tabCountBucket === 'overloaded') {
    modifiers.push('tab_overload');
    evidence.push('tab_bucket:overloaded');
  }

  if ((input.tabSwitches10m || 0) >= 12) {
    modifiers.push('rapid_switching');
    evidence.push('tab_switches_10m:high');
  }

  if (input.reentryState === 'recent_return') {
    modifiers.push('recent_return');
    evidence.push(`reentry:${input.idleBucket}`);
  }

  if (input.isManualRefresh) {
    modifiers.push('manual_refresh');
    evidence.push(`refresh_streak:${input.consecutiveClicks}`);
  }
  if (input.isManualRefresh && input.consecutiveClicks >= 3) modifiers.push('refresh_streak');
  if (input.hasAudibleTab) modifiers.push('audio_present');

  const hasSustainedLateActivity = (input.sessionDurationMinutes || 0) >= 60
    || (input.tabSwitches10m || 0) >= 12;
  if (
    input.timeBlock === 'late_evening'
    && (input.dayKind === 'workday' || input.dayKind === 'adjusted_workday')
    && hasSustainedLateActivity
  ) {
    modifiers.push('possible_work_overhang');
    evidence.push('late_activity:sustained');
  }

  return { modifiers, evidence };
}

/**
 * Chooses one primary scene while retaining every compatible modifier. A
 * higher-priority event never erases the underlying time scene.
 */
export function resolveScene(input: EngineInput): SceneResolution {
  const baseScene = resolveBaseTimeScene(input);
  const { modifiers, evidence } = resolveModifiers(input);
  let scene: Scene = baseScene;
  let confidence: SignalConfidence = 'high';

  if (input.clickedEmotion) {
    scene = 'emotional_checkin';
    evidence.unshift(`explicit_emotion:${input.clickedEmotion}`);
  } else if (modifiers.includes('manual_refresh')) {
    scene = 'refresh_loop';
  } else if (modifiers.includes('recent_return')) {
    scene = 'quiet_return';
    confidence = input.confidence.reentry;
  } else if (modifiers.includes('tab_overload') || modifiers.includes('tab_heavy')) {
    scene = 'overloaded_browser';
    confidence = input.confidence.browser;
  }

  return {
    baseScene,
    scene,
    isOverride: scene !== baseScene,
    modifiers,
    evidence,
    confidence
  };
}
