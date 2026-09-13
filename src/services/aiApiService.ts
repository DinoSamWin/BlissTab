type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AiCompletionPayload = {
  messages: AiMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' };
  purpose?: 'perspective' | 'deep_care' | 'private_chat';
};

export async function requestAiCompletion(
  payload: AiCompletionPayload,
  signal?: AbortSignal
): Promise<Response> {
  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!functionsUrl) {
    throw new Error('AI proxy is not configured.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (anonKey) {
    headers.apikey = anonKey;
    headers.Authorization = `Bearer ${anonKey}`;
  }

  return fetch(`${functionsUrl.replace(/\/$/, '')}/ai-proxy`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });
}
