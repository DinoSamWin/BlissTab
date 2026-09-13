import { ConfirmedWorkStatus, PerspectiveHistory, PerspectivePoolItem } from '../../types';
import { selectBestCandidate, validatePerspectiveCandidate } from './candidateValidator';
import { STARTLY_PROMPT_VERSION } from './generator';
import { BaseTimeScene, PipelineState, SceneModifier } from './types';

type Template = Pick<
  PerspectivePoolItem,
  'text' | 'content_track' | 'semantic_core' | 'action_tag' | 'object_tag' | 'metaphor_tag' | 'opener_tag' | 'sentence_shape'
>;

const BASE_ZH: Record<BaseTimeScene, Template[]> = {
  early_buffer: [
    { text: '天还早，今天不用一次把自己全部叫醒。', content_track: 'permission_pause', semantic_core: 'early_day_can_load_slowly', action_tag: 'delay_full_start', object_tag: 'day', metaphor_tag: 'loading_the_self', opener_tag: 'early_time_observation', sentence_shape: 'observation_plus_permission' },
    { text: '早到的一会儿，先留给还没进入状态的自己。', content_track: 'life_boundary', semantic_core: 'early_buffer_belongs_to_self', action_tag: 'keep_buffer', object_tag: 'morning_gap', metaphor_tag: 'time_as_personal_space', opener_tag: 'early_gap', sentence_shape: 'time_reallocation' }
  ],
  arrival_buffer: [
    { text: '今天刚打开，先别急着把整天一起装进来。', content_track: 'playful_boundary', semantic_core: 'do_not_load_whole_day', action_tag: 'delay_full_day', object_tag: 'day', metaphor_tag: 'day_as_luggage', opener_tag: 'day_opening', sentence_shape: 'observation_plus_light_instruction' },
    { text: '人已经到今天了，脑子可以晚几分钟打卡。', content_track: 'object_humor', semantic_core: 'mind_can_arrive_later', action_tag: 'delay_mental_start', object_tag: 'mind', metaphor_tag: 'mind_clocking_in', opener_tag: 'person_arrived', sentence_shape: 'contrast_plus_permission' }
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
    { text: '白天已经走到这里，剩下的时间留一点给自己。', content_track: 'life_boundary', semantic_core: 'evening_time_returns_to_self', action_tag: 'keep_evening_time', object_tag: 'remaining_time', metaphor_tag: 'time_returned_to_self', opener_tag: 'day_reached_evening', sentence_shape: 'observation_plus_reallocation' },
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
  ],
  refresh_loop: [
    { text: '看来这句还没对上，先把屏幕晾一会儿。', content_track: 'playful_boundary', semantic_core: 'line_mismatch_invites_screen_break', action_tag: 'brief_screen_exit', object_tag: 'screen', metaphor_tag: 'airing_the_screen', opener_tag: 'line_not_landed', sentence_shape: 'observation_plus_light_action' }
  ]
};

const MODIFIER_ZH: Partial<Record<SceneModifier, Template[]>> = {
  monday_return: [
    { text: '周一只是日历翻了一格，不用把自己也拧紧。', content_track: 'playful_boundary', semantic_core: 'monday_is_one_calendar_step', action_tag: 'soften_week_start', object_tag: 'calendar', metaphor_tag: 'self_as_tightened_object', opener_tag: 'monday_reframe', sentence_shape: 'reframe_plus_permission' }
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

  { text: '把目光放远一点，屏幕之外还有没有标题的时间。', content_track: 'poetic_glimpse', semantic_core: 'untitled_time_beyond_screen', action_tag: 'look_farther', object_tag: 'untitled_time', metaphor_tag: 'time_without_title', opener_tag: 'look_a_little_farther', sentence_shape: 'micro_action_plus_poetic_image' },
  { text: '今天不必一路笔直，绕去生活里坐一会儿也很好。', content_track: 'poetic_glimpse', semantic_core: 'day_need_not_be_straight_line', action_tag: 'visit_life_briefly', object_tag: 'day_path', metaphor_tag: 'day_as_path', opener_tag: 'today_need_not', sentence_shape: 'permission_plus_clear_metaphor' },
  { text: '留一点空白，风景常从没有安排的地方进来。', content_track: 'poetic_glimpse', semantic_core: 'unscheduled_space_allows_scenery', action_tag: 'leave_blank_space', object_tag: 'blank_space', metaphor_tag: 'scenery_entering_schedule', opener_tag: 'leave_some_blank', sentence_shape: 'micro_action_plus_poetic_observation' },
  { text: '一天不只由完成组成，停顿也在替它轻轻换气。', content_track: 'poetic_glimpse', semantic_core: 'pauses_belong_in_a_day', action_tag: 'allow_pause', object_tag: 'day', metaphor_tag: 'day_breathing_through_pauses', opener_tag: 'a_day_is_not_only', sentence_shape: 'reframe_plus_poetic_image' },
  { text: '手边的光阴不用全交给任务，留一点给发呆。', content_track: 'poetic_glimpse', semantic_core: 'time_not_all_given_to_tasks', action_tag: 'keep_idle_moment', object_tag: 'nearby_time', metaphor_tag: 'time_handed_to_tasks', opener_tag: 'time_at_hand', sentence_shape: 'boundary_plus_poetic_permission' },
  { text: '让未完成先睡在句号外面，今天仍然可以收好。', content_track: 'poetic_glimpse', semantic_core: 'unfinished_can_rest_outside_period', action_tag: 'close_day_with_unfinished', object_tag: 'unfinished_work', metaphor_tag: 'unfinished_sleeping_outside_period', opener_tag: 'let_unfinished_rest', sentence_shape: 'poetic_image_plus_reassurance' }
];

const CONFIRMED_WORK_ZH: Record<ConfirmedWorkStatus, Template[]> = {
  workplace_arrival: [
    { text: '人已经到公司了，脑子可以晚几分钟打卡。', content_track: 'playful_boundary', semantic_core: 'mind_can_clock_in_after_arrival', action_tag: 'delay_mental_start', object_tag: 'mind', metaphor_tag: 'mind_clocking_in', opener_tag: 'person_arrived_at_workplace', sentence_shape: 'fact_plus_playful_permission' }
  ],
  working: [
    { text: '工作已经在进行，注意力不用一直绷成直线。', content_track: 'grounded_observation', semantic_core: 'attention_need_not_stay_tense', action_tag: 'soften_attention', object_tag: 'attention', metaphor_tag: 'attention_as_tight_line', opener_tag: 'work_in_progress', sentence_shape: 'fact_plus_permission' }
  ],
  off_work: [
    { text: '已经下班了，剩下的时间不用继续替工作值班。', content_track: 'life_boundary', semantic_core: 'off_work_time_not_on_duty', action_tag: 'release_work_role', object_tag: 'remaining_time', metaphor_tag: 'time_on_duty', opener_tag: 'off_work_confirmed', sentence_shape: 'fact_plus_boundary' }
  ],
  overtime: [
    { text: '加班到了现在，今晚也该留一点位置给你自己。', content_track: 'life_boundary', semantic_core: 'overtime_evening_keeps_personal_space', action_tag: 'keep_personal_space', object_tag: 'evening', metaphor_tag: 'evening_as_space', opener_tag: 'overtime_confirmed', sentence_shape: 'fact_plus_reallocation' }
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
    const emotionCandidates = [
      EMOTION_ZH[state.input.clickedEmotion],
      ...GENERAL_ZH
    ].filter(Boolean).map(template => hydrate(template, state));
    return selectFallbackCandidate(emotionCandidates, state, history);
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
