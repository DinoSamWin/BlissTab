import { ConfirmedWorkStatus, PerspectiveHistory, PerspectivePoolItem } from '../../types';
import { selectBestCandidate } from './candidateValidator';
import { STARTLY_PROMPT_VERSION } from './generator';
import { BaseTimeScene, PipelineState, SceneModifier } from './types';

type Template = Pick<
  PerspectivePoolItem,
  'text' | 'content_track' | 'semantic_core' | 'action_tag' | 'object_tag' | 'metaphor_tag' | 'opener_tag' | 'sentence_shape'
>;

const BASE_ZH: Record<BaseTimeScene, Template[]> = {
  early_buffer: [
    { text: '时间还早，先做一件简单的事，不用马上忙起来。', content_track: 'permission_pause', semantic_core: 'early_start_can_stay_simple', action_tag: 'start_simple', object_tag: 'current_thing', metaphor_tag: 'none', opener_tag: 'early_time_observation', sentence_shape: 'observation_plus_direct_permission' },
    { text: '刚开始不用安排太满，按平常的速度来就行。', content_track: 'grounded_observation', semantic_core: 'start_at_normal_pace', action_tag: 'keep_normal_pace', object_tag: 'starting_rhythm', metaphor_tag: 'none', opener_tag: 'plain_start', sentence_shape: 'direct_permission_plus_action' }
  ],
  arrival_buffer: [
    { text: '刚开始别把事情排得太满，先做最清楚的一件。', content_track: 'playful_boundary', semantic_core: 'start_without_full_schedule', action_tag: 'keep_start_small', object_tag: 'current_thing', metaphor_tag: 'none', opener_tag: 'plain_day_start', sentence_shape: 'direct_boundary_plus_action' },
    { text: '现在不用马上进入状态，按平常的速度开始就行。', content_track: 'grounded_observation', semantic_core: 'start_at_normal_speed', action_tag: 'keep_normal_speed', object_tag: 'starting_rhythm', metaphor_tag: 'none', opener_tag: 'start_permission', sentence_shape: 'direct_permission_plus_action' }
  ],
  morning_sustained: [
    { text: '上午已经在走了，手里的事不用一起往前挤。', content_track: 'grounded_observation', semantic_core: 'morning_tasks_need_not_crowd', action_tag: 'reduce_scope', object_tag: 'current_tasks', metaphor_tag: 'tasks_crowding_forward', opener_tag: 'morning_in_progress', sentence_shape: 'observation_plus_containment' },
    { text: '先让一件事留在前面，其余的不用排成队。', content_track: 'playful_boundary', semantic_core: 'one_item_without_queue', action_tag: 'keep_one_item', object_tag: 'tasks', metaphor_tag: 'tasks_as_queue', opener_tag: 'single_scope', sentence_shape: 'micro_action_plus_joke' }
  ],
  pre_lunch_transition: [
    { text: '快到饭点了，手里的事先别跟午饭抢座位。', content_track: 'playful_boundary', semantic_core: 'task_competes_with_meal', action_tag: 'release_current_task', object_tag: 'lunch', metaphor_tag: 'competing_for_seat', opener_tag: 'approaching_meal', sentence_shape: 'observation_plus_joke' },
    { text: '上午没收完的尾，不必都带到餐桌上。', content_track: 'life_boundary', semantic_core: 'unfinished_work_stays_off_table', action_tag: 'leave_work_before_meal', object_tag: 'table', metaphor_tag: 'carrying_unfinished_work', opener_tag: 'unfinished_morning', sentence_shape: 'boundary_statement' }
  ],
  midday_release: [
    { text: '午饭不是任务间隙，它本来就是今天的一部分。', content_track: 'life_boundary', semantic_core: 'meal_is_not_task_gap', action_tag: 'legitimize_meal', object_tag: 'lunch', metaphor_tag: 'meal_inside_day', opener_tag: 'meal_reframe', sentence_shape: 'negation_plus_reframe' },
    { text: '中午先别安排意义，吃饭这件事已经够具体了。', content_track: 'object_humor', semantic_core: 'meal_needs_no_meaning', action_tag: 'drop_meaning', object_tag: 'meal', metaphor_tag: 'meaning_as_schedule', opener_tag: 'midday_permission', sentence_shape: 'permission_plus_dry_humor' }
  ],
  post_lunch_reentry: [
    { text: '午后刚接回来，先别要求脑子立刻满格。', content_track: 'playful_boundary', semantic_core: 'afternoon_mind_loads_gradually', action_tag: 'delay_full_capacity', object_tag: 'mind', metaphor_tag: 'mind_as_battery', opener_tag: 'afternoon_return', sentence_shape: 'observation_plus_permission' },
    { text: '下午不用猛地开始，先让眼前这一页慢慢清楚。', content_track: 'sensory_reset', semantic_core: 'afternoon_visual_reentry', action_tag: 'soft_visual_reentry', object_tag: 'current_page', metaphor_tag: 'clarity_arriving', opener_tag: 'afternoon_permission', sentence_shape: 'permission_plus_micro_action' }
  ],
  afternoon_stretch: [
    { text: '下午走到这里，先把目光从工作里拿出来一下。', content_track: 'sensory_reset', semantic_core: 'brief_visual_exit_from_work', action_tag: 'look_away', object_tag: 'gaze', metaphor_tag: 'gaze_removed_from_work', opener_tag: 'afternoon_progress', sentence_shape: 'observation_plus_micro_action' },
    { text: '手里的事可以继续，注意力不用一直站着。', content_track: 'playful_boundary', semantic_core: 'attention_may_sit_down', action_tag: 'soften_attention', object_tag: 'attention', metaphor_tag: 'attention_standing', opener_tag: 'work_can_continue', sentence_shape: 'contrast_plus_personification' }
  ],
  closing_runway: [
    { text: '今天快走到收尾了，没做完的先别全挤过来。', content_track: 'grounded_observation', semantic_core: 'unfinished_work_need_not_crowd_close', action_tag: 'contain_unfinished_work', object_tag: 'unfinished_tasks', metaphor_tag: 'tasks_crowding_close', opener_tag: 'day_near_close', sentence_shape: 'observation_plus_containment' },
    { text: '下班前这段，不适合把整个世界临时搬过来。', content_track: 'object_humor', semantic_core: 'closing_time_not_for_everything', action_tag: 'refuse_new_scope', object_tag: 'world', metaphor_tag: 'moving_world_into_close', opener_tag: 'before_work_end', sentence_shape: 'time_statement_plus_humor' }
  ],
  evening_transition: [
    { text: '已经到晚上了，工作之外的事情也该排进来。', content_track: 'life_boundary', semantic_core: 'evening_includes_nonwork_life', action_tag: 'make_room_for_nonwork', object_tag: 'evening', metaphor_tag: 'none', opener_tag: 'evening_arrived', sentence_shape: 'observation_plus_direct_boundary' },
    { text: '工作可以留在今天，晚上不用替它继续值班。', content_track: 'playful_boundary', semantic_core: 'evening_not_on_duty_for_work', action_tag: 'leave_work_in_day', object_tag: 'evening', metaphor_tag: 'evening_on_duty', opener_tag: 'work_can_stay', sentence_shape: 'permission_plus_joke' }
  ],
  late_evening_boundary: [
    { text: '这个点还开着浏览器，也不用立刻解释为什么。', content_track: 'permission_pause', semantic_core: 'late_browser_needs_no_explanation', action_tag: 'drop_self_explanation', object_tag: 'browser', metaphor_tag: 'none', opener_tag: 'late_time_observation', sentence_shape: 'observation_plus_permission' },
    { text: '晚上的注意力很贵，先别让每件事都来结账。', content_track: 'playful_boundary', semantic_core: 'late_attention_is_expensive', action_tag: 'limit_demands', object_tag: 'attention', metaphor_tag: 'attention_as_currency', opener_tag: 'evening_attention', sentence_shape: 'metaphor_plus_boundary' }
  ],
  night_guard: [
    { text: '夜已经很深了，屏幕里的事不必现在都有答案。', content_track: 'permission_pause', semantic_core: 'night_questions_can_wait', action_tag: 'leave_answers', object_tag: 'screen_tasks', metaphor_tag: 'none', opener_tag: 'deep_night', sentence_shape: 'observation_plus_permission' },
    { text: '今天可以停在未完成这里，明天认得回来的路。', content_track: 'unexpected_perspective', semantic_core: 'unfinished_state_survives_night', action_tag: 'allow_unfinished', object_tag: 'tomorrow', metaphor_tag: 'tomorrow_knows_way_back', opener_tag: 'day_can_stop', sentence_shape: 'permission_plus_perspective' }
  ]
};

const OVERRIDE_ZH: Partial<Record<PipelineState['sceneResolution']['scene'], Template[]>> = {
  quiet_return: [
    { text: '刚回到这一页，先不用把节奏接得太满。', content_track: 'grounded_observation', semantic_core: 'return_without_full_speed', action_tag: 'soft_reentry', object_tag: 'current_page', metaphor_tag: 'rhythm_as_connection', opener_tag: 'just_returned', sentence_shape: 'observation_plus_permission' }
  ],
  overloaded_browser: [
    { text: '开着的东西不少，先别让它们一起往前挤。', content_track: 'playful_boundary', semantic_core: 'open_items_need_not_crowd', action_tag: 'reduce_scope', object_tag: 'open_items', metaphor_tag: 'items_crowding_forward', opener_tag: 'open_items_observation', sentence_shape: 'observation_plus_containment' }
  ]
};

const REFRESH_ZH: Record<'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'later', Template[]> = {
  first: [
    { text: '先看几秒远处，让眼睛从屏幕上换个焦点。', content_track: 'sensory_reset', semantic_core: 'refresh_look_far_for_seconds', action_tag: 'look_far', object_tag: 'distant_view', metaphor_tag: 'none', opener_tag: 'first_refresh_visual', sentence_shape: 'single_direct_visual_action' },
    { text: '把视线移到远一点的地方，停几秒再看屏幕。', content_track: 'sensory_reset', semantic_core: 'refresh_move_gaze_offscreen', action_tag: 'move_gaze', object_tag: 'offscreen_view', metaphor_tag: 'none', opener_tag: 'first_refresh_gaze', sentence_shape: 'direct_visual_action_plus_return' }
  ],
  second: [
    { text: '随便选一样看得见的小东西，认真看它几秒。', content_track: 'object_humor', semantic_core: 'refresh_pick_visible_object', action_tag: 'notice_object', object_tag: 'visible_object', metaphor_tag: 'none', opener_tag: 'second_refresh_pick', sentence_shape: 'direct_object_invitation' },
    { text: '让电脑自己忙一会儿，你先看看旁边的普通东西。', content_track: 'object_humor', semantic_core: 'refresh_let_computer_run', action_tag: 'notice_nearby_object', object_tag: 'computer', metaphor_tag: 'computer_busy', opener_tag: 'second_refresh_computer', sentence_shape: 'light_object_joke_plus_action' }
  ],
  third: [
    { text: '这句没说到点上也没关系，先去做点别的。', content_track: 'playful_boundary', semantic_core: 'refresh_line_can_miss', action_tag: 'do_something_else', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'third_refresh_line', sentence_shape: 'acknowledgment_plus_direct_action' },
    { text: '浏览器不会介意你少看它一会儿。', content_track: 'playful_boundary', semantic_core: 'refresh_browser_does_not_mind', action_tag: 'look_away', object_tag: 'browser', metaphor_tag: 'browser_has_opinion', opener_tag: 'third_refresh_browser', sentence_shape: 'clear_object_joke' }
  ],
  fourth: [
    { text: '去倒杯水、走两步，或者做件和屏幕无关的小事。', content_track: 'life_boundary', semantic_core: 'refresh_choose_offscreen_activity', action_tag: 'do_offscreen_activity', object_tag: 'ordinary_life', metaphor_tag: 'none', opener_tag: 'fourth_refresh_activity', sentence_shape: 'concrete_offscreen_options' },
    { text: '先整理一下手边的东西，几分钟后再回来。', content_track: 'life_boundary', semantic_core: 'refresh_tidy_something_nearby', action_tag: 'tidy_nearby', object_tag: 'nearby_things', metaphor_tag: 'none', opener_tag: 'fourth_refresh_tidy', sentence_shape: 'ordinary_action_plus_return' }
  ],
  fifth: [
    { text: '换再多句，也不如真的离开屏幕几分钟。', content_track: 'unexpected_perspective', semantic_core: 'refresh_more_lines_are_not_a_break', action_tag: 'take_real_break', object_tag: 'new_lines', metaphor_tag: 'none', opener_tag: 'fifth_refresh_more_lines', sentence_shape: 'contrast_plus_concrete_reframe' },
    { text: '下一句话不是必需的，几分钟不看屏幕也可以。', content_track: 'unexpected_perspective', semantic_core: 'refresh_next_line_not_required', action_tag: 'skip_next_line', object_tag: 'next_line', metaphor_tag: 'none', opener_tag: 'fifth_refresh_not_required', sentence_shape: 'direct_reframe_plus_permission' }
  ],
  later: [
    { text: '这个页面可以先关掉，想回来时再回来。', content_track: 'permission_pause', semantic_core: 'refresh_page_can_close', action_tag: 'close_page', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'later_refresh_close', sentence_shape: 'direct_permission_plus_return' },
    { text: '先离开屏幕一会儿，这里的内容不会跑掉。', content_track: 'permission_pause', semantic_core: 'refresh_content_will_remain', action_tag: 'leave_screen', object_tag: 'page_content', metaphor_tag: 'content_running_away', opener_tag: 'later_refresh_leave', sentence_shape: 'direct_action_plus_light_joke' }
  ]
};

function getRefreshTemplates(consecutiveClicks: number): Template[] {
  if (consecutiveClicks === 1) return REFRESH_ZH.first;
  if (consecutiveClicks === 2) return REFRESH_ZH.second;
  if (consecutiveClicks === 3) return REFRESH_ZH.third;
  if (consecutiveClicks === 4) return REFRESH_ZH.fourth;
  if (consecutiveClicks === 5) return REFRESH_ZH.fifth;
  return REFRESH_ZH.later;
}

const MODIFIER_ZH: Partial<Record<SceneModifier, Template[]>> = {
  monday_return: [
    { text: '周一刚开始，按平常节奏来就行，不用一下排满。', content_track: 'playful_boundary', semantic_core: 'monday_can_start_normally', action_tag: 'keep_normal_week_start', object_tag: 'monday', metaphor_tag: 'none', opener_tag: 'monday_plain_start', sentence_shape: 'observation_plus_direct_permission' }
  ],
  friday_release: [
    { text: '周五已经走到这里，剩下的别都塞进今天。', content_track: 'life_boundary', semantic_core: 'friday_need_not_hold_everything', action_tag: 'leave_scope_for_later', object_tag: 'friday', metaphor_tag: 'day_as_container', opener_tag: 'friday_progress', sentence_shape: 'observation_plus_boundary' }
  ],
  soft_weekend: [
    { text: '周末不用交代进度，慢一点也算在过今天。', content_track: 'permission_pause', semantic_core: 'weekend_needs_no_progress_report', action_tag: 'allow_slow_day', object_tag: 'weekend', metaphor_tag: 'day_as_lived_time', opener_tag: 'weekend_permission', sentence_shape: 'permission_plus_reframe' }
  ],
  public_holiday: [
    { text: '假期不负责提高效率，它只负责把时间还给你。', content_track: 'life_boundary', semantic_core: 'holiday_returns_time', action_tag: 'keep_personal_time', object_tag: 'holiday', metaphor_tag: 'time_returned', opener_tag: 'holiday_role', sentence_shape: 'negation_plus_reframe' }
  ],
  adjusted_workday: [
    { text: '调休上班已经够绕了，今天别再和自己较劲。', content_track: 'playful_boundary', semantic_core: 'adjusted_workday_needs_less_self_pressure', action_tag: 'drop_self_pressure', object_tag: 'adjusted_workday', metaphor_tag: 'calendar_as_tangle', opener_tag: 'adjusted_day_observation', sentence_shape: 'observation_plus_boundary' }
  ],
  pre_holiday: [
    { text: '假期已经在日历那头招手，今天不用装作没看见。', content_track: 'object_humor', semantic_core: 'holiday_visible_ahead', action_tag: 'acknowledge_anticipation', object_tag: 'calendar', metaphor_tag: 'holiday_waving', opener_tag: 'holiday_ahead', sentence_shape: 'observation_plus_joke' }
  ],
  holiday_start: [
    { text: '假期才刚开始，先别急着把轻松也排满。', content_track: 'life_boundary', semantic_core: 'holiday_start_needs_no_schedule', action_tag: 'leave_holiday_open', object_tag: 'holiday_start', metaphor_tag: 'ease_as_schedule', opener_tag: 'holiday_just_started', sentence_shape: 'observation_plus_permission' }
  ],
  holiday_middle: [
    { text: '假期走到中间也不用盘点，今天先算今天。', content_track: 'permission_pause', semantic_core: 'holiday_middle_needs_no_audit', action_tag: 'stay_with_today', object_tag: 'holiday_middle', metaphor_tag: 'holiday_as_ledger', opener_tag: 'holiday_midpoint', sentence_shape: 'observation_plus_reframe' }
  ],
  holiday_end: [
    { text: '假期快收尾了，也不用提前替明天开始。', content_track: 'life_boundary', semantic_core: 'holiday_end_does_not_start_tomorrow', action_tag: 'keep_last_holiday_time', object_tag: 'tomorrow', metaphor_tag: 'starting_tomorrow_early', opener_tag: 'holiday_near_end', sentence_shape: 'observation_plus_boundary' }
  ],
  post_holiday: [
    { text: '假期后的节奏不用一步接满，先让今天慢慢归位。', content_track: 'grounded_observation', semantic_core: 'post_holiday_rhythm_returns_gradually', action_tag: 'soft_reentry', object_tag: 'daily_rhythm', metaphor_tag: 'rhythm_returning_to_place', opener_tag: 'after_holiday', sentence_shape: 'permission_plus_reentry' }
  ],
  possible_work_overhang: [
    { text: '白天的事还在屏幕边上，也不必都留到今晚。', content_track: 'life_boundary', semantic_core: 'work_overhang_need_not_fill_evening', action_tag: 'leave_work_for_later', object_tag: 'evening', metaphor_tag: 'work_at_screen_edge', opener_tag: 'daytime_work_lingers', sentence_shape: 'observation_plus_boundary' }
  ]
};

const REST_DAY_ZH: Template[] = [
  { text: '今天不用按工作日的刻度走，慢一点也准时。', content_track: 'playful_boundary', semantic_core: 'rest_day_has_own_clock', action_tag: 'follow_rest_pace', object_tag: 'day_scale', metaphor_tag: 'day_as_clock_scale', opener_tag: 'rest_day_clock', sentence_shape: 'reframe_plus_permission' },
  { text: '这一页可以只是路过，不必顺手变成一项任务。', content_track: 'life_boundary', semantic_core: 'page_need_not_become_task', action_tag: 'keep_page_casual', object_tag: 'current_page', metaphor_tag: 'page_as_task', opener_tag: 'page_permission', sentence_shape: 'permission_plus_boundary' },
  { text: '空下来不是漏掉了什么，是今天本来就有空白。', content_track: 'permission_pause', semantic_core: 'empty_time_belongs_in_day', action_tag: 'allow_empty_time', object_tag: 'empty_time', metaphor_tag: 'day_contains_blank', opener_tag: 'empty_time_reframe', sentence_shape: 'negation_plus_reframe' },
  { text: '屏幕可以开着，今天的注意力不用跟着值班。', content_track: 'object_humor', semantic_core: 'attention_off_duty_on_rest_day', action_tag: 'release_attention', object_tag: 'attention', metaphor_tag: 'attention_on_duty', opener_tag: 'screen_can_stay', sentence_shape: 'contrast_plus_joke' }
];

const CONFIRMED_WORK_ZH: Record<ConfirmedWorkStatus, Template[]> = {
  workplace_arrival: [
    { text: '已经到公司了，先简单收拾一下，不用马上开工。', content_track: 'playful_boundary', semantic_core: 'arrival_allows_simple_setup', action_tag: 'settle_before_start', object_tag: 'workplace', metaphor_tag: 'none', opener_tag: 'confirmed_arrival', sentence_shape: 'fact_plus_direct_permission' }
  ],
  working: [
    { text: '工作已经开始了，先停几秒再接着做也可以。', content_track: 'grounded_observation', semantic_core: 'work_allows_brief_stop', action_tag: 'brief_stop', object_tag: 'current_work', metaphor_tag: 'none', opener_tag: 'work_in_progress', sentence_shape: 'fact_plus_direct_permission' }
  ],
  off_work: [
    { text: '已经下班了，没处理完的先放着，明天再继续。', content_track: 'life_boundary', semantic_core: 'off_work_leaves_unfinished_work', action_tag: 'leave_work_for_tomorrow', object_tag: 'unfinished_work', metaphor_tag: 'none', opener_tag: 'off_work_confirmed', sentence_shape: 'fact_plus_direct_boundary' }
  ],
  overtime: [
    { text: '已经加班到现在了，先确认哪些事情可以明天再做。', content_track: 'life_boundary', semantic_core: 'overtime_can_defer_scope', action_tag: 'defer_nonurgent_work', object_tag: 'remaining_work', metaphor_tag: 'none', opener_tag: 'overtime_confirmed', sentence_shape: 'fact_plus_direct_boundary' }
  ]
};

const EMOTION_ZH: Record<string, Template> = {
  happy: { text: '这点好心情先别急着用掉，留一会儿也行。', content_track: 'grounded_observation', semantic_core: 'let_good_feeling_linger', action_tag: 'keep_feeling', object_tag: 'good_mood', metaphor_tag: 'mood_as_resource', opener_tag: 'good_feeling', sentence_shape: 'observation_plus_permission' },
  neutral: { text: '没什么特别的也很好，这一会儿可以只是普通。', content_track: 'permission_pause', semantic_core: 'ordinary_moment_is_enough', action_tag: 'allow_ordinary', object_tag: 'moment', metaphor_tag: 'none', opener_tag: 'nothing_special', sentence_shape: 'reframe_plus_permission' },
  angry: { text: '这股火先不用讲道理，在这里放一会儿也行。', content_track: 'grounded_observation', semantic_core: 'anger_needs_no_argument', action_tag: 'let_anger_rest', object_tag: 'anger', metaphor_tag: 'anger_as_fire', opener_tag: 'this_anger', sentence_shape: 'acknowledgment_plus_permission' },
  anxious: { text: '先不用追到以后，眼前这一小块已经够了。', content_track: 'grounded_observation', semantic_core: 'future_can_shrink_to_present', action_tag: 'narrow_to_present', object_tag: 'present_space', metaphor_tag: 'future_as_chase', opener_tag: 'no_need_to_chase', sentence_shape: 'permission_plus_grounding' },
  sad: { text: '这一会儿不用表现得没事，安静待着也可以。', content_track: 'permission_pause', semantic_core: 'sadness_needs_no_performance', action_tag: 'allow_quiet', object_tag: 'moment', metaphor_tag: 'emotion_as_performance', opener_tag: 'this_moment', sentence_shape: 'permission_plus_acceptance' },
  exhausted: { text: '现在不用再证明什么，停在这里也算一种安排。', content_track: 'permission_pause', semantic_core: 'exhaustion_needs_no_proof', action_tag: 'allow_stop', object_tag: 'current_moment', metaphor_tag: 'stopping_as_plan', opener_tag: 'no_more_proof', sentence_shape: 'permission_plus_reframe' }
};

function hydrate(template: Template, state: PipelineState): PerspectivePoolItem {
  return {
    ...template,
    style: template.content_track || 'grounded_observation',
    track: template.content_track === 'sensory_reset' ? 'A_PHYSICAL' : 'D_THEME',
    dimension: template.semantic_core || 'local_fallback',
    state_fingerprint: state.stateFingerprint,
    prompt_version: STARTLY_PROMPT_VERSION,
    generated_at: Date.now()
  };
}

function compactHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function leastRecentlyUsedFallback(
  candidates: PerspectivePoolItem[],
  state: PipelineState,
  history: PerspectiveHistory[]
): PerspectivePoolItem | undefined {
  if (candidates.length === 0) return undefined;
  const ranked = candidates.map((candidate, index) => {
    const semanticIndex = history.findIndex(item => (
      item.semanticCore === candidate.semantic_core || item.text === candidate.text
    ));
    return {
      candidate,
      index,
      recency: semanticIndex === -1 ? Number.POSITIVE_INFINITY : semanticIndex
    };
  });
  const oldest = Math.max(...ranked.map(item => item.recency));
  const tied = ranked.filter(item => item.recency === oldest);
  const seed = compactHash(`${state.stateFingerprint}|${history.length}`);
  return tied[seed % tied.length]?.candidate;
}

export function getStateAwareFallback(
  state: PipelineState,
  language: string,
  history: PerspectiveHistory[] = []
): PerspectivePoolItem | undefined {
  if (!language.toLowerCase().includes('chinese') && !language.toLowerCase().includes('zh')) return undefined;

  if (state.input.clickedEmotion) {
    const emotionCandidates = [EMOTION_ZH[state.input.clickedEmotion]].map(template => hydrate(template, state));
    const emotionSelection = selectBestCandidate(emotionCandidates, state, history);
    return emotionSelection.selected || leastRecentlyUsedFallback(emotionCandidates, state, history);
  }

  if (state.input.isManualRefresh) {
    const refreshCandidates = getRefreshTemplates(state.input.consecutiveClicks)
      .map(template => hydrate(template, state));
    const refreshSelection = selectBestCandidate(refreshCandidates, state, history);
    return refreshSelection.selected
      || leastRecentlyUsedFallback(refreshCandidates, state, history);
  }

  if (state.input.confirmedWorkStatus) {
    const confirmedCandidates = CONFIRMED_WORK_ZH[state.input.confirmedWorkStatus]
      .map(template => hydrate(template, state));
    const confirmedSelection = selectBestCandidate(confirmedCandidates, state, history);
    return confirmedSelection.selected
      || leastRecentlyUsedFallback(confirmedCandidates, state, history);
  }

  const isRestDay = state.input.dayKind === 'rest_day' || state.input.dayKind === 'public_holiday';
  const templates = [
    ...(OVERRIDE_ZH[state.sceneResolution.scene] || []),
    ...state.sceneResolution.modifiers.flatMap(modifier => MODIFIER_ZH[modifier] || []),
    ...(isRestDay ? REST_DAY_ZH : BASE_ZH[state.sceneResolution.baseScene])
  ];
  const candidates = templates.filter(Boolean).map(template => hydrate(template, state));
  const selection = selectBestCandidate(candidates, state, history);
  return selection.selected || leastRecentlyUsedFallback(candidates, state, history);
}
