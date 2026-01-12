
import { AppState } from '../types';

/**
 * Simulates a cloud backend for storing and retrieving user data.
 * In a real-world scenario, this would be a series of fetch() calls to a REST API.
 */
export async function syncToCloud(state: AppState): Promise<void> {
  if (!state.user) return;

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  // Isolated cloud storage per user
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
  console.log(`[Sync] Successfully pushed data for ${state.user.email}`);
}

export async function fetchFromCloud(userId: string): Promise<Partial<AppState> | null> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1000));

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
