
export interface QuickLink {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string;
  category?: string; // Grouping category (e.g. "Work", "Personal")

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

export interface AppState {
  version: string;
  links: QuickLink[];
  requests: SnippetRequest[];
  pinnedSnippetId: string | null;
  language: string;
  user: User | null;
  theme: Theme;
  subscriptionTier?: SubscriptionTier; // Optional for backward compatibility
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}


export interface PerspectiveHistory {
  text: string;
  timestamp: number; // Unix timestamp in milliseconds
  promptId: string;
  intent?: string;
  style?: string;
  theme?: string;
}

export interface PerspectiveRouterContext {
  local_time: string; // HH:MM
  weekday: number; // 0-6
  is_weekend: boolean;
  session_count_today: number;
  minutes_since_last: number;
  late_night_streak: number;
  work_mode_disabled?: boolean;
  custom_themes?: string[];
  theme_only?: boolean;
  recent_history: PerspectiveHistory[];
  language: string;
  // V3.5 Environment Context
  weather?: string;
  battery_level?: number;
}

export interface PerspectivePoolItem {
  text: string;
  style: string;
  track: 'A' | 'B';
}

export interface PerspectivePlan {
  intent: string;
  style: string;
  topic_source: 'custom' | 'context';
  selected_theme?: string;
  language: string;
  max_length_chars: number;
  allow_one_comma: boolean;
}
