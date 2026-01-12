
import { QuickLink, SnippetRequest } from './types';

export const APP_VERSION = '1.0.0';

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
    id: 'bing',
    name: 'Bing',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=bing.com',
    searchUrl: 'https://www.bing.com/search?q='
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=duckduckgo.com',
    searchUrl: 'https://duckduckgo.com/?q='
  },
  {
    id: 'brave',
    name: 'Brave Search',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=search.brave.com',
    searchUrl: 'https://search.brave.com/search?q='
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    icon: 'https://www.google.com/s2/favicons?sz=32&domain=ecosia.org',
    searchUrl: 'https://www.ecosia.org/search?q='
  }
];

export const DEFAULT_SEARCH_ENGINE = 'google';
