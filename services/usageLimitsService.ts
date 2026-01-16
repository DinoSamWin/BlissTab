import { SubscriptionTier, AppState } from '../types';
import { determineSubscriptionTier } from './subscriptionService';

/**
 * Single source of truth for subscription limits
 */
export const SUBSCRIPTION_LIMITS = {
  GATEWAYS: {
    FREE: 5,
    SUBSCRIBED: Infinity,
  },
  INTENTIONS: {
    UNAUTHENTICATED: 1, // Unauthenticated users can have 1 intention via homepage modal
    FREE: 2, // Free users get 2 intentions
    SUBSCRIBED: Infinity,
  },
} as const;

/**
 * Get the current subscription tier based on user state
 * Uses backend subscription data if available, falls back to AppState
 */
export function getSubscriptionTier(state: AppState): SubscriptionTier {
  if (!state.user) {
    return 'unauthenticated';
  }
  
  // Use backend subscription data to determine tier
  const tier = determineSubscriptionTier(state.user);
  
  // Fallback to AppState subscriptionTier if backend data not available
  if (tier === 'authenticated_free' && state.subscriptionTier === 'authenticated_subscribed') {
    return state.subscriptionTier;
  }
  
  return tier;
}

/**
 * Check if user is subscribed (helper function)
 */
export function isSubscribed(state: AppState): boolean {
  const tier = getSubscriptionTier(state);
  return tier === 'authenticated_subscribed';
}

/**
 * Check if user can generate a new perspective
 * New logic: Unauthenticated users get 2 free clicks, then need to provide context
 */
export function canGeneratePerspective(state: AppState): { allowed: boolean; reason?: string } {
  const tier = getSubscriptionTier(state);
  
  if (tier === 'unauthenticated') {
    const count = getPerspectiveCount();
    if (count >= 2) {
      return { allowed: false, reason: 'context_needed' };
    }
  }
  
  // Authenticated users (free or subscribed) can always generate
  return { allowed: true };
}

/**
 * Check if user can add a new gateway
 * Single source of truth: Free users get 5 gateways, subscribed get unlimited
 */
export function canAddGateway(state: AppState): { allowed: boolean; reason?: string } {
  const tier = getSubscriptionTier(state);
  
  if (tier === 'unauthenticated') {
    return { allowed: false, reason: 'requires_auth' };
  }
  
  if (tier === 'authenticated_free') {
    const gatewayCount = state.links.length;
    const maxGateways = SUBSCRIPTION_LIMITS.GATEWAYS.FREE;
    if (gatewayCount >= maxGateways) {
      return { allowed: false, reason: 'limit_reached' };
    }
  }
  
  // Subscribed users can add unlimited gateways
  return { allowed: true };
}

/**
 * Check if user can add a new intention
 * New limits: Unauthenticated: 1 (homepage only), Free: 2, Pro: unlimited
 */
export function canAddIntention(state: AppState, isHomepageModal: boolean = false): { allowed: boolean; reason?: string } {
  const tier = getSubscriptionTier(state);
  
  if (tier === 'unauthenticated') {
    // Unauthenticated users can add 1 intention via homepage modal only
    if (isHomepageModal) {
      const intentionCount = state.requests.length;
      if (intentionCount >= SUBSCRIPTION_LIMITS.INTENTIONS.UNAUTHENTICATED) {
        return { allowed: false, reason: 'limit_reached' };
      }
      return { allowed: true };
    }
    // Studio access requires auth
    return { allowed: false, reason: 'requires_auth' };
  }
  
  if (tier === 'authenticated_free') {
    const activeIntentionCount = state.requests.filter(r => r.active).length;
    const maxIntentions = SUBSCRIPTION_LIMITS.INTENTIONS.FREE;
    if (activeIntentionCount >= maxIntentions) {
      return { allowed: false, reason: 'limit_reached' };
    }
  }
  
  // Subscribed users can add unlimited intentions
  return { allowed: true };
}

/**
 * Get and increment perspective count for unauthenticated users
 */
export function getPerspectiveCount(): number {
  const stored = localStorage.getItem('perspectiveCount');
  return stored ? parseInt(stored, 10) : 0;
}

export function incrementPerspectiveCount(): number {
  const current = getPerspectiveCount();
  const newCount = current + 1;
  localStorage.setItem('perspectiveCount', newCount.toString());
  return newCount;
}

/**
 * Reset perspective count (called after login)
 */
export function resetPerspectiveCount(): void {
  localStorage.removeItem('perspectiveCount');
}

