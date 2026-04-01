import { AppState } from '../types';
import { syncToCloud as supabaseSync, fetchFromCloud as supabaseFetch, SyncResult } from './supabaseService';

export type { SyncResult } from './supabaseService';

/**
 * Sync user data to cloud (Supabase) with localStorage fallback
 */
export async function syncToCloud(state: AppState): Promise<void> {
  if (!state.user) return;

  // Try Supabase first, fallback to localStorage
  try {
    await supabaseSync(state);
  } catch (error) {
    console.warn('[Sync] Supabase sync failed, using localStorage fallback:', error);
    // Fallback to localStorage
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
  }
}

/**
 * Fetch user data from cloud (Supabase) with localStorage fallback
 */
export async function fetchFromCloud(userId: string): Promise<SyncResult> {
  try {
    const result = await supabaseFetch(userId);

    // If successful, return immediately
    if (result.status === 'success') {
      return result;
    }

    // If not found, that's a valid result (new user), return it
    if (result.status === 'not_found') {
      // Check localStorage just in case (e.g. offline mode previously)
      const cloudKey = `cloud_sync_${userId}`;
      const saved = localStorage.getItem(cloudKey);
      if (saved) {
        try {
          return { status: 'success', data: JSON.parse(saved) };
        } catch (e) {
          // ignore error
        }
      }
      return result;
    }

    // If error, fall through to localStorage fallback
    console.warn('[Sync] Supabase fetch error:', result.error);
  } catch (error) {
    console.warn('[Sync] Supabase fetch exception:', error);
  }

  // Fallback to localStorage
  const cloudKey = `cloud_sync_${userId}`;
  const saved = localStorage.getItem(cloudKey);

  if (saved) {
    try {
      return { status: 'success', data: JSON.parse(saved) };
    } catch (e) {
      return { status: 'error', error: e };
    }
  }

  // If we had a specific error from Supabase, return that. Otherwise generic error.
  // Actually, if we are here, it means Supabase failed AND localStorage is empty.
  // Ideally return error to be safe, but if it was not_found, we returned earlier.
  return { status: 'error', error: new Error('Failed to fetch from cloud and local storage') };
}
