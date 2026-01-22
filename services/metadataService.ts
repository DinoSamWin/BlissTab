
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

// 超时工具函数
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}

// 提取一级域名（用于回退）
function extractRootDomain(domain: string): string | null {
  const parts = domain.split('.');
  if (parts.length <= 2) return null;
  return parts.slice(-2).join('.');
}

// 验证图片是否可加载（快速验证）
function verifyImageLoads(url: string, timeout: number = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve(false);
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

async function fetchFavicon(domain: string): Promise<string> {
  // 方案1：直接使用 Google Favicon API（最快，无需验证）
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  
  // 方案2：DuckDuckGo（备用）
  const duckduckgoFavicon = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  
  // 方案3：直接访问域名 favicon
  const directFavicon = `https://${domain}/favicon.ico`;
  
  // 并行竞速：同时尝试多个服务，谁快用谁
  const attempts = [
    { url: googleFavicon, priority: 1 },
    { url: duckduckgoFavicon, priority: 2 },
    { url: directFavicon, priority: 3 }
  ];
  
  // 并行验证，取第一个成功的
  const results = await Promise.allSettled(
    attempts.map(({ url }) => 
      verifyImageLoads(url, 1500).then(loaded => loaded ? url : Promise.reject())
    )
  );
  
  // 找到第一个成功的
  for (const result of results) {
    if (result.status === 'fulfilled') {
      return result.value;
    }
  }
  
  // 如果都失败，尝试一级域名
  const rootDomain = extractRootDomain(domain);
  if (rootDomain) {
    const rootFavicon = `https://www.google.com/s2/favicons?domain=${rootDomain}&sz=128`;
    const rootLoaded = await verifyImageLoads(rootFavicon, 1000);
    if (rootLoaded) return rootFavicon;
  }
  
  // 最终回退：使用 Google 服务（通常可用）
  return googleFavicon;
}

async function fetchSiteName(url: string, domain: string): Promise<string> {
  // 策略：快速尝试多个 CORS 代理（并行，2秒超时）
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  
  try {
    const proxyPromises = proxies.map(proxyUrl => 
      withTimeout(
        fetch(proxyUrl)
          .then(r => r.json())
          .then(data => {
            // 处理不同代理的响应格式
            let htmlContent: string;
            if (data.contents) {
              // allorigins.win 格式
              htmlContent = data.contents;
            } else if (typeof data === 'string') {
              // corsproxy.io 可能直接返回 HTML
              htmlContent = data;
            } else {
              throw new Error('No content found');
            }
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // 优先级1: og:site_name
            const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
            if (ogSiteName) return ogSiteName;
            
            // 优先级2: application-name
            const appName = doc.querySelector('meta[name="application-name"]')?.getAttribute('content');
            if (appName) return appName;
            
            // 优先级3: title tag
            const title = doc.querySelector('title')?.textContent;
            if (title) {
              const cleanTitle = title
                .replace(/\s*[-|]\s*.+$/, '')
                .trim();
              if (cleanTitle) return cleanTitle;
            }
            
            throw new Error('No content found');
          }),
        2000 // 2秒超时
      )
    );
    
    // 并行尝试，取第一个成功的
    const results = await Promise.allSettled(proxyPromises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        return result.value;
      }
    }
  } catch (error) {
    console.log('Failed to fetch site name:', error);
  }
  
  // 快速失败：使用域名作为后备（不等待）
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
    
    // 立即返回快速结果（不等待完整数据）
    const quickResult: SiteMetadata = {
      url: targetUrl,
      title: formatDomainAsTitle(domain), // 立即使用域名
      icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` // 立即使用 Google CDN
    };
    
    // 后台异步获取完整数据（不阻塞返回）
    Promise.all([
      fetchFavicon(domain).catch(() => quickResult.icon),
      fetchSiteName(targetUrl, domain).catch(() => quickResult.title)
    ]).then(([icon, title]) => {
      const fullMetadata: SiteMetadata = {
        url: targetUrl,
        title,
        icon
      };
      
      // 更新缓存
      metadataCache.set(cacheKey, fullMetadata);
    }).catch(err => {
      console.log('Background metadata fetch failed:', err);
    });
    
    // 立即返回快速结果
    return quickResult;
    
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
