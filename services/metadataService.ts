
interface SiteMetadata {
  url: string;
  title: string;
  icon: string;
}

// Cache for metadata to avoid repeated fetches
const metadataCache = new Map<string, SiteMetadata>();

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function formatDomainAsTitle(domain: string): string {
  const parts = domain.split('.');
  const mainPart = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
}

async function fetchFavicon(domain: string): Promise<string> {
  // Priority 1: Google favicon service
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  
  // Try to verify if Google favicon works, otherwise fallback
  try {
    const response = await fetch(googleFavicon, { method: 'HEAD', mode: 'no-cors' });
    return googleFavicon;
  } catch {
    // Priority 2: Try origin favicon
    try {
      const originFavicon = `https://${domain}/favicon.ico`;
      const response = await fetch(originFavicon, { method: 'HEAD', mode: 'no-cors' });
      return originFavicon;
    } catch {
      // Fallback: Use Google service anyway (it usually works)
      return googleFavicon;
    }
  }
}

async function fetchSiteName(url: string, domain: string): Promise<string> {
  // Try to fetch HTML and parse meta tags
  try {
    // Use a CORS proxy or try direct fetch
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const data = await response.json();
    
    if (data.contents) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // Priority 1: og:site_name
      const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
      if (ogSiteName) return ogSiteName;
      
      // Priority 2: application-name
      const appName = doc.querySelector('meta[name="application-name"]')?.getAttribute('content');
      if (appName) return appName;
      
      // Priority 3: title tag
      const title = doc.querySelector('title')?.textContent;
      if (title) {
        // Clean up title (remove common suffixes)
        const cleanTitle = title
          .replace(/\s*[-|]\s*.+$/, '') // Remove " - Site Name" suffix
          .trim();
        if (cleanTitle) return cleanTitle;
      }
    }
  } catch (error) {
    console.log('Failed to fetch site name via proxy:', error);
  }
  
  // Fallback: Use formatted domain
  return formatDomainAsTitle(domain);
}

export async function fetchSiteMetadata(url: string): Promise<SiteMetadata | null> {
  try {
    // Normalize URL
    const targetUrl = normalizeUrl(url);
    const domain = extractDomain(targetUrl);
    
    if (!domain) {
      throw new Error('Invalid URL');
    }
    
    // Check cache first
    const cacheKey = domain.toLowerCase();
    if (metadataCache.has(cacheKey)) {
      const cached = metadataCache.get(cacheKey)!;
      return { ...cached, url: targetUrl }; // Use the normalized URL from input
    }
    
    // Fetch metadata
    const [icon, title] = await Promise.all([
      fetchFavicon(domain),
      fetchSiteName(targetUrl, domain)
    ]);
    
    const metadata: SiteMetadata = {
      url: targetUrl,
      title,
      icon
    };
    
    // Cache the result
    metadataCache.set(cacheKey, metadata);
    
    return metadata;
  } catch (e) {
    console.error("Metadata fetch error:", e);
    
    // Fallback: Return basic metadata
    try {
      const targetUrl = normalizeUrl(url);
      const domain = extractDomain(targetUrl);
      return {
        url: targetUrl,
        title: formatDomainAsTitle(domain),
        icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      };
    } catch {
      return null;
    }
  }
}
