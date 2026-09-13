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
assert.ok(getStateAwareFallback(confirmedEarlyArrival, 'Chinese (Simplified)'));

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

const restDayInitial = stateFor({
  local_date: '2026-09-13',
  weekday: 0,
  is_weekend: true,
  day_kind: 'rest_day',
  local_time: '14:20',
  custom_themes: ['尽快完成今天的工作']
});
const restDayRefresh = stateFor({
  local_date: '2026-09-13',
  weekday: 0,
  is_weekend: true,
  day_kind: 'rest_day',
  local_time: '14:20',
  custom_themes: ['尽快完成今天的工作'],
  trigger: 'manual_refresh',
  isManualRefresh: true,
  consecutiveClicks: 4
});
assert.ok(restDayInitial.noveltyPlan.allowedTracks.includes('leisure_outing'));
assert.ok(restDayInitial.noveltyPlan.allowedTracks.includes('social_connection'));
assert.ok(restDayInitial.noveltyPlan.allowedTracks.includes('curiosity_play'));
assert.ok(!restDayInitial.noveltyPlan.allowedTracks.includes('work_companion'));
assert.equal(restDayInitial.stateFingerprint, restDayRefresh.stateFingerprint);

const changedTimeBlock = stateFor({
  local_date: '2026-09-13',
  weekday: 0,
  is_weekend: true,
  day_kind: 'rest_day',
  local_time: '21:20'
});
assert.notEqual(restDayInitial.stateFingerprint, changedTimeBlock.stateFingerprint);

const changedEmotion = stateFor({
  local_date: '2026-09-13',
  weekday: 0,
  is_weekend: true,
  day_kind: 'rest_day',
  local_time: '14:20',
  clickedEmotion: 'happy',
  trigger: 'emotion_click'
});
assert.notEqual(restDayInitial.stateFingerprint, changedEmotion.stateFingerprint);

const stateChangingContexts: Array<Partial<PerspectiveRouterContext>> = [
  { language: 'English' },
  { selectedPersona: 'bestie' },
  { custom_themes: ['周末想去逛书店'] },
  {
    allow_context_sensing: true,
    browser_context_observed_at: Date.now(),
    tab_count: 18,
    tab_count_scope: 'all_browser_tabs'
  },
  {
    allow_context_sensing: true,
    browser_context_observed_at: Date.now(),
    idle_time_seconds: 35 * 60
  },
  { confirmed_work_status: 'working' }
];
for (const changedContext of stateChangingContexts) {
  const changedState = stateFor({
    local_date: '2026-09-13',
    weekday: 0,
    is_weekend: true,
    day_kind: 'rest_day',
    local_time: '14:20',
    custom_themes: ['尽快完成今天的工作'],
    ...changedContext
  });
  assert.notEqual(restDayInitial.stateFingerprint, changedState.stateFingerprint);
}

const recentDailyHistory = [
  {
    text: '昨天的小乐趣',
    timestamp: new Date(2026, 8, 12, 9, 0).getTime(),
    promptId: 'previous_day',
    contentTrack: 'small_delight' as const,
    semanticCore: 'previous_day_delight'
  },
  {
    text: '前天的散步',
    timestamp: new Date(2026, 8, 11, 9, 0).getTime(),
    promptId: 'two_days_ago',
    contentTrack: 'leisure_outing' as const,
    semanticCore: 'two_days_ago_outing'
  }
];
const dailyRotation = stateFor({
  local_date: '2026-09-13',
  weekday: 0,
  is_weekend: true,
  day_kind: 'rest_day',
  local_time: '14:20',
  recent_history: recentDailyHistory
});
assert.notEqual(dailyRotation.noveltyPlan.targetTrack, 'small_delight');
assert.notEqual(dailyRotation.noveltyPlan.targetTrack, 'leisure_outing');

let workdayHistory: PerspectiveRouterContext['recent_history'] = [];
const workdayTracks = [];
const workdayTargets = [];
for (let index = 0; index < 10; index += 1) {
  const workdayState = stateFor({
    local_date: '2026-09-15',
    weekday: 2,
    is_weekend: false,
    day_kind: 'workday',
    local_time: '10:20',
    recent_history: workdayHistory
  });
  const item = getStateAwareFallback(workdayState, 'Chinese (Simplified)', workdayHistory);
  assert.ok(item);
  workdayTargets.push(workdayState.noveltyPlan.targetTrack);
  workdayTracks.push(item!.content_track);
  workdayHistory = [{
    text: item!.text,
    timestamp: Date.now() + index,
    promptId: 'workday_rotation',
    contentTrack: item!.content_track,
    semanticCore: item!.semantic_core,
    actionTag: item!.action_tag,
    objectTag: item!.object_tag,
    metaphorTag: item!.metaphor_tag,
    openerTag: item!.opener_tag,
    sentenceShape: item!.sentence_shape
  }, ...workdayHistory];
}
assert.ok(new Set(workdayTracks).size >= 6, `expected broad workday rotation, received ${workdayTracks.join(',')} for ${workdayTargets.join(',')}`);
assert.ok(
  workdayTracks.filter(track => track === 'work_companion').length <= 2,
  `expected work to remain occasional, received ${workdayTracks.join(',')} for ${workdayTargets.join(',')}`
);

const restDayPrompt = runCompanionPipeline(context({
  local_date: '2026-09-13',
  weekday: 0,
  is_weekend: true,
  day_kind: 'rest_day',
  local_time: '14:20',
  custom_themes: ['尽快完成今天的工作']
}), 'Chinese (Simplified)', 4);
assert.match(restDayPrompt.user, /Protected rest day/);
assert.doesNotMatch(restDayPrompt.user, /尽快完成今天的工作/);
assert.doesNotMatch(restDayPrompt.user, /"style":/);
const restFallback = getStateAwareFallback(restDayInitial, 'Chinese (Simplified)');
assert.ok(restFallback);
assert.doesNotMatch(restFallback!.text, /(工作|任务|待办|效率|加班|下班|邮件|项目|截止|进度|办公|会议|职场|上班)/u);

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

const invalidRestDayCandidate = validatePerspectiveCandidate({
  text: '周末先完成一件简单任务，再去喝杯咖啡。',
  style: 'leisure_outing',
  track: 'D_THEME',
  content_track: 'leisure_outing',
  semantic_core: 'task_before_coffee',
  action_tag: 'finish_task',
  object_tag: 'coffee',
  state_fingerprint: restDayInitial.stateFingerprint,
  prompt_version: 'context-loop-v1.2.0'
}, restDayInitial);
assert.equal(invalidRestDayCandidate.valid, false);
assert.ok(invalidRestDayCandidate.reasons.includes('work_framing_on_rest_day'));

const distantSemanticHistory: PerspectiveRouterContext['recent_history'] = [
  ...Array.from({ length: 24 }, (_, index) => ({
    text: `历史内容${index}`,
    timestamp: Date.now() - index * 1000,
    promptId: `history_${index}`,
    semanticCore: `unrelated_${index}`
  })),
  {
    text: '几天前用过的另一种说法',
    timestamp: Date.now() - 25_000,
    promptId: 'older_same_meaning',
    semanticCore: 'wander_into_new_shop'
  }
];
const distantSemanticDuplicate = validatePerspectiveCandidate({
  text: '去街角看看没见过的小店，让今天拐个有趣的弯。',
  style: 'leisure_outing',
  track: 'A_PHYSICAL',
  content_track: 'leisure_outing',
  semantic_core: 'wander_into_new_shop',
  action_tag: 'visit_small_shop',
  object_tag: 'street_corner',
  state_fingerprint: restDayInitial.stateFingerprint,
  prompt_version: 'context-loop-v1.2.0'
}, restDayInitial, distantSemanticHistory);
assert.equal(distantSemanticDuplicate.valid, false);
assert.ok(distantSemanticDuplicate.reasons.includes('semantic_core_duplicate'));

console.log('Perspective engine deterministic checks passed.');
