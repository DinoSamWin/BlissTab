
export interface QuickLink {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string;

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
  customLogoUrl?: string | null; // Cached public/signed URL (optional)
  customLogoHash?: string | null; // Content hash to avoid re-uploading same logo
}

export interface SnippetRequest {
  id: string;
  prompt: string;
  active: boolean;
}

export type SubscriptionPlan = 'free' | 'plus' | 'pro';
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
}
