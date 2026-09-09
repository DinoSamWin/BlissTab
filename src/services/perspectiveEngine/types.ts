import {
  DayKind,
  EmotionType,
  HolidayPhase,
  PerspectiveContentTrack,
  PerspectiveTrigger,
  PersonaType
} from '../../types';

// ==========================================
// 1. Raw Inputs Layer
// ==========================================
export type TimeBlock =
  | 'early_morning'          // before the normal arrival window
  | 'arrival_window'         // day-start buffer
  | 'morning_focus'          // established morning rhythm
  | 'pre_lunch'              // approaching the configured lunch window
  | 'midday_break'           // configured lunch window
  | 'post_lunch_reset'       // first hour after lunch
  | 'afternoon'              // established afternoon rhythm
  | 'closing_window'         // approaching configured work end
  | 'evening'                // work/life transition
  | 'late_evening'           // possible overhang, never assumed overtime
  | 'late_night';            // protective late-night mode

export type SignalConfidence = 'high' | 'medium' | 'low' | 'unknown';
export type TabCountBucket = 'unknown' | 'light' | 'normal' | 'heavy' | 'overloaded';
export type IdleBucket = 'unknown' | 'active' | 'away' | 'long_away';

export interface EngineInput {
  localDate: string;
  weekday: number;
  timeBlock: TimeBlock;
  dayKind: DayKind;
  isWeekend: boolean;
  holidayPhase: HolidayPhase;
  holidayDayIndex?: number;
  daysToHoliday?: number;
  daysSinceHoliday?: number;
  confirmedWorkStatus?: import('../../types').ConfirmedWorkStatus;

  tabCountBucket: TabCountBucket;
  tabCountScope: 'all_browser_tabs' | 'same_origin_startly_tabs' | 'unknown';
  hasAudibleTab: boolean;
  audibleStateKnown: boolean;
  audibleTabCount: number;
  idleBucket: IdleBucket;
  reentryState: 'recent_return' | 'continuous' | 'unknown';

  clickedEmotion?: EmotionType;
  trigger: PerspectiveTrigger;
  rawTabCount?: number;
  rawIdleMinutes?: number;
  minutesSincePreviousOpen?: number;
  sessionDurationMinutes?: number;
  consecutiveClicks: number;
  isNewUser: boolean;
  isFirstInTimeBlock: boolean;
  isManualRefresh: boolean;
  isPageReload: boolean;
  tabSwitches10m?: number;

  weather?: string;
  weatherKnown: boolean;
  userLanguage: string;
  screenMode?: string;
  screenModeKnown: boolean;
  selectedPersona: PersonaType;
  customThemes: string[];

  confidence: {
    time: SignalConfidence;
    calendar: SignalConfidence;
    browser: SignalConfidence;
    reentry: SignalConfidence;
    emotion: SignalConfidence;
  };
}

// ==========================================
// 2. Scene Layer
// ==========================================
export type BaseTimeScene =
  | 'early_buffer'
  | 'arrival_buffer'
  | 'morning_sustained'
  | 'pre_lunch_transition'
  | 'midday_release'
  | 'post_lunch_reentry'
  | 'afternoon_stretch'
  | 'closing_runway'
  | 'evening_transition'
  | 'late_evening_boundary'
  | 'night_guard';

export type OverrideScene =
  | 'quiet_return'
  | 'overloaded_browser'
  | 'emotional_checkin'
  | 'refresh_loop';

export type Scene = BaseTimeScene | OverrideScene;

export type SceneModifier =
  | 'monday_return'
  | 'friday_release'
  | 'soft_weekend'
  | 'public_holiday'
  | 'adjusted_workday'
  | 'pre_holiday'
  | 'holiday_start'
  | 'holiday_middle'
  | 'holiday_end'
  | 'post_holiday'
  | 'tab_heavy'
  | 'tab_overload'
  | 'rapid_switching'
  | 'recent_return'
  | 'page_reload'
  | 'manual_refresh'
  | 'refresh_streak'
  | 'audio_present'
  | 'possible_work_overhang';

export interface SceneResolution {
  baseScene: BaseTimeScene;
  scene: Scene;
  isOverride: boolean;
  modifiers: SceneModifier[];
  evidence: string[];
  confidence: SignalConfidence;
}

// ==========================================
// 3. Intent Layer
// ==========================================
export type Intent =
  | 'contextual_greeting'
  | 'gentle_re_entry'
  | 'emotional_acknowledgment'
  | 'soft_grounding'
  | 'rhythm_mirroring'
  | 'reduce_scope'
  | 'permission_to_pause'
  | 'work_life_boundary'
  | 'soft_closure'
  | 'interrupt_autopilot';

// ==========================================
// 4. Emotion Bias Layer
// ==========================================
export type EmotionBias =
  | 'positive'
  | 'okay'
  | 'tired'
  | 'anxious'
  | 'scattered'
  | 'heavy';

// ==========================================
// 5. Strategy Layer
// ==========================================
export type ResponseStrategy =
  | 'mirror'
  | 'soothe'
  | 'ground'
  | 'reduce'
  | 'rhythm'
  | 'reentry'
  | 'release'
  | 'interrupt';

export type Dimension = 'dictionary' | 'sensory' | 'ritual' | 'philosophical' | 'mixed';

export interface NoveltyPlan {
  targetTrack: PerspectiveContentTrack;
  allowedTracks: PerspectiveContentTrack[];
  avoidSemanticCores: string[];
  avoidActions: string[];
  avoidObjects: string[];
  avoidMetaphors: string[];
  avoidOpeners: string[];
  avoidSentenceShapes: string[];
  recentTexts: string[];
  recentProductivityCount: number;
  rotationReason: string;
}

// ==========================================
// 6. Complete Pipeline State (passed to LLM)
// ==========================================
export interface PipelineState {
  input: EngineInput;
  sceneResolution: SceneResolution;
  intent: Intent;
  emotionBias: EmotionBias;
  strategy: ResponseStrategy;
  dimension: Dimension;
  stateFingerprint: string;
  noveltyPlan: NoveltyPlan;
  knownFacts: string[];
  forbiddenAssumptions: string[];

  constraints: {
    englishWordsRange: [number, number];
    chineseCharsRange: [number, number];
    maxLengthChars: number;
  };
}
