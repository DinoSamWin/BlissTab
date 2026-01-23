/**
 * Local-only cache for user-uploaded gateway logos.
 *
 * We intentionally do NOT sync data URLs to Supabase to avoid bloating backups.
 * Instead, we store:
 * - Supabase Storage path + hash in cloud (in links/override table)
 * - Data URL locally for instant render/offline-ish behavior
 */

export interface LocalLogoCacheEntry {
  dataUrl: string;
  hash: string;
  updatedAt: number;
}

const LOGO_CACHE_KEY = 'focus_tab_gateway_logo_cache';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getLocalLogoCache(): Record<string, LocalLogoCacheEntry> {
  return safeParse<Record<string, LocalLogoCacheEntry>>(localStorage.getItem(LOGO_CACHE_KEY)) || {};
}

export function setLocalLogoCache(next: Record<string, LocalLogoCacheEntry>) {
  localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(next));
}

export function getLocalLogoDataUrl(canonicalUrl: string, expectedHash?: string | null): string | null {
  const cache = getLocalLogoCache();
  const entry = cache[canonicalUrl];
  if (!entry) return null;
  if (expectedHash && entry.hash !== expectedHash) return null;
  return entry.dataUrl;
}

export function upsertLocalLogo(canonicalUrl: string, entry: LocalLogoCacheEntry) {
  const cache = getLocalLogoCache();
  cache[canonicalUrl] = entry;
  setLocalLogoCache(cache);
}

export function removeLocalLogo(canonicalUrl: string) {
  const cache = getLocalLogoCache();
  delete cache[canonicalUrl];
  setLocalLogoCache(cache);
}

/**
 * Download logo from URL and save to local cache.
 * Used when loading from cloud (e.g., after login on a new browser).
 * 
 * @param canonicalUrl - The canonical URL of the gateway
 * @param logoUrl - The public or signed URL to download from
 * @param expectedHash - The expected hash of the logo file
 * @param storagePath - Optional: The storage path to use with Supabase download() method
 */
export async function downloadAndCacheLogo(
  canonicalUrl: string,
  logoUrl: string,
  expectedHash: string,
  storagePath?: string
): Promise<boolean> {
  // Skip if already cached with same hash
  const existing = getLocalLogoDataUrl(canonicalUrl, expectedHash);
  if (existing) {
    return true;
  }

  try {
    // Try using Supabase Storage download() method first if path is provided
    if (storagePath) {
      try {
        // Use the existing Supabase client from supabaseService to avoid creating multiple instances
        const { getSupabaseClient } = await import('./supabaseService');
        const client = getSupabaseClient();
        
        if (client) {
          const { data, error } = await client.storage
            .from('gateway-logos')
            .download(storagePath);
          
          if (error) {
            console.warn(`[LogoCache] Supabase download failed, trying direct fetch:`, error);
          } else if (data) {
            const reader = new FileReader();
            return new Promise((resolve) => {
              reader.onloadend = () => {
                const dataUrl = reader.result as string;
                if (dataUrl) {
                  upsertLocalLogo(canonicalUrl, {
                    dataUrl,
                    hash: expectedHash,
                    updatedAt: Date.now(),
                  });
                  console.log(`[LogoCache] Downloaded and cached logo for ${canonicalUrl} (via Supabase)`);
                  resolve(true);
                } else {
                  resolve(false);
                }
              };
              reader.onerror = () => {
                console.warn(`[LogoCache] Failed to read logo blob for ${canonicalUrl}`);
                resolve(false);
              };
              reader.readAsDataURL(data);
            });
          }
        }
      } catch (supabaseError) {
        console.warn(`[LogoCache] Supabase download exception, trying direct fetch:`, supabaseError);
      }
    }

    // Fallback to direct fetch
    const response = await fetch(logoUrl, {
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      console.warn(`[LogoCache] Failed to download logo from ${logoUrl}:`, {
        status: response.status,
        statusText: response.statusText,
        url: logoUrl
      });
      // If 404, the file might not exist - log for debugging
      if (response.status === 404) {
        console.warn(`[LogoCache] Logo file not found at ${logoUrl}. It may not have been uploaded successfully.`);
      }
      return false;
    }

    const blob = await response.blob();
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl) {
          upsertLocalLogo(canonicalUrl, {
            dataUrl,
            hash: expectedHash,
            updatedAt: Date.now(),
          });
          console.log(`[LogoCache] Downloaded and cached logo for ${canonicalUrl}`);
          resolve(true);
        } else {
          resolve(false);
        }
      };
      reader.onerror = () => {
        console.warn(`[LogoCache] Failed to read logo blob for ${canonicalUrl}`);
        resolve(false);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`[LogoCache] Exception downloading logo for ${canonicalUrl}:`, error);
    return false;
  }
}


