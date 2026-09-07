import assert from 'node:assert/strict';
import { calculateSimilarity } from './src/services/perspectiveService.ts';
import {
  getStateAwareFallback,
  runCompanionPipeline,
  validatePerspectiveCandidate
} from './src/services/perspectiveEngine/index.ts';
import type { PerspectiveRouterContext } from './src/types.ts';

function context(overrides: Partial<PerspectiveRouterContext>): PerspectiveRouterContext {
  return {
    local_time: '12:00',
    local_date: '2026-09-08',
    timezone: 'Asia/Shanghai',
    weekday: 2,
    is_weekend: false,
    day_kind: 'workday',
    session_count_today: 1,
    minutes_since_last: 30,
    late_night_streak: 0,
    recent_history: [],
    language: 'Chinese (Simplified)',
    allow_context_sensing: false,
    ...overrides
  };
}

function stateFor(overrides: Partial<PerspectiveRouterContext>) {
  return runCompanionPipeline(context(overrides), 'Chinese (Simplified)', 4).state;
}

const mondayEvening = stateFor({
  local_date: '2026-09-07',
  weekday: 1,
  local_time: '20:10'
});
assert.equal(mondayEvening.sceneResolution.baseScene, 'evening_transition');
assert.ok(mondayEvening.sceneResolution.modifiers.includes('monday_return'));
assert.ok(!mondayEvening.sceneResolution.modifiers.includes('possible_work_overhang'));
assert.ok(mondayEvening.forbiddenAssumptions.some(rule => rule.includes('overtime')));

const earlyArrival = stateFor({ local_time: '07:00' });
assert.equal(earlyArrival.sceneResolution.baseScene, 'early_buffer');
assert.equal(earlyArrival.sceneResolution.scene, 'early_buffer');
assert.equal(earlyArrival.input.confirmedWorkStatus, undefined);

const confirmedEarlyArrival = stateFor({
  local_time: '07:00',
  confirmed_work_status: 'workplace_arrival'
});
assert.ok(confirmedEarlyArrival.knownFacts.includes('confirmed_work_status:workplace_arrival'));
assert.equal(
  getStateAwareFallback(confirmedEarlyArrival, 'Chinese (Simplified)')?.text,
  '人已经到公司了，脑子可以晚几分钟打卡。'
);

const preLunch = stateFor({ local_time: '11:50' });
assert.equal(preLunch.sceneResolution.baseScene, 'pre_lunch_transition');
assert.equal(preLunch.sceneResolution.scene, 'pre_lunch_transition');

const preHoliday = stateFor({
  local_time: '16:00',
  holiday_phase: 'pre_holiday',
  days_to_holiday: 1
});
assert.ok(preHoliday.sceneResolution.modifiers.includes('pre_holiday'));
assert.ok(preHoliday.knownFacts.includes('days_to_holiday:1'));

const publicHoliday = stateFor({
  day_kind: 'public_holiday',
  holiday_phase: 'holiday_middle',
  holiday_day_index: 3,
  is_weekend: false
});
assert.ok(publicHoliday.sceneResolution.modifiers.includes('public_holiday'));
assert.ok(publicHoliday.sceneResolution.modifiers.includes('holiday_middle'));

const overloadedPreLunch = stateFor({
  local_time: '11:50',
  allow_context_sensing: true,
  browser_context_observed_at: Date.now(),
  tab_count: 18,
  tab_count_scope: 'all_browser_tabs'
});
assert.equal(overloadedPreLunch.input.tabCountBucket, 'overloaded');
assert.equal(overloadedPreLunch.sceneResolution.scene, 'overloaded_browser');
assert.equal(overloadedPreLunch.sceneResolution.baseScene, 'pre_lunch_transition');

const unknownWebSignals = stateFor({
  local_time: '11:50',
  allow_context_sensing: false,
  tab_count: 18,
  tab_count_scope: 'same_origin_startly_tabs',
  audio_playing: true,
  idle_time_seconds: 3600
});
assert.equal(unknownWebSignals.input.tabCountBucket, 'unknown');
assert.equal(unknownWebSignals.input.audibleStateKnown, false);
assert.equal(unknownWebSignals.input.reentryState, 'unknown');
assert.equal(unknownWebSignals.sceneResolution.scene, 'pre_lunch_transition');

const staleExtensionSignals = stateFor({
  allow_context_sensing: true,
  browser_context_observed_at: Date.now() - 3 * 60 * 1000,
  tab_count: 30,
  tab_count_scope: 'all_browser_tabs'
});
assert.equal(staleExtensionSignals.input.tabCountBucket, 'unknown');
assert.equal(staleExtensionSignals.input.confidence.browser, 'unknown');

const anxious = stateFor({ clickedEmotion: 'anxious', trigger: 'emotion_click' });
assert.equal(anxious.sceneResolution.scene, 'emotional_checkin');
assert.equal(anxious.emotionBias, 'anxious');
assert.equal(anxious.strategy, 'ground');

const refreshLoop = stateFor({
  local_time: '15:20',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 3
});
assert.equal(refreshLoop.sceneResolution.scene, 'refresh_loop');
assert.equal(refreshLoop.strategy, 'interrupt');

const similarity = calculateSimilarity(
  '人已经到今天了，脑子可以晚几分钟打卡。',
  '人先到了今天，脑子晚几分钟打卡也行。'
);
assert.ok(similarity >= 0.58, `expected Chinese near-duplicate score >= 0.58, received ${similarity}`);

const promptCase = runCompanionPipeline(context({ local_time: '11:50' }), 'Chinese (Simplified)', 4);
assert.match(promptCase.system, /You are StartlyTab/);
assert.match(promptCase.user, /forbidden_assumptions/);
assert.match(promptCase.user, /prompt_version/);
assert.doesNotMatch(promptCase.user, /"state_fingerprint"\s*:/);

const invalidCandidate = validatePerspectiveCandidate({
  text: '你刚到公司，先深呼吸一下。',
  style: 'grounded_observation',
  track: 'A_PHYSICAL',
  content_track: 'grounded_observation',
  semantic_core: 'invented_arrival',
  action_tag: 'breathe',
  object_tag: 'office',
  metaphor_tag: 'none',
  opener_tag: 'arrival_claim',
  sentence_shape: 'claim_plus_action',
  state_fingerprint: promptCase.state.stateFingerprint,
  prompt_version: 'context-loop-v1.0.0'
}, promptCase.state);
assert.equal(invalidCandidate.valid, false);
assert.ok(invalidCandidate.reasons.includes('cliche_or_coaching'));
assert.ok(invalidCandidate.reasons.includes('invented_workplace_state'));

console.log('Perspective engine deterministic checks passed.');
