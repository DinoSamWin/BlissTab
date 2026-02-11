
interface SiteMetadata {
  url: string;
  title: string;
  icon: string;
}

interface CachedMetadata extends SiteMetadata {
  cachedAt?: number;
}

import { canonicalizeUrl, extractHostname } from './urlCanonicalService';
import { upsertGatewayMetadataIfMissing, fetchGatewayMetadata } from './supabaseService';

declare const chrome: any;

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


// 提取相对路径
function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch {
    return relativeUrl;
  }
}

async function fetchPageMetadata(url: string): Promise<{ title?: string; icon?: string }> {
  // 1. 尝试直接请求 (如果是扩展程序环境且有权限)
  // Check if we are in an extension environment
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

  if (isExtension) {
    try {
      // 扩展程序可以直接发请求，绕过 CORS代理
      const response = await withTimeout(fetch(url, { method: 'GET' }), 3000);
      if (response.ok) {
        const htmlContent = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        return extractMetadataFromDoc(doc, url);
      }
    } catch (e) {
      console.log('Direct fetch failed, falling back to proxy:', e);
    }
  }

  // 2. 策略：快速尝试多个 CORS 代理（并行，2秒超时）
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
            const result: { title?: string; icon?: string } = {};

            // --- 1. Extract Title ---
            // 优先级1: og:site_name
            const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
            if (ogSiteName) {
              result.title = ogSiteName;
            } else {
              // 优先级2: application-name
              const appName = doc.querySelector('meta[name="application-name"]')?.getAttribute('content');
              if (appName) {
                result.title = appName;
              } else {
                // 优先级3: title tag
                const title = doc.querySelector('title')?.textContent;
                if (title) {
                  result.title = title.replace(/\s*[-|]\s*.+$/, '').trim();
                }
              }
            }

            // --- 2. Extract Icon ---
            // Look for link rel="icon", "shortcut icon", "apple-touch-icon"
            const iconSelectors = [
              'link[rel="apple-touch-icon"]',
              'link[rel="icon"]',
              'link[rel="shortcut icon"]'
            ];

            for (const selector of iconSelectors) {
              const el = doc.querySelector(selector);
              const href = el?.getAttribute('href');
              if (href) {
                result.icon = resolveUrl(url, href);
                break; // Found the best one (selectors are ordered by priority)
              }
            }

            if (!result.title && !result.icon) {
              throw new Error('No metadata found');
            }
            return result;
          }),
        2500 // 稍微增加超时时间到2.5s，因为解析变通常了
      )
    );

    // 并行尝试，取第一个成功的
    const results = await Promise.allSettled(proxyPromises);
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        return result.value;
      }
    }
  } catch (error) {
    console.log('Failed to fetch page metadata:', error);
  }

  return {};
}

export async function fetchSiteMetadata(url: string, onBackgroundUpdate?: (metadata: SiteMetadata) => void): Promise<SiteMetadata | null> {
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

          // 后台异步刷新
          refreshMetadataInBackground(canonicalUrl, domain, cacheKey, cached, onBackgroundUpdate);

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
    refreshMetadataInBackground(canonicalUrl, domain, cacheKey, quickResult, onBackgroundUpdate);

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

// Helper to extract metadata from parsed DOM
function extractMetadataFromDoc(doc: Document, baseUrl: string): { title?: string; icon?: string } {
  const result: { title?: string; icon?: string } = {};

  // --- 1. Extract Title ---
  // 优先级1: og:site_name
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (ogSiteName) {
    result.title = ogSiteName;
  } else {
    // 优先级2: application-name
    const appName = doc.querySelector('meta[name="application-name"]')?.getAttribute('content');
    if (appName) {
      result.title = appName;
    } else {
      // 优先级3: title tag
      const title = doc.querySelector('title')?.textContent;
      if (title) {
        result.title = title.replace(/\s*[-|]\s*.+$/, '').trim();
      }
    }
  }

  // --- 2. Extract Icon ---
  // Look for link rel="icon", "shortcut icon", "apple-touch-icon"
  const iconSelectors = [
    'link[rel="apple-touch-icon"]',
    'link[rel="icon"]',
    'link[rel="shortcut icon"]'
  ];

  for (const selector of iconSelectors) {
    const el = doc.querySelector(selector);
    const href = el?.getAttribute('href');
    if (href) {
      result.icon = resolveUrl(baseUrl, href);
      break; // Found the best one (selectors are ordered by priority)
    }
  }

  return result;
}

// 抽取后台更新逻辑
function refreshMetadataInBackground(canonicalUrl: string, domain: string, cacheKey: string, currentData: SiteMetadata, onUpdate?: (metadata: SiteMetadata) => void) {
  Promise.all([
    fetchFavicon(domain),             // 1. Google/DDG API
    fetchPageMetadata(canonicalUrl),  // 2. HTML parsing (Proxy)
    fetchGatewayMetadata(canonicalUrl) // 3. Supabase global metadata (fallback)
  ]).then(async ([apiFavicon, pageMeta, cloudMeta]) => {

    // Priority for title: HTML > Cloud > Current
    let finalTitle = currentData.title;
    if (pageMeta.title) {
      finalTitle = pageMeta.title; // HTML parsing succeeded
    } else if (cloudMeta?.title) {
      finalTitle = cloudMeta.title; // Fallback to cloud metadata
      console.log(`[Metadata] Using cloud metadata for title: ${finalTitle}`);
    }

    let finalIcon = apiFavicon; // 默认使用 API 的结果 (通常比较稳)

    // 如果 HTML 解析到了 Icon，优先验证并使用它 (因为这通常是该网站特定的，更准确)
    if (pageMeta.icon) {
      const isHtmlIconValid = await verifyImageLoads(pageMeta.icon, 1500);
      if (isHtmlIconValid) {
        finalIcon = pageMeta.icon;
      }
    }

    // Fallback to cloud metadata icon if HTML parsing failed
    if (!pageMeta.icon && cloudMeta?.icon) {
      const isCloudIconValid = await verifyImageLoads(cloudMeta.icon, 1500);
      if (isCloudIconValid) {
        finalIcon = cloudMeta.icon;
        console.log(`[Metadata] Using cloud metadata for icon`);
      }
    }

    // 如果 API 失败了 (verifyImageLoads 内部其实已经尽量保证可用性了，但 fetchFavicon 返回的一般是 URL)，
    // 这里再次确保 finalIcon 有值。如果 fetchFavicon 都失效了，可能得保留 currentData.icon
    if (!finalIcon && currentData.icon) {
      finalIcon = currentData.icon;
    }

    const fullMetadata: SiteMetadata = {
      url: canonicalUrl,
      title: finalTitle,
      icon: finalIcon
    };

    // 更新缓存
    metadataCache.set(cacheKey, fullMetadata);
    saveCacheToStorageDebounced(metadataCache);

    // Best-effort: de-duped cloud metadata store
    upsertGatewayMetadataIfMissing({ url: canonicalUrl, title: finalTitle, iconUrl: finalIcon }).catch(() => { });
    console.log(`[Metadata] Background refresh completed for ${domain}`);

    // Notify caller that background update is complete
    if (onUpdate) {
      onUpdate(fullMetadata);
    }

  }).catch(err => {
    console.log(`[Metadata] Background refresh failed for ${domain}:`, err);
  });
}

