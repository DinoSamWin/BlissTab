import { PerspectiveHistory, PerspectivePoolItem } from '../../types';
import { isTooSimilar } from '../perspectiveService';
import { STARTLY_PROMPT_VERSION } from './generator';
import { PipelineState } from './types';
import { countRecentProductivityLines, isProductivityPlanningText } from './contentSignals';

export interface CandidateValidation {
  valid: boolean;
  reasons: string[];
  score: number;
  item: PerspectivePoolItem;
}

const CLICHE_PATTERNS = [
  /加油/u,
  /深呼吸/u,
  /相信自己/u,
  /你已经(很|做得).*棒/u,
  /不要放弃/u,
  /you('ve| have)? got this/iu,
  /believe in yourself/iu,
  /take a deep breath/iu
];
const VAGUE_LITERARY_PATTERNS = [
  /把自己(?:全部|一下|也)?叫醒/u,
  /(?:把)?(?:这段|剩下的|一点)?时间.{0,8}留.{0,3}给.{0,8}自己/u,
  /把自己(?:也)?拧紧/u,
  /脑子.{0,6}(?:满格|打卡)/u,
  /注意力.{0,6}(?:站着|结账)/u
];
const REFRESH_PACE_PATTERNS = [
  /(?:不要|不用|不必|别).{0,4}(?:着急|急着)/u,
  /(?:慢慢来|慢一点|放慢|慢慢(?:开始|进入|做))/u,
  /(?:不要|不用|不必|别).{0,6}(?:马上|立刻).{0,8}(?:开始|进入|忙|开工|处理|做)/u,
  /(?:不要|不用|不必|别).{0,5}(?:把)?(?:今天|工作|事情|任务).{0,8}(?:塞|排|装|挤).{0,3}满/u,
  /(?:塞|排|装|挤).{0,4}(?:太满|很满|满满)/u,
  /按.{0,4}(?:平常|正常).{0,3}(?:速度|节奏)/u,
  /节奏.{0,5}(?:放慢|慢|接满|排满)/u
];
const GRAND_PHILOSOPHY_PATTERNS = [
  /(?:宇宙|星河|星辰|光年|尘埃|时间长河|永恒|存在|意义|无常|虚无|本质|真理|命运|宿命|灵魂|叔本华|尼采|道法自然|万物)/u,
  /(?:cosmos|cosmic|universe|galax(?:y|ies)|starlight|light[- ]years?|speck of dust|river of time|eternity|eternal|existence|meaning|impermanence|nihilis|essence|ultimate truth|schopenhauer|nietzsche|destiny|fate|soul)/iu
];
const CONCRETE_PHILOSOPHY_ANCHORS = [
  /(?:屏幕|页面|浏览器|眼前|手里|(?:这|一)(?:件|点|项)事|事情|任务|工作|做完|没做完|一周|明天|几分钟|十分钟|生活|吃饭|休息|下班)/u,
  /(?:screen|page|browser|in front of you|at hand|this (?:thing|task)|unfinished|finish(?:ed)?|work|task|week|tomorrow|minutes?|ordinary life|meal|rest)/iu
];
const VALID_TRACKS = new Set(['A_PHYSICAL', 'B_TIME_ECHO', 'C_EMOTION', 'D_THEME', 'E_QUESTION']);

function sanitizeText(text: string): string {
  return text
    .replace(/^\s*["'“”‘’「」](.*?)["'“”‘’「」]\s*$/u, '$1')
    .replace(/#/g, '')
    .trim();
}

function visibleLength(text: string): number {
  return text.replace(/\[\/?h\]/g, '').replace(/\s/g, '').length;
}

function hasRecentTag(
  history: PerspectiveHistory[],
  key: keyof PerspectiveHistory,
  value: string | undefined,
  lookback: number
): boolean {
  if (!value || value === 'none') return false;
  return history.slice(0, lookback).some(item => item[key] === value);
}

function factBoundaryViolations(text: string, state: PipelineState): string[] {
  const reasons: string[] = [];
  const input = state.input;

  if (input.tabCountBucket === 'unknown' && /(标签页|满屏|这一屏.{0,4}(满|挤)|开着.{0,3}(很多|不少))/u.test(text)) {
    reasons.push('invented_tab_load');
  }
  if (input.tabCountBucket === 'unknown' && /(too many|many|crowded|full).{0,12}(tabs?|screen)|(tabs?|screen).{0,12}(too many|many|crowded|full)/iu.test(text)) {
    reasons.push('invented_tab_load');
  }
  if ((!input.audibleStateKnown || !input.hasAudibleTab) && /(音乐|歌声|耳机|背景音|旋律)/u.test(text)) {
    reasons.push('invented_audio');
  }
  if ((!input.audibleStateKnown || !input.hasAudibleTab) && /(music|song|headphones?|background sound|melody)/iu.test(text)) {
    reasons.push('invented_audio');
  }
  if (!input.weatherKnown && /(下雨|雨声|阳光|晴天|阴天|天气|风声)/u.test(text)) {
    reasons.push('invented_weather');
  }
  if (!input.weatherKnown && /(rain|sunny|sunshine|cloudy|weather|wind)/iu.test(text)) {
    reasons.push('invented_weather');
  }
  if (
    input.holidayPhase === 'none'
    && input.dayKind !== 'public_holiday'
    && /(假期|放假|节前|节后|返工)/u.test(text)
  ) {
    reasons.push('invented_holiday');
  }
  if (input.holidayPhase === 'none' && input.dayKind !== 'public_holiday' && /(holiday|vacation|back to work)/iu.test(text)) {
    reasons.push('invented_holiday');
  }
  if (input.confirmedWorkStatus !== 'overtime' && /加班/u.test(text)) {
    reasons.push('invented_overtime');
  }
  if (input.confirmedWorkStatus !== 'overtime' && /(overtime|working late)/iu.test(text)) {
    reasons.push('invented_overtime');
  }
  if (!input.clickedEmotion && /(你|看起来|感觉).{0,4}(焦虑|抑郁|难过|生气|烦躁|崩溃|疲惫|累了)/u.test(text)) {
    reasons.push('invented_emotion');
  }
  if (!input.clickedEmotion && /(you|you seem|you look).{0,16}(anxious|tired|exhausted|sad|angry|burned out)/iu.test(text)) {
    reasons.push('invented_emotion');
  }
  if (!input.clickedEmotion && /(刚午睡|睡醒了|你饿了)/u.test(text)) {
    reasons.push('invented_private_state');
  }
  if (!input.clickedEmotion && /(just woke|after your nap|you('re| are) hungry)/iu.test(text)) {
    reasons.push('invented_private_state');
  }
  if (
    input.confirmedWorkStatus !== 'workplace_arrival'
    && /(到公司|办公室|工位)/u.test(text)
  ) {
    reasons.push('invented_workplace_state');
  }
  if (input.confirmedWorkStatus !== 'workplace_arrival' && /(arrived at (the )?(office|work)|at your (office|workstation))/iu.test(text)) {
    reasons.push('invented_workplace_state');
  }
  if (input.confirmedWorkStatus !== 'off_work' && /(刚下班|终于下班了)/u.test(text)) {
    reasons.push('invented_off_work_state');
  }
  if (input.confirmedWorkStatus !== 'off_work' && /(just got off work|just finished work)/iu.test(text)) {
    reasons.push('invented_off_work_state');
  }
  if (/开完会|meeting just ended|after (that|your) meeting/iu.test(text)) reasons.push('invented_meeting_state');
  return reasons;
}

function repeatsResolvedSceneFraming(text: string, state: PipelineState): boolean {
  if (!state.input.isManualRefresh && !state.input.isPageReload) return false;

  const patterns: Partial<Record<PipelineState['sceneResolution']['baseScene'], RegExp>> = {
    early_buffer: /(天还早|时间还早|这么早|一大早|早到)/u,
    arrival_buffer: /(刚到今天|今天刚打开|一早|早上刚开始)/u,
    morning_sustained: /(上午|早上)/u,
    pre_lunch_transition: /(快到饭点|午饭|中午)/u,
    midday_release: /(午饭|饭点|中午)/u,
    post_lunch_reentry: /(午后|午饭后|下午刚开始)/u,
    afternoon_stretch: /下午/u,
    closing_runway: /(下班前|快下班|收尾)/u,
    evening_transition: /(已经到晚上|到了晚上|白天已经|下班)/u,
    late_evening_boundary: /(这个点|这么晚|深夜|晚上)/u,
    night_guard: /(夜已经|夜深|深夜|这么晚)/u
  };

  return patterns[state.sceneResolution.baseScene]?.test(text) || false;
}

export function validatePerspectiveCandidate(
  rawItem: PerspectivePoolItem,
  state: PipelineState,
  history: PerspectiveHistory[] = []
): CandidateValidation {
  const item: PerspectivePoolItem = { ...rawItem, text: sanitizeText(rawItem.text || '') };
  const text = item.text;
  const reasons: string[] = [];
  let score = 100;

  if (!text) reasons.push('empty_text');
  if (/\r|\n/u.test(text)) reasons.push('multiple_lines');
  if (/[!?！？]/u.test(text)) reasons.push('forbidden_punctuation');
  if (/\b\d{1,2}:\d{2}\b|\b(?:[1-9]|1[0-2])\s?(?:a\.?m\.?|p\.?m\.?)\b|\d{1,2}点(?:\d{1,2}分)?/iu.test(text)) {
    reasons.push('exact_clock_time');
  }
  if (CLICHE_PATTERNS.some(pattern => pattern.test(text))) reasons.push('cliche_or_coaching');
  if (VAGUE_LITERARY_PATTERNS.some(pattern => pattern.test(text))) reasons.push('vague_or_literary_wording');
  if (repeatsResolvedSceneFraming(text, state)) reasons.push('repeated_scene_framing_on_refresh');
  if (state.input.isManualRefresh && REFRESH_PACE_PATTERNS.some(pattern => pattern.test(text))) {
    reasons.push('repeated_pace_message_on_refresh');
  }
  if (
    state.input.isPageReload
    && isProductivityPlanningText(text)
    && countRecentProductivityLines(history) >= 2
  ) {
    reasons.push('productivity_framing_overused_on_page_reload');
  }

  const length = visibleLength(text);
  const isChinese = /[\u3400-\u9fff\uf900-\ufaff]/u.test(text);
  if (length > state.constraints.maxLengthChars) reasons.push('too_long');
  if (isChinese && length < 10) reasons.push('too_short');
  if (isChinese && (length < 12 || length > 28)) score -= 8;

  reasons.push(...factBoundaryViolations(text, state));

  if (item.state_fingerprint && item.state_fingerprint !== state.stateFingerprint) {
    reasons.push('state_fingerprint_mismatch');
  }
  if (item.prompt_version && item.prompt_version !== STARTLY_PROMPT_VERSION) {
    reasons.push('unsupported_prompt_version');
  }

  const contentTrack = item.content_track;
  if (contentTrack === 'philosophical_zoom_out') {
    if (GRAND_PHILOSOPHY_PATTERNS.some(pattern => pattern.test(text))) {
      reasons.push('grand_philosophy_cliche');
    }
    if (!CONCRETE_PHILOSOPHY_ANCHORS.some(pattern => pattern.test(text))) {
      reasons.push('ungrounded_philosophical_zoom_out');
    }
  }
  if (!item.track || !VALID_TRACKS.has(item.track)) reasons.push('missing_or_invalid_track');
  if (!item.state_fingerprint) reasons.push('missing_state_fingerprint');
  if (!item.prompt_version) reasons.push('missing_prompt_version');
  if (contentTrack && !state.noveltyPlan.allowedTracks.includes(contentTrack)) {
    reasons.push('content_track_not_allowed');
  }
  if (!item.semantic_core) reasons.push('missing_semantic_core');
  if (!contentTrack) reasons.push('missing_content_track');
  if (!item.action_tag) reasons.push('missing_action_tag');
  if (!item.object_tag) reasons.push('missing_object_tag');
  if (!item.metaphor_tag) reasons.push('missing_metaphor_tag');
  if (!item.opener_tag) reasons.push('missing_opener_tag');
  if (!item.sentence_shape) reasons.push('missing_sentence_shape');
  if (contentTrack === state.noveltyPlan.targetTrack) score += 12;

  if (isTooSimilar(text, history, 0.58)) reasons.push('surface_text_duplicate');
  if (hasRecentTag(history, 'semanticCore', item.semantic_core, 20)) reasons.push('semantic_core_duplicate');
  if (hasRecentTag(history, 'metaphorTag', item.metaphor_tag, 10)) reasons.push('metaphor_duplicate');
  if (hasRecentTag(history, 'openerTag', item.opener_tag, 5)) reasons.push('opener_duplicate');
  if (hasRecentTag(history, 'sentenceShape', item.sentence_shape, 4)) score -= 8;
  if (hasRecentTag(history, 'actionTag', item.action_tag, 6)) score -= 6;
  if (hasRecentTag(history, 'objectTag', item.object_tag, 4)) score -= 4;

  return {
    valid: reasons.length === 0,
    reasons,
    score,
    item
  };
}

export function selectBestCandidate(
  items: PerspectivePoolItem[],
  state: PipelineState,
  history: PerspectiveHistory[] = []
): { selected?: PerspectivePoolItem; accepted: PerspectivePoolItem[]; rejected: CandidateValidation[] } {
  const reports = items.map(item => validatePerspectiveCandidate(item, state, history));
  const acceptedReports = reports
    .filter(report => report.valid)
    .sort((a, b) => b.score - a.score);
  return {
    selected: acceptedReports[0]?.item,
    accepted: acceptedReports.map(report => report.item),
    rejected: reports.filter(report => !report.valid)
  };
}
