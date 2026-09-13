const allowedOrigins = new Set([
  'https://startlytab.com',
  'https://www.startlytab.com',
  'chrome-extension://pfjfdnaopfaampmgaalfafhodcafbelm',
]);

const rateWindows = new Map<string, { startedAt: number; count: number }>();
const RATE_WINDOW_MS = 60_000;
const MAX_BODY_BYTES = 48_000;
const MAX_MESSAGES = 12;
const DEFAULT_MAX_TOKENS = 512;
const MIN_MAX_TOKENS = 16;
const MAX_MAX_TOKENS = 700;

type RequestPurpose = 'perspective' | 'deep_care' | 'private_chat';

const PURPOSE_LIMITS: Record<RequestPurpose, { perMinute: number; maxInputChars: number; maxOutputTokens: number }> = {
  perspective: { perMinute: 4, maxInputChars: 10_000, maxOutputTokens: 600 },
  deep_care: { perMinute: 1, maxInputChars: 8_000, maxOutputTokens: 700 },
  private_chat: { perMinute: 10, maxInputChars: 24_000, maxOutputTokens: 700 },
};

function hasExpectedPromptContract(
  purpose: RequestPurpose,
  messages: Array<{ role: string; content: string }>
): boolean {
  if (purpose === 'perspective') {
    return messages.length === 2
      && messages[0].role === 'system'
      && messages[0].content.startsWith('You are StartlyTab')
      && messages[1].role === 'user'
      && messages[1].content.includes('"prompt_version":"context-loop-v1.2.0"');
  }
  if (purpose === 'deep_care') {
    return messages.length === 1
      && messages[0].role === 'system'
      && messages[0].content.includes('Deep Care Whisper');
  }
  const hasPrivateSpaceSystemPrompt = messages[0]?.role === 'system'
    && /(私密树洞|Private Venting Space)/u.test(messages[0].content);
  return hasPrivateSpaceSystemPrompt
    && messages.length >= 1
    && messages.length <= MAX_MESSAGES
    && (messages.length === 1 || messages[messages.length - 1].role === 'user');
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://www.startlytab.com';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function isRateLimited(req: Request, purpose: RequestPurpose): boolean {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientKey = req.headers.get('cf-connecting-ip') || forwardedFor || 'unknown';
  const key = `${clientKey}:${purpose}`;
  const now = Date.now();
  const current = rateWindows.get(key);

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > PURPOSE_LIMITS[purpose].perMinute;
}

function logProviderUsage(purpose: RequestPurpose, payload: unknown): void {
  if (!payload || typeof payload !== 'object') return;
  const usage = (payload as { usage?: Record<string, unknown> }).usage;
  if (!usage) return;
  console.log(JSON.stringify({
    event: 'ai_usage',
    purpose,
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    total_tokens: usage.total_tokens,
    prompt_cache_hit_tokens: usage.prompt_cache_hit_tokens,
    prompt_cache_miss_tokens: usage.prompt_cache_miss_tokens,
  }));
}

function instrumentUsageStream(
  body: ReadableStream<Uint8Array>,
  purpose: RequestPurpose
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  let buffer = '';

  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk);
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:') || trimmed === 'data: [DONE]') continue;
        try {
          logProviderUsage(purpose, JSON.parse(trimmed.slice(5).trim()));
        } catch {
          // Ignore partial or provider-specific SSE events.
        }
      }
    },
    flush() {
      const trimmed = buffer.trim();
      if (!trimmed.startsWith('data:') || trimmed === 'data: [DONE]') return;
      try {
        logProviderUsage(purpose, JSON.parse(trimmed.slice(5).trim()));
      } catch {
        // The response has already been forwarded unchanged.
      }
    },
  }));
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, headers);
  }

  if (!origin || !allowedOrigins.has(origin)) {
    return jsonResponse({ error: 'Origin not allowed.' }, 403, headers);
  }

  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Request body is too large.' }, 413, headers);
  }

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Request body is too large.' }, 413, headers);
    }

    const body = JSON.parse(rawBody || '{}');
    if (!['perspective', 'deep_care', 'private_chat'].includes(body.purpose)) {
      return jsonResponse({ error: 'A valid request purpose is required.' }, 400, headers);
    }
    const purpose = body.purpose as RequestPurpose;
    const purposeLimit = PURPOSE_LIMITS[purpose];

    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
      return jsonResponse({ error: 'Invalid messages.' }, 400, headers);
    }

    const messages = body.messages.map((message: unknown) => {
      if (!message || typeof message !== 'object') throw new Error('Invalid message.');
      const candidate = message as { role?: unknown; content?: unknown };
      const role = String(candidate.role);
      if (!['system', 'user', 'assistant'].includes(role)) {
        throw new Error('Invalid message role.');
      }
      if (typeof candidate.content !== 'string') throw new Error('Invalid message content.');
      return { role, content: candidate.content };
    });

    if (!hasExpectedPromptContract(purpose, messages)) {
      return jsonResponse({ error: 'Prompt contract does not match request purpose.' }, 400, headers);
    }

    if (isRateLimited(req, purpose)) {
      return jsonResponse({ error: 'Too many requests.' }, 429, headers);
    }

    const totalContent = messages.reduce((sum: number, message: { content: string }) => (
      sum + message.content.length
    ), 0);
    if (totalContent > purposeLimit.maxInputChars) {
      return jsonResponse({ error: 'Message content is too large.' }, 413, headers);
    }

    const requestedMaxTokens = Number(body.max_tokens ?? DEFAULT_MAX_TOKENS);
    const maxTokens = Number.isFinite(requestedMaxTokens)
      ? Math.min(MAX_MAX_TOKENS, purposeLimit.maxOutputTokens, Math.max(MIN_MAX_TOKENS, Math.floor(requestedMaxTokens)))
      : DEFAULT_MAX_TOKENS;

    const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') || '';
    const siliconKey = Deno.env.get('SILICONFLOW_API_KEY') || '';
    const zhipuKey = Deno.env.get('ZHIPUAI_API_KEY') || '';

    let apiKey = deepseekKey;
    let apiBase = Deno.env.get('DEEPSEEK_API_BASE') || 'https://api.deepseek.com';
    let model = Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-chat';
    let provider: 'deepseek' | 'siliconflow' | 'zhipu' = 'deepseek';

    if (!apiKey && siliconKey) {
      provider = 'siliconflow';
      apiKey = siliconKey;
      apiBase = Deno.env.get('SILICONFLOW_API_BASE') || 'https://api.siliconflow.cn/v1';
      model = Deno.env.get('SILICONFLOW_MODEL') || 'deepseek-ai/DeepSeek-V3';
    } else if (!apiKey && zhipuKey) {
      provider = 'zhipu';
      apiKey = zhipuKey;
      apiBase = Deno.env.get('ZHIPUAI_API_BASE') || 'https://open.bigmodel.cn/api/paas/v4';
      model = Deno.env.get('ZHIPUAI_MODEL') || 'glm-4-flash';
    }

    if (!apiKey) {
      return jsonResponse({ error: 'AI provider is not configured.' }, 503, headers);
    }

    console.log(JSON.stringify({
      event: 'ai_request',
      purpose,
      input_chars: totalContent,
      max_output_tokens: maxTokens,
      streaming: body.stream === true,
      model,
    }));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    let upstream: Response;

    try {
      upstream = await fetch(`${apiBase.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: Math.min(1.5, Math.max(0, Number(body.temperature ?? 0.8))),
          max_tokens: maxTokens,
          stream: body.stream === true,
          ...(body.stream === true && provider === 'deepseek'
            ? { stream_options: { include_usage: true } }
            : {}),
          ...(body.response_format?.type === 'json_object'
            ? { response_format: { type: 'json_object' } }
            : {}),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    let responseBody = upstream.body;
    if (body.stream === true && upstream.body) {
      responseBody = instrumentUsageStream(upstream.body, purpose);
    } else {
      try {
        logProviderUsage(purpose, await upstream.clone().json());
      } catch {
        // Upstream error bodies are returned to the caller unchanged.
      }
    }

    return new Response(responseBody, {
      status: upstream.status,
      headers: {
        ...headers,
        'Content-Type': upstream.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ai-proxy]', message);
    return jsonResponse({ error: 'AI request failed.' }, 500, headers);
  }
});
