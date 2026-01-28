import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveHistory } from "../types";
import { isTooSimilar } from "./perspectiveService";
import { loadPerspectiveRules } from "./perspectiveRulesLoader";

const MAX_QUOTE_LENGTH = 60; // Hard limit: ~3 lines for Chinese, ~2 lines for English
const MAX_RETRIES = 3;
const MIN_ACCEPTABLE_LENGTH = 20; // Minimum length after truncation to be acceptable

/**
 * Smart truncation that preserves sentence completeness
 * Tries to truncate at natural break points: sentence endings > punctuation > word boundaries
 */
function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  
  // Try to find the best truncation point
  // Priority 1: Sentence endings (., !, ?, 。, ！, ？)
  const sentenceEndings = isChinese 
    ? /[。！？]/g 
    : /[.!?]/g;
  
  let bestMatch: { index: number; length: number } | null = null;
  let match;
  
  while ((match = sentenceEndings.exec(text)) !== null) {
    const endIndex = match.index + 1;
    if (endIndex <= maxLength && endIndex > (bestMatch?.length || 0)) {
      bestMatch = { index: endIndex, length: endIndex };
    }
  }
  
  // Priority 2: Other punctuation (commas, semicolons, etc.)
  // Only use punctuation if we don't have a sentence ending, or if it's longer
  if (!bestMatch) {
    const punctuation = isChinese
      ? /[，；：、]/g
      : /[,;:]/g;
    
    while ((match = punctuation.exec(text)) !== null) {
      const endIndex = match.index + 1;
      if (endIndex <= maxLength) {
        // Prefer longer truncations, but accept shorter ones if they're at least MIN_ACCEPTABLE_LENGTH
        if (!bestMatch || (endIndex > bestMatch.length && endIndex >= MIN_ACCEPTABLE_LENGTH)) {
          bestMatch = { index: endIndex, length: endIndex };
        }
      }
    }
  }
  
  // Priority 3: Word boundaries (for English) or character boundaries (for Chinese)
  // Only use this if we don't have a good punctuation match
  if (!bestMatch || bestMatch.length < MIN_ACCEPTABLE_LENGTH) {
    if (isChinese) {
      // For Chinese, try to find a good character boundary
      // Look for spaces or punctuation near the max length
      const searchStart = Math.max(0, maxLength - 10);
      const searchText = text.substring(searchStart, maxLength);
      const spaceIndex = searchText.lastIndexOf(' ');
      const punctuationIndex = searchText.search(/[，。！？、；：]/);
      
      if (punctuationIndex >= 0) {
        bestMatch = { index: searchStart + punctuationIndex + 1, length: searchStart + punctuationIndex + 1 };
      } else if (spaceIndex >= 0) {
        bestMatch = { index: searchStart + spaceIndex + 1, length: searchStart + spaceIndex + 1 };
      } else {
        // Fallback to maxLength
        bestMatch = { index: maxLength, length: maxLength };
      }
    } else {
      // For English, truncate at word boundary
      const words = text.substring(0, maxLength).split(' ');
      // Remove the last incomplete word
      if (words.length > 1) {
        words.pop();
        const truncated = words.join(' ');
        if (truncated.length >= MIN_ACCEPTABLE_LENGTH) {
          bestMatch = { index: truncated.length, length: truncated.length };
        }
      }
      
      // If word boundary truncation is too short, try to find a better point
      if (!bestMatch || bestMatch.length < MIN_ACCEPTABLE_LENGTH) {
        // Look for a space or punctuation near maxLength
        const searchStart = Math.max(0, maxLength - 15);
        const searchText = text.substring(searchStart, maxLength);
        const spaceIndex = searchText.lastIndexOf(' ');
        
        if (spaceIndex >= 0 && searchStart + spaceIndex >= MIN_ACCEPTABLE_LENGTH) {
          bestMatch = { index: searchStart + spaceIndex, length: searchStart + spaceIndex };
        } else {
          // Last resort: use maxLength
          bestMatch = { index: maxLength, length: maxLength };
        }
      }
    }
  }
  
  // Apply truncation
  if (bestMatch) {
    let truncated = text.substring(0, bestMatch.index).trim();
    
    // Clean up the truncated text
    // If we didn't cut at a sentence ending, remove trailing incomplete punctuation
    if (bestMatch.index < text.length) {
      const lastChar = truncated[truncated.length - 1];
      const nextChar = text[bestMatch.index];
      
      // If we cut mid-sentence (not at sentence ending), clean up
      if (!/[.!?。！？]/.test(lastChar)) {
        // Remove trailing commas/semicolons if the sentence seems incomplete
        if (/[,;，；]/.test(lastChar)) {
          truncated = truncated.slice(0, -1).trim();
        }
        // If next character would continue the sentence, ensure we have a complete thought
        if (/[a-z\u4e00-\u9fa5]/.test(nextChar) && truncated.length < maxLength * 0.7) {
          // Try to find a better break point earlier
          const earlierBreak = truncated.lastIndexOf(' ');
          if (earlierBreak >= MIN_ACCEPTABLE_LENGTH) {
            truncated = truncated.substring(0, earlierBreak).trim();
          }
        }
      }
    }
    
    // Final validation: ensure we have a meaningful length
    if (truncated.length >= MIN_ACCEPTABLE_LENGTH) {
      return truncated;
    }
    
    // If truncated text is too short, try to extend it slightly if possible
    if (truncated.length < MIN_ACCEPTABLE_LENGTH && bestMatch.index < text.length) {
      const remaining = text.substring(bestMatch.index, Math.min(bestMatch.index + 10, text.length));
      const words = remaining.split(/\s+/);
      if (words.length > 0 && words[0]) {
        const extended = truncated + ' ' + words[0];
        if (extended.length <= maxLength && extended.length >= MIN_ACCEPTABLE_LENGTH) {
          return extended.trim();
        }
      }
    }
  }
  
  // Fallback: simple truncation at word/character boundary
  // Try to find a space near maxLength for cleaner cut
  const fallbackText = text.substring(0, maxLength);
  const lastSpace = fallbackText.lastIndexOf(' ');
  if (lastSpace >= MIN_ACCEPTABLE_LENGTH) {
    return fallbackText.substring(0, lastSpace).trim();
  }
  
  return fallbackText.trim();
}

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

    // Load system prompt from PERSPECTIVE_GENERATION_RULES.md
    // Rules are loaded from the markdown file, only length validation is kept in code
    const systemPrompt = await loadPerspectiveRules(language);

    // Build user prompt with explicit length constraint
    // Emphasize that the sentence must be COMPLETE and within the limit
    const lengthConstraint = `\n\nCRITICAL LENGTH REQUIREMENT: 
- Your response MUST be 30-50 characters (absolute maximum 60 characters)
- The sentence must be COMPLETE and MEANINGFUL - do not cut off mid-thought
- Count your characters carefully before responding
- If you cannot express the idea completely within 60 characters, use a shorter, simpler expression
- A short complete sentence is better than a long incomplete one`;
    const userPrompt = `Request: ${prompt}. Response Language: ${language}.${lengthConstraint}${diversityInstruction}`;

    console.log('[ZhipuAI] Calling API with prompt:', prompt.substring(0, 50) + '...');
    
    // Call ZhipuAI API (OpenAI compatible format)
    // Use stricter max_tokens to prevent over-generation
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
        max_tokens: 50, // Reduced from 60 to encourage shorter, complete sentences
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

    // Check length - if too long, retry generation instead of truncating
    // This ensures we get a complete, meaningful sentence within the limit
    if (text.length > MAX_QUOTE_LENGTH && retryCount < MAX_RETRIES) {
      console.log(`[ZhipuAI] Generated text (${text.length} chars) exceeds limit (${MAX_QUOTE_LENGTH}), retrying for shorter complete sentence...`);
      return generateSnippet(prompt, language, history, retryCount + 1);
    }

    // Only use smart truncation as last resort (if we've exhausted retries)
    if (text.length > MAX_QUOTE_LENGTH) {
      console.warn(`[ZhipuAI] Text still too long after ${MAX_RETRIES} retries, applying smart truncation...`);
      text = smartTruncate(text, MAX_QUOTE_LENGTH);
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