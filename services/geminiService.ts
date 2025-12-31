
import { GoogleGenAI } from "@google/genai";
import { LOCALIZED_FALLBACKS } from "../constants";

export async function generateSnippet(prompt: string, language: string = "English"): Promise<string> {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("FocusTab: API key not found. Using localized fallback.");
      return getRandomFallback(language);
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User request: ${prompt}. Please provide the response in ${language}.`,
      config: {
        systemInstruction: `You are a minimal, sophisticated assistant for a home screen. Provide ONE single line of text based on the user's request. Keep it under 12 words. No emojis, just clean text. Be insightful, witty, or calm depending on the context. THE OUTPUT MUST BE ENTIRELY IN THE ${language.toUpperCase()} LANGUAGE. Do not include English translations.`,
        temperature: 0.8,
        topP: 0.9,
      },
    });

    const text = response.text;
    if (!text || text.trim().length === 0) {
      return getRandomFallback(language);
    }

    return text.trim();
  } catch (error: any) {
    const errorMessage = error?.message || "";
    if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      console.warn("FocusTab: Gemini rate limit reached (429). Showing localized fallback.");
    } else {
      console.error("FocusTab: Gemini generation error:", error);
    }
    
    return getRandomFallback(language);
  }
}

function getRandomFallback(language: string): string {
  const fallbacks = LOCALIZED_FALLBACKS[language] || LOCALIZED_FALLBACKS['English'];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
