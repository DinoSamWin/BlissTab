import { GoogleGenAI } from "@google/genai";
import { LOCALIZED_FALLBACKS } from "../constants";
import { PerspectiveHistory, isTooSimilar } from "./perspectiveService";

/**
 * Generates a single line snippet using Gemini with anti-repetition logic.
 * Uses gemini-2.5-flash for broad compatibility and reliability in browser-side execution.
 */
export async function generateSnippet(
  prompt: string,
  language: string = "English",
  history: PerspectiveHistory[] = [],
  retryCount: number = 0
): Promise<string> {
  try {
    // Verify API key presence
    if (!process.env.API_KEY) {
      console.warn("StartlyTab: API key not found. Using localized fallback.");
      return getRandomFallback(language);
    }

    // Build diversity instruction based on history
    const diversityInstruction = history.length > 0
      ? `\n\nIMPORTANT: Avoid repeating or closely mirroring these recent perspectives:\n${history.slice(0, 5).map(h => `- "${h.text}"`).join('\n')}\n\nGenerate a FRESH, DISTINCT perspective. Vary the tone, structure, vocabulary, and angle. Even if the theme is similar, the expression must feel clearly different.`
      : '';

    // Initialize the AI client
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Use the 2.5-flash model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        parts: [{
          text: `Request: ${prompt}. Response Language: ${language}.${diversityInstruction}`
        }]
      }],
      config: {
        systemInstruction: `You are a minimal, sophisticated assistant for a professional home screen. 
        Provide ONE single line of text. Under 12 words. No emojis. 
        IDENTIFY 1-2 core keywords or short phrases and wrap them in [h] tags (e.g., "[h]simplicity[/h] is key"). 
        DO NOT highlight the whole sentence. 
        THE OUTPUT MUST BE ENTIRELY IN ${language.toUpperCase()}.
        Each perspective must be UNIQUE and feel fresh. Vary your approach: different metaphors, angles, sentence structures, and vocabulary.`,
        temperature: 0.8 + (retryCount * 0.1), // Increase temperature on retries for more diversity
        topP: 0.95,
      },
    });

    const text = response.text?.trim();
    if (!text || text.length === 0) {
      return getRandomFallback(language);
    }

    // Check if generated text is too similar to history
    if (isTooSimilar(text, history) && retryCount < 3) {
      console.log(`Perspective too similar, retrying (attempt ${retryCount + 1})...`);
      return generateSnippet(prompt, language, history, retryCount + 1);
    }

    return text;
  } catch (error: any) {
    // Log detailed error information while ensuring the UI doesn't break
    console.error("StartlyTab: Gemini generation failed:", error);
    return getRandomFallback(language);
  }
}

function getRandomFallback(language: string): string {
  const fallbacks = LOCALIZED_FALLBACKS[language] || LOCALIZED_FALLBACKS['English'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}