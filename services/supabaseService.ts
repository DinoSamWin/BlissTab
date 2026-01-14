import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';

const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY;

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize Supabase client
 */
function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase not configured. Falling back to localStorage.');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
  } catch (e) {
    console.error('Failed to initialize Supabase:', e);
    return null;
  }
}

/**
 * Sync user data to Supabase
 */
export async function syncToCloud(state: AppState): Promise<void> {
  if (!state.user) return;

  const client = getSupabaseClient();
  
  // Fallback to localStorage if Supabase is not configured
  if (!client) {
    const cloudKey = `cloud_sync_${state.user.id}`;
    const dataToSync = {
      links: state.links,
      requests: state.requests,
      language: state.language,
      theme: state.theme,
      version: state.version,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(cloudKey, JSON.stringify(dataToSync));
    return;
  }

  try {
    // Prepare data to sync (only user-specific data, not user object itself)
    const dataToSync = {
      links: state.links || [],
      requests: state.requests || [],
      language: state.language || 'English',
      theme: state.theme || 'light',
      version: state.version || '1.0.0',
      pinnedSnippetId: state.pinnedSnippetId || null
    };

    console.log('[Sync] Syncing to Supabase:', {
      userId: state.user.id,
      linksCount: dataToSync.links.length,
      requestsCount: dataToSync.requests.length
    });

    const { data, error } = await client
      .from('user_data')
      .upsert({
        user_id: state.user.id,
        email: state.user.email,
        data: dataToSync,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select(); // Return the inserted/updated row

    if (error) {
      console.error('[Sync] Supabase error:', error);
      console.error('[Sync] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    // Verify the write succeeded
    if (data && data.length > 0) {
      const savedData = data[0].data;
      console.log(`[Sync] Successfully synced data for ${state.user.email}`, {
        links: savedData.links?.length || 0,
        requests: savedData.requests?.length || 0,
        language: savedData.language,
        theme: savedData.theme,
        savedAt: data[0].updated_at
      });
      
      // Verify the data matches what we sent
      if (savedData.links?.length !== dataToSync.links.length) {
        console.warn('[Sync] Link count mismatch!', {
          sent: dataToSync.links.length,
          saved: savedData.links?.length
        });
      }
    } else {
      console.warn('[Sync] Upsert succeeded but no data returned');
    }
  } catch (error) {
    console.error('[Sync] Failed to sync to cloud:', error);
    // Fallback to localStorage on error
    const cloudKey = `cloud_sync_${state.user.id}`;
    localStorage.setItem(cloudKey, JSON.stringify({
      links: state.links,
      requests: state.requests,
      language: state.language,
      theme: state.theme,
      version: state.version,
      updatedAt: new Date().toISOString()
    }));
  }
}

/**
 * Fetch user data from Supabase
 */
export async function fetchFromCloud(userId: string): Promise<Partial<AppState> | null> {
  const client = getSupabaseClient();
  
  // Fallback to localStorage if Supabase is not configured
  if (!client) {
    const cloudKey = `cloud_sync_${userId}`;
    const saved = localStorage.getItem(cloudKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  try {
    const { data, error } = await client
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no data found (first time user), return null (not an error)
      if (error.code === 'PGRST116') {
        console.log('[Sync] No existing data for user, will create on first sync');
        return null;
      }
      throw error;
    }
    
    if (data && data.data) {
      console.log(`[Sync] Fetched data for user ${userId}`, {
        links: data.data.links?.length || 0,
        requests: data.data.requests?.length || 0,
        language: data.data.language,
        theme: data.data.theme,
        lastUpdated: data.updated_at
      });
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('[Sync] Failed to fetch from cloud:', error);
    // Fallback to localStorage on error
    const cloudKey = `cloud_sync_${userId}`;
    const saved = localStorage.getItem(cloudKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
