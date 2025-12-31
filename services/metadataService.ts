
export async function fetchSiteMetadata(url: string) {
  try {
    // Normalize URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const domain = new URL(targetUrl).hostname;
    const favicon = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    
    // Fallback title logic as browser CORS prevents direct scraping usually
    let title = domain.split('.')[0];
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      url: targetUrl,
      title,
      icon: favicon,
    };
  } catch (e) {
    console.error("Metadata fetch error:", e);
    return null;
  }
}
