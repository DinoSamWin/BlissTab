import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from '../types';
import { canonicalizeUrl, extractHostname } from './urlCanonicalService';

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

export interface GatewayMetadataRow {
  canonical_url: string;
  hostname: string;
  site_title: string | null;
  icon_url: string | null;
  updated_at?: string;
}

export interface UserGatewayOverrideRow {
  user_id: string;
  canonical_url: string;
  custom_title: string | null;
  custom_logo_path: string | null;
  custom_logo_url: string | null;
  custom_logo_signed_url: string | null; // For private buckets
  custom_logo_hash: string | null;
  updated_at?: string;
}

/**
 * Upsert gateway metadata into a global table, but avoid write if the row already exists.
 * This reduces write volume significantly when many users add the same URL.
 */
export async function upsertGatewayMetadataIfMissing(input: {
  url: string;
  title?: string | null;
  iconUrl?: string | null;
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const canonicalUrl = canonicalizeUrl(input.url);
  const hostname = extractHostname(canonicalUrl);
  if (!canonicalUrl || !hostname) return;

  try {
    const { data: existing, error: selErr } = await client
      .from('gateway_metadata')
      .select('canonical_url')
      .eq('canonical_url', canonicalUrl)
      .maybeSingle();

    if (selErr) {
      // If select fails due to missing table/RLS, don't block the app.
      console.warn('[GatewayMetadata] select failed:', selErr);
      return;
    }

    if (existing?.canonical_url) {
      // Already exists; skip write.
      return;
    }

    const row: GatewayMetadataRow = {
      canonical_url: canonicalUrl,
      hostname,
      site_title: input.title ?? null,
      icon_url: input.iconUrl ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: insErr } = await client.from('gateway_metadata').insert(row);
    if (insErr) {
      console.warn('[GatewayMetadata] insert failed:', insErr);
    }
  } catch (e) {
    console.warn('[GatewayMetadata] upsert-if-missing failed:', e);
  }
}

export async function fetchUserGatewayOverrides(userId: string): Promise<UserGatewayOverrideRow[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('user_gateway_overrides')
      .select('user_id, canonical_url, custom_title, custom_logo_path, custom_logo_url, custom_logo_signed_url, custom_logo_hash, updated_at')
      .eq('user_id', userId);

    if (error) {
      console.warn('[GatewayOverrides] fetch failed:', error);
      return [];
    }
    return (data as UserGatewayOverrideRow[]) || [];
  } catch (e) {
    console.warn('[GatewayOverrides] fetch exception:', e);
    return [];
  }
}

/**
 * Upsert user overrides keyed by (user_id, canonical_url).
 * Callers should only call when values actually changed to reduce write volume.
 */
export async function upsertUserGatewayOverride(row: UserGatewayOverrideRow): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('user_gateway_overrides')
      .upsert(
        {
          ...row,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,canonical_url' }
      );

    if (error) {
      console.warn('[GatewayOverrides] upsert failed:', error);
    }
  } catch (e) {
    console.warn('[GatewayOverrides] upsert exception:', e);
  }
}

/**
 * Upload a gateway logo to Supabase Storage (bucket must exist).
 * Returns { path, publicUrl } if successful.
 */
export async function uploadGatewayLogo(params: {
  userId: string;
  canonicalUrl: string;
  file: Blob;
  contentType: string;
  hash: string;
}): Promise<{ path: string; publicUrl: string | null; signedUrl: string | null } | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('[GatewayLogo] Supabase client not available');
    return null;
  }

  try {
    const safeKey = encodeURIComponent(params.canonicalUrl);
    const path = `${params.userId}/${safeKey}/${params.hash}`;

    console.log('[GatewayLogo] Uploading logo:', { path, size: params.file.size, contentType: params.contentType });

    const { error: upErr } = await client.storage
      .from('gateway-logos')
      .upload(path, params.file, { upsert: true, contentType: params.contentType });

    if (upErr) {
      const errorMessage = upErr.message || String(upErr);
      console.error('[GatewayLogo] Upload failed:', {
        error: upErr,
        message: errorMessage,
      });
      // Check for common errors
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('not found')) {
        console.error('[GatewayLogo] Bucket "gateway-logos" does not exist. Please create it in Supabase Storage.');
      } else if (errorMessage.includes('row-level security') || errorMessage.includes('RLS') || errorMessage.includes('permission') || errorMessage.includes('Forbidden') || errorMessage.includes('403')) {
        console.error('[GatewayLogo] Permission denied. Check Storage bucket RLS policies. You may need to allow authenticated users to upload.');
      }
      return null;
    }

    console.log('[GatewayLogo] Upload successful:', path);

    // Try to get public URL (works if bucket is public)
    const { data: publicData } = client.storage.from('gateway-logos').getPublicUrl(path);
    const publicUrl = publicData?.publicUrl || null;
    
    let signedUrl: string | null = null;
    
    if (publicUrl) {
      console.log('[GatewayLogo] Public URL:', publicUrl);
    } else {
      // Bucket is private, generate signed URL (valid for 1 year)
      console.log('[GatewayLogo] Bucket is private, generating signed URL...');
      try {
        const { data: signedData, error: signedErr } = await client.storage
          .from('gateway-logos')
          .createSignedUrl(path, 31536000); // 1 year expiry
        
        if (signedErr) {
          console.warn('[GatewayLogo] Failed to create signed URL:', signedErr);
        } else if (signedData?.signedUrl) {
          signedUrl = signedData.signedUrl;
          console.log('[GatewayLogo] Signed URL generated (valid for 1 year)');
        }
      } catch (signedError) {
        console.warn('[GatewayLogo] Exception creating signed URL:', signedError);
      }
    }

    return { path, publicUrl, signedUrl };
  } catch (e) {
    console.error('[GatewayLogo] Upload exception:', e);
    return null;
  }
}

/**
 * Get a signed URL for a logo file (useful for private buckets or expired URLs).
 * Returns null if the file doesn't exist or if signed URL generation fails.
 */
export async function getLogoSignedUrl(path: string, expiresIn: number = 31536000): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.storage
      .from('gateway-logos')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.warn('[GatewayLogo] Failed to create signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (e) {
    console.warn('[GatewayLogo] Exception creating signed URL:', e);
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
