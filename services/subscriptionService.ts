import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, SubscriptionTier, SubscriptionPlan, SubscriptionStatus } from '../types';

const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Subscription] Supabase not configured. Using default free tier.');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (e) {
    console.error('[Subscription] Failed to initialize Supabase:', e);
    return null;
  }
}

/**
 * Subscription data structure stored in backend
 */
interface SubscriptionData {
  isSubscribed: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
}

/**
 * Fetch subscription state from backend
 */
export async function fetchSubscriptionState(userId: string): Promise<Partial<User>> {
  const client = getSupabaseClient();
  
  // Fallback: return default free tier if Supabase not configured
  if (!client) {
    console.log('[Subscription] Supabase not configured, defaulting to free tier');
    return {
      isSubscribed: false,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: null,
    };
  }

  try {
    const { data, error } = await client
      .from('user_subscriptions')
      .select('is_subscribed, subscription_plan, subscription_status, subscription_expires_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no subscription record exists, create default free tier
      if (error.code === 'PGRST116') {
        console.log('[Subscription] No subscription record found, creating default free tier');
        const defaultData: SubscriptionData = {
          isSubscribed: false,
          subscriptionPlan: 'free',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: null,
        };
        await createSubscriptionRecord(userId, defaultData);
        return defaultData;
      }
      throw error;
    }

    if (data) {
      const subscriptionData: Partial<User> = {
        isSubscribed: data.is_subscribed || false,
        subscriptionPlan: (data.subscription_plan as SubscriptionPlan) || 'free',
        subscriptionStatus: (data.subscription_status as SubscriptionStatus) || 'active',
        subscriptionExpiresAt: data.subscription_expires_at || null,
      };
      
      console.log('[Subscription] Fetched subscription state:', subscriptionData);
      return subscriptionData;
    }

    return {
      isSubscribed: false,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: null,
    };
  } catch (error) {
    console.error('[Subscription] Failed to fetch subscription state:', error);
    // Fallback to free tier on error
    return {
      isSubscribed: false,
      subscriptionPlan: 'free',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: null,
    };
  }
}

/**
 * Create a subscription record (internal helper)
 */
async function createSubscriptionRecord(userId: string, data: SubscriptionData): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        is_subscribed: data.isSubscribed,
        subscription_plan: data.subscriptionPlan,
        subscription_status: data.subscriptionStatus,
        subscription_expires_at: data.subscriptionExpiresAt,
      });

    if (error) {
      console.error('[Subscription] Failed to create subscription record:', error);
    }
  } catch (error) {
    console.error('[Subscription] Error creating subscription record:', error);
  }
}

/**
 * Update subscription state (for admin/webhook use)
 */
export async function updateSubscriptionState(
  userId: string,
  data: Partial<SubscriptionData>
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[Subscription] Cannot update subscription: Supabase not configured');
    return false;
  }

  try {
    const updateData: any = {};
    if (data.isSubscribed !== undefined) updateData.is_subscribed = data.isSubscribed;
    if (data.subscriptionPlan !== undefined) updateData.subscription_plan = data.subscriptionPlan;
    if (data.subscriptionStatus !== undefined) updateData.subscription_status = data.subscriptionStatus;
    if (data.subscriptionExpiresAt !== undefined) updateData.subscription_expires_at = data.subscriptionExpiresAt;

    const { error } = await client
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        ...updateData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('[Subscription] Failed to update subscription:', error);
      return false;
    }

    console.log('[Subscription] Successfully updated subscription state');
    return true;
  } catch (error) {
    console.error('[Subscription] Error updating subscription:', error);
    return false;
  }
}

/**
 * Determine subscription tier from user data
 */
export function determineSubscriptionTier(user: User | null): SubscriptionTier {
  if (!user) {
    return 'unauthenticated';
  }

  // Check if user has active subscription
  const isSubscribed = user.isSubscribed === true;
  const status = user.subscriptionStatus || 'active';
  const expiresAt = user.subscriptionExpiresAt;

  // Check if subscription is expired
  if (isSubscribed && expiresAt) {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    if (expirationDate < now) {
      return 'authenticated_free'; // Expired subscription = free tier
    }
  }

  // Check subscription status
  if (isSubscribed && status === 'active') {
    return 'authenticated_subscribed';
  }

  // Default to free tier for authenticated users
  return 'authenticated_free';
}

/**
 * Check if subscription is valid and active
 */
export function isSubscriptionActive(user: User | null): boolean {
  if (!user || !user.isSubscribed) return false;
  
  const status = user.subscriptionStatus || 'active';
  if (status !== 'active') return false;

  if (user.subscriptionExpiresAt) {
    const expirationDate = new Date(user.subscriptionExpiresAt);
    const now = new Date();
    return expirationDate >= now;
  }

  return true;
}

