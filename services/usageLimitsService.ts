import { SubscriptionTier, AppState } from '../types';
import { determineSubscriptionTier } from './subscriptionService';

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
 * Check if user can generate a new perspective
 */
export function canGeneratePerspective(state: AppState): { allowed: boolean; reason?: string } {
  const tier = getSubscriptionTier(state);
  
  if (tier === 'unauthenticated') {
    const count = getPerspectiveCount();
    if (count >= 10) {
      return { allowed: false, reason: 'limit_reached' };
    }
  }
  
  // Authenticated users (free or subscribed) can always generate
  return { allowed: true };
}

/**
 * Check if user can add a new gateway
 */
export function canAddGateway(state: AppState): { allowed: boolean; reason?: string } {
  const tier = getSubscriptionTier(state);
  
  if (tier === 'unauthenticated') {
    return { allowed: false, reason: 'requires_auth' };
  }
  
  if (tier === 'authenticated_free') {
    const activeGateways = state.links.length;
    if (activeGateways >= 5) {
      return { allowed: false, reason: 'limit_reached' };
    }
  }
  
  // Subscribed users can add unlimited gateways
  return { allowed: true };
}

/**
 * Check if user can add a new intention
 */
export function canAddIntention(state: AppState): { allowed: boolean; reason?: string } {
  const tier = getSubscriptionTier(state);
  
  if (tier === 'unauthenticated') {
    return { allowed: false, reason: 'requires_auth' };
  }
  
  if (tier === 'authenticated_free') {
    const activeIntentions = state.requests.filter(r => r.active).length;
    if (activeIntentions >= 1) {
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

