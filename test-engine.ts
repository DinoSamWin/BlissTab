import assert from 'node:assert/strict';
import { calculateSimilarity } from './src/services/perspectiveService.ts';
import {
  STARTLY_PROMPT_VERSION,
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
const earlyInitialFallback = getStateAwareFallback(earlyArrival, 'Chinese (Simplified)');
assert.ok(earlyInitialFallback);
assert.doesNotMatch(earlyInitialFallback.text, /(把自己.*叫醒|时间.*留.*给.*自己)/u);

const confirmedEarlyArrival = stateFor({
  local_time: '07:00',
  confirmed_work_status: 'workplace_arrival'
});
assert.ok(confirmedEarlyArrival.knownFacts.includes('confirmed_work_status:workplace_arrival'));
assert.equal(
  getStateAwareFallback(confirmedEarlyArrival, 'Chinese (Simplified)')?.text,
  '已经到公司了，先简单收拾一下，不用马上开工。'
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

const firstRefresh = stateFor({
  local_time: '07:00',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 1
});
assert.equal(firstRefresh.sceneResolution.scene, 'refresh_loop');
assert.equal(firstRefresh.strategy, 'interrupt');

const firstRefreshFallback = getStateAwareFallback(firstRefresh, 'Chinese (Simplified)');
assert.ok(firstRefreshFallback);
assert.notEqual(firstRefreshFallback.text, earlyInitialFallback.text);
assert.doesNotMatch(firstRefreshFallback.text, /(天还早|时间还早|这么早|一大早|早到)/u);

const secondRefresh = stateFor({
  local_time: '07:00',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 2,
  recent_history: [{
    text: firstRefreshFallback.text,
    timestamp: Date.now(),
    promptId: 'first-refresh',
    contentTrack: firstRefreshFallback.content_track,
    semanticCore: firstRefreshFallback.semantic_core,
    actionTag: firstRefreshFallback.action_tag,
    objectTag: firstRefreshFallback.object_tag,
    metaphorTag: firstRefreshFallback.metaphor_tag,
    openerTag: firstRefreshFallback.opener_tag,
    sentenceShape: firstRefreshFallback.sentence_shape,
    timeBlock: 'early_morning'
  }]
});
const secondRefreshFallback = getStateAwareFallback(secondRefresh, 'Chinese (Simplified)');
assert.ok(secondRefreshFallback);
assert.notEqual(secondRefreshFallback.text, firstRefreshFallback.text);
assert.doesNotMatch(secondRefreshFallback.text, /(天还早|时间还早|这么早|一大早|早到)/u);

const refreshLoop = stateFor({
  local_time: '15:20',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 3
});
assert.equal(refreshLoop.sceneResolution.scene, 'refresh_loop');
assert.equal(refreshLoop.strategy, 'interrupt');

const expectedRefreshTracks = [
  'sensory_reset',
  'object_humor',
  'playful_boundary',
  'life_boundary',
  'unexpected_perspective',
  'permission_pause'
] as const;
const refreshFingerprints: string[] = [];
const refreshDimensionTexts = expectedRefreshTracks.map((expectedTrack, index) => {
  const state = stateFor({
    local_time: '09:01',
    trigger: 'manual_refresh',
    isManualRefresh: true,
    consecutiveClicks: index + 1
  });
  const fallback = getStateAwareFallback(state, 'Chinese (Simplified)');
  assert.equal(state.noveltyPlan.targetTrack, expectedTrack);
  assert.deepEqual(state.noveltyPlan.allowedTracks, [expectedTrack]);
  refreshFingerprints.push(state.stateFingerprint);
  assert.ok(fallback);
  assert.equal(fallback.content_track, expectedTrack);
  assert.doesNotMatch(fallback.text, /(不要着急|不用着急|慢慢来|不用马上|别.{0,8}(塞|排|装).{0,3}满)/u);
  return fallback.text;
});
assert.equal(new Set(refreshDimensionTexts).size, expectedRefreshTracks.length);
assert.equal(new Set(refreshFingerprints).size, expectedRefreshTracks.length);

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
assert.match(promptCase.system, /meaning must be obvious on the first read/i);

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
  prompt_version: STARTLY_PROMPT_VERSION
}, promptCase.state);
assert.equal(invalidCandidate.valid, false);
assert.ok(invalidCandidate.reasons.includes('cliche_or_coaching'));
assert.ok(invalidCandidate.reasons.includes('invented_workplace_state'));

const vagueRefreshCandidate = validatePerspectiveCandidate({
  text: '天还早，今天不用一次把自己全部叫醒。',
  style: 'permission_pause',
  track: 'D_THEME',
  content_track: 'permission_pause',
  semantic_core: 'repeat_early_message',
  action_tag: 'delay_full_start',
  object_tag: 'day',
  metaphor_tag: 'loading_the_self',
  opener_tag: 'early_time_observation',
  sentence_shape: 'observation_plus_permission',
  state_fingerprint: firstRefresh.stateFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
}, firstRefresh);
assert.equal(vagueRefreshCandidate.valid, false);
assert.ok(vagueRefreshCandidate.reasons.includes('vague_or_literary_wording'));
assert.ok(vagueRefreshCandidate.reasons.includes('repeated_scene_framing_on_refresh'));

const repeatedPaceCandidate = validatePerspectiveCandidate({
  text: '不用着急，今天的工作别马上塞得太满。',
  style: 'sensory_reset',
  track: 'A_PHYSICAL',
  content_track: 'sensory_reset',
  semantic_core: 'repeat_slow_start',
  action_tag: 'slow_start',
  object_tag: 'workday',
  metaphor_tag: 'day_as_container',
  opener_tag: 'pace_permission',
  sentence_shape: 'permission_plus_boundary',
  state_fingerprint: firstRefresh.stateFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
}, firstRefresh);
assert.equal(repeatedPaceCandidate.valid, false);
assert.ok(repeatedPaceCandidate.reasons.includes('repeated_pace_message_on_refresh'));

console.log('Perspective engine deterministic checks passed.');
