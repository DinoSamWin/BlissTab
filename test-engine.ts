import assert from 'node:assert/strict';
import { calculateSimilarity } from './src/services/perspectiveService.ts';
import {
  STARTLY_PROMPT_VERSION,
  countRecentProductivityLines,
  getStateAwareFallback,
  isProductivityPlanningText,
  runCompanionPipeline,
  validatePerspectiveCandidate
} from './src/services/perspectiveEngine/index.ts';
import type { PerspectiveRouterContext } from './src/types.ts';
import {
  resolveEnvironmentCacheScope,
  SIGNIFICANT_ENVIRONMENT_GAP_MS
} from './src/services/perspectiveEnvironmentCache.ts';
import {
  advanceRefreshStreak,
  initializePageRefreshStreak,
  isPageReloadNavigation,
  REFRESH_STREAK_WINDOW_MS,
} from './src/services/refreshStreakService.ts';

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

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

const refreshStorage = memoryStorage();
assert.equal(isPageReloadNavigation({ getEntriesByType: () => [{ type: 'reload' }] }), true);
assert.equal(isPageReloadNavigation({ getEntriesByType: () => [{ type: 'navigate' }] }), false);
assert.deepEqual(initializePageRefreshStreak(false, 1000, refreshStorage), {
  count: 0,
  lastAt: 0,
  isReload: false
});
assert.equal(advanceRefreshStreak(1000, refreshStorage).count, 1);
assert.equal(initializePageRefreshStreak(true, 2000, refreshStorage).count, 1);
assert.equal(advanceRefreshStreak(2000, refreshStorage).count, 2);
assert.equal(advanceRefreshStreak(2000 + REFRESH_STREAK_WINDOW_MS + 1, refreshStorage).count, 1);

const stableInitialState = stateFor({ local_time: '09:58' });
const stableReloadState = stateFor({
  local_time: '10:20',
  trigger: 'page_reload',
  isPageReload: true,
  consecutiveClicks: 2
});
const stableManualState = stateFor({
  local_time: '10:20',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 4
});
assert.equal(stableInitialState.environmentFingerprint, stableReloadState.environmentFingerprint);
assert.equal(stableInitialState.environmentFingerprint, stableManualState.environmentFingerprint);
assert.notEqual(stableInitialState.stateFingerprint, stableReloadState.stateFingerprint);
assert.notEqual(stableReloadState.stateFingerprint, stableManualState.stateFingerprint);
assert.equal(stableInitialState.noveltyPlan.cacheFillTracks.length, 6);
assert.equal(stableManualState.noveltyPlan.cacheFillTracks.length, 0);

const nextTimeBlockState = stateFor({ local_time: '11:21' });
assert.notEqual(stableInitialState.environmentFingerprint, nextTimeBlockState.environmentFingerprint);

const changedTimezoneState = stateFor({ local_time: '10:20', timezone: 'America/Los_Angeles' });
assert.notEqual(stableInitialState.environmentFingerprint, changedTimezoneState.environmentFingerprint);

const heavyBrowserState = stateFor({
  local_time: '10:20',
  allow_context_sensing: true,
  browser_context_observed_at: Date.now(),
  tab_count: 12,
  tab_count_scope: 'all_browser_tabs'
});
assert.notEqual(stableInitialState.environmentFingerprint, heavyBrowserState.environmentFingerprint);

const environmentStorage = memoryStorage();
const firstEnvironment = resolveEnvironmentCacheScope(
  stableInitialState.environmentFingerprint,
  10_000,
  environmentStorage
);
assert.equal(firstEnvironment.changed, true);
assert.equal(firstEnvironment.reason, 'first_observation');

const sameEnvironment = resolveEnvironmentCacheScope(
  stableManualState.environmentFingerprint,
  20_000,
  environmentStorage
);
assert.equal(sameEnvironment.changed, false);
assert.equal(sameEnvironment.reason, 'same_environment');
assert.equal(sameEnvironment.scopeId, firstEnvironment.scopeId);

const changedTimeBlock = resolveEnvironmentCacheScope(
  nextTimeBlockState.environmentFingerprint,
  30_000,
  environmentStorage
);
assert.equal(changedTimeBlock.changed, true);
assert.equal(changedTimeBlock.reason, 'environment_changed');
assert.notEqual(changedTimeBlock.scopeId, firstEnvironment.scopeId);

const returnedEnvironment = resolveEnvironmentCacheScope(
  stableInitialState.environmentFingerprint,
  40_000,
  environmentStorage
);
assert.equal(returnedEnvironment.changed, true);
assert.equal(returnedEnvironment.reason, 'environment_changed');
assert.notEqual(returnedEnvironment.scopeId, firstEnvironment.scopeId);

const expiredEnvironment = resolveEnvironmentCacheScope(
  stableInitialState.environmentFingerprint,
  40_000 + SIGNIFICANT_ENVIRONMENT_GAP_MS,
  environmentStorage
);
assert.equal(expiredEnvironment.changed, true);
assert.equal(expiredEnvironment.reason, 'significant_time_gap');
assert.notEqual(expiredEnvironment.scopeId, returnedEnvironment.scopeId);

const firstManualInStableEnvironment = stateFor({
  local_time: '10:20',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 1
});
const reusableCachedCandidate = {
  text: '先看几秒远处，让眼睛从屏幕上换个焦点。',
  style: 'sensory_reset',
  track: 'A_PHYSICAL' as const,
  content_track: 'sensory_reset' as const,
  semantic_core: 'cached_stable_environment_gaze_shift',
  action_tag: 'look_far',
  object_tag: 'distant_view',
  metaphor_tag: 'none',
  opener_tag: 'cached_visual_shift',
  sentence_shape: 'direct_visual_action',
  state_fingerprint: stableInitialState.stateFingerprint,
  environment_fingerprint: stableInitialState.environmentFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
};
const reusedAcrossTrigger = validatePerspectiveCandidate(
  reusableCachedCandidate,
  firstManualInStableEnvironment
);
assert.equal(reusedAcrossTrigger.valid, true);

const rejectedAcrossEnvironment = validatePerspectiveCandidate(
  reusableCachedCandidate,
  nextTimeBlockState
);
assert.equal(rejectedAcrossEnvironment.valid, false);
assert.ok(rejectedAcrossEnvironment.reasons.includes('environment_fingerprint_mismatch'));

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
  'philosophical_zoom_out',
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

const morningFallbackTracks = new Set<string>();
const morningHistory: NonNullable<PerspectiveRouterContext['recent_history']> = [];
for (let index = 0; index < 6; index += 1) {
  const morningState = stateFor({
    local_time: '09:58',
    recent_history: morningHistory
  });
  const fallback = getStateAwareFallback(morningState, 'Chinese (Simplified)', morningHistory);
  assert.ok(fallback);
  morningFallbackTracks.add(fallback.content_track || '');
  morningHistory.unshift({
    text: fallback.text,
    timestamp: Date.now() + index,
    promptId: `morning-${index}`,
    contentTrack: fallback.content_track,
    semanticCore: fallback.semantic_core,
    actionTag: fallback.action_tag,
    objectTag: fallback.object_tag,
    metaphorTag: fallback.metaphor_tag,
    openerTag: fallback.opener_tag,
    sentenceShape: fallback.sentence_shape,
    timeBlock: 'morning_focus'
  });
}
assert.ok(morningFallbackTracks.size >= 5, `expected at least five morning fallback styles, received ${morningFallbackTracks.size}`);

const pageReloadHistory: NonNullable<PerspectiveRouterContext['recent_history']> = [];
const pageReloadTracks = new Set<string>();
for (let index = 0; index < 8; index += 1) {
  const pageReloadState = stateFor({
    local_time: '09:58',
    trigger: 'page_reload',
    isPageReload: true,
    isManualRefresh: false,
    consecutiveClicks: index + 1,
    recent_history: pageReloadHistory
  });
  assert.equal(pageReloadState.sceneResolution.baseScene, 'morning_sustained');
  assert.equal(pageReloadState.sceneResolution.scene, 'morning_sustained');
  assert.equal(pageReloadState.input.isManualRefresh, false);
  assert.equal(pageReloadState.input.isPageReload, true);
  assert.ok(pageReloadState.sceneResolution.modifiers.includes('page_reload'));
  assert.ok(!pageReloadState.sceneResolution.modifiers.includes('manual_refresh'));
  assert.equal(pageReloadState.noveltyPlan.allowedTracks.length, 8);

  const fallback = getStateAwareFallback(pageReloadState, 'Chinese (Simplified)', pageReloadHistory);
  assert.ok(fallback);
  assert.doesNotMatch(fallback.text, /(上午|早上|不要着急|不用着急|慢慢来)/u);
  pageReloadTracks.add(fallback.content_track || '');
  pageReloadHistory.unshift({
    text: fallback.text,
    timestamp: Date.now() + index,
    promptId: `page-reload-${index}`,
    contentTrack: fallback.content_track,
    semanticCore: fallback.semantic_core,
    actionTag: fallback.action_tag,
    objectTag: fallback.object_tag,
    metaphorTag: fallback.metaphor_tag,
    openerTag: fallback.opener_tag,
    sentenceShape: fallback.sentence_shape,
    timeBlock: 'morning_focus'
  });
}
assert.equal(pageReloadTracks.size, 8, `expected all eight page-reload styles, received ${pageReloadTracks.size}`);
assert.ok(countRecentProductivityLines(pageReloadHistory) <= 2);

const productivityHistory: NonNullable<PerspectiveRouterContext['recent_history']> = [
  { text: '手里的事情不用一起往前挤，先留一件在前面。', timestamp: Date.now(), promptId: 'scope-1' },
  { text: '工作别一下排满，先处理最清楚的一项。', timestamp: Date.now() - 1, promptId: 'scope-2' }
];
assert.equal(countRecentProductivityLines(productivityHistory), 2);
assert.equal(isProductivityPlanningText('工作只是生活的一部分，不值得占满全部注意力。'), false);
const cappedReloadState = stateFor({
  local_time: '09:58',
  trigger: 'page_reload',
  isPageReload: true,
  consecutiveClicks: 3,
  recent_history: productivityHistory
});
const cappedProductivityCandidate = validatePerspectiveCandidate({
  text: '手里的事情先排一下，挑最清楚的一件往前推。',
  style: 'grounded_observation',
  track: 'D_THEME',
  content_track: 'grounded_observation',
  semantic_core: 'reload_prioritize_clear_task',
  action_tag: 'prioritize_task',
  object_tag: 'current_tasks',
  metaphor_tag: 'none',
  opener_tag: 'reload_current_tasks',
  sentence_shape: 'task_scope_plus_action',
  state_fingerprint: cappedReloadState.stateFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
}, cappedReloadState, productivityHistory);
assert.equal(cappedProductivityCandidate.valid, false);
assert.ok(cappedProductivityCandidate.reasons.includes('productivity_framing_overused_on_page_reload'));

const reloadPrompt = runCompanionPipeline(context({
  local_time: '09:58',
  trigger: 'page_reload',
  isPageReload: true,
  consecutiveClicks: 3,
  recent_history: productivityHistory
}), 'Chinese (Simplified)', 8);
assert.match(reloadPrompt.user, /NOT a New Perspective button click/);
assert.match(reloadPrompt.user, /productivity-advice cap has been reached/);

const fifthRefresh = stateFor({
  local_time: '09:01',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 5
});
assert.equal(fifthRefresh.dimension, 'philosophical');
assert.match(runCompanionPipeline(context({
  local_time: '09:01',
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 5
}), 'Chinese (Simplified)', 4).user, /GROUNDED PHILOSOPHY/);

const abstractPhilosophy = validatePerspectiveCandidate({
  text: '宇宙浩瀚，存在的意义终将归于无常。',
  style: 'philosophical_zoom_out',
  track: 'D_THEME',
  content_track: 'philosophical_zoom_out',
  semantic_core: 'cosmic_impermanence',
  action_tag: 'none',
  object_tag: 'universe',
  metaphor_tag: 'cosmic_scale',
  opener_tag: 'cosmic_claim',
  sentence_shape: 'abstract_claim',
  state_fingerprint: fifthRefresh.stateFingerprint,
  environment_fingerprint: fifthRefresh.environmentFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
}, fifthRefresh);
assert.equal(abstractPhilosophy.valid, false);
assert.ok(abstractPhilosophy.reasons.includes('grand_philosophy_cliche'));
assert.ok(abstractPhilosophy.reasons.includes('ungrounded_philosophical_zoom_out'));

const abstractTodayPhilosophy = validatePerspectiveCandidate({
  text: '今天的意义，不由存在的本质决定。',
  style: 'philosophical_zoom_out',
  track: 'D_THEME',
  content_track: 'philosophical_zoom_out',
  semantic_core: 'abstract_meaning_of_today',
  action_tag: 'none',
  object_tag: 'today',
  metaphor_tag: 'none',
  opener_tag: 'today_abstract_claim',
  sentence_shape: 'abstract_claim',
  state_fingerprint: fifthRefresh.stateFingerprint,
  environment_fingerprint: fifthRefresh.environmentFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
}, fifthRefresh);
assert.equal(abstractTodayPhilosophy.valid, false);
assert.ok(abstractTodayPhilosophy.reasons.includes('grand_philosophy_cliche'));
assert.ok(abstractTodayPhilosophy.reasons.includes('ungrounded_philosophical_zoom_out'));

const groundedPhilosophy = validatePerspectiveCandidate({
  text: '眼前这件事放到一周里看，晚几分钟真的没什么。',
  style: 'philosophical_zoom_out',
  track: 'D_THEME',
  content_track: 'philosophical_zoom_out',
  semantic_core: 'current_task_is_small_in_week',
  action_tag: 'allow_a_few_minutes',
  object_tag: 'current_task',
  metaphor_tag: 'none',
  opener_tag: 'week_scale',
  sentence_shape: 'time_scale_plus_plain_conclusion',
  state_fingerprint: fifthRefresh.stateFingerprint,
  environment_fingerprint: fifthRefresh.environmentFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
}, fifthRefresh);
assert.equal(groundedPhilosophy.valid, true);

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
assert.match(promptCase.user, /every cache_fill_priority_track/i);
assert.match(promptCase.user, /No more than two items may discuss prioritizing/i);

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
  environment_fingerprint: promptCase.state.environmentFingerprint,
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
  environment_fingerprint: firstRefresh.environmentFingerprint,
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
  environment_fingerprint: firstRefresh.environmentFingerprint,
  prompt_version: STARTLY_PROMPT_VERSION
}, firstRefresh);
assert.equal(repeatedPaceCandidate.valid, false);
assert.ok(repeatedPaceCandidate.reasons.includes('repeated_pace_message_on_refresh'));

console.log('Perspective engine deterministic checks passed.');
