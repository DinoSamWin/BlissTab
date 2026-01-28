import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User } from '../types';

const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Redeem] Supabase not configured.');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (e) {
    console.error('[Redeem] Failed to initialize Supabase:', e);
    return null;
  }
}

/**
 * Redeem code error types
 */
export type RedeemErrorCode = 
  | 'INVALID_CODE'
  | 'DISABLED_CODE'
  | 'ALREADY_REDEEMED'
  | 'EXPIRED_CODE'
  | 'NOT_AUTHENTICATED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface RedeemResponse {
  ok: boolean;
  error_code?: RedeemErrorCode;
  message?: string;
  membership?: {
    is_member: boolean;
    member_via_redeem: boolean;
  };
}

/**
 * Redeem a code
 */
export async function redeemCode(user: User, code: string): Promise<RedeemResponse> {
  const client = getSupabaseClient();
  
  if (!client) {
    return {
      ok: false,
      error_code: 'NETWORK_ERROR',
      message: 'Service unavailable. Please try again later.',
    };
  }

  if (!user || !user.id) {
    return {
      ok: false,
      error_code: 'NOT_AUTHENTICATED',
      message: 'Please sign in to redeem a code.',
    };
  }

  try {
    // Normalize code: trim spaces, uppercase
    const normalizedCode = code.trim().toUpperCase();

    // Lookup code
    const { data: redeemCodeData, error: lookupError } = await client
      .from('redeem_codes')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (lookupError || !redeemCodeData) {
      return {
        ok: false,
        error_code: 'INVALID_CODE',
        message: 'Invalid code. Please check and try again.',
      };
    }

    // Check if code is enabled
    if (redeemCodeData.status !== 'enabled') {
      return {
        ok: false,
        error_code: 'DISABLED_CODE',
        message: 'This code has been disabled.',
      };
    }

    // Check if already redeemed
    if (redeemCodeData.redeemed_at) {
      // Check if redeemed by same user (idempotency)
      if (redeemCodeData.redeemed_by_user_id === user.id) {
        return {
          ok: false,
          error_code: 'ALREADY_REDEEMED',
          message: 'You have already redeemed this code.',
        };
      }
      return {
        ok: false,
        error_code: 'ALREADY_REDEEMED',
        message: 'This code has already been redeemed.',
      };
    }

    // Check if expired
    if (redeemCodeData.expires_at) {
      const expirationDate = new Date(redeemCodeData.expires_at);
      const now = new Date();
      if (expirationDate < now) {
        return {
          ok: false,
          error_code: 'EXPIRED_CODE',
          message: 'This code has expired.',
        };
      }
    }

    // Atomic transaction: Update redeem_codes and user_membership
    // Note: Supabase doesn't support true transactions via client, so we use a function
    // For production, use Supabase Edge Functions or RPC functions for atomicity
    
    const now = new Date().toISOString();

    // Update redeem_codes
    const { error: updateCodeError } = await client
      .from('redeem_codes')
      .update({
        redeemed_at: now,
        redeemed_by_user_id: user.id,
        redeemed_by_email: user.email,
      })
      .eq('id', redeemCodeData.id)
      .is('redeemed_at', null); // Only update if not already redeemed (prevent race condition)

    if (updateCodeError) {
      // Check if it was a race condition (already redeemed)
      const { data: checkData } = await client
        .from('redeem_codes')
        .select('redeemed_at, redeemed_by_user_id')
        .eq('id', redeemCodeData.id)
        .single();

      if (checkData?.redeemed_at) {
        if (checkData.redeemed_by_user_id === user.id) {
          return {
            ok: false,
            error_code: 'ALREADY_REDEEMED',
            message: 'You have already redeemed this code.',
          };
        }
        return {
          ok: false,
          error_code: 'ALREADY_REDEEMED',
          message: 'This code has already been redeemed.',
        };
      }

      console.error('[Redeem] Failed to update redeem code:', updateCodeError);
      return {
        ok: false,
        error_code: 'UNKNOWN_ERROR',
        message: 'Failed to redeem code. Please try again.',
      };
    }

    // Upsert user_membership - try INSERT first, then UPDATE if exists
    // This ensures RLS policies work correctly
    let membershipError = null;
    
    // First, try to check if membership exists
    const { data: existingMembership } = await client
      .from('user_membership')
      .select('user_id, membership_since')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      // Update existing membership
      const { error: updateError } = await client
        .from('user_membership')
        .update({
          member_via_redeem: true,
          redeem_code_id: redeemCodeData.id,
          membership_since: existingMembership.membership_since || now, // Preserve existing or set new
          updated_at: now,
        })
        .eq('user_id', user.id);

      membershipError = updateError;
      console.log('[Redeem] Updating existing membership');
    } else {
      // Insert new membership
      // First ensure user_data exists (required for RLS policy)
      const { error: userDataError } = await client
        .from('user_data')
        .upsert({
          user_id: user.id,
          email: user.email,
          data: {},
          updated_at: now,
        }, {
          onConflict: 'user_id',
        });

      if (userDataError) {
        console.warn('[Redeem] Failed to ensure user_data exists:', userDataError);
        // Continue anyway, RLS might still work
      }

      const { error: insertError } = await client
        .from('user_membership')
        .insert({
          user_id: user.id,
          is_subscribed: false,
          member_via_redeem: true,
          redeem_code_id: redeemCodeData.id,
          membership_since: now,
          updated_at: now,
        });

      membershipError = insertError;
      console.log('[Redeem] Inserting new membership');
    }

    if (membershipError) {
      console.error('[Redeem] Failed to update membership:', membershipError);
      console.error('[Redeem] Membership error details:', {
        code: membershipError.code,
        message: membershipError.message,
        details: membershipError.details,
        hint: membershipError.hint
      });
      
      // Try to rollback redeem_codes update (best effort)
      await client
        .from('redeem_codes')
        .update({
          redeemed_at: null,
          redeemed_by_user_id: null,
          redeemed_by_email: null,
        })
        .eq('id', redeemCodeData.id);

      return {
        ok: false,
        error_code: 'UNKNOWN_ERROR',
        message: `Failed to update membership: ${membershipError.message || 'Please try again.'}`,
      };
    }

    return {
      ok: true,
      membership: {
        is_member: true,
        member_via_redeem: true,
      },
    };
  } catch (error) {
    console.error('[Redeem] Error redeeming code:', error);
    return {
      ok: false,
      error_code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Fetch user membership state
 */
export async function fetchUserMembership(userId: string): Promise<{
  isSubscribed: boolean;
  memberViaRedeem: boolean;
  membershipSince: string | null;
} | null> {
  const client = getSupabaseClient();
  
  if (!client) {
    return null;
  }

  try {
    const { data, error } = await client
      .from('user_membership')
      .select('is_subscribed, member_via_redeem, membership_since')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No membership record, return defaults
        return {
          isSubscribed: false,
          memberViaRedeem: false,
          membershipSince: null,
        };
      }
      throw error;
    }

    return {
      isSubscribed: data.is_subscribed || false,
      memberViaRedeem: data.member_via_redeem || false,
      membershipSince: data.membership_since || null,
    };
  } catch (error) {
    console.error('[Redeem] Failed to fetch membership:', error);
    return null;
  }
}

/**
 * Fetch user settings (including redeem_enabled)
 */
export async function fetchUserSettings(userId: string): Promise<{
  redeemEnabled: boolean;
} | null> {
  const client = getSupabaseClient();
  
  // Fallback to localStorage if Supabase is not configured (for local testing)
  if (!client) {
    console.warn('[Redeem] Supabase not configured, checking localStorage fallback');
    try {
      const settingsKey = `user_settings_${userId}`;
      const stored = localStorage.getItem(settingsKey);
      if (stored) {
        const settings = JSON.parse(stored);
        return {
          redeemEnabled: settings.redeem_enabled !== false, // Default to true if null
        };
      }
      // No stored settings, return default
      return {
        redeemEnabled: true, // Default to enabled
      };
    } catch (error) {
      console.error('[Redeem] Failed to read from localStorage:', error);
      return {
        redeemEnabled: true, // Default to enabled
      };
    }
  }

  try {
    const { data, error } = await client
      .from('user_settings')
      .select('redeem_enabled')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings record, check localStorage fallback
        try {
          const settingsKey = `user_settings_${userId}`;
          const stored = localStorage.getItem(settingsKey);
          if (stored) {
            const settings = JSON.parse(stored);
            return {
              redeemEnabled: settings.redeem_enabled !== false,
            };
          }
        } catch (localError) {
          console.warn('[Redeem] localStorage fallback failed:', localError);
        }
        // Return defaults
        return {
          redeemEnabled: true, // Default to enabled
        };
      }
      throw error;
    }

    return {
      redeemEnabled: data.redeem_enabled !== false, // Default to true if null
    };
  } catch (error) {
    console.error('[Redeem] Failed to fetch settings:', error);
    // Fallback to localStorage
    try {
      const settingsKey = `user_settings_${userId}`;
      const stored = localStorage.getItem(settingsKey);
      if (stored) {
        const settings = JSON.parse(stored);
        return {
          redeemEnabled: settings.redeem_enabled !== false,
        };
      }
    } catch (localError) {
      console.warn('[Redeem] localStorage fallback failed:', localError);
    }
    // Return defaults
    return {
      redeemEnabled: true, // Default to enabled
    };
  }
}

/**
 * Toggle redeem feature for user
 */
export async function toggleRedeemFeature(
  userId: string,
  redeemEnabled: boolean
): Promise<boolean> {
  const client = getSupabaseClient();
  
  // Fallback to localStorage if Supabase is not configured (for local testing)
  if (!client) {
    console.warn('[Redeem] Supabase not configured, using localStorage fallback');
    try {
      const settingsKey = `user_settings_${userId}`;
      const settings = {
        redeem_enabled: redeemEnabled,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      console.log('[Redeem] Settings saved to localStorage:', settings);
      return true;
    } catch (error) {
      console.error('[Redeem] Failed to save to localStorage:', error);
      return false;
    }
  }

  try {
    const { error } = await client
      .from('user_settings')
      .upsert({
        user_id: userId,
        redeem_enabled: redeemEnabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('[Redeem] Failed to update settings:', error);
      // Fallback to localStorage on error
      try {
        const settingsKey = `user_settings_${userId}`;
        const settings = {
          redeem_enabled: redeemEnabled,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(settingsKey, JSON.stringify(settings));
        console.log('[Redeem] Fallback: Settings saved to localStorage');
        return true;
      } catch (localError) {
        console.error('[Redeem] Fallback to localStorage also failed:', localError);
        return false;
      }
    }

    console.log('[Redeem] Settings updated successfully in Supabase');
    return true;
  } catch (error) {
    console.error('[Redeem] Error toggling redeem feature:', error);
    // Fallback to localStorage on exception
    try {
      const settingsKey = `user_settings_${userId}`;
      const settings = {
        redeem_enabled: redeemEnabled,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      console.log('[Redeem] Fallback: Settings saved to localStorage after exception');
      return true;
    } catch (localError) {
      console.error('[Redeem] Fallback to localStorage also failed:', localError);
      return false;
    }
  }
}

