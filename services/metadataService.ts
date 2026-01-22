
interface SiteMetadata {
  url: string;
  title: string;
  icon: string;
}

interface CachedMetadata extends SiteMetadata {
  cachedAt?: number;
}

import { canonicalizeUrl, extractHostname } from './urlCanonicalService';
import { upsertGatewayMetadataIfMissing } from './supabaseService';

// 缓存键名和配置
const CACHE_STORAGE_KEY = 'focus_tab_metadata_cache';
const CACHE_EXPIRY_DAYS = 30; // 缓存有效期 30 天
const CACHE_STALE_DAYS = 60; // 缓存完全失效时间 60 天（超过这个时间才真正删除）

// 从 localStorage 恢复缓存
function loadCacheFromStorage(): Map<string, SiteMetadata> {
  const cache = new Map<string, SiteMetadata>();
  try {
    const saved = localStorage.getItem(CACHE_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      const now = Date.now();
      
      for (const [key, value] of Object.entries(data)) {
        const metadata = value as CachedMetadata;
        if (metadata.cachedAt) {
          const age = now - metadata.cachedAt;
          const maxAge = CACHE_STALE_DAYS * 24 * 60 * 60 * 1000;
          
          // 只加载未完全失效的缓存（超过 60 天才删除）
          if (age < maxAge) {
            // 移除 cachedAt 字段，只保留元数据
            const { cachedAt, ...cleanMetadata } = metadata;
            cache.set(key, cleanMetadata as SiteMetadata);
          }
        } else {
          // 兼容旧格式（没有 cachedAt）
          cache.set(key, metadata as SiteMetadata);
        }
      }
      console.log(`[Metadata] Loaded ${cache.size} cached items from storage`);
    }
  } catch (error) {
    console.error('[Metadata] Failed to load cache from storage:', error);
  }
  return cache;
}

// 保存缓存到 localStorage
function saveCacheToStorage(cache: Map<string, SiteMetadata>) {
  try {
    const data: Record<string, CachedMetadata> = {};
    const now = Date.now();
    
    for (const [key, value] of cache.entries()) {
      data[key] = {
        ...value,
        cachedAt: now
      };
    }
    
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[Metadata] Failed to save cache to storage:', error);
    // 如果存储空间不足，清理旧缓存
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch (e) {
      // 忽略清理错误
    }
  }
}

// 防抖保存缓存
let saveCacheTimeout: NodeJS.Timeout | null = null;

function saveCacheToStorageDebounced(cache: Map<string, SiteMetadata>) {
  if (saveCacheTimeout) {
    clearTimeout(saveCacheTimeout);
  }
  
  saveCacheTimeout = setTimeout(() => {
    saveCacheToStorage(cache);
    saveCacheTimeout = null;
  }, 1000); // 1秒后保存，避免频繁写入
}

// 检查缓存是否过期（但不过期太久）
function isCacheStale(cachedAt: number): boolean {
  const now = Date.now();
  const age = now - cachedAt;
  const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return age >= expiryTime;
}

// 检查缓存是否完全失效
function isCacheExpired(cachedAt: number): boolean {
  const now = Date.now();
  const age = now - cachedAt;
  const maxAge = CACHE_STALE_DAYS * 24 * 60 * 60 * 1000;
  return age >= maxAge;
}

// 获取缓存时间信息
function getCacheTime(cacheKey: string): number | null {
  try {
    const saved = localStorage.getItem(CACHE_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      const cachedData = data[cacheKey] as CachedMetadata;
      return cachedData?.cachedAt || null;
    }
  } catch (error) {
    // 忽略错误
  }
  return null;
}

// 初始化缓存（从 localStorage 恢复）
const metadataCache = loadCacheFromStorage();

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
    // Canonicalize URL (used for cache + cloud dedupe)
    const canonicalUrl = canonicalizeUrl(url);
    const domain = extractHostname(canonicalUrl);
    
    if (!domain) {
      throw new Error('Invalid URL');
    }
    
    const cacheKey = canonicalUrl;
    
    // 检查缓存
    const cached = metadataCache.get(cacheKey);
    if (cached) {
      // 从 localStorage 获取缓存时间信息
      const cachedAt = getCacheTime(cacheKey);
      
      if (cachedAt) {
        if (isCacheExpired(cachedAt)) {
          // 缓存完全失效，删除并重新获取
          metadataCache.delete(cacheKey);
          console.log(`[Metadata] Cache expired for ${domain}, fetching fresh data`);
        } else if (isCacheStale(cachedAt)) {
          // 缓存过期但未完全失效，先返回旧数据，后台更新
          console.log(`[Metadata] Cache stale for ${domain}, using cached data, refreshing in background`);
          
          // 后台异步获取新数据（不阻塞返回）
          Promise.all([
            fetchFavicon(domain).catch(() => cached.icon),
            fetchSiteName(canonicalUrl, domain).catch(() => cached.title)
          ]).then(([icon, title]) => {
            const freshMetadata: SiteMetadata = {
              url: canonicalUrl,
              title,
              icon
            };
            
            // 更新缓存
            metadataCache.set(cacheKey, freshMetadata);
            saveCacheToStorageDebounced(metadataCache);
            console.log(`[Metadata] Background refresh completed for ${domain}`);
          }).catch(err => {
            console.log(`[Metadata] Background refresh failed for ${domain}, keeping cached data:`, err);
          });
          
          // 立即返回缓存的旧数据（不等待）
          return { ...cached, url: canonicalUrl };
        } else {
          // 缓存未过期，直接使用
          return { ...cached, url: canonicalUrl };
        }
      } else {
        // 没有时间信息，直接使用（兼容旧格式）
        return { ...cached, url: canonicalUrl };
      }
    }
    
    // 没有缓存，获取新数据
    const quickResult: SiteMetadata = {
      url: canonicalUrl,
      title: formatDomainAsTitle(domain), // 立即使用域名
      icon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` // 立即使用 Google CDN
    };
    
    // 后台异步获取完整数据（不阻塞返回）
    Promise.all([
      fetchFavicon(domain).catch(() => quickResult.icon),
      fetchSiteName(canonicalUrl, domain).catch(() => quickResult.title)
    ]).then(([icon, title]) => {
      const fullMetadata: SiteMetadata = {
        url: canonicalUrl,
        title,
        icon
      };
      
      // 更新缓存
      metadataCache.set(cacheKey, fullMetadata);
      saveCacheToStorageDebounced(metadataCache);

      // Best-effort: de-duped cloud metadata store (skip if already exists)
      upsertGatewayMetadataIfMissing({ url: canonicalUrl, title, iconUrl: icon }).catch(() => {});
    }).catch(err => {
      console.log('Background metadata fetch failed:', err);
    });
    
    // 立即返回快速结果
    return quickResult;
    
  } catch (e) {
    console.error("Metadata fetch error:", e);
    
    // Fallback: Return basic metadata
    try {
      const canonicalUrl = canonicalizeUrl(url);
      const domain = extractHostname(canonicalUrl);
      return {
        url: canonicalUrl,
        title: formatDomainAsTitle(domain || 'link'),
        icon: `https://www.google.com/s2/favicons?domain=${domain || 'example.com'}&sz=128`
      };
    } catch {
      return null;
    }
  }
}
