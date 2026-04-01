export function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

/**
 * Canonicalize URL for deduping.
 * - Lowercase hostname
 * - Remove default ports
 * - Remove trailing slash (except root)
 * - Drop common tracking params (utm_*, fbclid, gclid, etc.)
 * - Sort remaining query params
 */
export function canonicalizeUrl(inputUrl: string): string {
  const targetUrl = normalizeUrl(inputUrl);
  const u = new URL(targetUrl);

  u.hostname = u.hostname.toLowerCase();

  // Remove default ports
  if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) {
    u.port = '';
  }

  // Remove tracking params
  const dropKeys = new Set([
    'fbclid',
    'gclid',
    'igshid',
    'mc_cid',
    'mc_eid',
    'msclkid',
    'ref',
    'ref_src',
    'spm',
  ]);

  // Remove utm_* params
  for (const key of Array.from(u.searchParams.keys())) {
    if (key.toLowerCase().startsWith('utm_') || dropKeys.has(key.toLowerCase())) {
      u.searchParams.delete(key);
    }
  }

  // Sort query params
  const sorted = Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
  u.search = '';
  for (const [k, v] of sorted) u.searchParams.append(k, v);

  // Normalize pathname
  if (u.pathname !== '/') {
    u.pathname = u.pathname.replace(/\/+$/, '');
  }

  // Remove hash
  u.hash = '';

  return u.toString();
}

export function extractHostname(inputUrl: string): string {
  try {
    const u = new URL(normalizeUrl(inputUrl));
    return u.hostname.toLowerCase();
  } catch {
    return '';
  }
}

export async function sha256Hex(input: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', input);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}



