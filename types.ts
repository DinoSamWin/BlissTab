
export interface QuickLink {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string;
}

export interface SnippetRequest {
  id: string;
  prompt: string;
  active: boolean;
}

export type SubscriptionPlan = 'free' | 'pro' | 'team';
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
