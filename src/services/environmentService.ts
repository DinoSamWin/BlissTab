
import { QuickLink, SearchEngine } from '../types';

export const CHINA_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Chongqing',
  'Asia/Harbin',
  'Asia/Urumqi',
  'Asia/Hong_Kong',
  'Asia/Macau',
  'Asia/Taipei'
];

/**
 * Detects if the user is in the China region based on Timezone and Cloudflare Worker GeoIP
 * Heuristic: Timezone is fast and offline-available. GeoIP is more accurate for VPN users.
 */
export async function isChinaRegion(): Promise<boolean> {
  // 1. Cloudflare GeoIP Check (Primary for testing VPNs)
  try {
    const res = await fetch('https://workers.cloudflare.com/cf.json', { cache: 'no-cache' }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.country) {
        return data.country === 'CN';
      }
    }
  } catch (e) {
    console.warn('[Environment] GeoIP check failed, falling back to timezone');
  }

  // 2. Timezone Check (Fallback)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (CHINA_TIMEZONES.includes(tz)) return true;

  return false;
}

export const REGIONAL_SEARCH_ENGINES: Record<'CN' | 'GLOBAL', SearchEngine[]> = {
  CN: [
    {
      id: 'browser',
      name: '浏览器默认设置',
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' /%3E%3C/svg%3E",
      searchUrl: ''
    },
    {
      id: 'baidu',
      name: 'Baidu',
      icon: 'https://www.baidu.com/favicon.ico',
      searchUrl: 'https://www.baidu.com/s?wd='
    },
    {
      id: 'google',
      name: 'Google',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=google.com',
      searchUrl: 'https://www.google.com/search?q='
    },
    {
      id: 'bing',
      name: 'Bing',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=bing.com',
      searchUrl: 'https://www.bing.com/search?q='
    },
    {
      id: 'so360',
      name: '360 Search',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=so.com',
      searchUrl: 'https://www.so.com/s?q='
    },
    {
      id: 'jd',
      name: 'JD',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=jd.com',
      searchUrl: 'https://search.jd.com/Search?keyword='
    },
    {
      id: 'taobao',
      name: 'Taobao Search',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=taobao.com',
      searchUrl: 'https://s.taobao.com/search?q='
    },
  ],
  GLOBAL: [
    {
      id: 'browser',
      name: 'Browser Default',
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' /%3E%3C/svg%3E",
      searchUrl: ''
    },
    {
      id: 'google',
      name: 'Google',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=google.com',
      searchUrl: 'https://www.google.com/search?q='
    },
    {
      id: 'bing',
      name: 'Bing',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=bing.com',
      searchUrl: 'https://www.bing.com/search?q='
    },
    {
      id: 'yahoo',
      name: 'Yahoo',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=yahoo.com',
      searchUrl: 'https://search.yahoo.com/search?p='
    },
    {
      id: 'amazon',
      name: 'Amazon',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=amazon.com',
      searchUrl: 'https://www.amazon.com/s?k='
    },
  ]
};

export const REGIONAL_DEFAULT_LINKS: Record<'CN' | 'GLOBAL', QuickLink[]> = {
  CN: [
    {
      id: 'zhihu',
      title: 'Zhihu',
      url: 'https://www.zhihu.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=zhihu.com',
      color: '#0084FF'
    },
    {
      id: 'taobao',
      title: 'Taobao',
      url: 'https://www.taobao.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=taobao.com',
      color: '#FF5000'
    },
    {
      id: 'bilibili',
      title: 'Bilibili',
      url: 'https://www.bilibili.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=bilibili.com',
      color: '#FB7299'
    },
    {
      id: 'weibo',
      title: 'Weibo',
      url: 'https://weibo.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=weibo.com',
      color: '#E6162D'
    },
    {
      id: 'jd',
      title: 'JD',
      url: 'https://www.jd.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=jd.com',
      color: '#E33333'
    },
    {
      id: 'chatgpt',
      title: 'ChatGPT',
      url: 'https://chat.openai.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=openai.com',
      color: '#10A37F'
    },
    {
      id: 'doubao',
      title: 'Doubao',
      url: 'https://www.doubao.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=doubao.com',
      color: '#4C6EF5'
    },
    {
      id: 'kimi',
      title: 'Kimi',
      url: 'https://kimi.moonshot.cn',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=moonshot.cn',
      color: '#000000'
    },
    {
      id: 'mita',
      title: 'Mita Search',
      url: 'https://metaso.cn',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=metaso.cn',
      color: '#3B82F6'
    }
  ],
  GLOBAL: [
    {
      id: 'gmail',
      title: 'Gmail',
      url: 'https://mail.google.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=mail.google.com',
      color: '#EA4335'
    },
    {
      id: 'outlook',
      title: 'Outlook',
      url: 'https://outlook.live.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=outlook.com',
      color: '#0078D4'
    },
    {
      id: 'gcal',
      title: 'Google Calendar',
      url: 'https://calendar.google.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=calendar.google.com',
      color: '#4285F4'
    },
    {
      id: 'ocal',
      title: 'Outlook Calendar',
      url: 'https://outlook.live.com/calendar',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=outlook.com',
      color: '#0078D4'
    },
    {
      id: 'gdocs',
      title: 'Google Docs',
      url: 'https://docs.google.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=docs.google.com',
      color: '#4285F4'
    },
    {
      id: 'gdrive',
      title: 'Google Drive',
      url: 'https://drive.google.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=drive.google.com',
      color: '#34A853'
    },
    {
      id: 'onedrive',
      title: 'OneDrive',
      url: 'https://onedrive.live.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=onedrive.com',
      color: '#0078D4'
    },
    {
      id: 'slack',
      title: 'Slack',
      url: 'https://slack.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=slack.com',
      color: '#4A154B'
    },
    {
      id: 'teams',
      title: 'Teams',
      url: 'https://teams.microsoft.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=teams.microsoft.com',
      color: '#6264A7'
    },
    {
      id: 'notion',
      title: 'Notion',
      url: 'https://www.notion.so',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=notion.so',
      color: '#000000'
    },
    {
      id: 'chatgpt',
      title: 'ChatGPT',
      url: 'https://chat.openai.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=openai.com',
      color: '#10A37F'
    },
    {
      id: 'canva',
      title: 'Canva',
      url: 'https://www.canva.com',
      icon: 'https://www.google.com/s2/favicons?sz=64&domain=canva.com',
      color: '#00C4CC'
    }
  ]
};
