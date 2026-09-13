import { ConfirmedWorkStatus, EmotionType, PerspectiveHistory, PerspectivePoolItem } from '../../types';
import { selectBestCandidate, validatePerspectiveCandidate } from './candidateValidator';
import { STARTLY_PROMPT_VERSION } from './generator';
import { BaseTimeScene, EmotionTransition, PipelineState, SceneModifier } from './types';

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
    { text: '先让一件事留在前面，其余的不用排成队。', content_track: 'playful_boundary', semantic_core: 'one_item_without_queue', action_tag: 'keep_one_item', object_tag: 'tasks', metaphor_tag: 'tasks_as_queue', opener_tag: 'single_scope', sentence_shape: 'micro_action_plus_joke' },
    { text: '把视线从屏幕上移开几秒，再回来也来得及。', content_track: 'sensory_reset', semantic_core: 'brief_gaze_shift_is_affordable', action_tag: 'look_away_briefly', object_tag: 'screen', metaphor_tag: 'none', opener_tag: 'move_gaze_offscreen', sentence_shape: 'direct_action_plus_reassurance' },
    { text: '屏幕外随便看样东西，工作不会趁这几秒跑掉。', content_track: 'object_humor', semantic_core: 'work_survives_object_glance', action_tag: 'notice_any_object', object_tag: 'visible_object', metaphor_tag: 'work_running_away', opener_tag: 'look_outside_screen', sentence_shape: 'object_invitation_plus_joke' },
    { text: '上午不只用来处理事情，喝水、走两步也算正事。', content_track: 'life_boundary', semantic_core: 'morning_includes_ordinary_life', action_tag: 'make_room_for_body', object_tag: 'ordinary_life', metaphor_tag: 'none', opener_tag: 'morning_is_not_only_tasks', sentence_shape: 'boundary_plus_examples' },
    { text: '有件事暂时没做完，也不妨碍你先停一会儿。', content_track: 'permission_pause', semantic_core: 'unfinished_item_allows_pause', action_tag: 'pause_with_unfinished_work', object_tag: 'unfinished_item', metaphor_tag: 'none', opener_tag: 'unfinished_item_permission', sentence_shape: 'fact_plus_permission' },
    { text: '少看屏幕几分钟，大多数事情不会因此变糟。', content_track: 'unexpected_perspective', semantic_core: 'brief_screen_break_changes_little', action_tag: 'leave_screen_briefly', object_tag: 'current_things', metaphor_tag: 'none', opener_tag: 'brief_screen_absence', sentence_shape: 'small_action_plus_plain_result' }
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

const STAGE_ENTRY_ZH: Record<BaseTimeScene, Template> = {
  early_buffer: { text: '现在还早，先做点简单的，不用马上进入忙碌状态。', content_track: 'grounded_observation', semantic_core: 'stage_early_is_not_full_speed', action_tag: 'start_simple', object_tag: 'early_time', metaphor_tag: 'none', opener_tag: 'stage_early_direct', sentence_shape: 'direct_stage_plus_permission' },
  arrival_buffer: { text: '早上刚开始，先做一件简单的事，不用立刻排满。', content_track: 'grounded_observation', semantic_core: 'stage_morning_starts_simple', action_tag: 'start_with_one_simple_thing', object_tag: 'morning_start', metaphor_tag: 'none', opener_tag: 'stage_arrival_direct', sentence_shape: 'direct_stage_plus_action' },
  morning_sustained: { text: '已经是上午了，工作一件件做，中间也可以停几分钟。', content_track: 'grounded_observation', semantic_core: 'stage_morning_allows_breaks', action_tag: 'take_brief_break', object_tag: 'morning_work', metaphor_tag: 'none', opener_tag: 'stage_morning_direct', sentence_shape: 'direct_stage_plus_permission' },
  pre_lunch_transition: { text: '快到午饭时间了，手里的事情可以准备停一下。', content_track: 'life_boundary', semantic_core: 'stage_lunch_is_approaching', action_tag: 'prepare_to_pause', object_tag: 'lunch_time', metaphor_tag: 'none', opener_tag: 'stage_pre_lunch_direct', sentence_shape: 'direct_stage_plus_boundary' },
  midday_release: { text: '现在是午间时间，吃饭和休息不用给工作让路。', content_track: 'life_boundary', semantic_core: 'stage_midday_protects_meal_and_rest', action_tag: 'protect_midday_break', object_tag: 'meal_and_rest', metaphor_tag: 'none', opener_tag: 'stage_midday_direct', sentence_shape: 'direct_stage_plus_boundary' },
  post_lunch_reentry: { text: '午后刚开始，先做简单的事，不用马上处理一大堆。', content_track: 'grounded_observation', semantic_core: 'stage_post_lunch_restarts_small', action_tag: 'restart_with_simple_thing', object_tag: 'afternoon_start', metaphor_tag: 'none', opener_tag: 'stage_post_lunch_direct', sentence_shape: 'direct_stage_plus_action' },
  afternoon_stretch: { text: '已经到下午了，工作可以继续，也该停几分钟看看别处。', content_track: 'sensory_reset', semantic_core: 'stage_afternoon_allows_visual_break', action_tag: 'look_elsewhere_briefly', object_tag: 'afternoon_work', metaphor_tag: 'none', opener_tag: 'stage_afternoon_direct', sentence_shape: 'direct_stage_plus_action' },
  closing_runway: { text: '快到下班时间了，今天没做完的不用都塞进这会儿。', content_track: 'life_boundary', semantic_core: 'stage_closing_does_not_hold_everything', action_tag: 'leave_unfinished_work', object_tag: 'closing_window', metaphor_tag: 'work_as_container', opener_tag: 'stage_closing_direct', sentence_shape: 'direct_stage_plus_boundary' },
  evening_transition: { text: '已经到晚上了，工作之外的时间也应该留出来。', content_track: 'life_boundary', semantic_core: 'stage_evening_makes_room_for_life', action_tag: 'make_room_for_nonwork', object_tag: 'evening_time', metaphor_tag: 'none', opener_tag: 'stage_evening_direct', sentence_shape: 'direct_stage_plus_boundary' },
  late_evening_boundary: { text: '现在已经比较晚了，屏幕里的事情不用今晚全处理。', content_track: 'permission_pause', semantic_core: 'stage_late_evening_tasks_can_wait', action_tag: 'leave_tasks_for_later', object_tag: 'screen_tasks', metaphor_tag: 'none', opener_tag: 'stage_late_evening_direct', sentence_shape: 'direct_stage_plus_permission' },
  night_guard: { text: '已经是深夜了，屏幕里的事情可以留到明天。', content_track: 'permission_pause', semantic_core: 'stage_night_tasks_wait_for_tomorrow', action_tag: 'leave_tasks_for_tomorrow', object_tag: 'screen_tasks', metaphor_tag: 'none', opener_tag: 'stage_night_direct', sentence_shape: 'direct_stage_plus_permission' }
};

const OVERRIDE_ZH: Partial<Record<PipelineState['sceneResolution']['scene'], Template[]>> = {
  quiet_return: [
    { text: '刚回到这一页，先不用把节奏接得太满。', content_track: 'grounded_observation', semantic_core: 'return_without_full_speed', action_tag: 'soft_reentry', object_tag: 'current_page', metaphor_tag: 'rhythm_as_connection', opener_tag: 'just_returned', sentence_shape: 'observation_plus_permission' }
  ],
  overloaded_browser: [
    { text: '开着的东西不少，先别让它们一起往前挤。', content_track: 'playful_boundary', semantic_core: 'open_items_need_not_crowd', action_tag: 'reduce_scope', object_tag: 'open_items', metaphor_tag: 'items_crowding_forward', opener_tag: 'open_items_observation', sentence_shape: 'observation_plus_containment' }
  ]
};

const PAGE_RELOAD_ZH: Template[] = [
  { text: '随便挑个手边的小东西看看，它今天不用完成任务。', content_track: 'object_humor', semantic_core: 'reload_object_has_no_task', action_tag: 'notice_nearby_object', object_tag: 'ordinary_object', metaphor_tag: 'object_with_no_assignment', opener_tag: 'reload_pick_object', sentence_shape: 'object_invitation_plus_joke' },
  { text: '看看屏幕外最普通的东西，不用从它身上得到启发。', content_track: 'object_humor', semantic_core: 'reload_object_needs_no_inspiration', action_tag: 'notice_without_purpose', object_tag: 'ordinary_object', metaphor_tag: 'none', opener_tag: 'reload_ordinary_object', sentence_shape: 'object_action_plus_permission' },
  { text: '先看几秒屏幕外最远的地方，再回来也来得及。', content_track: 'sensory_reset', semantic_core: 'reload_brief_far_gaze', action_tag: 'look_far_briefly', object_tag: 'farthest_visible_point', metaphor_tag: 'none', opener_tag: 'reload_look_far', sentence_shape: 'visual_action_plus_return' },
  { text: '把视线从字上挪开一会儿，看看远近有什么变化。', content_track: 'sensory_reset', semantic_core: 'reload_notice_visual_distance', action_tag: 'shift_visual_distance', object_tag: 'near_and_far_view', metaphor_tag: 'none', opener_tag: 'reload_move_gaze', sentence_shape: 'visual_shift_plus_observation' },
  { text: '不是每次打开页面，都要顺手解决一个问题。', content_track: 'unexpected_perspective', semantic_core: 'reload_page_needs_no_solution', action_tag: 'leave_problem_unsolved', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'reload_not_every_open', sentence_shape: 'negation_plus_perspective' },
  { text: '少看屏幕几分钟，大多数事情不会因此变糟。', content_track: 'unexpected_perspective', semantic_core: 'reload_brief_absence_changes_little', action_tag: 'leave_screen_briefly', object_tag: 'current_things', metaphor_tag: 'none', opener_tag: 'reload_brief_screen_absence', sentence_shape: 'small_action_plus_plain_result' },
  { text: '去喝两口水也算正事，这一页可以先放一会儿。', content_track: 'life_boundary', semantic_core: 'reload_water_counts_as_life', action_tag: 'drink_water', object_tag: 'water', metaphor_tag: 'none', opener_tag: 'reload_water_is_valid', sentence_shape: 'ordinary_life_plus_page_boundary' },
  { text: '做件和屏幕无关的小事，回来再决定看不看。', content_track: 'life_boundary', semantic_core: 'reload_offscreen_choice_first', action_tag: 'do_offscreen_activity', object_tag: 'ordinary_life', metaphor_tag: 'none', opener_tag: 'reload_offscreen_activity', sentence_shape: 'ordinary_action_plus_choice' },
  { text: '现在什么都不处理也可以，页面先开着就行。', content_track: 'permission_pause', semantic_core: 'reload_no_processing_required', action_tag: 'do_nothing_briefly', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'reload_nothing_required', sentence_shape: 'clear_permission_plus_fact' },
  { text: '有件事暂时没做完，也不妨碍你先停一会儿。', content_track: 'permission_pause', semantic_core: 'reload_unfinished_allows_pause', action_tag: 'pause_with_unfinished_item', object_tag: 'unfinished_item', metaphor_tag: 'none', opener_tag: 'reload_unfinished_permission', sentence_shape: 'fact_plus_permission' },
  { text: '浏览器可以一直开着，你不用一直陪着它。', content_track: 'playful_boundary', semantic_core: 'reload_browser_needs_no_company', action_tag: 'leave_browser_alone', object_tag: 'browser', metaphor_tag: 'browser_needs_company', opener_tag: 'reload_browser_open', sentence_shape: 'object_joke_plus_boundary' },
  { text: '这页不会点名，走神几分钟也没人记过。', content_track: 'playful_boundary', semantic_core: 'reload_page_takes_no_attendance', action_tag: 'allow_mind_wander', object_tag: 'current_page', metaphor_tag: 'page_taking_attendance', opener_tag: 'reload_page_attendance', sentence_shape: 'clear_page_joke' },
  { text: '屏幕亮着只说明页面开着，不代表你现在得做什么。', content_track: 'grounded_observation', semantic_core: 'reload_open_screen_implies_nothing', action_tag: 'drop_page_obligation', object_tag: 'screen', metaphor_tag: 'none', opener_tag: 'reload_screen_fact', sentence_shape: 'literal_fact_plus_boundary' },
  { text: '你只是打开了一页，不需要顺手接住所有事情。', content_track: 'grounded_observation', semantic_core: 'reload_opening_is_not_obligation', action_tag: 'drop_page_scope', object_tag: 'current_page', metaphor_tag: 'catching_all_things', opener_tag: 'reload_just_one_page', sentence_shape: 'plain_fact_plus_boundary' },
  { text: '眼前这件事放到一周里看，晚几分钟真的没什么。', content_track: 'philosophical_zoom_out', semantic_core: 'reload_current_task_is_small_in_week', action_tag: 'allow_a_few_minutes', object_tag: 'current_task', metaphor_tag: 'none', opener_tag: 'reload_week_scale', sentence_shape: 'time_scale_plus_plain_conclusion' },
  { text: '今天没做完一件事，不等于把这一天过坏了。', content_track: 'philosophical_zoom_out', semantic_core: 'reload_unfinished_task_does_not_define_day', action_tag: 'separate_task_from_day', object_tag: 'unfinished_task', metaphor_tag: 'none', opener_tag: 'reload_day_reframe', sentence_shape: 'concrete_fact_plus_identity_boundary' }
];

const REFRESH_ZH: Record<'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'later', Template[]> = {
  first: [
    { text: '先看几秒远处，让眼睛从屏幕上换个焦点。', content_track: 'sensory_reset', semantic_core: 'refresh_look_far_for_seconds', action_tag: 'look_far', object_tag: 'distant_view', metaphor_tag: 'none', opener_tag: 'first_refresh_visual', sentence_shape: 'single_direct_visual_action' },
    { text: '把视线移到远一点的地方，停几秒再看屏幕。', content_track: 'sensory_reset', semantic_core: 'refresh_move_gaze_offscreen', action_tag: 'move_gaze', object_tag: 'offscreen_view', metaphor_tag: 'none', opener_tag: 'first_refresh_gaze', sentence_shape: 'direct_visual_action_plus_return' },
    { text: '先眨几下眼，再看一眼屏幕外最远的地方。', content_track: 'sensory_reset', semantic_core: 'refresh_blink_then_look_far', action_tag: 'blink_and_look_far', object_tag: 'farthest_visible_point', metaphor_tag: 'none', opener_tag: 'first_refresh_blink', sentence_shape: 'two_small_visual_actions' },
    { text: '先别盯着字看，抬眼看看远处，几秒就行。', content_track: 'sensory_reset', semantic_core: 'refresh_stop_reading_briefly', action_tag: 'raise_gaze', object_tag: 'distant_view', metaphor_tag: 'none', opener_tag: 'first_refresh_stop_reading', sentence_shape: 'direct_boundary_plus_timed_action' }
  ],
  second: [
    { text: '随便选一样看得见的小东西，认真看它几秒。', content_track: 'object_humor', semantic_core: 'refresh_pick_visible_object', action_tag: 'notice_object', object_tag: 'visible_object', metaphor_tag: 'none', opener_tag: 'second_refresh_pick', sentence_shape: 'direct_object_invitation' },
    { text: '让电脑自己忙一会儿，你先看看旁边的普通东西。', content_track: 'object_humor', semantic_core: 'refresh_let_computer_run', action_tag: 'notice_nearby_object', object_tag: 'computer', metaphor_tag: 'computer_busy', opener_tag: 'second_refresh_computer', sentence_shape: 'light_object_joke_plus_action' },
    { text: '挑个屏幕外的小东西，看看它是什么颜色。', content_track: 'object_humor', semantic_core: 'refresh_notice_object_color', action_tag: 'notice_color', object_tag: 'visible_object', metaphor_tag: 'none', opener_tag: 'second_refresh_color', sentence_shape: 'object_choice_plus_detail' },
    { text: '先看一眼手边最普通的东西，不用从它身上得到什么。', content_track: 'object_humor', semantic_core: 'refresh_object_needs_no_purpose', action_tag: 'notice_without_purpose', object_tag: 'ordinary_object', metaphor_tag: 'none', opener_tag: 'second_refresh_ordinary_object', sentence_shape: 'object_invitation_plus_permission' }
  ],
  third: [
    { text: '这句没说到点上也没关系，先去做点别的。', content_track: 'playful_boundary', semantic_core: 'refresh_line_can_miss', action_tag: 'do_something_else', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'third_refresh_line', sentence_shape: 'acknowledgment_plus_direct_action' },
    { text: '浏览器不会介意你少看它一会儿。', content_track: 'playful_boundary', semantic_core: 'refresh_browser_does_not_mind', action_tag: 'look_away', object_tag: 'browser', metaphor_tag: 'browser_has_opinion', opener_tag: 'third_refresh_browser', sentence_shape: 'clear_object_joke' },
    { text: '网页不会因为你走神几秒就记仇。', content_track: 'playful_boundary', semantic_core: 'refresh_page_holds_no_grudge', action_tag: 'allow_distraction', object_tag: 'current_page', metaphor_tag: 'page_holding_grudge', opener_tag: 'third_refresh_webpage', sentence_shape: 'plain_object_joke' },
    { text: '这页先自己待会儿，你不用一直陪着它。', content_track: 'playful_boundary', semantic_core: 'refresh_page_can_wait_alone', action_tag: 'leave_page_alone', object_tag: 'current_page', metaphor_tag: 'page_needs_company', opener_tag: 'third_refresh_page_waits', sentence_shape: 'joke_plus_direct_boundary' }
  ],
  fourth: [
    { text: '去倒杯水、走两步，或者做件和屏幕无关的小事。', content_track: 'life_boundary', semantic_core: 'refresh_choose_offscreen_activity', action_tag: 'do_offscreen_activity', object_tag: 'ordinary_life', metaphor_tag: 'none', opener_tag: 'fourth_refresh_activity', sentence_shape: 'concrete_offscreen_options' },
    { text: '先整理一下手边的东西，几分钟后再回来。', content_track: 'life_boundary', semantic_core: 'refresh_tidy_something_nearby', action_tag: 'tidy_nearby', object_tag: 'nearby_things', metaphor_tag: 'none', opener_tag: 'fourth_refresh_tidy', sentence_shape: 'ordinary_action_plus_return' },
    { text: '去喝两口水，回来再决定还看不看这一页。', content_track: 'life_boundary', semantic_core: 'refresh_water_before_page_decision', action_tag: 'drink_water', object_tag: 'water', metaphor_tag: 'none', opener_tag: 'fourth_refresh_water', sentence_shape: 'ordinary_action_plus_choice' },
    { text: '站起来走两步，屏幕里的事可以等一会儿。', content_track: 'life_boundary', semantic_core: 'refresh_short_walk_before_screen', action_tag: 'walk_briefly', object_tag: 'screen_tasks', metaphor_tag: 'none', opener_tag: 'fourth_refresh_walk', sentence_shape: 'ordinary_action_plus_permission' }
  ],
  fifth: [
    { text: '眼前这件事放到一周里看，晚几分钟真的没什么。', content_track: 'philosophical_zoom_out', semantic_core: 'current_task_is_small_in_week', action_tag: 'allow_a_few_minutes', object_tag: 'current_task', metaphor_tag: 'none', opener_tag: 'fifth_refresh_week_scale', sentence_shape: 'time_scale_plus_plain_conclusion' },
    { text: '今天没做完一件事，不等于你把这一天过坏了。', content_track: 'philosophical_zoom_out', semantic_core: 'unfinished_task_does_not_define_day', action_tag: 'separate_task_from_day', object_tag: 'unfinished_task', metaphor_tag: 'none', opener_tag: 'fifth_refresh_day_reframe', sentence_shape: 'concrete_fact_plus_identity_boundary' },
    { text: '工作只是生活的一部分，不值得占满你全部注意力。', content_track: 'philosophical_zoom_out', semantic_core: 'work_is_only_part_of_life', action_tag: 'release_attention', object_tag: 'work', metaphor_tag: 'none', opener_tag: 'fifth_refresh_work_boundary', sentence_shape: 'plain_proportion_plus_boundary' },
    { text: '大多数事情过一会儿还在，少看几分钟不会改变结果。', content_track: 'philosophical_zoom_out', semantic_core: 'brief_pause_does_not_change_result', action_tag: 'look_away_briefly', object_tag: 'current_things', metaphor_tag: 'none', opener_tag: 'fifth_refresh_result_reframe', sentence_shape: 'ordinary_truth_plus_concrete_permission' }
  ],
  later: [
    { text: '这个页面可以先关掉，想回来时再回来。', content_track: 'permission_pause', semantic_core: 'refresh_page_can_close', action_tag: 'close_page', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'later_refresh_close', sentence_shape: 'direct_permission_plus_return' },
    { text: '先离开屏幕一会儿，这里的内容不会跑掉。', content_track: 'permission_pause', semantic_core: 'refresh_content_will_remain', action_tag: 'leave_screen', object_tag: 'page_content', metaphor_tag: 'content_running_away', opener_tag: 'later_refresh_leave', sentence_shape: 'direct_action_plus_light_joke' },
    { text: '现在停下来也可以，不必再找一句更合适的话。', content_track: 'permission_pause', semantic_core: 'refresh_no_more_line_search', action_tag: 'stop_refreshing', object_tag: 'perspective_line', metaphor_tag: 'none', opener_tag: 'later_refresh_stop', sentence_shape: 'permission_plus_clear_boundary' },
    { text: '到这里就行，关掉页面也不会错过什么。', content_track: 'permission_pause', semantic_core: 'refresh_close_without_missing_out', action_tag: 'close_page', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'later_refresh_enough', sentence_shape: 'clear_stop_plus_permission' }
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
  { text: '去附近走一圈，让一杯喜欢的咖啡加入周末。', content_track: 'leisure_outing', semantic_core: 'walk_with_favorite_coffee', action_tag: 'take_casual_walk', object_tag: 'coffee', metaphor_tag: 'coffee_joins_weekend', opener_tag: 'walk_nearby', sentence_shape: 'invitation_plus_small_pleasure' },
  { text: '今天可以把路线交给脚步，拐进一家没去过的小店。', content_track: 'leisure_outing', semantic_core: 'wander_into_new_shop', action_tag: 'wander_nearby', object_tag: 'small_shop', metaphor_tag: 'feet_choose_route', opener_tag: 'let_feet_choose', sentence_shape: 'permission_plus_discovery' },
  { text: '找个舒服的位置坐会儿，看街上的故事自己经过。', content_track: 'leisure_outing', semantic_core: 'watch_street_life_pass', action_tag: 'sit_and_watch', object_tag: 'street', metaphor_tag: 'street_life_as_stories', opener_tag: 'find_comfortable_seat', sentence_shape: 'invitation_plus_observation' },

  { text: '给熟悉的人发句没正事的消息，闲聊也有自己的价值。', content_track: 'social_connection', semantic_core: 'casual_message_has_value', action_tag: 'send_casual_hello', object_tag: 'familiar_person', metaphor_tag: 'none', opener_tag: 'message_someone_familiar', sentence_shape: 'invitation_plus_reframe' },
  { text: '约一顿不用赶时间的饭，让话题慢慢自己长出来。', content_track: 'social_connection', semantic_core: 'unhurried_meal_together', action_tag: 'share_slow_meal', object_tag: 'shared_meal', metaphor_tag: 'conversation_growing', opener_tag: 'share_a_meal', sentence_shape: 'invitation_plus_image' },

  { text: '挑部没看过的电影，今晚可以借别人的故事旅行。', content_track: 'curiosity_play', semantic_core: 'travel_through_new_film', action_tag: 'watch_new_film', object_tag: 'film', metaphor_tag: 'story_as_travel', opener_tag: 'choose_new_film', sentence_shape: 'suggestion_plus_imagination' },
  { text: '翻几页一直好奇的书，答案晚点出现也没关系。', content_track: 'curiosity_play', semantic_core: 'browse_a_curious_book', action_tag: 'read_for_curiosity', object_tag: 'book', metaphor_tag: 'none', opener_tag: 'open_curious_book', sentence_shape: 'suggestion_plus_permission' },
  { text: '今天适合研究一件纯粹好玩的事，不必证明它有用。', content_track: 'curiosity_play', semantic_core: 'explore_something_for_fun', action_tag: 'follow_curiosity', object_tag: 'playful_interest', metaphor_tag: 'none', opener_tag: 'today_suits_curiosity', sentence_shape: 'observation_plus_permission' },

  { text: '给自己认真调杯喜欢的饮料，普通一天也值得讲究。', content_track: 'home_ritual', semantic_core: 'make_favorite_drink_carefully', action_tag: 'make_favorite_drink', object_tag: 'drink', metaphor_tag: 'none', opener_tag: 'make_a_drink', sentence_shape: 'ritual_plus_reframe' },
  { text: '放首想听的歌，让房间先换一种表情。', content_track: 'home_ritual', semantic_core: 'change_room_mood_with_song', action_tag: 'play_a_song', object_tag: 'room', metaphor_tag: 'room_changes_expression', opener_tag: 'play_wanted_song', sentence_shape: 'small_ritual_plus_image' },
  { text: '做点想吃的东西，厨房很擅长把时间变得有香气。', content_track: 'home_ritual', semantic_core: 'cook_something_desired', action_tag: 'cook_for_pleasure', object_tag: 'kitchen', metaphor_tag: 'time_gains_aroma', opener_tag: 'make_something_tasty', sentence_shape: 'invitation_plus_personification' },

  { text: '甜点不必等庆祝，今天愿意吃就是一个好理由。', content_track: 'small_delight', semantic_core: 'dessert_needs_no_occasion', action_tag: 'enjoy_small_treat', object_tag: 'dessert', metaphor_tag: 'none', opener_tag: 'dessert_permission', sentence_shape: 'reframe_plus_reason' },
  { text: '换件自己喜欢的衣服，哪怕只是出门随便逛逛。', content_track: 'small_delight', semantic_core: 'dress_for_casual_wandering', action_tag: 'wear_something_liked', object_tag: 'favorite_clothes', metaphor_tag: 'none', opener_tag: 'wear_something_liked', sentence_shape: 'small_choice_plus_example' },
  { text: '把窗边留给一杯东西和几分钟发呆，这就很像周末。', content_track: 'poetic_glimpse', semantic_core: 'window_drink_and_daydream', action_tag: 'daydream_by_window', object_tag: 'window', metaphor_tag: 'weekend_as_small_scene', opener_tag: 'leave_window_space', sentence_shape: 'scene_plus_weekend_image' },
  { text: '周末的空白不是缺内容，是生活正在自由发挥。', content_track: 'grounded_observation', semantic_core: 'weekend_blank_is_free_living', action_tag: 'allow_open_time', object_tag: 'weekend_space', metaphor_tag: 'life_improvising', opener_tag: 'weekend_blank', sentence_shape: 'reframe_plus_personification' },
  { text: '水杯和零食都到位的话，这一刻已经颇有阵容。', content_track: 'object_humor', semantic_core: 'snack_and_drink_make_a_lineup', action_tag: 'enjoy_simple_setup', object_tag: 'drink_and_snack', metaphor_tag: 'snacks_as_lineup', opener_tag: 'if_snacks_ready', sentence_shape: 'conditional_plus_object_humor' }
];

/**
 * A broad, scene-safe reserve for slow or unavailable AI responses. These
 * lines deliberately rotate across work, daily life, friendship, delight and
 * restrained poetry so the fallback experience does not become a loop of
 * "slow down" reminders.
 */
const GENERAL_ZH: Template[] = [
  { text: '这件事先做到能往前走，漂亮可以留给下一遍。', content_track: 'work_companion', semantic_core: 'workable_before_polished', action_tag: 'make_workable_version', object_tag: 'current_task', metaphor_tag: 'polish_as_second_pass', opener_tag: 'this_task_first', sentence_shape: 'work_reframe_plus_permission' },
  { text: '卡住时先把已知条件摆出来，答案不用全靠脑子扛。', content_track: 'work_companion', semantic_core: 'externalize_known_conditions', action_tag: 'write_known_conditions', object_tag: 'known_conditions', metaphor_tag: 'mind_carrying_answer', opener_tag: 'when_stuck', sentence_shape: 'micro_step_plus_reassurance' },
  { text: '今天的工作不用每项都满分，重要的那项清楚就好。', content_track: 'work_companion', semantic_core: 'clarity_over_all_perfect', action_tag: 'clarify_priority', object_tag: 'important_item', metaphor_tag: 'tasks_as_scores', opener_tag: 'todays_work', sentence_shape: 'scope_reframe_plus_standard' },
  { text: '邮件可以晚两分钟回，先把正在想的这件事放稳。', content_track: 'work_companion', semantic_core: 'protect_current_thought', action_tag: 'finish_current_thought', object_tag: 'email', metaphor_tag: 'thought_as_object_to_settle', opener_tag: 'email_can_wait', sentence_shape: 'boundary_plus_micro_focus' },
  { text: '待办再长也只会一次来一件，不用替后面那件着急。', content_track: 'work_companion', semantic_core: 'tasks_arrive_one_at_a_time', action_tag: 'stay_with_current_item', object_tag: 'task_list', metaphor_tag: 'tasks_arriving_in_turn', opener_tag: 'however_long_the_list', sentence_shape: 'fact_reframe_plus_reassurance' },
  { text: '先交出一个能用的版本，余下的聪明可以慢慢补上。', content_track: 'work_companion', semantic_core: 'usable_version_before_cleverness', action_tag: 'make_usable_version', object_tag: 'draft', metaphor_tag: 'cleverness_added_later', opener_tag: 'usable_version_first', sentence_shape: 'micro_step_plus_permission' },

  { text: '如果想换个场景，附近一段没走过的路也能当目的地。', content_track: 'leisure_outing', semantic_core: 'nearby_unwalked_route_as_destination', action_tag: 'take_new_nearby_route', object_tag: 'nearby_route', metaphor_tag: 'route_as_destination', opener_tag: 'if_scene_change_wanted', sentence_shape: 'conditional_plus_invitation' },
  { text: '下一次出门可以留个小彩蛋，比如尝一杯没喝过的东西。', content_track: 'leisure_outing', semantic_core: 'small_surprise_on_next_outing', action_tag: 'try_new_drink', object_tag: 'new_drink', metaphor_tag: 'outing_contains_surprise', opener_tag: 'next_outing', sentence_shape: 'permission_plus_example' },
  { text: '偶尔绕开最熟的路线，普通街角也会多一点新鲜。', content_track: 'leisure_outing', semantic_core: 'detour_refreshes_familiar_street', action_tag: 'take_small_detour', object_tag: 'street_corner', metaphor_tag: 'none', opener_tag: 'occasionally_detour', sentence_shape: 'small_action_plus_observation' },
  { text: '找个舒服的地方坐一会儿，看看人间自己往前走。', content_track: 'leisure_outing', semantic_core: 'sit_and_watch_life_move', action_tag: 'sit_somewhere_comfortable', object_tag: 'surroundings', metaphor_tag: 'life_moving_itself', opener_tag: 'find_comfortable_place', sentence_shape: 'invitation_plus_observation' },

  { text: '给熟悉的人分享一件小事，不必等它足够重要。', content_track: 'social_connection', semantic_core: 'share_small_thing_without_importance', action_tag: 'share_small_thing', object_tag: 'familiar_person', metaphor_tag: 'none', opener_tag: 'share_with_someone', sentence_shape: 'invitation_plus_permission' },
  { text: '想到谁就发句没正事的消息，闲聊本来就不需要理由。', content_track: 'social_connection', semantic_core: 'casual_chat_needs_no_reason', action_tag: 'send_casual_message', object_tag: 'familiar_person', metaphor_tag: 'none', opener_tag: 'when_someone_comes_to_mind', sentence_shape: 'invitation_plus_reframe' },
  { text: '有空可以约顿轻松的饭，话题到了桌边会自己出现。', content_track: 'social_connection', semantic_core: 'easy_meal_brings_conversation', action_tag: 'share_easy_meal', object_tag: 'dining_table', metaphor_tag: 'topics_arrive_at_table', opener_tag: 'when_time_allows', sentence_shape: 'invitation_plus_personification' },
  { text: '有人一起笑过的小事，通常比事情本身多活一会儿。', content_track: 'social_connection', semantic_core: 'shared_laughter_extends_small_moment', action_tag: 'notice_shared_laughter', object_tag: 'small_moment', metaphor_tag: 'moment_lives_longer', opener_tag: 'small_thing_shared', sentence_shape: 'observation_plus_perspective' },

  { text: '今天可以顺手认识一个完全用不上的冷知识。', content_track: 'curiosity_play', semantic_core: 'learn_useless_fun_fact', action_tag: 'follow_random_fact', object_tag: 'fun_fact', metaphor_tag: 'none', opener_tag: 'today_can', sentence_shape: 'permission_plus_play' },
  { text: '翻几页一直好奇的书，不急着读完也能带走一点东西。', content_track: 'curiosity_play', semantic_core: 'browse_curious_book_without_finishing', action_tag: 'browse_book', object_tag: 'book', metaphor_tag: 'carry_idea_away', opener_tag: 'browse_some_pages', sentence_shape: 'invitation_plus_permission' },
  { text: '挑部没看过的电影，借别人的故事换一会儿频道。', content_track: 'curiosity_play', semantic_core: 'switch_channel_through_new_film', action_tag: 'watch_new_film', object_tag: 'film', metaphor_tag: 'story_as_channel', opener_tag: 'choose_new_film', sentence_shape: 'invitation_plus_metaphor' },
  { text: '把一个平常问题查到有趣为止，好奇心偶尔也想散步。', content_track: 'curiosity_play', semantic_core: 'follow_question_until_interesting', action_tag: 'explore_small_question', object_tag: 'ordinary_question', metaphor_tag: 'curiosity_takes_walk', opener_tag: 'follow_a_question', sentence_shape: 'playful_action_plus_personification' },

  { text: '给喜欢的杯子换种饮料，房间会立刻多一点新剧情。', content_track: 'home_ritual', semantic_core: 'new_drink_changes_room_story', action_tag: 'make_different_drink', object_tag: 'favorite_cup', metaphor_tag: 'room_gains_story', opener_tag: 'change_cup_drink', sentence_shape: 'small_ritual_plus_image' },
  { text: '把灯光调到舒服的样子，屋子也会跟着换种语气。', content_track: 'home_ritual', semantic_core: 'comfortable_light_changes_room_tone', action_tag: 'adjust_room_light', object_tag: 'room_light', metaphor_tag: 'room_changes_tone', opener_tag: 'adjust_the_light', sentence_shape: 'small_ritual_plus_personification' },
  { text: '放首想听的歌，几分钟也足够让房间重新布景。', content_track: 'home_ritual', semantic_core: 'song_resets_room_scene', action_tag: 'play_wanted_song', object_tag: 'room', metaphor_tag: 'room_as_stage', opener_tag: 'play_wanted_song', sentence_shape: 'small_ritual_plus_reframe' },
  { text: '认真做点想吃的东西，香气会替这一段时间署名。', content_track: 'home_ritual', semantic_core: 'cook_desired_food_to_mark_time', action_tag: 'cook_something_desired', object_tag: 'food', metaphor_tag: 'aroma_signs_time', opener_tag: 'make_something_desired', sentence_shape: 'ritual_plus_poetic_image' },

  { text: '水杯如果在手边，让它也参与一下今天。', content_track: 'everyday_care', semantic_core: 'water_joins_the_day', action_tag: 'take_water', object_tag: 'water_cup', metaphor_tag: 'cup_participating', opener_tag: 'if_cup_nearby', sentence_shape: 'conditional_plus_light_action' },
  { text: '坐着时偶尔换个姿势，椅子也不用从头到尾演同一幕。', content_track: 'everyday_care', semantic_core: 'change_posture_for_variety', action_tag: 'change_posture', object_tag: 'chair', metaphor_tag: 'chair_scene_changes', opener_tag: 'while_sitting', sentence_shape: 'micro_action_plus_object_humor' },
  { text: '下一顿选点真正想吃的，味觉也该有一点发言权。', content_track: 'everyday_care', semantic_core: 'choose_food_by_real_preference', action_tag: 'choose_desired_food', object_tag: 'next_meal', metaphor_tag: 'taste_has_a_vote', opener_tag: 'next_meal', sentence_shape: 'small_choice_plus_personification' },
  { text: '眼睛可以离开屏幕一小会儿，窗外不需要加载。', content_track: 'everyday_care', semantic_core: 'brief_view_beyond_screen', action_tag: 'look_away_briefly', object_tag: 'window', metaphor_tag: 'outside_without_loading', opener_tag: 'eyes_may_leave', sentence_shape: 'permission_plus_object_humor' },
  { text: '洗把脸或走几步，都算把自己接回到今天。', content_track: 'everyday_care', semantic_core: 'small_reset_returns_to_day', action_tag: 'wash_or_walk', object_tag: 'small_routine', metaphor_tag: 'self_returning_to_day', opener_tag: 'wash_or_walk', sentence_shape: 'options_plus_reframe' },
  { text: '给桌面腾出一小块空地方，也给脑子留点余地。', content_track: 'everyday_care', semantic_core: 'clear_small_surface_space', action_tag: 'clear_small_space', object_tag: 'desk', metaphor_tag: 'desk_space_as_mental_margin', opener_tag: 'make_small_space', sentence_shape: 'micro_action_plus_parallel_reframe' },

  { text: '此刻只是一天里的一小段，不必替整天承担剧情。', content_track: 'grounded_observation', semantic_core: 'moment_need_not_carry_whole_day', action_tag: 'keep_moment_in_scale', object_tag: 'current_moment', metaphor_tag: 'day_as_story', opener_tag: 'this_moment', sentence_shape: 'observation_plus_scale' },
  { text: '平常的一刻也有自己的完整，不需要非得发生点什么。', content_track: 'grounded_observation', semantic_core: 'ordinary_moment_is_complete', action_tag: 'notice_ordinary_moment', object_tag: 'ordinary_moment', metaphor_tag: 'none', opener_tag: 'ordinary_moment', sentence_shape: 'observation_plus_reframe' },
  { text: '一天会自己往前走，偶尔看看沿途也算参与其中。', content_track: 'grounded_observation', semantic_core: 'notice_day_as_it_moves', action_tag: 'notice_surroundings', object_tag: 'day', metaphor_tag: 'day_as_path', opener_tag: 'day_moves_itself', sentence_shape: 'observation_plus_permission' },
  { text: '眼前能看见的小东西，也在认真组成这一刻。', content_track: 'grounded_observation', semantic_core: 'small_visible_things_form_moment', action_tag: 'notice_small_object', object_tag: 'visible_detail', metaphor_tag: 'moment_as_composition', opener_tag: 'small_visible_things', sentence_shape: 'observation_plus_personification' },

  { text: '先陪你把今天过到这里，后面的事等它来了再说。', content_track: 'friendly_nudge', semantic_core: 'company_for_current_part_of_day', action_tag: 'stay_with_present', object_tag: 'rest_of_day', metaphor_tag: 'future_events_arriving', opener_tag: 'stay_with_you_here', sentence_shape: 'companionship_plus_boundary' },
  { text: '要是这一刻不太顺，也不用马上把自己修好。', content_track: 'friendly_nudge', semantic_core: 'rough_moment_needs_no_self_repair', action_tag: 'drop_self_repair', object_tag: 'current_moment', metaphor_tag: 'self_as_repair_project', opener_tag: 'if_moment_rough', sentence_shape: 'conditional_plus_reassurance' },
  { text: '今天不必一直表现得很能干，普通一点也很可靠。', content_track: 'friendly_nudge', semantic_core: 'ordinary_self_is_reliable', action_tag: 'drop_competence_performance', object_tag: 'ordinary_self', metaphor_tag: 'competence_as_performance', opener_tag: 'today_need_not_perform', sentence_shape: 'permission_plus_reframe' },
  { text: '有些事只是难，不是你哪里做得不够。', content_track: 'friendly_nudge', semantic_core: 'difficulty_is_not_personal_failure', action_tag: 'separate_self_from_difficulty', object_tag: 'hard_thing', metaphor_tag: 'none', opener_tag: 'some_things_are_hard', sentence_shape: 'distinction_plus_reassurance' },
  { text: '你可以认真，也可以不把每件事都往心里搬。', content_track: 'friendly_nudge', semantic_core: 'care_without_carrying_everything', action_tag: 'carry_less_personally', object_tag: 'every_thing', metaphor_tag: 'things_carried_into_heart', opener_tag: 'you_can_care', sentence_shape: 'permission_plus_boundary' },
  { text: '这一小会儿先站你这边，不催，也不讲大道理。', content_track: 'friendly_nudge', semantic_core: 'brief_unpressured_companionship', action_tag: 'offer_company', object_tag: 'this_moment', metaphor_tag: 'standing_on_your_side', opener_tag: 'for_this_moment', sentence_shape: 'companionship_plus_plain_boundary' },

  { text: '让喜欢的杯子今天也上个班，气氛会松一点。', content_track: 'small_delight', semantic_core: 'favorite_cup_changes_mood', action_tag: 'use_favorite_cup', object_tag: 'favorite_cup', metaphor_tag: 'cup_clocking_in', opener_tag: 'let_favorite_cup', sentence_shape: 'small_delight_plus_light_result' },
  { text: '手边若有一份小零食，不必等到庆祝时才出现。', content_track: 'small_delight', semantic_core: 'small_treat_needs_no_occasion', action_tag: 'allow_small_treat', object_tag: 'small_snack', metaphor_tag: 'snack_waiting_for_celebration', opener_tag: 'if_snack_nearby', sentence_shape: 'conditional_plus_permission' },
  { text: '换一张喜欢的背景，也算给这一天换个表情。', content_track: 'small_delight', semantic_core: 'favorite_background_changes_day_expression', action_tag: 'change_background', object_tag: 'background', metaphor_tag: 'day_has_expression', opener_tag: 'change_a_background', sentence_shape: 'small_action_plus_playful_reframe' },
  { text: '把一个小东西摆正，世界会短暂地很配合。', content_track: 'small_delight', semantic_core: 'align_one_small_object', action_tag: 'straighten_small_object', object_tag: 'small_object', metaphor_tag: 'world_cooperating', opener_tag: 'straighten_one_thing', sentence_shape: 'micro_action_plus_dry_humor' },
  { text: '偶尔看看与工作无关的东西，脑子也需要闲逛。', content_track: 'small_delight', semantic_core: 'mind_needs_harmless_wandering', action_tag: 'look_at_nonwork_thing', object_tag: 'nonwork_detail', metaphor_tag: 'mind_wandering', opener_tag: 'occasionally_look_elsewhere', sentence_shape: 'permission_plus_personification' },
  { text: '今天可以留个小盼头，哪怕只是喝到喜欢的东西。', content_track: 'small_delight', semantic_core: 'keep_one_small_anticipation', action_tag: 'name_small_pleasure', object_tag: 'favorite_drink', metaphor_tag: 'anticipation_as_reserved_space', opener_tag: 'today_can_keep', sentence_shape: 'permission_plus_example' },

  { text: '看看手边最淡定的东西，它大概没有今天的安排。', content_track: 'object_humor', semantic_core: 'calm_object_has_no_schedule', action_tag: 'notice_calm_object', object_tag: 'nearby_object', metaphor_tag: 'object_without_schedule', opener_tag: 'look_at_calm_object', sentence_shape: 'object_observation_plus_dry_humor' },
  { text: '电脑风扇忙得很有气氛，你可以只负责听个响。', content_track: 'object_humor', semantic_core: 'computer_fan_performs_busyness', action_tag: 'listen_to_computer_fan', object_tag: 'computer_fan', metaphor_tag: 'fan_performing_busyness', opener_tag: 'computer_fan_busy', sentence_shape: 'object_joke_plus_permission' },
  { text: '桌角一直很安静，看来它对今天没有宏大计划。', content_track: 'object_humor', semantic_core: 'desk_corner_has_no_grand_plan', action_tag: 'notice_desk_corner', object_tag: 'desk_corner', metaphor_tag: 'desk_corner_planning', opener_tag: 'desk_corner_quiet', sentence_shape: 'object_observation_plus_joke' },
  { text: '窗外那朵云没提交日报，也照样走得很有方向。', content_track: 'object_humor', semantic_core: 'cloud_moves_without_daily_report', action_tag: 'watch_cloud_move', object_tag: 'cloud', metaphor_tag: 'cloud_without_report', opener_tag: 'cloud_outside', sentence_shape: 'object_joke_plus_observation' },

  { text: '把目光放远一点，屏幕之外还有没有标题的时间。', content_track: 'poetic_glimpse', semantic_core: 'untitled_time_beyond_screen', action_tag: 'look_farther', object_tag: 'untitled_time', metaphor_tag: 'time_without_title', opener_tag: 'look_a_little_farther', sentence_shape: 'micro_action_plus_poetic_image' },
  { text: '今天不必一路笔直，绕去生活里坐一会儿也很好。', content_track: 'poetic_glimpse', semantic_core: 'day_need_not_be_straight_line', action_tag: 'visit_life_briefly', object_tag: 'day_path', metaphor_tag: 'day_as_path', opener_tag: 'today_need_not', sentence_shape: 'permission_plus_clear_metaphor' },
  { text: '留一点空白，风景常从没有安排的地方进来。', content_track: 'poetic_glimpse', semantic_core: 'unscheduled_space_allows_scenery', action_tag: 'leave_blank_space', object_tag: 'blank_space', metaphor_tag: 'scenery_entering_schedule', opener_tag: 'leave_some_blank', sentence_shape: 'micro_action_plus_poetic_observation' },
  { text: '一天不只由完成组成，停顿也在替它轻轻换气。', content_track: 'poetic_glimpse', semantic_core: 'pauses_belong_in_a_day', action_tag: 'allow_pause', object_tag: 'day', metaphor_tag: 'day_breathing_through_pauses', opener_tag: 'a_day_is_not_only', sentence_shape: 'reframe_plus_poetic_image' },
  { text: '手边的光阴不用全交给任务，留一点给发呆。', content_track: 'poetic_glimpse', semantic_core: 'time_not_all_given_to_tasks', action_tag: 'keep_idle_moment', object_tag: 'nearby_time', metaphor_tag: 'time_handed_to_tasks', opener_tag: 'time_at_hand', sentence_shape: 'boundary_plus_poetic_permission' },
  { text: '让未完成先睡在句号外面，今天仍然可以收好。', content_track: 'poetic_glimpse', semantic_core: 'unfinished_can_rest_outside_period', action_tag: 'close_day_with_unfinished', object_tag: 'unfinished_work', metaphor_tag: 'unfinished_sleeping_outside_period', opener_tag: 'let_unfinished_rest', sentence_shape: 'poetic_image_plus_reassurance' }
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

const EMOTION_ZH: Record<EmotionType, Template> = {
  happy: { text: '现在心情很好，想笑就多笑一会儿。', content_track: 'grounded_observation', semantic_core: 'happiness_can_expand', action_tag: 'enjoy_happiness', object_tag: 'good_mood', metaphor_tag: 'none', opener_tag: 'happiness_direct', sentence_shape: 'acknowledgment_plus_invitation' },
  neutral: { text: '现在挺平静的，不需要特意把这一刻变得更精彩。', content_track: 'grounded_observation', semantic_core: 'ordinary_calm_is_enough', action_tag: 'leave_moment_ordinary', object_tag: 'calm_moment', metaphor_tag: 'none', opener_tag: 'calm_direct', sentence_shape: 'acknowledgment_plus_boundary' },
  angry: { text: '现在确实很生气，先离开眼前的事几分钟。', content_track: 'grounded_observation', semantic_core: 'anger_allows_distance', action_tag: 'step_away_briefly', object_tag: 'current_thing', metaphor_tag: 'none', opener_tag: 'anger_direct', sentence_shape: 'acknowledgment_plus_distance' },
  anxious: { text: '现在确实有点焦虑，先看眼前一个具体的东西。', content_track: 'grounded_observation', semantic_core: 'anxiety_returns_to_concrete_detail', action_tag: 'notice_one_detail', object_tag: 'visible_detail', metaphor_tag: 'none', opener_tag: 'anxiety_direct', sentence_shape: 'acknowledgment_plus_grounding' },
  sad: { text: '现在难过就不用装作没事，先安静待一会儿。', content_track: 'permission_pause', semantic_core: 'sadness_needs_no_performance', action_tag: 'allow_quiet', object_tag: 'moment', metaphor_tag: 'none', opener_tag: 'sadness_direct', sentence_shape: 'acknowledgment_plus_permission' },
  exhausted: { text: '现在真的累了，停一会儿不是偷懒。', content_track: 'permission_pause', semantic_core: 'exhaustion_legitimizes_stopping', action_tag: 'allow_stop', object_tag: 'current_moment', metaphor_tag: 'none', opener_tag: 'exhaustion_direct', sentence_shape: 'acknowledgment_plus_reframe' }
};

const EMOTION_TRANSITION_ZH: Partial<Record<EmotionTransition, Partial<Record<EmotionType, Template>>>> = {
  same_emotion: {
    happy: { text: '你还是很开心，这点高兴可以再多待一会儿。', content_track: 'grounded_observation', semantic_core: 'repeated_happiness_can_continue', action_tag: 'let_happiness_continue', object_tag: 'good_mood', metaphor_tag: 'none', opener_tag: 'still_happy', sentence_shape: 'repeat_acknowledgment_plus_permission' },
    neutral: { text: '你还是挺平静的，普通的一会儿也不用添点什么。', content_track: 'grounded_observation', semantic_core: 'repeated_calm_needs_no_addition', action_tag: 'leave_moment_ordinary', object_tag: 'calm_moment', metaphor_tag: 'none', opener_tag: 'still_calm', sentence_shape: 'repeat_acknowledgment_plus_boundary' },
    angry: { text: '这股生气还在，我听见了，先别逼自己马上消气。', content_track: 'permission_pause', semantic_core: 'repeated_anger_needs_no_instant_resolution', action_tag: 'allow_anger_without_action', object_tag: 'anger', metaphor_tag: 'none', opener_tag: 'anger_remains', sentence_shape: 'repeat_acknowledgment_plus_permission' },
    anxious: { text: '焦虑还没有走开也没关系，先只看眼前这一小块。', content_track: 'grounded_observation', semantic_core: 'repeated_anxiety_narrows_to_present', action_tag: 'narrow_to_present', object_tag: 'present_detail', metaphor_tag: 'none', opener_tag: 'anxiety_remains', sentence_shape: 'repeat_acknowledgment_plus_grounding' },
    sad: { text: '难过还在也不用装没事，这一会儿先别勉强自己。', content_track: 'permission_pause', semantic_core: 'repeated_sadness_needs_no_performance', action_tag: 'stop_self_pressure', object_tag: 'sad_moment', metaphor_tag: 'none', opener_tag: 'sadness_remains', sentence_shape: 'repeat_acknowledgment_plus_permission' },
    exhausted: { text: '你还是很累，那就先少做一点，不用继续硬撑。', content_track: 'permission_pause', semantic_core: 'repeated_exhaustion_reduces_demands', action_tag: 'reduce_demands', object_tag: 'current_demands', metaphor_tag: 'none', opener_tag: 'still_exhausted', sentence_shape: 'repeat_acknowledgment_plus_boundary' }
  },
  uplift: {
    happy: { text: '现在开心起来了，就让这份好心情再多待一会儿。', content_track: 'grounded_observation', semantic_core: 'happiness_after_shift_can_linger', action_tag: 'let_happiness_linger', object_tag: 'good_mood', metaphor_tag: 'none', opener_tag: 'happy_now', sentence_shape: 'transition_acknowledgment_plus_permission' }
  },
  drop: {
    sad: { text: '刚才还好好的，现在却难过了，这个落差确实不好受。', content_track: 'grounded_observation', semantic_core: 'happy_to_sad_contrast_hurts', action_tag: 'acknowledge_contrast', object_tag: 'emotional_shift', metaphor_tag: 'none', opener_tag: 'mood_drop', sentence_shape: 'transition_contrast_plus_validation' },
    angry: { text: '刚才还算轻松，现在却很生气，这个变化确实不好受。', content_track: 'grounded_observation', semantic_core: 'calm_to_anger_contrast_is_hard', action_tag: 'acknowledge_contrast', object_tag: 'emotional_shift', metaphor_tag: 'none', opener_tag: 'anger_shift', sentence_shape: 'transition_contrast_plus_validation' },
    anxious: { text: '刚才还比较轻松，现在却焦虑了，先不用逼自己解释。', content_track: 'permission_pause', semantic_core: 'calm_to_anxiety_needs_no_explanation', action_tag: 'drop_explanation', object_tag: 'emotional_shift', metaphor_tag: 'none', opener_tag: 'anxiety_shift', sentence_shape: 'transition_contrast_plus_permission' },
    exhausted: { text: '刚才状态还不错，现在却很累，身体的变化不用硬扛。', content_track: 'life_boundary', semantic_core: 'positive_to_exhausted_allows_stop', action_tag: 'stop_pushing', object_tag: 'body', metaphor_tag: 'none', opener_tag: 'exhaustion_shift', sentence_shape: 'transition_contrast_plus_boundary' }
  },
  settling: {
    neutral: { text: '现在平静一点了，这份普通不用被解释成进步。', content_track: 'grounded_observation', semantic_core: 'settling_needs_no_progress_story', action_tag: 'leave_calm_unmeasured', object_tag: 'calm_moment', metaphor_tag: 'none', opener_tag: 'calmer_now', sentence_shape: 'transition_acknowledgment_plus_boundary' }
  }
};

const EMOTION_FOLLOWUP_ZH: Record<EmotionType, Template[]> = {
  happy: [
    { text: '趁现在心情不错，去做件单纯让你高兴的小事。', content_track: 'unexpected_perspective', semantic_core: 'happy_followup_small_joy', action_tag: 'choose_small_joy', object_tag: 'ordinary_life', metaphor_tag: 'none', opener_tag: 'happy_followup', sentence_shape: 'mood_plus_offscreen_invitation' },
    { text: '开心的时候不用找意义，做件你本来就想做的小事。', content_track: 'playful_boundary', semantic_core: 'happy_followup_needs_no_meaning', action_tag: 'choose_wanted_activity', object_tag: 'ordinary_life', metaphor_tag: 'none', opener_tag: 'happy_followup_no_meaning', sentence_shape: 'mood_plus_plain_permission' }
  ],
  neutral: [
    { text: '平静的一会儿不需要产出什么，普通就很好。', content_track: 'unexpected_perspective', semantic_core: 'neutral_followup_needs_no_output', action_tag: 'leave_moment_unproductive', object_tag: 'ordinary_moment', metaphor_tag: 'none', opener_tag: 'neutral_followup', sentence_shape: 'plain_reframe' },
    { text: '现在不想多说什么也可以，让这一页安静一会儿。', content_track: 'grounded_observation', semantic_core: 'neutral_followup_allows_quiet', action_tag: 'leave_page_quiet', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'neutral_followup_quiet', sentence_shape: 'permission_plus_quiet_observation' }
  ],
  angry: [
    { text: '先把眼前这件事放远一点，几分钟后再决定要不要理它。', content_track: 'permission_pause', semantic_core: 'anger_followup_delays_engagement', action_tag: 'delay_reengagement', object_tag: 'current_thing', metaphor_tag: 'none', opener_tag: 'anger_followup', sentence_shape: 'distance_plus_later_choice' },
    { text: '先别回应眼前的事，去碰点和它没关系的东西。', content_track: 'life_boundary', semantic_core: 'anger_followup_changes_context', action_tag: 'touch_unrelated_object', object_tag: 'ordinary_object', metaphor_tag: 'none', opener_tag: 'anger_followup_no_response', sentence_shape: 'boundary_plus_context_shift' }
  ],
  anxious: [
    { text: '先只看一个具体的东西，让注意力有地方落下。', content_track: 'sensory_reset', semantic_core: 'anxiety_followup_uses_visual_anchor', action_tag: 'notice_one_object', object_tag: 'visible_object', metaphor_tag: 'attention_landing', opener_tag: 'anxiety_followup', sentence_shape: 'concrete_action_plus_grounding' },
    { text: '把视线放到离屏幕远一点的地方，先停几秒。', content_track: 'sensory_reset', semantic_core: 'anxiety_followup_shifts_visual_distance', action_tag: 'look_far_briefly', object_tag: 'distant_view', metaphor_tag: 'none', opener_tag: 'anxiety_followup_distance', sentence_shape: 'visual_shift_plus_pause' }
  ],
  sad: [
    { text: '这会儿不解决什么也可以，先做件让身体舒服的小事。', content_track: 'life_boundary', semantic_core: 'sad_followup_allows_simple_comfort', action_tag: 'choose_simple_comfort', object_tag: 'body', metaphor_tag: 'none', opener_tag: 'sad_followup', sentence_shape: 'permission_plus_ordinary_care' },
    { text: '今天可以先少要求自己一点，普通地待着就行。', content_track: 'permission_pause', semantic_core: 'sad_followup_reduces_self_demand', action_tag: 'reduce_self_demand', object_tag: 'current_day', metaphor_tag: 'none', opener_tag: 'sad_followup_less_demand', sentence_shape: 'boundary_plus_permission' }
  ],
  exhausted: [
    { text: '能停的先停一件，今天不用靠硬撑来证明什么。', content_track: 'permission_pause', semantic_core: 'exhausted_followup_stops_one_demand', action_tag: 'stop_one_demand', object_tag: 'current_demands', metaphor_tag: 'none', opener_tag: 'exhausted_followup', sentence_shape: 'reduce_demand_plus_boundary' },
    { text: '这一页可以先放着，累的时候不用再接新的事。', content_track: 'permission_pause', semantic_core: 'exhausted_followup_adds_no_new_demand', action_tag: 'avoid_new_demand', object_tag: 'current_page', metaphor_tag: 'none', opener_tag: 'exhausted_followup_no_new_task', sentence_shape: 'page_permission_plus_boundary' }
  ]
};

function hydrate(template: Template, state: PipelineState): PerspectivePoolItem {
  return {
    ...template,
    style: template.content_track || 'grounded_observation',
    track: template.content_track === 'sensory_reset' ? 'A_PHYSICAL' : 'D_THEME',
    dimension: template.semantic_core || 'local_fallback',
    state_fingerprint: state.stateFingerprint,
    environment_fingerprint: state.environmentFingerprint,
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

function selectFallbackCandidate(
  candidates: PerspectivePoolItem[],
  state: PipelineState,
  history: PerspectiveHistory[]
): PerspectivePoolItem | undefined {
  const selection = selectBestCandidate(candidates, state, history);
  if (selection.selected) return selection.selected;

  // If the 14-day duplicate window has exhausted every fresh option, relax
  // only the historical cooldown. Facts, rest-day boundaries, length and
  // allowed content tracks must still pass before choosing the least recently
  // used line.
  const hardSafeCandidates = candidates.filter(candidate => (
    validatePerspectiveCandidate(candidate, state, []).valid
  ));
  return leastRecentlyUsedFallback(hardSafeCandidates, state, history);
}

export function getStateAwareFallback(
  state: PipelineState,
  language: string,
  history: PerspectiveHistory[] = []
): PerspectivePoolItem | undefined {
  if (!language.toLowerCase().includes('chinese') && !language.toLowerCase().includes('zh')) return undefined;

  if (state.input.clickedEmotion) {
    const transitionTemplate = EMOTION_TRANSITION_ZH[state.input.emotionTransition]?.[state.input.clickedEmotion];
    const emotionTemplates = transitionTemplate
      ? state.input.emotionTransition === 'same_emotion'
        ? [transitionTemplate, EMOTION_ZH[state.input.clickedEmotion]]
        : [transitionTemplate]
      : [EMOTION_ZH[state.input.clickedEmotion]];
    const emotionCandidates = emotionTemplates.map(template => hydrate(template, state));
    return selectFallbackCandidate(emotionCandidates, state, history);
  }

  if (state.sceneResolution.scene === 'emotional_followup' && state.input.activeEmotion) {
    const followupCandidates = EMOTION_FOLLOWUP_ZH[state.input.activeEmotion]
      .map(template => hydrate(template, state));
    const followupSelection = selectBestCandidate(followupCandidates, state, history);
    return followupSelection.selected
      || leastRecentlyUsedFallback(followupCandidates, state, history);
  }

  if (state.input.isNewEnvironment) {
    const isRestDay = state.input.dayKind === 'rest_day'
      || state.input.dayKind === 'public_holiday';
    if (state.input.confirmedWorkStatus) {
      const confirmedCandidates = [
        ...CONFIRMED_WORK_ZH[state.input.confirmedWorkStatus],
        ...GENERAL_ZH
      ].map(template => hydrate(template, state));
      return selectFallbackCandidate(confirmedCandidates, state, history);
    }

    const entryTemplates = isRestDay
      ? [...REST_DAY_ZH, ...GENERAL_ZH]
      : [STAGE_ENTRY_ZH[state.sceneResolution.baseScene], ...GENERAL_ZH];
    const entryCandidates = entryTemplates.map(template => hydrate(template, state));
    return selectFallbackCandidate(entryCandidates, state, history);
  }

  if (state.input.isManualRefresh) {
    const isRestDay = state.input.dayKind === 'rest_day'
      || state.input.dayKind === 'public_holiday';
    const refreshTemplates = isRestDay
      ? [...REST_DAY_ZH, ...GENERAL_ZH]
      : GENERAL_ZH;
    const refreshCandidates = refreshTemplates.map(template => hydrate(template, state));
    return selectFallbackCandidate(refreshCandidates, state, history);
  }

  if (state.input.isPageReload) {
    const isRestDay = state.input.dayKind === 'rest_day'
      || state.input.dayKind === 'public_holiday';
    const reloadTemplates = isRestDay
      ? [...REST_DAY_ZH, ...GENERAL_ZH]
      : [...PAGE_RELOAD_ZH, ...GENERAL_ZH];
    const reloadCandidates = reloadTemplates.map(template => hydrate(template, state));
    return selectFallbackCandidate(reloadCandidates, state, history);
  }

  if (state.input.confirmedWorkStatus) {
    const confirmedCandidates = [
      ...CONFIRMED_WORK_ZH[state.input.confirmedWorkStatus],
      ...GENERAL_ZH
    ].map(template => hydrate(template, state));
    return selectFallbackCandidate(confirmedCandidates, state, history);
  }

  const isRestDay = state.input.dayKind === 'rest_day' || state.input.dayKind === 'public_holiday';
  const sceneSafeTemplates = isRestDay
    ? [...REST_DAY_ZH, ...GENERAL_ZH]
    : [...GENERAL_ZH, ...BASE_ZH[state.sceneResolution.baseScene]];
  const templates = [
    ...(OVERRIDE_ZH[state.sceneResolution.scene] || []),
    ...state.sceneResolution.modifiers.flatMap(modifier => MODIFIER_ZH[modifier] || []),
    ...sceneSafeTemplates
  ];
  const candidates = templates.filter(Boolean).map(template => hydrate(template, state));
  return selectFallbackCandidate(candidates, state, history);
}
