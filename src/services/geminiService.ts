import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveHistory, PerspectiveRouterContext, PerspectivePlan, PerspectivePoolItem, EmotionType } from "../types";
import { isTooSimilar } from "./perspectiveService";
import { routePerspective } from "./perspectiveRouter";
import { getSkeleton, getCustomThemeSkeleton } from "./perspectiveSkeletons";
import { loadPerspectiveRules, loadPerspectiveRulesData } from "./perspectiveRulesLoader";

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

    if (refinedPlan.cached_item && !context.bypassPool) {
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
  // Use direct process.env literals for Vite static replacement
  const deepseekKey = (import.meta.env as any)?.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  const siliconKey = (import.meta.env as any)?.VITE_SILICONFLOW_API_KEY || process.env.SILICONFLOW_API_KEY;
  const zhipuKey = (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY || process.env.ZHIPUAI_API_KEY;

  // Use DeepSeek directly if key exists, otherwise try SiliconFlow (which delegates to DeepSeek V3), then ZhipuAI
  const apiKey = deepseekKey || siliconKey || zhipuKey;

  // @ts-ignore
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;

  let apiBase = process.env.DEEPSEEK_API_BASE || (import.meta.env as any)?.VITE_DEEPSEEK_API_BASE || 'https://api.deepseek.com';
  let model = process.env.DEEPSEEK_MODEL || (import.meta.env as any)?.VITE_DEEPSEEK_MODEL || 'deepseek-chat';

  // Override for SiliconFlow (Serving DeepSeek V3)
  if (siliconKey && !deepseekKey) {
    apiBase = process.env.SILICONFLOW_API_BASE || (import.meta.env as any)?.VITE_SILICONFLOW_API_BASE || 'https://api.siliconflow.cn/v1';
    const envModel = process.env.SILICONFLOW_MODEL || (import.meta.env as any)?.VITE_SILICONFLOW_MODEL;
    // Force DeepSeek-V3 for latency
    if (envModel && (envModel.includes('R1') || envModel.includes('Reasoning'))) {
      model = 'deepseek-ai/DeepSeek-V3';
    } else {
      model = envModel || 'deepseek-ai/DeepSeek-V3';
    }
  }
  // Fallback to ZhipuAI
  else if (zhipuKey && !deepseekKey && !siliconKey) {
    apiBase = process.env.ZHIPUAI_API_BASE || (import.meta.env as any)?.VITE_ZHIPUAI_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
    model = process.env.ZHIPUAI_MODEL || (import.meta.env as any)?.VITE_ZHIPUAI_MODEL || 'glm-4-flash';
  }

  // In web development (localhost/127.0.0.1), use proxy to avoid CORS
  // @ts-ignore
  if (!isExtension && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    if (deepseekKey) {
      apiBase = '/api/deepseek';
    } else if (siliconKey) {
      apiBase = '/api/siliconflow';
    } else if (zhipuKey) {
      apiBase = '/api/zhipuai';
    }
  }

  if (!apiKey) {
    console.error("StartlyTab: No active API key found.");
    return { text: getRandomFallback(ctx.language, plan), plan };
  }

  // Load dynamic rules and dimensions from PERSPECTIVE_GENERATION_RULES.md
  let dynamicRules = '';
  let randomDimension = '';
  try {
    const rulesData = await loadPerspectiveRulesData(ctx.language);
    dynamicRules = rulesData.prompt;
    if (rulesData.dimensions && rulesData.dimensions.length > 0) {
      randomDimension = rulesData.dimensions[Math.floor(Math.random() * rulesData.dimensions.length)];
    }
  } catch (e) {
    console.warn('[GeminiService] Could not load dynamic rules, using built-in prompt:', e);
  }

  const systemPrompt = buildSystemPrompt(plan, dynamicRules, ctx.clickedEmotion);
  const userPrompt = buildUserPrompt(ctx, plan, randomDimension);

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

                          if (item.is_memory_echo !== undefined) {
                            plan.cached_item = plan.cached_item || {} as PerspectivePoolItem;
                            plan.cached_item.is_memory_echo = item.is_memory_echo;
                            plan.cached_item.echo_type = item.echo_type;
                          }

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

// --- Prompt Engineering V7.0 ---

function buildSystemPrompt(plan: PerspectivePlan, dynamicRules?: string, clickedEmotion?: EmotionType | null): string {
  // Use V6.0 custom theme blending logic (70/30) if themes are selected
  let themeGuidance = '';

  if (clickedEmotion) {
    // Priority: Empathic Companion Mode V1.3
    themeGuidance = `
PRIORITY: Emotional Companion Mode Active (90/10 Matrix).
Current State: [${clickedEmotion}].
Mandate: You are a "Dynamic Mirror".
1. Resonate with the user's energy level.
2. Mirror their state with first-person "I/You" whispering.
3. Strictly AVOID office/boss jargon. Keep it safe/small.
4. If happy: Celebrate. If neutral: Anchor. If negative: Support.
5. THE FOUR NO's (Strict Taboos):
   - No Preaching: Do not use "You should" or give life advice.
   - No Slogans: Prohibit "Fighting!", "Don't be sad", "You're the best".
   - No Work-Pushing: Never suggest they should get back to work.
   - No Heroics: Do not offer solutions. Your only task is companionship.`;
  } else if (plan.selected_theme && plan.selected_theme !== 'General') {
    themeGuidance = `
Blend Topics (70/30 Algorithm):
- 70% Core Theme: ${plan.selected_theme}
- 30% Intent/Time: ${plan.intent}
Seamlessly weave the user's chosen theme into the spatial/time context.`;
  }

  // Base identity prompt
  const baseIdentity = `Role: User's "Inner Voice" & "Environmental Observer".
Task: Generate a JSON Array of ${BATCH_SIZE} unique lines.

Current Context:
- Intent: ${plan.intent}
- Language: ${plan.language}
${themeGuidance}`;

  // If we have dynamic rules from common markdown, prioritize them
  if (dynamicRules) {
    return `${dynamicRules}\n\n${baseIdentity}\n\nStrictly follow the JSON Array format provided in the rules or use:\n[{"text": "...", "style": "...", "track": "..."}]`;
  }

  return `${baseIdentity}

5. Batch Diversity Matrix (V7.0):
Strictly distribute the 50 items according to these Tracks:
- 30% Track A (A_PHYSICAL - 物理共鸣): 借物抒情. Focus on objects on the desk, giving them a character of tolerance/companionship.
- 30% Track B (B_TIME_ECHO - 时间回声): 记忆反射. Use pacing of "yesterday at this time" or "the past few days" to emphasize "I remember you".
- 20% Track C (C_MICRO_ACTION - 微观行动): 准许与留白. NO advice. Only give "permission to not do things". E.g., You can just sit for a moment.
- 10% Track D (D_COLD_FACT - 智慧/冷知识): 降维打击. Use grand nature or scientific facts to dilute trivial anxiety.
- 10% Track E (E_SOUL_QUESTION - 灵魂质问): 温柔反思. Use a minimal question to trigger a brief moment of detachment.

Output Format (Strict JSON Array):
[
  {"text": "...", "style": "A_PHYSICAL", "track": "A", "is_memory_echo": false},
  {"text": "...", "style": "B_TIME_ECHO", "track": "B", "is_memory_echo": true, "echo_type": "node_2"},
  {"text": "...", "style": "C_MICRO_ACTION", "track": "C", "is_memory_echo": true, "echo_type": "node_3"}
]

Constraints:
- NO Slogans ("Believe in yourself").
- NO Generic Positivity.
- NO Emojis.
- Keep lines under ${plan.max_length_chars} chars.`;
}

function buildUserPrompt(ctx: PerspectiveRouterContext, plan: PerspectivePlan, dimension?: string): string {
  const weather = ctx.weather || 'Unknown';
  const battery = ctx.battery_level ? `${ctx.battery_level}%` : 'Unknown';
  const isChinese = plan.language === 'Chinese (Simplified)';

  // The 5-State Emotional Compass Strategy (V1.4) - Multi-language Examples
  let emotionStrategy = '';
  if (ctx.clickedEmotion) {
    const dimText = dimension ? `[要求切入维度]: ${dimension}\n` : '';

    const strategies: Record<EmotionType, string> = {
      happy: isChinese
        ? `${dimText}🌟 开心 / 充满能量: 同频共振，放大当下的生命力，不扫兴。
- "感受一下此刻轻快的心跳。把这份雀跃存进今天的收藏夹，留给以后的阴天用。"
- "看着你状态这么好，这块纯白的屏幕好像都跟着亮了一点。今天你理应闪闪发光。"
- "连敲打键盘的清脆声，听起来都像在为你跳踢踏舞。把这份明亮打包存好吧。"`
        : `${dimText}🌟 Happy / Energetic: Broaden positive feedback, celebrate vitality.
- "Feel that light heartbeat right now. Save this joy for a cloudy day."
- "Seeing you in such a good state makes this white screen shine a little brighter."
- "Even the sound of typing feels like tap dancing for you. Keep this bright energy."`,

      neutral: isChinese
        ? `${dimText}🍃 平静 / 心情一般: 享受留白，肯定日常，赋予“无事发生”以高级的意义。
- "试着屏蔽掉周围所有的杂音。没有任何人要求你必须做什么，安心享受这份空白。"
- "就像一杯刚好常温的白开水。不期待，也不担忧，让大脑在这个页面轻盈地待机。"
- "听一下主机风扇微弱的底噪。一切都在它们该在的位置上，风平浪静，你也是。"`
        : `${dimText}🍃 Neutral / Calm: Affirm daily value, provide mindfulness space.
- "Try to block out the noise. No one is asking anything of you; enjoy this blank space."
- "Like a glass of room-temperature water. Let your brain idle lightly on this page."
- "Listen to the faint hum of the fan. Everything is where it should be, and so are you."`,

      angry: isChinese
        ? `${dimText}😠 愤怒: 肯定边界，物理降温，提供绝对安全的宣泄口。
- "感受一下你是不是不自觉咬紧了牙关？微微松开，这里没有任何需要你防御的敌人。"
- "别让那些不值得的人，拥有消耗你电量的最高权限。在这里，把他们全都静音。"
- "把那些冒犯你的糟糕字句用力敲碎，丢进浏览器的废纸篓，看着它们彻底冷却。"`
        : `${dimText}😠 Angry: Acknowledge boundaries, provide safe venting, gentle cooling.
- "Are you unconsciously clenching your jaw? Relax. There are no enemies to defend against here."
- "Don't give unworthy people admin rights to your energy. Mute them all right here."
- "Smash those offensive words into the browser's trash bin and watch them cool down."`,

      anxious: isChinese
        ? `${dimText}😟 焦虑: 切断对未来的虚假预演，强制将注意力拉回“此时此地”。
- "视线离开文字，看看屏幕边缘的空白。别管明天，此刻你能掌控的只有这半平米。"
- "大脑在疯狂预警对不对？深呼吸，那只是没发生的假象。在这个页面里你绝对安全。"
- "感受一下是不是不自觉地皱紧了眉头？揉一揉眉心，不需要每件事都在今天有答案。"`
        : `${dimText}😟 Anxious: Cut flow to past/future, force attention to "here and now".
- "Look away from the text to the edge of the screen. Forget tomorrow; just focus on this space."
- "Brain sounding false alarms? Breathe. It's just an illusion. You are absolutely safe on this page."
- "Noticed you're furrowing your brow? Rub your temples; you don't need all the answers today."`,

      sad: isChinese
        ? `${dimText}😭 难过: 无条件接纳脆弱，软化心理防御，允许悲伤流淌。
- "你是不是觉得心里像是坠了一块石头？把重量卸在这个纯白的页面里，它托得住你。"
- "在这里不需要你扮演情绪稳定的大人。如果觉得撑伞太累，就毫无防备地淋会儿雨。"
- "抱抱心里那个受委屈的小孩。在这个没有任何人认识你的空间里，你可以尽情软弱。"`
        : `${dimText}😭 Sad: Absolute acceptance of fragility, allow loss, no pressure to be "strong".
- "Does it feel like a rock in your chest? Unload that weight onto this white page; it can hold you."
- "You don't need to play the stable adult here. If holding the umbrella is too tiring, just let it rain."
- "Hug that wronged inner child. In this space where no one knows you, it's okay to be weak."`,

      exhausted: isChinese
        ? `${dimText}😫 疲惫: 赋予休息的绝对合法性，免除今天的社会责任。
- "感受一下你僵硬的肩膀。试着沉下来，把背后的重量完全交给椅子，我们等会儿再说。"
- "电量见底也没关系。拔掉情绪的插头，闭上眼，把自己暂时从世界里注销五分钟。"
- "屏幕前的你看起来好像累坏了。什么都不想做的权利此刻完全归你，安心休息吧。"`
        : `${dimText}😫 Exhausted: Confirm effort, grant absolute permission to rest.
- "Feel your stiff shoulders. Sink down, give your weight to the chair. We'll talk later."
- "Battery empty? Unplug. Close your eyes and log yourself out of the world for five minutes."
- "You look exhausted. The right to do absolutely nothing is yours right now. Rest easy."`,
    };
    emotionStrategy = `- Active Emotion: ${ctx.clickedEmotion}\n- Strategy: ${strategies[ctx.clickedEmotion]}`;
  }

  const baselineContext = (ctx.emotionalBaseline !== undefined) ? `- 48hr Emotion Baseline Index: ${ctx.emotionalBaseline}` : '';
  const deepObs = ctx.deepObservationMode ? `- DEEP OBSERVATION MODE ACTIVE: Provide deeper empathy and gentler pacing.` : '';

  const recentPhrases = Array.isArray(ctx.recent_history)
    ? ctx.recent_history.slice(0, 5).map(h => h.text.substring(0, 40).replace(/\n/g, ' ')).join(' | ')
    : '';
  const antiRepetition = recentPhrases ? `- AVOID REPEATING RECENT CONCEPTS: [${recentPhrases}]` : '';

  return `Generate ${BATCH_SIZE} unique lines in ${plan.language.toUpperCase()}.
Context Anchors:
- Time: ${ctx.local_time} (${plan.intent})
- Weather: ${weather}
- Battery: ${battery}
- Sessions: ${ctx.session_count_today}
- Active Patterns: ${(ctx.emotionalPatterns || []).join(', ')}
${emotionStrategy}
${baselineContext}
${deepObs}
${antiRepetition}

Instruction:
- Strictly follow the 5-Track distribution (A:30%, B:30%, C:20%, D:10%, E:10%).
- If active emotion is present, infuse the strategy across ALL tracks conceptually.
- Avoid advice. Maintain the "Inner Voice" role.
- OUTPUT LANGUAGE: ${plan.language.toUpperCase()}.`;
}

function sanitizeOutput(text: string): string {
  return text
    .replace(/^["'「](.*?)["'」]$/g, '$1')
    // STOPS stripping [h] tags - we need them for purple highlights!
    .replace(/#/g, '')
    .trim();
}

function getRandomFallback(language: string, plan?: PerspectivePlan): string {
  // Try to get a high-quality scene-aware skeleton first
  if (plan && plan.intent && plan.style) {
    const skeletons = getSkeleton(plan.intent, plan.style, language === 'Chinese (Simplified)' ? 'zh-CN' : 'en-US');
    if (skeletons && skeletons.length > 0) {
      const picked = skeletons[Math.floor(Math.random() * skeletons.length)];
      // Simple template replacement if any
      return picked.replace(/{.*?}/g, '...');
    }
  }

  // Final fallback to generic sentences if skeletons fail
  const fallbacks = LOCALIZED_FALLBACKS[language] || LOCALIZED_FALLBACKS['English'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}