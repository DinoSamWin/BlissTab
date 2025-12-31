
export interface QuickLink {
  id: string;
  url: string;
  title: string;
  icon: string | null;
  color: string;
}

export interface SnippetRequest {
  id: string;
  prompt: string;
  active: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export type Theme = 'light' | 'dark';

export interface AppState {
  version: string;
  links: QuickLink[];
  requests: SnippetRequest[];
  pinnedSnippetId: string | null;
  language: string;
  user: User | null;
  theme: Theme;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
