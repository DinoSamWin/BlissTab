
export interface SearchEngine {
  id: string;
  name: string;
  icon: string;
  searchUrl: string;
}

export interface QuickLink {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string;
  category?: string; // Grouping category (e.g. "Work", "Personal")
  type?: 'link' | 'group-placeholder'; // 'link' is default if undefined

  /**
   * Canonical URL used for deduping metadata / overrides across sessions.
   * Backward compatible: older saved states may not have it.
   */
  canonicalUrl?: string;

  /**
   * User overrides (optional). If unset, UI falls back to default metadata/title/icon.
   */
  customTitle?: string | null;
  customLogoPath?: string | null; // Supabase Storage path
  customLogoUrl?: string | null; // Public URL (if bucket is public)
  customLogoSignedUrl?: string | null; // Signed URL (for private buckets)
  customLogoHash?: string | null; // Content hash to avoid re-uploading same logo
}

export interface SnippetRequest {
  id: string;
  prompt: string;
  active: boolean;
}

export type SubscriptionPlan = 'free' | 'plus' | 'pro' | 'lifetime' | 'career';
export type SubscriptionStatus = 'active' | 'expired' | 'canceled';

export interface User {
  id: string;
  email: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  // Subscription fields (from backend)
  isSubscribed?: boolean;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionExpiresAt?: string | null; // ISO date string
  // Membership fields (from backend)
  memberViaRedeem?: boolean;
  membershipSince?: string | null; // ISO date string
  // Settings
  redeemEnabled?: boolean;
}

export type Theme = 'light' | 'dark';

export type SubscriptionTier = 'unauthenticated' | 'authenticated_free' | 'authenticated_subscribed';

export type PersonaType = 'soulmate' | 'motivator' | 'bestie' | 'mentor';

export interface AppState {
  version: string;
  links: QuickLink[];
  requests: SnippetRequest[];
  pinnedSnippetId: string | null;
  language: string;
  user: User | null;
  theme: Theme;
  selectedPersona?: PersonaType; // Added for V8.0 dynamic personas
  subscriptionTier?: SubscriptionTier; // Optional for backward compatibility
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export type EmotionType = 'happy' | 'neutral' | 'angry' | 'sad' | 'anxious' | 'exhausted';

export interface EmotionLog {
  id?: string;
  userId?: string;
  emotionType: EmotionType;
  score: number;
  timeSlot: string;
  timestamp: number;
}

export type TrackType = 'A_PHYSICAL' | 'B_TIME_ECHO' | 'C_EMOTION' | 'D_THEME' | 'E_QUESTION';

/**
 * User-facing copy angles. These are deliberately separate from TrackType,
 * which is retained for the existing engagement-affinity system.
 */
export type PerspectiveContentTrack =
  | 'playful_boundary'
  | 'grounded_observation'
  | 'life_boundary'
  | 'sensory_reset'
  | 'permission_pause'
  | 'object_humor'
  | 'philosophical_zoom_out'
  | 'unexpected_perspective';

export type PerspectiveTrigger = 'initial_open' | 'manual_refresh' | 'emotion_click' | 'background_refill';

export type ConfirmedWorkStatus = 'workplace_arrival' | 'working' | 'off_work' | 'overtime';

export type DayKind = 'workday' | 'rest_day' | 'public_holiday' | 'adjusted_workday' | 'unknown';

export type HolidayPhase =
  | 'pre_holiday'
  | 'holiday_start'
  | 'holiday_middle'
  | 'holiday_end'
  | 'post_holiday'
  | 'none';

export interface WorkSchedule {
  workStart?: string; // HH:MM
  lunchStart?: string; // HH:MM
  lunchEnd?: string; // HH:MM
  workEnd?: string; // HH:MM
  workDays?: number[]; // 0-6
}

export interface TrackAffinity {
  userId: string;
  trackType: TrackType;
  affinityScore: number;
  updatedAt: number;
}


export interface PerspectiveHistory {
  text: string;
  timestamp: number; // Unix timestamp in milliseconds
  promptId: string;
  intent?: string;
  style?: string;
  theme?: string;
  trackType?: TrackType;
  is_memory_echo?: boolean;
  echo_type?: 'node_2' | 'node_3';
  dimension?: string;
  contentTrack?: PerspectiveContentTrack;
  semanticCore?: string;
  actionTag?: string;
  objectTag?: string;
  metaphorTag?: string;
  openerTag?: string;
  sentenceShape?: string;
  stateFingerprint?: string;
  promptVersion?: string;
  timeBlock?: string;
}

export interface PerspectiveRouterContext {
  local_time: string; // HH:MM
  local_date?: string; // YYYY-MM-DD in the user's timezone
  timezone?: string;
  weekday: number; // 0-6
  is_weekend: boolean;
  day_kind?: DayKind;
  holiday_phase?: HolidayPhase;
  holiday_day_index?: number;
  days_to_holiday?: number;
  days_since_holiday?: number;
  work_schedule?: WorkSchedule;
  /** Only set from an explicit user action or trusted calendar/workflow input. */
  confirmed_work_status?: ConfirmedWorkStatus;
  session_count_today: number;
  minutes_since_last: number;
  minutes_since_previous_open?: number;
  first_open_today?: boolean;
  session_duration_minutes?: number;
  late_night_streak: number;
  work_mode_disabled?: boolean;
  custom_themes?: string[];
  theme_only?: boolean;
  recent_history: PerspectiveHistory[];
  language: string;
  // V3.5 Environment Context
  weather?: string;
  battery_level?: number;
  // V7.0 Emotion & ECRA Context
  clickedEmotion?: EmotionType;
  emotionalBaseline?: number;
  bypassPool?: boolean;
  historyKeywords?: string[];
  deepObservationMode?: boolean;
  emotionalPatterns?: string[];
  // V4.0 Digital Context
  tab_count?: number;
  tab_count_scope?: 'all_browser_tabs' | 'same_origin_startly_tabs';
  audio_playing?: boolean;
  is_muted?: boolean;
  is_fullscreen?: boolean;
  window_state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
  idle_time_seconds?: number;
  tab_switches_10m?: number;
  context_observed_at?: number;
  browser_context_observed_at?: number;
  selectedPersona?: PersonaType;
  allow_context_sensing?: boolean;
  trigger?: PerspectiveTrigger;
  isManualRefresh?: boolean;

  // V3 Routing & Strategy Context
  isNewUser?: boolean;
  isFirstInTimeBlock?: boolean;
  consecutiveClicks?: number;
}

export interface PerspectivePoolItem {
  text: string;
  style: string;
  track: TrackType | 'A' | 'B' | 'C' | 'D' | 'E';
  is_memory_echo?: boolean;
  echo_type?: 'node_2' | 'node_3';
  dimension?: string;
  content_track?: PerspectiveContentTrack;
  semantic_core?: string;
  action_tag?: string;
  object_tag?: string;
  metaphor_tag?: string;
  opener_tag?: string;
  sentence_shape?: string;
  state_fingerprint?: string;
  prompt_version?: string;
  generated_at?: number;
}

export interface PerspectivePlan {
  intent: string;
  style: string;
  topic_source: 'custom' | 'context';
  selected_theme?: string;
  language: string;
  max_length_chars: number;
  allow_one_comma: boolean;
  cached_item?: PerspectivePoolItem;
  full_system_prompt?: string;
  full_user_prompt?: string;
  state_fingerprint?: string;
  content_track?: PerspectiveContentTrack;
  prompt_version?: string;
  time_block?: string;
}
