import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveHistory, isTooSimilar } from "./perspectiveService";

const MAX_QUOTE_LENGTH = 60; // Hard limit: ~3 lines for Chinese, ~2 lines for English
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
    const systemPrompt = `You generate SHORT, inspiring, calming quotes for a focus tab.

CORE PURPOSE: Help the user start the moment with quiet strength.

CRITICAL LENGTH RULES:
- ABSOLUTE MAXIMUM: 60 characters (including spaces)
- TARGET: 30-50 characters
- MUST fit in 2-3 lines when displayed
- ONE short sentence or phrase only
- NO multi-sentence stories or dialogues
- NO conversations or Q&A format

CONTENT REQUIREMENTS:
- Single, concise thought or observation
- Calm, warm, reflective, encouraging
- Designed to be read instantly and felt emotionally
- Never noisy, preachy, or aggressive

STRICTLY FORBIDDEN:
- NO stories, narratives, or dialogues
- NO conversations between people
- NO multi-part sentences
- NO emojis, hashtags, quotation marks
- NO markdown formatting
- NO hype language or commands
- NO clichés or overused quotes

OUTPUT FORMAT:
- Output ONLY the quote text (30-50 characters)
- NO metadata, explanation, or markdown
- Plain text only
- Single line of thought

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
        max_tokens: 60, // Strict limit: ~60 chars = 2-3 lines
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
      // For Chinese: truncate by character; For English: truncate by word
      const isChinese = /[\u4e00-\u9fa5]/.test(text);
      
      if (isChinese) {
        // Chinese: truncate at character boundary
        text = text.substring(0, MAX_QUOTE_LENGTH).trim();
        // Remove incomplete sentence endings
        text = text.replace(/[，。！？、]$/, '').trim();
      } else {
        // English: truncate at word boundary
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