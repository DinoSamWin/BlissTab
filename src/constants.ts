
import { QuickLink, SnippetRequest } from './types';

export const APP_VERSION = '1.0.0';

export const BRAND_CONFIG = {
  name: 'StartlyTab',
  slogan: 'Start your day softly'
};

export const SUPPORTED_LANGUAGES = [
  { code: 'English', name: 'English' },
  { code: 'German', name: 'Deutsch' },
  { code: 'French', name: 'Français' },
  { code: 'Spanish', name: 'Español' },
  { code: 'Italian', name: 'Italiano' },
  { code: 'Portuguese', name: 'Português' },
  { code: 'Japanese', name: '日本語' },
  { code: 'Chinese (Simplified)', name: '简体中文' }
];

export const DEFAULT_LINKS: QuickLink[] = [
  {
    id: '1',
    url: 'https://github.com',
    title: 'GitHub',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=github.com',
    color: '#333'
  },
  {
    id: '2',
    url: 'https://notion.so',
    title: 'Notion',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=notion.so',
    color: '#000'
  },
  {
    id: '3',
    url: 'https://calendar.google.com',
    title: 'Calendar',
    icon: 'https://www.google.com/s2/favicons?sz=64&domain=calendar.google.com',
    color: '#4285F4'
  }
];

export const DEFAULT_REQUESTS: SnippetRequest[] = [
  { id: 'r1', prompt: 'A short productivity tip for office workers', active: true },
  { id: 'r2', prompt: 'A calm, philosophical morning reflection', active: true },
  { id: 'r3', prompt: 'A funny one-line joke about software engineering', active: true },
  { id: 'r4', prompt: 'A beautiful, short quote about creativity', active: true }
];

export const LOCALIZED_FALLBACKS: Record<string, string[]> = {
  'English': [
    "Simplicity is the ultimate sophistication.",
    "Your direction is more important than your speed.",
    "Small progress is still progress.",
    "Be where your feet are.",
    "Nature does not hurry, yet everything is accomplished.",
    "A quiet mind is a productive mind.",
    "Rest is not idleness, but a necessary pause."
  ],
  'Chinese (Simplified)': [
    "简约是最高级的复杂。",
    "方向比速度更重要。",
    "微小的进步也是进步。",
    "活在当下。",
    "大自然从不匆忙，但万物皆有成。",
    "宁静的心灵是高效的。",
    "休息不是无所事事，而是必要的停顿。"
  ],
  'German': [
    "Einfachheit ist die höchste Stufe der Vollendung.",
    "Deine Richtung ist wichtiger als dein Tempo.",
    "Kleiner Fortschritt ist immer noch Fortschritt.",
    "Sei dort, wo deine Füße sind.",
    "Die Natur beeilt sich nicht, und doch wird alles erreicht.",
    "Ein ruhiger Geist ist ein produktiver Geist.",
    "Pause ist kein Müßiggang, sondern eine notwendige Unterbrechung."
  ],
  'French': [
    "La simplicité est la sophistication suprême.",
    "Votre direction est plus importante que votre vitesse.",
    "Un petit progrès est toujours un progrès.",
    "Soyez là où sont vos pieds.",
    "La nature ne se presse pas, et pourtant tout est accompli.",
    "Un esprit calme est un esprit productif.",
    "Le repos n'est pas de l'oisiveté, mais une pause nécessaire."
  ],
  'Spanish': [
    "La simplicidad es la máxima sofisticación.",
    "Tu dirección es más importante que tu velocidad.",
    "Un pequeño progreso sigue siendo progreso.",
    "Estate donde están tus pies.",
    "La naturaleza no se apresura, pero todo se logra.",
    "Una mente tranquila es una mente productiva.",
    "El descanso no es ociosidad, sino una pausa necesaria."
  ],
  'Italian': [
    "La semplicità è l'ultima sofisticazione.",
    "La tua direzione è più importante della tua velocità.",
    "Il piccolo progresso è pur sempre un progresso.",
    "Sii dove sono i tuoi piedi.",
    "La natura non ha fretta, eppure tutto è compiuto.",
    "Una mente calma è una mente produttiva.",
    "Il riposo non è ozio, ma una pausa necessaria."
  ],
  'Portuguese': [
    "A simplicidade é o último grau da sofisticação.",
    "Sua direção é mais importante que sua velocidade.",
    "Pequeno progresso ainda é progresso.",
    "Esteja onde seus pés estão.",
    "A natureza não tem pressa, mas tudo se realiza.",
    "Uma mente calma é uma mente produtiva.",
    "O descanso não é ociosidade, mas uma pausa necessária."
  ],
  'Japanese': [
    "シンプルさは究極の洗練である。",
    "方向性はスピードよりも重要である。",
    "小さな進歩も進歩である。",
    "今、ここを生きる。",
    "自然は急がないが、すべてを成し遂げる。",
    "静かな心は生産的な心である。",
    "休息は怠惰ではなく、必要な中断である。"
  ]
};

export const COLORS = [
  '#E5E7EB', '#FEE2E2', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#E0E7FF', '#F3E8FF', '#FCE7F3'
];

export interface SearchEngine {
  id: string;
  name: string;
  icon: string;
  searchUrl: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=google.com',
    searchUrl: 'https://www.google.com/search?q='
  },
  {
    id: 'baidu',
    name: 'Baidu',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=baidu.com',
    searchUrl: 'https://www.baidu.com/s?wd='
  },
  {
    id: 'bing',
    name: 'Bing',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=bing.com',
    searchUrl: 'https://www.bing.com/search?q='
  },
  {
    id: '360',
    name: '360 Search',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=so.com',
    searchUrl: 'https://www.so.com/s?q='
  },
  {
    id: 'jd',
    name: 'JD',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=jd.com',
    searchUrl: 'https://search.jd.com/Search?keyword='
  },
  {
    id: 'taobao',
    name: 'Taobao',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=taobao.com',
    searchUrl: 'https://s.taobao.com/search?q='
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=duckduckgo.com',
    searchUrl: 'https://duckduckgo.com/?q='
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=yahoo.com',
    searchUrl: 'https://search.yahoo.com/search?p='
  },
  {
    id: 'amazon',
    name: 'Amazon',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=amazon.com',
    searchUrl: 'https://www.amazon.com/s?k='
  }
];

export const DEFAULT_SEARCH_ENGINE = 'google';

export const REGIONAL_DEFAULT_GATEWAYS: Record<'China' | 'Overseas', QuickLink[]> = {
  China: [
    { id: 'zh1', title: 'Zhihu', url: 'https://www.zhihu.com', icon: 'https://www.google.com/s2/favicons?domain=zhihu.com&sz=64', color: '#0084FF' },
    { id: 'tb1', title: 'Taobao', url: 'https://www.taobao.com', icon: 'https://www.google.com/s2/favicons?domain=taobao.com&sz=64', color: '#FF5000' },
    { id: 'bb1', title: 'Bilibili', url: 'https://www.bilibili.com', icon: 'https://www.google.com/s2/favicons?domain=bilibili.com&sz=64', color: '#00A1D6' },
    { id: 'wb1', title: 'Weibo', url: 'https://weibo.com', icon: 'https://www.google.com/s2/favicons?domain=weibo.com&sz=64', color: '#E6162D' },
    { id: 'jd1', title: 'JD', url: 'https://www.jd.com', icon: 'https://www.google.com/s2/favicons?domain=jd.com&sz=64', color: '#E1251B' },
    { id: 'gpt1', title: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://www.google.com/s2/favicons?domain=chat.openai.com&sz=64', color: '#10A37F' },
    { id: 'db1', title: 'Doubao', url: 'https://www.doubao.com', icon: 'https://www.google.com/s2/favicons?domain=doubao.com&sz=64', color: '#4E6EF2' },
    { id: 'km1', title: 'Kimi', url: 'https://kimi.moonshot.cn', icon: 'https://www.google.com/s2/favicons?domain=moonshot.cn&sz=64', color: '#FF6B00' },
    { id: 'mt1', title: 'Mita Search', url: 'https://metaso.cn', icon: 'https://www.google.com/s2/favicons?domain=metaso.cn&sz=64', color: '#000000' }
  ],
  Overseas: [
    { id: 'gm1', title: 'Gmail', url: 'https://mail.google.com', icon: 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64', color: '#EA4335' },
    { id: 'ol1', title: 'Outlook', url: 'https://outlook.live.com', icon: 'https://www.google.com/s2/favicons?domain=outlook.com&sz=64', color: '#0078D4' },
    { id: 'gc1', title: 'Google Calendar', url: 'https://calendar.google.com', icon: 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64', color: '#4285F4' },
    { id: 'oc1', title: 'Outlook Calendar', url: 'https://outlook.live.com/calendar', icon: 'https://www.google.com/s2/favicons?domain=outlook.com&sz=64', color: '#0078D4' },
    { id: 'gd1', title: 'Google Docs', url: 'https://docs.google.com', icon: 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64', color: '#4285F4' },
    { id: 'gdv1', title: 'Google Drive', url: 'https://drive.google.com', icon: 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64', color: '#34A853' },
    { id: 'od1', title: 'OneDrive', url: 'https://onedrive.live.com', icon: 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=64', color: '#0078D4' },
    { id: 'sl1', title: 'Slack', url: 'https://slack.com', icon: 'https://www.google.com/s2/favicons?domain=slack.com&sz=64', color: '#4A154B' },
    { id: 'mtm1', title: 'Teams', url: 'https://teams.microsoft.com', icon: 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=64', color: '#6264A7' },
    { id: 'nt1', title: 'Notion', url: 'https://www.notion.so', icon: 'https://www.google.com/s2/favicons?domain=notion.so&sz=64', color: '#000000' },
    { id: 'gpt2', title: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://www.google.com/s2/favicons?domain=chat.openai.com&sz=64', color: '#10A37F' },
    { id: 'cv1', title: 'Canva', url: 'https://www.canva.com', icon: 'https://www.google.com/s2/favicons?domain=canva.com&sz=64', color: '#00C4CC' }
  ]
};

export const FEATUREBASE_URL = 'https://startlytab.featurebase.app'; // Replace with your actual Featurebase URL
