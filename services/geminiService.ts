import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveHistory, isTooSimilar } from "./perspectiveService";

const MAX_QUOTE_LENGTH = 120; // Hard limit per spec
const MAX_RETRIES = 3;

// 智谱AI API 配置
// 支持多种环境变量读取方式：process.env (通过 Vite define 注入) 和 import.meta.env (Vite 标准方式)
const ZHIPUAI_API_BASE = (process.env as any)?.ZHIPUAI_API_BASE || (import.meta.env as any)?.VITE_ZHIPUAI_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
const ZHIPUAI_MODEL = (process.env as any)?.ZHIPUAI_MODEL || (import.meta.env as any)?.VITE_ZHIPUAI_MODEL || 'glm-4-flash';

// 调试：在模块加载时检查环境变量（仅在浏览器环境）
if (typeof window !== 'undefined') {
  console.log('[ZhipuAI] ===== Environment Check =====');
  console.log('[ZhipuAI] process.env.ZHIPUAI_API_KEY:', (process.env as any)?.ZHIPUAI_API_KEY ? 'SET' : 'NOT SET');
  console.log('[ZhipuAI] process.env.API_KEY:', (process.env as any)?.API_KEY ? 'SET' : 'NOT SET');
  console.log('[ZhipuAI] import.meta.env.VITE_ZHIPUAI_API_KEY:', (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY ? 'SET' : 'NOT SET');
  console.log('[ZhipuAI] ZHIPUAI_API_BASE:', ZHIPUAI_API_BASE);
  console.log('[ZhipuAI] ZHIPUAI_MODEL:', ZHIPUAI_MODEL);
  console.log('[ZhipuAI] =================================');
}

/**
 * Generates a single line snippet using ZhipuAI with anti-repetition logic.
 * Uses OpenAI-compatible API format for ZhipuAI models.
 */
export async function generateSnippet(
  prompt: string,
  language: string = "English",
  history: PerspectiveHistory[] = [],
  retryCount: number = 0
): Promise<string> {
  try {
    // Verify API key presence - support multiple ways to read environment variables
    // 1. process.env (injected by Vite define)
    // 2. import.meta.env (Vite standard way)
    const apiKey = (process.env as any)?.ZHIPUAI_API_KEY 
      || (process.env as any)?.API_KEY 
      || (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY
      || (import.meta.env as any)?.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("StartlyTab: API key not found. Using localized fallback.");
      console.error("StartlyTab: Checked process.env.ZHIPUAI_API_KEY:", (process.env as any)?.ZHIPUAI_API_KEY ? 'SET' : 'NOT SET');
      console.error("StartlyTab: Checked process.env.API_KEY:", (process.env as any)?.API_KEY ? 'SET' : 'NOT SET');
      console.error("StartlyTab: Checked import.meta.env.VITE_ZHIPUAI_API_KEY:", (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY ? 'SET' : 'NOT SET');
      console.error("StartlyTab: Please set ZHIPUAI_API_KEY or VITE_ZHIPUAI_API_KEY in Vercel environment variables");
      return getRandomFallback(language);
    }
    
    console.log('[ZhipuAI] Generating perspective with API key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');

    // Build diversity instruction based on history
    const diversityInstruction = history.length > 0
      ? `\n\nIMPORTANT: Avoid repeating or closely mirroring these recent perspectives:\n${history.slice(0, 5).map(h => `- "${h.text}"`).join('\n')}\n\nGenerate a FRESH, DISTINCT perspective. Vary the tone, structure, vocabulary, and angle. Even if the theme is similar, the expression must feel clearly different.`
      : '';

    // Build system prompt following the canonical specification
    const systemPrompt = `You generate short, inspiring, calming, and motivating quotes for a focus tab.

CORE PURPOSE: Help the user start the moment with quiet strength.

LENGTH RULES:
- HARD LIMIT: Maximum 120 characters (including spaces)
- RECOMMENDED: 60-100 characters
- One single sentence preferred
- Period at end is optional but encouraged

TONE REQUIREMENTS:
- Calm, warm, reflective, encouraging, non-preachy
- Gentle encouragement, clarity, grounded confidence
- Designed to be read quickly and felt emotionally
- Never noisy, preachy, or aggressive

FORBIDDEN:
- NO emojis
- NO hashtags
- NO quotation marks (" or "")
- NO markdown formatting
- NO hype language (crush it, hustle harder)
- NO commands (avoid must, should)
- NO clichés or overused quotes
- NO religious or political references
- NO direct productivity jargon

CONTENT VARIATION:
Rotate across metaphors (light, space, rhythm, growth, stillness), sentence rhythms (short/balanced/flowing), and emotional emphasis (acceptance, progress, patience, presence, trust).

OUTPUT FORMAT:
- Output ONLY the quote text
- NO metadata, explanation, intention label, or markdown
- Plain text only

LANGUAGE: Output must be entirely in ${language.toUpperCase()}.`;

    // Build user prompt
    const userPrompt = `Request: ${prompt}. Response Language: ${language}.${diversityInstruction}`;

    console.log('[ZhipuAI] Calling API with prompt:', prompt.substring(0, 50) + '...');
    
    // Call ZhipuAI API (OpenAI compatible format)
    const response = await fetch(`${ZHIPUAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ZHIPUAI_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.85 + (retryCount * 0.05), // Increase temperature on retries for more diversity
        top_p: 0.95,
        max_tokens: 150, // Limit tokens to ensure length constraint
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ZhipuAI] API error:", response.status, errorText);
      return getRandomFallback(language);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content?.trim() || '';
    
    if (!text || text.length === 0) {
      console.warn('[ZhipuAI] Empty response from API, using fallback');
      return getRandomFallback(language);
    }

    // Remove any markdown, quotes, or unwanted formatting
    text = text
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\[h\](.*?)\[\/h\]/g, '$1') // Remove highlight tags if present
      .replace(/#/g, '') // Remove hashtags
      .trim();

    // Validate length (hard limit)
    if (text.length > MAX_QUOTE_LENGTH) {
      // Truncate intelligently at word boundary
      const words = text.split(' ');
      let truncated = '';
      for (const word of words) {
        if ((truncated + ' ' + word).length <= MAX_QUOTE_LENGTH) {
          truncated = truncated ? truncated + ' ' + word : word;
        } else {
          break;
        }
      }
      text = truncated || text.substring(0, MAX_QUOTE_LENGTH).trim();
    }

    console.log('[ZhipuAI] Generated perspective:', text.substring(0, 50) + '...');

    // Check if generated text is too similar to history
    if (isTooSimilar(text, history) && retryCount < MAX_RETRIES) {
      console.log(`[ZhipuAI] Perspective too similar, retrying (attempt ${retryCount + 1})...`);
      return generateSnippet(prompt, language, history, retryCount + 1);
    }

    console.log('[ZhipuAI] Successfully generated unique perspective');
    return text;
  } catch (error: any) {
    // Log detailed error information while ensuring the UI doesn't break
    console.error("[ZhipuAI] Generation failed:", error);
    console.error("[ZhipuAI] Error details:", {
      message: error?.message,
      status: error?.status,
      statusText: error?.statusText,
      apiKeySet: !!((process.env as any)?.ZHIPUAI_API_KEY || (process.env as any)?.API_KEY || (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY)
    });
    return getRandomFallback(language);
  }
}

function getRandomFallback(language: string): string {
  const fallbacks = LOCALIZED_FALLBACKS[language] || LOCALIZED_FALLBACKS['English'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}