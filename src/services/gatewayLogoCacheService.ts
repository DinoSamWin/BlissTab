/**
 * Local cache and background recovery for gateway icons.
 *
 * Custom logos use their cloud content hash as the cache version, so an
 * unchanged logo is never downloaded twice. Regular favicons are cached by
 * source URL and revalidated infrequently so same-URL icon changes can still
 * be picked up without issuing a request on every page open.
 */

import type { QuickLink } from '../types';
import { canonicalizeUrl, extractHostname } from './urlCanonicalService';
import { getLogoSignedUrl, getSupabaseClient } from './supabaseService';

export interface LocalLogoCacheEntry {
  dataUrl: string;
  hash: string;
  updatedAt: number;
  kind?: 'custom' | 'remote';
  sourceUrl?: string;
  checkedAt?: number;
  etag?: string | null;
  lastModified?: string | null;
}

interface LogoRetryEntry {
  failures: number;
  nextRetryAt: number;
}

const LOGO_CACHE_KEY = 'focus_tab_gateway_logo_cache';
const LOGO_RETRY_KEY = 'focus_tab_gateway_logo_retry_v2';
const LOGO_CACHE_EVENT = 'focus-tab-gateway-logo-cache-updated';

const REMOTE_ICON_REVALIDATE_MS = 7 * 24 * 60 * 60 * 1000;
const FAILED_RETRY_COOLDOWN_MS = 15 * 60 * 1000;
const RETRY_DELAYS_MS = [0, 1200, 4500, 12000];
const MAX_CACHE_ENTRIES = 120;
const MAX_CACHE_CHARACTERS = 4_000_000;
const DEFAULT_WARM_CONCURRENCY = 2;

const inFlightDownloads = new Map<string, Promise<boolean>>();
let memoryLogoCache: Record<string, LocalLogoCacheEntry> | null = null;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function notifyLogoCacheUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LOGO_CACHE_EVENT));
  }
}

function pruneLogoCache(cache: Record<string, LocalLogoCacheEntry>): Record<string, LocalLogoCacheEntry> {
  const entries = Object.entries(cache).sort(([, left], [, right]) => right.updatedAt - left.updatedAt);
  const next: Record<string, LocalLogoCacheEntry> = {};

  for (const [key, entry] of entries.slice(0, MAX_CACHE_ENTRIES)) {
    next[key] = entry;
    if (JSON.stringify(next).length > MAX_CACHE_CHARACTERS) {
      delete next[key];
      break;
    }
  }

  return next;
}

export function getLocalLogoCache(): Record<string, LocalLogoCacheEntry> {
  if (memoryLogoCache) return memoryLogoCache;
  try {
    memoryLogoCache = safeParse<Record<string, LocalLogoCacheEntry>>(localStorage.getItem(LOGO_CACHE_KEY)) || {};
  } catch {
    memoryLogoCache = {};
  }
  return memoryLogoCache;
}

export function setLocalLogoCache(next: Record<string, LocalLogoCacheEntry>) {
  const pruned = pruneLogoCache(next);
  memoryLogoCache = pruned;
  try {
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(pruned));
  } catch (error) {
    console.warn('[LogoCache] Failed to persist local icon cache:', error);
  }
  notifyLogoCacheUpdated();
}

export function subscribeToGatewayLogoCache(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOGO_CACHE_KEY) {
      memoryLogoCache = safeParse<Record<string, LocalLogoCacheEntry>>(event.newValue) || {};
      listener();
    }
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(LOGO_CACHE_EVENT, listener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(LOGO_CACHE_EVENT, listener);
  };
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

function resolveCanonicalUrl(link: Pick<QuickLink, 'url' | 'canonicalUrl'>): string | null {
  try {
    return canonicalizeUrl(link.canonicalUrl || link.url);
  } catch {
    return link.canonicalUrl || link.url || null;
  }
}

/**
 * Returns the best local icon. An exact custom-logo hash always wins. When a
 * custom logo is temporarily unavailable, a previously cached favicon may be
 * used as a graceful fallback while recovery continues in the background.
 */
export function getCachedGatewayIconDataUrl(link: QuickLink): string | null {
  const canonicalUrl = resolveCanonicalUrl(link);
  if (!canonicalUrl) return null;

  const entry = getLocalLogoCache()[canonicalUrl];
  if (!entry) return null;
  if (link.customLogoHash && entry.hash === link.customLogoHash) return entry.dataUrl;
  if (link.customLogoHash && (link.customLogoUrl || link.customLogoSignedUrl)) return null;
  if (entry.kind === 'remote' || entry.hash.startsWith('remote:')) return entry.dataUrl;
  return null;
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function cacheBlob(
  canonicalUrl: string,
  blob: Blob,
  entry: Omit<LocalLogoCacheEntry, 'dataUrl' | 'updatedAt'>
): Promise<boolean> {
  if (!blob.size || (blob.type && !blob.type.startsWith('image/') && blob.type !== 'application/octet-stream')) {
    return false;
  }

  const dataUrl = await blobToDataUrl(blob);
  if (!dataUrl) return false;

  upsertLocalLogo(canonicalUrl, {
    ...entry,
    dataUrl,
    updatedAt: Date.now(),
  });
  return true;
}

/**
 * Download a custom logo and save it to the local cache. The content hash is
 * the version: an existing entry with the same hash returns immediately and
 * performs no network or Supabase request.
 */
export async function downloadAndCacheLogo(
  canonicalUrl: string,
  logoUrl: string | null | undefined,
  expectedHash: string,
  storagePath?: string
): Promise<boolean> {
  if (getLocalLogoDataUrl(canonicalUrl, expectedHash)) return true;

  try {
    if (storagePath) {
      try {
        const client = getSupabaseClient();
        if (client) {
          const { data, error } = await client.storage.from('gateway-logos').download(storagePath);
          if (!error && data) {
            const cached = await cacheBlob(canonicalUrl, data, {
              hash: expectedHash,
              kind: 'custom',
            });
            if (cached) return true;
          } else if (error) {
            console.warn('[LogoCache] Supabase logo download failed; trying URL fallback:', error);
          }
        }
      } catch (error) {
        console.warn('[LogoCache] Supabase logo download failed; trying URL fallback:', error);
      }
    }

    if (!logoUrl) return false;
    const response = await fetch(logoUrl, {
      mode: 'cors',
      credentials: 'omit',
      // Reaching this branch means the expected hash is not cached locally.
      // Revalidate so a same-URL logo replacement cannot return stale bytes.
      cache: 'no-cache',
    });
    if (!response.ok) return false;

    return cacheBlob(canonicalUrl, await response.blob(), {
      hash: expectedHash,
      kind: 'custom',
    });
  } catch (error) {
    console.warn(`[LogoCache] Failed to download custom logo for ${canonicalUrl}:`, error);
    return false;
  }
}

function getRetryState(): Record<string, LogoRetryEntry> {
  try {
    return safeParse<Record<string, LogoRetryEntry>>(localStorage.getItem(LOGO_RETRY_KEY)) || {};
  } catch {
    return {};
  }
}

function updateRetryState(key: string, value: LogoRetryEntry | null) {
  try {
    const state = getRetryState();
    if (value) state[key] = value;
    else delete state[key];
    localStorage.setItem(LOGO_RETRY_KEY, JSON.stringify(state));
  } catch {
    // Retry persistence is best-effort; in-memory request de-duplication still works.
  }
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function stableLockSuffix(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function runWithCrossTabLock(key: string, task: () => Promise<boolean>): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.locks) return task();
  return navigator.locks.request(`focus-tab-icon-${stableLockSuffix(key)}`, task);
}

function retryInBackground(key: string, task: () => Promise<boolean>): Promise<boolean> {
  const existingRequest = inFlightDownloads.get(key);
  if (existingRequest) return existingRequest;

  const retryState = getRetryState()[key];
  if (retryState && retryState.nextRetryAt > Date.now()) return Promise.resolve(false);

  const request = (async () => {
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
      if (RETRY_DELAYS_MS[attempt] > 0) await wait(RETRY_DELAYS_MS[attempt]);
      if (await runWithCrossTabLock(key, task)) {
        updateRetryState(key, null);
        return true;
      }
    }

    updateRetryState(key, {
      failures: (retryState?.failures || 0) + RETRY_DELAYS_MS.length,
      nextRetryAt: Date.now() + FAILED_RETRY_COOLDOWN_MS,
    });
    return false;
  })().finally(() => {
    inFlightDownloads.delete(key);
  });

  inFlightDownloads.set(key, request);
  return request;
}

function safeIconSource(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) || /^blob:/i.test(trimmed) || /^data:image\//i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function getSiteIconSources(link: QuickLink): string[] {
  const sources: string[] = [];
  const storedIcon = safeIconSource(link.icon);
  const storedIconIsPublicProxy = Boolean(storedIcon && (
    /\/s2\/favicons/i.test(storedIcon) || /icons\.duckduckgo\.com/i.test(storedIcon)
  ));
  if (storedIcon && !storedIconIsPublicProxy) sources.push(storedIcon);

  const canonicalUrl = resolveCanonicalUrl(link);
  const hostname = canonicalUrl ? extractHostname(canonicalUrl) : '';
  if (canonicalUrl && hostname) {
    // The extension has Chrome's favicon permission. This source can recover
    // visited intranet icons that public favicon services cannot reach.
    const chromeApi = (globalThis as typeof globalThis & {
      chrome?: { runtime?: { id?: string; getURL?: (path: string) => string } };
    }).chrome;
    if (chromeApi?.runtime?.id && chromeApi.runtime.getURL) {
      const faviconBase = chromeApi.runtime.getURL('/_favicon/');
      sources.push(`${faviconBase}?pageUrl=${encodeURIComponent(canonicalUrl)}&size=64`);
    }

    try {
      const parsed = new URL(canonicalUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        sources.push(
          `${parsed.origin}/favicon.ico`,
          `${parsed.origin}/favicon.png`,
          `${parsed.origin}/apple-touch-icon.png`
        );
      }
    } catch {
      // External favicon services below can still recover from a hostname.
    }

    if (storedIconIsPublicProxy && storedIcon) sources.push(storedIcon);
    sources.push(
      `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(canonicalUrl)}`,
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`
    );
  }

  return Array.from(new Set(sources));
}

/**
 * Ordered render candidates. Direct site paths deliberately remain in this
 * list even when fetch() cannot cache them: an <img> can display an intranet
 * favicon in the user's browser without requiring CORS access to its bytes.
 */
export function getGatewayIconCandidates(link: QuickLink): string[] {
  const sources = [
    getCachedGatewayIconDataUrl(link),
    safeIconSource(link.customLogoUrl),
    safeIconSource(link.customLogoSignedUrl),
    ...getSiteIconSources(link),
  ].filter((source): source is string => Boolean(source));

  return Array.from(new Set(sources));
}

function getRemoteIconSources(link: QuickLink): string[] {
  return getSiteIconSources(link).filter(source => /^https?:\/\//i.test(source));
}

async function fetchAndCacheRemoteIcon(canonicalUrl: string, sourceUrl: string): Promise<boolean> {
  const existing = getLocalLogoCache()[canonicalUrl];
  const checkedAt = existing?.checkedAt || existing?.updatedAt || 0;
  const isMatchingRemote = existing?.kind === 'remote' && existing.sourceUrl === sourceUrl;

  if (isMatchingRemote && Date.now() - checkedAt < REMOTE_ICON_REVALIDATE_MS) {
    return true;
  }

  try {
    // no-cache lets the browser perform an efficient HTTP revalidation when it
    // has validators, while the seven-day guard avoids a request on each open.
    const response = await fetch(sourceUrl, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache',
    });
    if (!response.ok) return false;

    const blob = await response.blob();
    if (!blob.size || (blob.type && !blob.type.startsWith('image/') && blob.type !== 'application/octet-stream')) {
      return false;
    }

    const dataUrl = await blobToDataUrl(blob);
    if (!dataUrl) return false;

    if (isMatchingRemote && existing.dataUrl === dataUrl) {
      upsertLocalLogo(canonicalUrl, {
        ...existing,
        checkedAt: Date.now(),
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
      });
      return true;
    }

    upsertLocalLogo(canonicalUrl, {
      dataUrl,
      hash: `remote:${sourceUrl}`,
      kind: 'remote',
      sourceUrl,
      updatedAt: Date.now(),
      checkedAt: Date.now(),
      etag: response.headers.get('etag'),
      lastModified: response.headers.get('last-modified'),
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureRemoteIconCached(link: QuickLink, canonicalUrl: string): Promise<boolean> {
  const sources = getRemoteIconSources(link);
  if (!sources.length) return false;

  const existing = getLocalLogoCache()[canonicalUrl];
  const checkedAt = existing?.checkedAt || existing?.updatedAt || 0;
  if (existing?.kind === 'remote' && Date.now() - checkedAt < REMOTE_ICON_REVALIDATE_MS) {
    return true;
  }

  const orderedSources = existing?.kind === 'remote' && existing.sourceUrl
    ? [existing.sourceUrl, ...sources.filter(source => source !== existing.sourceUrl)]
    : sources;
  const retryKey = `remote:${canonicalUrl}:${orderedSources[0]}`;
  return retryInBackground(retryKey, async () => {
    for (const source of orderedSources) {
      if (await fetchAndCacheRemoteIcon(canonicalUrl, source)) return true;
    }
    return false;
  });
}

/**
 * Ensures one gateway has a usable local icon. Missing custom logos are retried
 * four times with backoff; after that they cool down for 15 minutes before a
 * later page open can try again. A favicon is recovered as a fallback.
 */
export async function ensureGatewayIconCached(link: QuickLink): Promise<boolean> {
  if (link.type === 'group-placeholder' || link.id.startsWith('ghost-')) return false;
  if (!link.customLogoHash && link.icon && /^(data|blob):/i.test(link.icon)) return true;

  const canonicalUrl = resolveCanonicalUrl(link);
  if (!canonicalUrl) return false;

  if (link.customLogoHash) {
    if (getLocalLogoDataUrl(canonicalUrl, link.customLogoHash)) return true;

    const hasCustomSource = Boolean(link.customLogoPath || link.customLogoUrl || link.customLogoSignedUrl);
    if (hasCustomSource) {
      const retryKey = `custom:${canonicalUrl}:${link.customLogoHash}`;
      const customCached = await retryInBackground(retryKey, async () => {
        const initialUrl = link.customLogoUrl || link.customLogoSignedUrl || null;
        if (await downloadAndCacheLogo(
          canonicalUrl,
          initialUrl,
          link.customLogoHash as string,
          link.customLogoPath || undefined
        )) {
          return true;
        }

        if (link.customLogoPath) {
          const refreshedSignedUrl = await getLogoSignedUrl(link.customLogoPath);
          if (refreshedSignedUrl && refreshedSignedUrl !== initialUrl) {
            return downloadAndCacheLogo(
              canonicalUrl,
              refreshedSignedUrl,
              link.customLogoHash as string,
              link.customLogoPath
            );
          }
        }
        return false;
      });
      if (customCached) return true;
    }
  }

  return ensureRemoteIconCached(link, canonicalUrl);
}

/**
 * Warms missing icons without blocking rendering. Work is de-duplicated by
 * canonical URL and limited to a small concurrency so startup remains light.
 */
export async function warmGatewayIconCache(
  links: QuickLink[],
  concurrency: number = DEFAULT_WARM_CONCURRENCY
): Promise<void> {
  const uniqueByCanonical = new Map<string, QuickLink>();
  for (const link of links) {
    if (link.type === 'group-placeholder' || link.id.startsWith('ghost-')) continue;
    const key = resolveCanonicalUrl(link) || link.id;
    const existing = uniqueByCanonical.get(key);
    if (!existing || link.customLogoHash) uniqueByCanonical.set(key, link);
  }
  const uniqueLinks = Array.from(uniqueByCanonical.values());

  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, uniqueLinks.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < uniqueLinks.length) {
      const link = uniqueLinks[nextIndex];
      nextIndex += 1;
      await ensureGatewayIconCached(link);
    }
  });

  await Promise.all(workers);
}
