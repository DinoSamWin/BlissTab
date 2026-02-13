import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveHistory, PerspectiveRouterContext, PerspectivePlan, PerspectivePoolItem } from "../types";
import { isTooSimilar } from "./perspectiveService";
import { routePerspective } from "./perspectiveRouter";
import { getSkeleton, getCustomThemeSkeleton } from "./perspectiveSkeletons";

const MAX_RETRIES = 3;
const BATCH_SIZE = 50;
const REFILL_THRESHOLD = 5;

// --- Pool Management ---

function getPoolKey(plan: PerspectivePlan, ctx: PerspectiveRouterContext): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  // If we have custom themes, the pool is specific to those themes
  const themeHash = (ctx.custom_themes || []).sort().join('_') || 'default';
  // Key depends on Intent (Time Slot) + Themes + Date
  return `v3_pool_${dateStr}_${plan.intent}_${themeHash}`;
}

function getPool(key: string): PerspectivePoolItem[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function savePool(key: string, pool: PerspectivePoolItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(pool));
  } catch (e) {
    console.warn('Failed to save perspective pool:', e);
  }
}

// --- Main Generation Service ---

export async function generateSnippet(
  context: PerspectiveRouterContext,
  retryCount: number = 0,
  onChunk?: (text: string) => void
): Promise<{ text: string, plan: PerspectivePlan }> {
  try {
    // 1. Initial Routing (to determine intent/key)
    let plan = routePerspective(context);
    const poolKey = getPoolKey(plan, context);
    const pool = getPool(poolKey);

    // 2. Second Routing (Attempt to use Pool)
    // routePerspective will splice the pool if it finds a match
    const refinedPlan = routePerspective(context, pool);

    if (refinedPlan.cached_item) {
      console.log('[StartlyTab] Zero-Latency Hit! Using cached perspective.', refinedPlan.cached_item);

      // Save the updated pool (item removed)
      savePool(poolKey, pool);

      // Check if refill needed
      if (pool.length < REFILL_THRESHOLD) {
        console.log('[StartlyTab] Pool low, triggering silent refill...');
        // Background refill - do not await
        fetchAndRefillPool(context, refinedPlan, poolKey).catch(console.error);
      }

      return { text: refinedPlan.cached_item.text, plan: refinedPlan };
    }

    // 3. Cold Start / Empty Pool - Fetch Batch
    console.log('[StartlyTab] Pool empty/miss. Fetching fresh batch...');
    // Use refinedPlan derived key, though poolKey usually matches
    const result = await fetchAndRefillPool(context, refinedPlan, getPoolKey(refinedPlan, context), onChunk);
    return result;

  } catch (error) {
    console.error("[GeminiService] Generation failed:", error);
    return { text: getRandomFallback(context.language), plan: routePerspective(context) };
  }
}

async function fetchAndRefillPool(
  ctx: PerspectiveRouterContext,
  plan: PerspectivePlan,
  poolKey: string,
  onImmediateChunk?: (text: string) => void
): Promise<{ text: string, plan: PerspectivePlan }> {

  // API Configuration - Prioritize DeepSeek API
  const deepseekKey = (process.env as any)?.DEEPSEEK_API_KEY || (import.meta.env as any)?.VITE_DEEPSEEK_API_KEY;
  const siliconKey = (process.env as any)?.SILICONFLOW_API_KEY || (import.meta.env as any)?.VITE_SILICONFLOW_API_KEY;
  const zhipuKey = (process.env as any)?.ZHIPUAI_API_KEY || (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY;

  // Use DeepSeek directly if key exists, otherwise try SiliconFlow (which delegates to DeepSeek V3), then ZhipuAI
  const apiKey = deepseekKey || siliconKey || zhipuKey;

  // @ts-ignore
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;

  let apiBase = (process.env as any)?.DEEPSEEK_API_BASE || (import.meta.env as any)?.VITE_DEEPSEEK_API_BASE || 'https://api.deepseek.com';
  let model = (process.env as any)?.DEEPSEEK_MODEL || (import.meta.env as any)?.VITE_DEEPSEEK_MODEL || 'deepseek-chat';

  // Override for SiliconFlow (Serving DeepSeek V3)
  if (siliconKey && !deepseekKey) {
    apiBase = (process.env as any)?.SILICONFLOW_API_BASE || (import.meta.env as any)?.VITE_SILICONFLOW_API_BASE || 'https://api.siliconflow.cn/v1';
    const envModel = (process.env as any)?.SILICONFLOW_MODEL || (import.meta.env as any)?.VITE_SILICONFLOW_MODEL;
    // Force DeepSeek-V3 for latency
    if (envModel && (envModel.includes('R1') || envModel.includes('Reasoning'))) {
      model = 'deepseek-ai/DeepSeek-V3';
    } else {
      model = envModel || 'deepseek-ai/DeepSeek-V3';
    }
  }
  // Fallback to ZhipuAI
  else if (zhipuKey && !deepseekKey && !siliconKey) {
    apiBase = (process.env as any)?.ZHIPUAI_API_BASE || (import.meta.env as any)?.VITE_ZHIPUAI_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
    model = (process.env as any)?.ZHIPUAI_MODEL || (import.meta.env as any)?.VITE_ZHIPUAI_MODEL || 'glm-4-flash';
  }

  // In web development (localhost), use proxy to avoid CORS
  // @ts-ignore
  if (!isExtension && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    if (siliconKey && !deepseekKey) {
      apiBase = '/api/siliconflow';
    } else {
      apiBase = '/api/deepseek';
    }
  }

  if (!apiKey) {
    console.error("StartlyTab: No active API key found.");
    return { text: getRandomFallback(ctx.language), plan };
  }

  const systemPrompt = buildSystemPrompt(plan);
  const userPrompt = buildUserPrompt(ctx, plan);

  try {
    console.log('[GeminiService] URL:', `${apiBase}/chat/completions`);
    console.log('[GeminiService] API Key:', apiKey.substring(0, 10) + '...');
    console.log('[GeminiService] Model:', model);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('[GeminiService] Request Timed Out (30s)');
      controller.abort();
    }, 30000); // Increased to 30s to be safe, but V3 should be <2s

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 1.1, // High temp for batch diversity
        stream: true
      }),
      signal: controller.signal
    });

    // Do NOT clear timeout here yet - wait until stream finishes or first item found
    // clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[GeminiService] API Error ${response.status}:`, errText);
      throw new Error(`API Error: ${response.status}`);
    }
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let firstItemFound = false;
    let returnResolver: (value: { text: string, plan: PerspectivePlan }) => void;
    const returnPromise = new Promise<{ text: string, plan: PerspectivePlan }>((resolve) => {
      returnResolver = resolve;
    });

    // Loop to process stream
    (async () => {
      const newItems: PerspectivePoolItem[] = [];
      let sseBuffer = '';
      let contentAccumulator = ''; // Reconstructed JSON string from LLM

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          sseBuffer += chunk;

          // Process SSE lines
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || ''; // Keep incomplete line

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '' || trimmed === 'data: [DONE]') continue;

            if (trimmed.startsWith('data: ')) {
              try {
                const json = JSON.parse(trimmed.substring(6));
                const delta = json.choices?.[0]?.delta?.content;

                if (delta) {
                  contentAccumulator += delta;

                  // Incremental JSON Parser Logic on Content
                  let startIndex = contentAccumulator.indexOf('{');
                  while (startIndex !== -1) {
                    const endIndex = findClosingBrace(contentAccumulator, startIndex);
                    if (endIndex !== -1) {
                      const jsonStr = contentAccumulator.substring(startIndex, endIndex + 1);
                      try {
                        const item = JSON.parse(jsonStr) as PerspectivePoolItem;
                        if (item.text && item.style) { // Validate it's our item
                          newItems.push(item);

                          // If this is the FIRST item and we have a waiter (onImmediateChunk), serve it!
                          if (!firstItemFound && onImmediateChunk) {
                            firstItemFound = true;
                            onImmediateChunk(sanitizeOutput(item.text));
                            returnResolver({ text: sanitizeOutput(item.text), plan });
                          } else if (!firstItemFound && !onImmediateChunk) {
                            // If no streamer, resolve promise immediately
                            firstItemFound = true;
                            returnResolver({ text: sanitizeOutput(item.text), plan });
                          }
                        }
                        // Remove processed part from accumulator
                        contentAccumulator = contentAccumulator.substring(endIndex + 1);
                        startIndex = contentAccumulator.indexOf('{'); // Look for next
                      } catch (e) {
                        // Content parse failed (e.g. valid brace but invalid JSON inside?)
                        // Skip this opening brace
                        startIndex = contentAccumulator.indexOf('{', startIndex + 1);
                      }
                    } else {
                      // No closing brace yet
                      break;
                    }
                  }
                }
              } catch (e) {
                // SSE parse error (ignore)
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Stream] Parse error:', e);
      } finally {
        // End of stream
        if (newItems.length > 0) {
          console.log(`[StartlyTab] Refilled pool with ${newItems.length} items.`);
          // Save to pool (merge with existing)
          const currentPool = getPool(poolKey);
          // Append NEW generic items to pool
          savePool(poolKey, [...currentPool, ...newItems]);
        }

        // If we finished and never resolved (e.g. empty response), resolve with fallback
        if (!firstItemFound) {
          // @ts-ignore
          if (returnResolver) returnResolver({ text: getRandomFallback(ctx.language), plan });
        }
      }
    })();

    return returnPromise;

  } catch (e) {
    console.error("Batch Fetch Failed", e);
    return { text: getRandomFallback(ctx.language), plan };
  }
}

// Helper: Find balanced closing brace
function findClosingBrace(str: string, start: number): number {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    if (str[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// --- Prompt Engineering V3.5 ---

function buildSystemPrompt(plan: PerspectivePlan): string {
  return `Role: User's "Inner Voice" & "Environmental Observer".
Task: Generate a JSON Array of ${BATCH_SIZE} unique lines.

Current Context:
- Intent: ${plan.intent}
- Themes: ${plan.selected_theme || 'General'}
- Language: ${plan.language}

Strict Style Guidelines (Dual-Track):
1. MACRO_ACTION, REFRAME, PERMISSION, GENTLE_QUESTION (Track A - Interactive)
   - Guide the user gently. NO Advice ("Try to...", "You should...").
   - Use "Permission" tone ("It's okay to...").

2. MICRO_STORY, SENSORY, WITTY (Track B - Observational)
   - Subject must be ENVIRONMENT (Light, Sound, Objects, Atmosphere).
   - Describe texture, temperature, or silence. NO "You".

Output Format (Strict JSON Array):
[
  {"text": "Line 1...", "style": "micro_action", "track": "A"},
  {"text": "Line 2...", "style": "sensory", "track": "B"}
]

Constraints:
- NO Slogans ("Believe in yourself").
- NO Generic Positivity.
- NO Emojis.
- Keep lines under ${plan.max_length_chars} chars.`;
}

function buildUserPrompt(ctx: PerspectiveRouterContext, plan: PerspectivePlan): string {
  const weather = ctx.weather || 'Unknown';
  const battery = ctx.battery_level ? `${ctx.battery_level}%` : 'Unknown';

  return `Generate ${BATCH_SIZE} lines.
Context Anchors:
- Time: ${ctx.local_time} (${plan.intent})
- Weather: ${weather} (If Rain/Cloudy -> cozy/melancholic)
- Battery: ${battery} (If low -> anxiety/energy; If high -> potential)
- Sessions: ${ctx.session_count_today}

Distribution:
- 40% Track A (Validation/Action)
- 40% Track B (Sensory/Atmosphere)
- 20% Witty/Random

Ensure high variety in sentence structure.`;
}

function sanitizeOutput(text: string): string {
  return text
    .replace(/^["'「](.*?)["'」]$/g, '$1')
    .replace(/\[h\](.*?)\[\/h\]/g, '$1')
    .replace(/#/g, '')
    .trim();
}

function getRandomFallback(language: string): string {
  const fallbacks = LOCALIZED_FALLBACKS[language] || LOCALIZED_FALLBACKS['English'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}