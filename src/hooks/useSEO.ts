import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
}

export const useSEO = ({ title, description, keywords, canonical, ogType = 'website', ogImage }: SEOProps) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title;
    
    // 2. Helper function to update/create meta tags
    const updateMetaTag = (name: string, content: string, attrName: string = 'name') => {
      let element = document.querySelector(`meta[${attrName}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Standard Meta Tags
    updateMetaTag('description', description);
    if (keywords) updateMetaTag('keywords', keywords);
    updateMetaTag('robots', 'index, follow');

    // 4. Open Graph Tags (Facebook/LinkedIn/Discord)
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:type', ogType, 'property');
    updateMetaTag('og:url', window.location.href, 'property');
    if (ogImage) {
      updateMetaTag('og:image', ogImage, 'property');
    }

    // 5. Twitter Card Tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (ogImage) {
      updateMetaTag('twitter:image', ogImage);
    }

    // 6. Update Canonical Link
    // Ensure we always use the preferred www. domain and strip trailing slashes for consistency
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const finalCanonical = canonical || `https://www.startlytab.com${currentPath}`;
    
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', finalCanonical);
  }, [title, description, keywords, canonical, ogType, ogImage]);
};
