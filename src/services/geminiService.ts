import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveContentTrack, PerspectiveHistory, PerspectiveRouterContext, PerspectivePlan, PerspectivePoolItem, TrackType } from "../types";
import {
  PipelineState,
  STARTLY_PROMPT_VERSION,
  buildCompanionPrompt,
  getStateAwareFallback,
  resolveCompanionState,
  runCompanionPipeline,
  selectBestCandidate,
  validatePerspectiveCandidate
} from "./perspectiveEngine";
import { requestAiCompletion } from "./aiApiService";
import { isTooSimilar } from "./perspectiveService";

const BATCH_SIZE = 4;
const FIRST_PAINT_BUDGET_MS = 1500;
const REFILL_LEASE_MS = 45_000;
const MAX_POOL_ITEM_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_CONSECUTIVE_CACHE_SERVES = 3;
const refillsInFlight = new Map<string, Promise<{ text: string; plan: PerspectivePlan }>>();

function engagementTrackFor(contentTrack?: PerspectiveContentTrack): TrackType {
  switch (contentTrack) {
    case 'everyday_care':
    case 'leisure_outing':
    case 'home_ritual':
    case 'sensory_reset':
      return 'A_PHYSICAL';
    case 'grounded_observation':
    case 'poetic_glimpse':
    case 'unexpected_perspective':
      return 'B_TIME_ECHO';
    case 'friendly_nudge':
    case 'social_connection':
      return 'C_EMOTION';
    case 'curiosity_play':
    case 'small_delight':
    case 'object_humor':
      return 'D_THEME';
    default:
      return 'E_QUESTION';
  }
}

// --- Pool Management ---

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getPoolKey(ctx: PerspectiveRouterContext, stateFingerprint: string): string {
  const localDate = (ctx.local_date || new Date().toLocaleDateString('en-CA')).replace(/-/g, '');
  return `v5_pool_${localDate}_${compactHash(`${stateFingerprint}|${STARTLY_PROMPT_VERSION}`)}`;
}

function getPool(key: string): PerspectivePoolItem[] {
  try {
    const data = localStorage.getItem(key);
    const parsed = data ? JSON.parse(data) : [];
    const cutoff = Date.now() - MAX_POOL_ITEM_AGE_MS;
    return Array.isArray(parsed)
      ? parsed.filter(item => (
        item
        && typeof item === 'object'
        && typeof item.text === 'string'
        && typeof item.generated_at === 'number'
        && item.generated_at >= cutoff
      ))
      : [];
  } catch (e) {
    return [];
  }
}

function cacheServeCountKey(poolKey: string): string {
  return `${poolKey}_consecutive_cache_serves`;
}

function getConsecutiveCacheServes(poolKey: string): number {
  try {
    const value = Number(localStorage.getItem(cacheServeCountKey(poolKey)) || '0');
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function setConsecutiveCacheServes(poolKey: string, count: number): void {
  try {
    localStorage.setItem(cacheServeCountKey(poolKey), String(Math.max(0, count)));
  } catch {
    // Cache freshness still falls back to the finite pool size.
  }
}

function savePool(key: string, pool: PerspectivePoolItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(pool.slice(0, 24)));
  } catch (e) {
    console.warn('Failed to save perspective pool:', e);
  }
}

function acquireRefillLease(poolKey: string): string | undefined {
  const leaseKey = `${poolKey}_refill_lease`;
  const now = Date.now();
  const token = `${now}_${Math.random().toString(36).slice(2)}`;
  try {
    const existing = JSON.parse(localStorage.getItem(leaseKey) || 'null') as {
      token?: string;
      expiresAt?: number;
    } | null;
    if (existing?.expiresAt && existing.expiresAt > now) return undefined;

    localStorage.setItem(leaseKey, JSON.stringify({ token, expiresAt: now + REFILL_LEASE_MS }));
    const confirmed = JSON.parse(localStorage.getItem(leaseKey) || 'null') as { token?: string } | null;
    return confirmed?.token === token ? token : undefined;
  } catch {
    // Storage-restricted environments still get in-memory request coalescing.
    return token;
  }
}

function releaseRefillLease(poolKey: string, token: string): void {
  const leaseKey = `${poolKey}_refill_lease`;
  try {
    const current = JSON.parse(localStorage.getItem(leaseKey) || 'null') as { token?: string } | null;
    if (current?.token === token) localStorage.removeItem(leaseKey);
  } catch {
    // Nothing to release when storage is unavailable.
  }
}

function applyPipelineStateToPlan(plan: PerspectivePlan, state: PipelineState): void {
  plan.intent = state.intent;
  plan.style = state.noveltyPlan.targetTrack;
  plan.content_track = state.noveltyPlan.targetTrack;
  plan.state_fingerprint = state.stateFingerprint;
  plan.prompt_version = STARTLY_PROMPT_VERSION;
  plan.time_block = state.input.timeBlock;
}

function createPerspectivePlan(ctx: PerspectiveRouterContext, state: PipelineState): PerspectivePlan {
  const plan: PerspectivePlan = {
    intent: state.intent,
    style: state.noveltyPlan.targetTrack,
    topic_source: state.input.customThemes.length > 0 ? 'custom' : 'context',
    selected_theme: state.input.customThemes[0],
    language: ctx.language,
    max_length_chars: state.constraints.maxLengthChars,
    allow_one_comma: true
  };
  applyPipelineStateToPlan(plan, state);
  return plan;
}

function getStateAwareFallbackResult(
  ctx: PerspectiveRouterContext,
  plan: PerspectivePlan,
  state?: PipelineState
): { text: string; plan: PerspectivePlan } {
  const resolvedState = state || resolveCompanionState(ctx);
  applyPipelineStateToPlan(plan, resolvedState);
  const item = getStateAwareFallback(resolvedState, ctx.language, ctx.recent_history || []);

  if (item) {
    plan.cached_item = item;
    return { text: item.text, plan };
  }

  return { text: getRandomFallback(ctx.language, plan), plan };
}

/**
 * Final display-layer safety net shared by the web app and extension. Pool and
 * streamed candidates are validated earlier, but this also protects against a
 * stale in-flight response or an older cached batch returning after a reload.
 */
function guardAgainstRecentDuplicate(
  ctx: PerspectiveRouterContext,
  result: { text: string; plan: PerspectivePlan },
  state: PipelineState
): { text: string; plan: PerspectivePlan } {
  const history = ctx.recent_history || [];
  if (!isTooSimilar(result.text, history)) return result;

  console.warn('[GeminiService] Blocked a repeated perspective before display.');
  const fallback = getStateAwareFallbackResult(ctx, { ...result.plan }, state);
  // The fallback library uses least-recently-used selection if the full
  // 14-day freshness window is exhausted. Returning the already-known repeat
  // here would make the duplicate guard self-defeating.
  return fallback;
}

async function withFirstPaintBudget(
  generation: Promise<{ text: string; plan: PerspectivePlan }>,
  fallbackFactory: () => { text: string; plan: PerspectivePlan },
  onBudgetExceeded?: () => void
): Promise<{ text: string; plan: PerspectivePlan }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<{ text: string; plan: PerspectivePlan }>(resolve => {
    timeoutId = setTimeout(() => {
      onBudgetExceeded?.();
      resolve(fallbackFactory());
    }, FIRST_PAINT_BUDGET_MS);
  });
  try {
    return await Promise.race([generation, fallback]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// --- Main Generation Service ---

export function clearAllPerspectivePools() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('_pool_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    console.log(`[GeminiService] Force-cleared ${keysToRemove.length} perspective pools.`);
  } catch (e) {
    console.warn('Failed to clear perspective pools:', e);
  }
}

export async function generateSnippet(
  context: PerspectiveRouterContext,
  isManualRefresh: boolean = false,
  onChunk?: (text: string) => void,
  batchSize?: number
): Promise<{ text: string, plan: PerspectivePlan, namespace?: string }> {
  try {
    const finalBatchSize = Math.max(1, Math.min(8, batchSize || BATCH_SIZE));
    const normalizedContext: PerspectiveRouterContext = {
      ...context,
      isManualRefresh: context.isManualRefresh ?? isManualRefresh,
      trigger: context.trigger || (context.clickedEmotion
        ? 'emotion_click'
        : (context.isManualRefresh ?? isManualRefresh) ? 'manual_refresh' : 'initial_open')
    };

    const pipeline = runCompanionPipeline(normalizedContext, normalizedContext.language, finalBatchSize);
    const plan = createPerspectivePlan(normalizedContext, pipeline.state);

    const poolKey = getPoolKey(normalizedContext, pipeline.state.stateFingerprint);
    const pool = getPool(poolKey);

    const poolSelection = selectBestCandidate(pool, pipeline.state, normalizedContext.recent_history || []);
    const consecutiveCacheServes = getConsecutiveCacheServes(poolKey);
    const canServeFromCache = !normalizedContext.bypassPool
      && consecutiveCacheServes < MAX_CONSECUTIVE_CACHE_SERVES;
    if (poolSelection.selected && canServeFromCache) {
      plan.cached_item = poolSelection.selected;
      const remainingPool = poolSelection.accepted.filter(item => item !== poolSelection.selected);
      savePool(poolKey, remainingPool);
      setConsecutiveCacheServes(poolKey, consecutiveCacheServes + 1);

      // Do not speculatively refill after serving a cached item. A new model
      // request is made only after the user has actually consumed the pool.
      const guarded = guardAgainstRecentDuplicate(
        normalizedContext,
        { text: poolSelection.selected.text, plan },
        pipeline.state
      );
      return { ...guarded, namespace: pipeline.state.sceneResolution.scene };
    }

    if (poolSelection.selected && !normalizedContext.bypassPool) {
      // Force a fresh model turn after a bounded cache streak. Discarding the
      // small remainder prevents it from resurfacing after the refresh.
      savePool(poolKey, []);
      setConsecutiveCacheServes(poolKey, 0);
    }

    // Remove stale or invalid cached items before an on-demand refill.
    if (pool.length > 0) savePool(poolKey, poolSelection.accepted);
    const deliveryGate = { open: true };
    const generation = startPoolRefill(
      normalizedContext,
      plan,
      poolKey,
      onChunk,
      finalBatchSize,
      pipeline.state,
      false,
      deliveryGate
    );
    const generated = await withFirstPaintBudget(
      generation,
      () => getStateAwareFallbackResult(normalizedContext, { ...plan }, pipeline.state),
      () => { deliveryGate.open = false; }
    );
    const guarded = guardAgainstRecentDuplicate(normalizedContext, generated, pipeline.state);
    return { ...guarded, namespace: pipeline.state.sceneResolution.scene };

  } catch (error) {
    console.error("[GeminiService] Generation failed:", error);
    const state = resolveCompanionState(context);
    const plan = createPerspectivePlan(context, state);
    const fallback = getStateAwareFallbackResult(context, plan, state);
    const guarded = guardAgainstRecentDuplicate(context, fallback, state);
    return { ...guarded, namespace: state.sceneResolution.scene };
  }
}

function startPoolRefill(
  ctx: PerspectiveRouterContext,
  plan: PerspectivePlan,
  poolKey: string,
  onImmediateChunk?: (text: string) => void,
  batchSize: number = BATCH_SIZE,
  resolvedState?: PipelineState,
  backgroundOnly: boolean = false,
  deliveryGate: { open: boolean } = { open: true }
): Promise<{ text: string; plan: PerspectivePlan }> {
  const existing = refillsInFlight.get(poolKey);
  if (existing) return existing;

  const leaseToken = acquireRefillLease(poolKey);
  if (!leaseToken) {
    return Promise.resolve(getStateAwareFallbackResult(ctx, { ...plan }, resolvedState));
  }

  const refill = fetchAndRefillPool(
    ctx,
    plan,
    poolKey,
    onImmediateChunk,
    batchSize,
    resolvedState,
    backgroundOnly,
    deliveryGate
  ).finally(() => {
    if (refillsInFlight.get(poolKey) === refill) refillsInFlight.delete(poolKey);
    releaseRefillLease(poolKey, leaseToken);
  });
  refillsInFlight.set(poolKey, refill);
  return refill;
}

async function fetchAndRefillPool(
  ctx: PerspectiveRouterContext,
  plan: PerspectivePlan,
  poolKey: string,
  onImmediateChunk?: (text: string) => void,
  batchSize: number = BATCH_SIZE,
  resolvedState?: PipelineState,
  backgroundOnly: boolean = false,
  deliveryGate: { open: boolean } = { open: true }
): Promise<{ text: string, plan: PerspectivePlan }> {
  const pipeline = resolvedState
    ? { ...buildCompanionPrompt(resolvedState, plan.language, batchSize), state: resolvedState }
    : runCompanionPipeline(ctx, plan.language, batchSize);
  const { system: systemPrompt, user: userPrompt, state: pipelineState } = pipeline;

  plan.full_system_prompt = systemPrompt;
  plan.full_user_prompt = userPrompt;

  try {
    console.log('[GeminiService] Requesting completion through the StartlyTab AI proxy.');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('[GeminiService] Request Timed Out (40s)');
      controller.abort();
    }, 40000); // Increased to 40s for large batches and slow proxy / DeepSeek V3

    const response = await requestAiCompletion({
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.85,
      max_tokens: finalBatchTokenBudget(batchSize),
      stream: true,
      purpose: 'perspective',
    }, controller.signal);

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
    let firstItemFound = false;
    let servedItem: PerspectivePoolItem | undefined;
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
                        const parsedItem = JSON.parse(jsonStr) as PerspectivePoolItem;
                        if (parsedItem.text) {
                          // Normalize legacy track mapping when an older model
                          // contract includes it. The compact contract no
                          // longer asks the model to spend tokens on metadata
                          // the application can bind itself.
                          const trackMap: Record<string, TrackType> = {
                            'A': 'A_PHYSICAL',
                            'B': 'B_TIME_ECHO',
                            'C': 'C_EMOTION',
                            'D': 'D_THEME',
                            'E': 'E_QUESTION'
                          };
                          if (parsedItem.track && trackMap[parsedItem.track]) {
                            parsedItem.track = trackMap[parsedItem.track];
                          }

                          parsedItem.text = sanitizeOutput(parsedItem.text);
                          parsedItem.style = parsedItem.style || parsedItem.content_track || 'generated';
                          parsedItem.track = parsedItem.track || engagementTrackFor(parsedItem.content_track);
                          parsedItem.dimension = parsedItem.dimension || parsedItem.semantic_core || 'generated';
                          parsedItem.metaphor_tag = parsedItem.metaphor_tag || 'none';
                          parsedItem.opener_tag = parsedItem.opener_tag || 'none';
                          parsedItem.sentence_shape = parsedItem.sentence_shape || 'none';
                          // Cache identity is application-owned metadata, not a
                          // claim delegated to the language model.
                          parsedItem.state_fingerprint = pipelineState.stateFingerprint;
                          parsedItem.prompt_version = STARTLY_PROMPT_VERSION;
                          parsedItem.generated_at = Date.now();

                          const batchHistory: PerspectiveHistory[] = newItems.map(candidate => ({
                            text: candidate.text,
                            timestamp: candidate.generated_at || Date.now(),
                            promptId: 'same_batch',
                            contentTrack: candidate.content_track,
                            semanticCore: candidate.semantic_core,
                            actionTag: candidate.action_tag,
                            objectTag: candidate.object_tag,
                            metaphorTag: candidate.metaphor_tag,
                            openerTag: candidate.opener_tag,
                            sentenceShape: candidate.sentence_shape
                          }));
                          const validation = validatePerspectiveCandidate(
                            parsedItem,
                            pipelineState,
                            [...batchHistory, ...(ctx.recent_history || [])]
                          );

                          if (validation.valid) {
                            const item = validation.item;
                            newItems.push(item);

                            if (
                              !firstItemFound
                              && !backgroundOnly
                              && deliveryGate.open
                              && item.content_track === pipelineState.noveltyPlan.targetTrack
                            ) {
                              firstItemFound = true;
                              servedItem = item;
                              plan.cached_item = item;
                              if (onImmediateChunk) onImmediateChunk(item.text);
                              returnResolver({ text: item.text, plan });
                            }
                          } else {
                            console.debug('[PerspectiveValidator] Candidate rejected:', validation.reasons);
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
        clearTimeout(timeoutId);
        // End of stream
        if (newItems.length > 0) {
          console.log(`[StartlyTab] Refilled pool with ${newItems.length} items.`);
          const currentPool = getPool(poolKey);
          const itemsToCache = backgroundOnly
            ? newItems
            : newItems.filter(item => item !== servedItem);
          const uniqueItems = [...currentPool, ...itemsToCache].filter((item, index, all) => {
            const key = `${item.text}|${item.semantic_core || ''}`;
            return all.findIndex(other => `${other.text}|${other.semantic_core || ''}` === key) === index;
          });
          savePool(poolKey, uniqueItems);
          setConsecutiveCacheServes(poolKey, 0);
        }

        if (backgroundOnly && !firstItemFound) {
          firstItemFound = true;
          const backgroundResult = newItems[0]
            ? { text: newItems[0].text, plan }
            : getStateAwareFallbackResult(ctx, plan, pipelineState);
          returnResolver(backgroundResult);
        }

        if (!firstItemFound) {
          returnResolver(getStateAwareFallbackResult(ctx, plan, pipelineState));
        }
      }
    })();

    return returnPromise;

  } catch (e) {
    console.error("Batch Fetch Failed", e);
    return getStateAwareFallbackResult(ctx, plan, resolvedState);
  }
}

function finalBatchTokenBudget(batchSize: number): number {
  return Math.min(900, Math.max(320, Math.max(1, batchSize) * 130));
}

// Helper: Find balanced closing brace
function findClosingBrace(str: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < str.length; i++) {
    const char = str[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function sanitizeOutput(text: string): string {
  return text
    .replace(/^["'「](.*?)["'」]$/g, '$1')
    // STOPS stripping [h] tags - we need them for purple highlights!
    .replace(/#/g, '')
    .trim();
}

export function getRandomFallback(language: string, plan?: PerspectivePlan): string {
  // Non-Chinese emergency fallback. Chinese generation always uses the
  // state-aware library before reaching this compatibility path.
  const fallbacks = LOCALIZED_FALLBACKS[language] || LOCALIZED_FALLBACKS['English'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// --- Private Space Chat (Venting Mode) ---

export async function streamPrivateChat(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  onChunk: (text: string) => void
): Promise<string> {
  const controller = new AbortController();

  const response = await requestAiCompletion({
    messages,
    temperature: 0.8,
    stream: true,
    purpose: 'private_chat',
  }, controller.signal);

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[PrivateChat] API Error ${response.status}:`, errText);
    throw new Error(`API Error: ${response.status}`);
  }
  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let sseBuffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      sseBuffer += chunk;

      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.substring(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk(fullContent);
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}
