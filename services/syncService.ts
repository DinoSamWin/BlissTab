import { AppState } from '../types';
import { syncToCloud as supabaseSync, fetchFromCloud as supabaseFetch } from './supabaseService';

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
export async function fetchFromCloud(userId: string): Promise<Partial<AppState> | null> {
  try {
    const data = await supabaseFetch(userId);
    if (data) return data;
  } catch (error) {
    console.warn('[Sync] Supabase fetch failed, trying localStorage fallback:', error);
  }

  // Fallback to localStorage
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
