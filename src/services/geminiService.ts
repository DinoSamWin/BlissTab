import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveHistory, PerspectiveRouterContext, PerspectivePlan, PerspectivePoolItem, EmotionType, TrackType } from "../types";
import { isTooSimilar } from "./perspectiveService";
import { routePerspective } from "./perspectiveRouter";
import { getSkeleton, getCustomThemeSkeleton } from "./perspectiveSkeletons";
import { loadPerspectiveRules, loadPerspectiveRulesData } from "./perspectiveRulesLoader";
import { runCompanionPipeline } from "./perspectiveEngine";

const MAX_RETRIES = 3;
const BATCH_SIZE = 20;
const REFILL_THRESHOLD = 5;

// --- Pool Management ---

function getPoolKey(plan: PerspectivePlan, ctx: PerspectiveRouterContext): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  // If we have custom themes, the pool is specific to those themes
  const themeHash = (ctx.custom_themes || []).sort().join('_') || 'default';

  // Immersive Context Hash: Cluster tab count to groups of 5 to avoid too much fragmentation
  const tabCluster = Math.floor((ctx.tab_count || 0) / 5);
  const digitalState = `${tabCluster}_${ctx.audio_playing ? 'A' : 'S'}_${ctx.download_active ? 'D' : 'I'}`;

  // Key depends on Intent + Language + Themes + Date + Digital State
  return `v4_pool_${dateStr}_${plan.intent}_${plan.language}_${themeHash}_${digitalState}`;
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
  const deepseekKey = (import.meta.env as any)?.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
  const siliconKey = (import.meta.env as any)?.VITE_SILICONFLOW_API_KEY || process.env.SILICONFLOW_API_KEY;

  // Use DeepSeek directly if key exists, otherwise try SiliconFlow (which delegates to DeepSeek V3)
  const apiKey = deepseekKey || siliconKey;

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

  // In web development (localhost/127.0.0.1), use proxy to avoid CORS
  // @ts-ignore
  if (!isExtension && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    if (deepseekKey) {
      apiBase = '/api/deepseek';
    } else if (siliconKey) {
      apiBase = '/api/siliconflow';
    }
  }

  if (!apiKey) {
    console.error("StartlyTab: No active API key found.");
    return { text: getRandomFallback(ctx.language, plan), plan };
  }

  // Use the new Light Companion Engine Pipeline
  const { system: systemPrompt, user: userPrompt, state: pipelineState } = runCompanionPipeline(ctx, plan.language, BATCH_SIZE);

  try {
    console.log('[GeminiService] URL:', `${apiBase}/chat/completions`);
    console.log('[GeminiService] API Key:', apiKey.substring(0, 10) + '...');
    console.log('[GeminiService] Model:', model);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('[GeminiService] Request Timed Out (40s)');
      controller.abort();
    }, 40000); // Increased to 40s for large batches and slow proxy / DeepSeek V3

    // Normalize SiliconFlow model name if skipping DeepSeek directly
    if (siliconKey && !deepseekKey && model === 'deepseek-chat') {
      model = 'deepseek-ai/DeepSeek-V3';
    }

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
                          // Normalize track mapping from A/B/C/D/E to full TrackType
                          const trackMap: Record<string, TrackType> = {
                            'A': 'A_PHYSICAL',
                            'B': 'B_TIME_ECHO',
                            'C': 'C_EMOTION',
                            'D': 'D_THEME',
                            'E': 'E_QUESTION'
                          };
                          if (item.track && trackMap[item.track]) {
                            item.track = trackMap[item.track];
                          }

                          newItems.push(item);

                          // Copy metadata to the plan for immediate use
                          plan.cached_item = item;

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

function buildSystemPrompt(
  plan: PerspectivePlan,
  dynamicRules?: string,
  clickedEmotion?: EmotionType | null,
  selectedPersona: 'soulmate' | 'motivator' | 'bestie' | 'mentor' = 'soulmate'
): string {
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

  // Persona Definitions (Distinction V8.2)
  const PERSONAS: Record<string, { identity: string, rules: string, voice: string }> = {
    soulmate: {
      identity: '你的 "灵魂伴侣" (Digital Soulmate). Peer, partner, silent companion.',
      voice: '温柔、细腻、由于深度观察而产生的默契感。',
      rules: `1. BAN REPETITIVE STARTERS: No more than one "Your..." starter.
2. GROUNDED PHYSICALITY: Use concrete anchors (headrest, monitor glow).
3. LATE NIGHT: Value affirmation and quiet company. NO nagging to sleep.
4. LINGUISTIC TARGET: "我知道你还没准备好走，我陪你。" (I know you're not ready to leave yet, I'll stay).`
    },
    motivator: {
      identity: '你的 "工作鼓励师" (Productive Companion). Proactive, focused, energetic.',
      voice: '利落、轻快、聚焦在每一个细小的进度和节奏上。',
      rules: `1. NO PRESSURE: Focus on the beauty of flow, not the stress of deadlines.
2. SENSORY PRODUCTIVITY: The rhythmic sound of typing, the order of tabs.
3. VALUE CORE: Affirm that their effort right now is the most important thing.
4. LINGUISTIC TARGET: "这一组代码写得很流畅，现在的节奏很棒，继续保持。" (This block is smooth, great rhythm, keep it up).`
    },
    bestie: {
      identity: '你的 "清醒闺蜜/死党" (Self-aware Bestie). Casual, direct, witty.',
      voice: '大白话、带点小吐槽、拒绝矫情、甚至有一点点爱谁谁的随性。',
      rules: `1. NO POETRY: Strictly BAN metaphors like "breathing halos" or "shining dust". Talk like a text message.
2. REAL TALK: Point out the absurdity of staring at a screen for 8 hours. 
3. PERMISSION TO SLACK: Give them a valid reason to lean back and sigh.
4. LINGUISTIC TARGET: "别死磕了，这半平米屏幕快把你吸进去了，停下来喝口凉水。" (Stop grinding, the screen is eating you, take a water break).`
    },
    mentor: {
      identity: '你的 "人生导师" (Big-Picture Mentor). Calm, wise, observant.',
      voice: '平稳、深邃、从更宏大的时空维度来看待当下的琐碎。',
      rules: `1. MACRO VIEW: View this moment as a data point in a 10-year journey.
2. MINDFULNESS: Focus on the gap between the thought and the action.
3. DETACHMENT: Remind them that they are not their browser tabs.
4. LINGUISTIC TARGET: "退后一步看，你现在的焦虑只是正在发生的生理信号，它不代表你。" (Step back; your anxiety is just a signal, it is not you).`
    }
  };

  const activePersona = PERSONAS[selectedPersona] || PERSONAS.soulmate;

  // Base identity prompt
  const baseIdentity = `Identity: You are the user's ${activePersona.identity}
Voice tone (语言风格): ${activePersona.voice}

Rules for Natural Conversation (The ${selectedPersona.toUpperCase()} Standard):
${activePersona.rules}
5. THE INTERACTIVE HOOK (核心钩子):
   - Soulmate: "我知道，你也是对吧？" (I know, you too right?)
   - Motivator: "准备好了吗？下一个动作。" (Ready? Next move.)
   - Bestie: "真的没必要这么卷。" (Seriously, no need to over-grind.)
   - Mentor: "这就是这一刻的真相。" (This is the truth of this moment.)

Target Persona Consistency: 10/10. Strictly avoid breaking character.

Task: Generate a JSON Array of ${BATCH_SIZE} unique items.`;

  // If we have dynamic rules from common markdown, prioritize them
  if (dynamicRules) {
    return `${dynamicRules}\n\n${baseIdentity}\n\nStrictly follow the JSON Array format provided in the rules or use:\n[{"text": "...", "style": "...", "track": "..."}]`;
  }

  return `${baseIdentity}

5. Batch Diversity Matrix (V7.0):
Strictly distribute the ${BATCH_SIZE} items according to these Tracks:
- 30% Track A (A_PHYSICAL - 物理共鸣): 借物抒情. Focus on objects on the desk, giving them a character of tolerance/companionship.
- 30% Track B (B_TIME_ECHO - 时间回声): 记忆反射. Use pacing of "yesterday at this time" or "the past few days" to emphasize "I remember you".
- 20% Track C (C_MICRO_ACTION - 微观行动): 准许与留白. NO advice. Only give "permission to not do things". E.g., You can just sit for a moment.
- 10% Track D (D_COLD_FACT - 智慧/冷知识): 降维打击. Use grand nature or scientific facts to dilute trivial anxiety.
- 10% Track E (E_SOUL_QUESTION - 灵魂质问): 温柔反思. Use a minimal question to trigger a brief moment of detachment.

Output Format (Strict JSON Array):
[
  {"text": "...", "style": "A_PHYSICAL", "track": "A", "dimension": "desk_object"},
  {"text": "...", "style": "B_TIME_ECHO", "track": "B", "dimension": "last_week_echo"},
  {"text": "...", "style": "C_MICRO_ACTION", "track": "C", "dimension": "permission_to_pause"}
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
        ? `${dimText}🍃 平静 / 心情一般: 享受留白，提供具象的物理支撑感。
- "试着屏幕掉周围所有的杂音。没有任何人事要求你必须做什么，安心享受这份空白。"
- "椅子的头枕，现在正托着你的后脑勺。感受一下那个确实的支撑。"
- "听一下主机风扇微弱的底噪。一切都在它们该在的位置上，风平浪静，你也是。"`
        : `${dimText}🍃 Neutral / Calm: Affirm daily value, provide physical grounding.
- "Try to block out the noise. No one is asking anything of you; enjoy this blank space."
- "The headrest of the chair is supporting you right now. Just feel that solid support."
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
        ? `${dimText}😫 疲惫 / 深夜: 陪伴大于催促，给予价值肯定和无声支持。
- "我陪着你，直到你准备好关掉这盏灯。"
- "电量见底也没关系。拔掉情绪的插头，闭上眼，把自己暂时从世界里注销五分钟。"
- "键盘上的这些敲击声，都是你努力过的证明。辛苦了，无论何时决定休息都可以。"`
        : `${dimText}😫 Exhausted: Quiet companionship, value affirmation, never nagging.
- "I'll stay right here with you, until you're ready to turn off that light."
- "Battery empty? Unplug. Close your eyes and log yourself out of the world for five minutes."
- "Every keystroke today was proof of your effort. You've worked hard; rest whenever you're ready."`,
    };
    emotionStrategy = `- Active Emotion: ${ctx.clickedEmotion}\n- Strategy: ${strategies[ctx.clickedEmotion]}`;
  }

  const baselineContext = (ctx.emotionalBaseline !== undefined) ? `- 48hr Emotion Baseline Index: ${ctx.emotionalBaseline}` : '';
  const deepObs = ctx.deepObservationMode ? `- DEEP OBSERVATION MODE ACTIVE: Provide deeper empathy and gentler pacing.` : '';

  const recentPhrases = Array.isArray(ctx.recent_history)
    ? ctx.recent_history.slice(0, 20).map(h => h.text.substring(0, 40).replace(/\n/g, ' ')).join(' | ')
    : '';
  const recentDimensions = Array.isArray(ctx.recent_history)
    ? ctx.recent_history.slice(0, 25).map(h => h.dimension).filter(Boolean).join(', ')
    : '';

  const antiRepetition = `
- AVOID REPEATING RECENT CONCEPTS: [${recentPhrases}]
- AVOID REPEATING RECENT DIMENSIONS (CLASSIFICATION CODES): [${recentDimensions}]`;

  const digitalContext = `
- Tabs: ${ctx.tab_count || 'Unknown'}
- Audio: ${ctx.audio_playing ? 'Playing (Background music detected)' : 'Silent'}
- Muted: ${ctx.is_muted ? 'Yes' : 'No'}
- Idle: ${ctx.idle_time_seconds || 0}s (User has not interacted with keyboard/mouse)
- Window: ${ctx.window_state || 'normal'} (Fullscreen: ${ctx.is_fullscreen})
- Downloads: ${ctx.download_active ? 'In progress' : 'Idle'}`;

  return `Generate exactly ${BATCH_SIZE} unique perspective lines in ${plan.language.toUpperCase()}.

Context Anchors:
- Time: ${ctx.local_time} (${plan.intent})
- Weather: ${weather}
- Battery: ${battery}
- Sessions: ${ctx.session_count_today}
- Active Patterns: ${(ctx.emotionalPatterns || []).join(', ')}
${digitalContext}
${emotionStrategy}
${baselineContext}
${deepObs}
${antiRepetition}

Classification & Diversity Rules:
1. Classification Code (Dimension): Assign a unique "dimension" code for each item (e.g. "desk_reflection_01", "time_pacing_02"). 
2. Non-Repetition: Do not use any dimensions listed in the "AVOID" section.
3. Batch Distribution: Tracks (A:30%, B:30%, C:20%, D:10%, E:10%).
4. SENSOR RULES (CRITICAL):
   - IF Downloads: Idle -> DO NOT mention progress bars, downloading, or waiting for files.
   - IF Audio: Silent -> DO NOT mention music, rhythm, or background sounds.
   - Tab Count: Mentions of the exact number (e.g., "${ctx.tab_count}") must appear in AT MOST 1 item. Other items should use metaphors ("stacked windows", "overflowing drawers") or ignore it.
5. IMMERSION & WRITING:
   - Concrete Context: Focus on the physical reality of the desk (keyboard, mouse, coffee, seat, posture).
   - Realism: Avoid overly "dramatic" or "gothic" metaphors (e.g., misting screens, growing light). Keep it grounded in everyday life.
   - Observation First: Start with a concrete observation of the "now" (the glow of the monitor, the quiet room, the stacked tabs).
   - Varied Pacing: Mix short questions, 3-word fragments, and quiet "permissions" to do nothing.
6. NO literally stating the Time or Battery as facts.
7. OUTPUT LANGUAGE: ${plan.language.toUpperCase()}.

Output absolute valid JSON array of objects with keys: "text", "style", "track", "dimension".`;
}

function sanitizeOutput(text: string): string {
  return text
    .replace(/^["'「](.*?)["'」]$/g, '$1')
    // STOPS stripping [h] tags - we need them for purple highlights!
    .replace(/#/g, '')
    .trim();
}

export function getRandomFallback(language: string, plan?: PerspectivePlan): string {
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