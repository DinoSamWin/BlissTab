import { useState, useCallback } from 'react';
import { requestAiCompletion } from '../services/aiApiService';

export interface DeepCareContent {
    title: string;
    p1: string;
    p2: string;
    p3: string;
}

interface EmotionProportion {
    type: string;
    count: number;
    percentage: number;
    color: string;
}

const DEEP_CARE_CACHE_KEY = 'startlytab_deep_care_daily_v1';

interface DeepCareCacheEntry {
    localDate: string;
    language: string;
    content: DeepCareContent;
}

function getLocalDateKey(): string {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
}

function readDailyCache(language: string): DeepCareContent | null {
    try {
        const parsed = JSON.parse(localStorage.getItem(DEEP_CARE_CACHE_KEY) || 'null') as DeepCareCacheEntry | null;
        if (parsed?.localDate === getLocalDateKey() && parsed.language === language) {
            return parsed.content;
        }
    } catch {
        // A malformed or unavailable cache should never block the report.
    }
    return null;
}

function saveDailyCache(language: string, content: DeepCareContent): void {
    try {
        const entry: DeepCareCacheEntry = { localDate: getLocalDateKey(), language, content };
        localStorage.setItem(DEEP_CARE_CACHE_KEY, JSON.stringify(entry));
    } catch {
        // The insight remains available in React state for this visit.
    }
}

export function useDeepCareAI() {
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState<DeepCareContent | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchAdvice = useCallback(async (
        proportions: EmotionProportion[],
        language: string,
        options: { force?: boolean } = {}
    ) => {
        if (!proportions || proportions.length === 0) return;

        if (!options.force) {
            const cached = readDailyCache(language);
            if (cached) {
                setContent(cached);
                setError(null);
                return;
            }
        }

        setLoading(true);
        setError(null);

        const dataSummary = proportions.map(p => `- ${p.type}: ${Math.round(p.percentage)}%`).join('\n');
        const isChinese = language === 'Chinese (Simplified)';
        const langStr = isChinese ? 'Chinese (Simplified)' : 'English';

        const systemPrompt = `You are a professional empathetic psychologist. The user has tracked their emotions over the past 7 days.
Their emotional distribution is:
${dataSummary}

Context:
- Please write a "Deep Care Whisper" (深层关怀信) for them based on this data.
- The language must be ${langStr}.
- Tone: Professional, highly empathetic, warm, but not overly enthusiastic. Use a "Morandi" emotional tone—calm and grounding.
- Output MUST be a valid JSON object matching this exact schema:
{
  "title": "A gentle, slightly poetic greeting title (e.g. 致过去七天不断努力的你： / To the one who tried so hard this week:)",
  "p1": "Paragraph 1: Acknowledge their specific emotional pattern from the data. Validate their feelings without judgment.",
  "p2": "Paragraph 2: Provide a deep psychological analysis of why they might feel this way (e.g. decision fatigue, boundary violation, or celebrating their stable emotional state).",
  "p3": "Paragraph 3: Give a specific, actionable, and gentle micro-habit or psychological prescription (e.g. 5-4-3-2-1 grounding, non-productive rest, peak-end reflection)."
}
Avoid markdown code blocks, just return raw JSON.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            const response = await requestAiCompletion({
                messages: [{ role: 'system', content: systemPrompt }],
                temperature: 0.8,
                max_tokens: 640,
                purpose: 'deep_care',
                response_format: { type: "json_object" }
            }, controller.signal);

            if (!response.ok) throw new Error('API request failed');

            const result = await response.json();
            const rawText = result.choices?.[0]?.message?.content || "";

            // Clean up backticks if the LLM ignored the "no markdown" rule
            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedText) as DeepCareContent;

            if (parsed.title && parsed.p1 && parsed.p2 && parsed.p3) {
                setContent(parsed);
                saveDailyCache(language, parsed);
            } else {
                throw new Error('Invalid JSON structure');
            }

        } catch (err) {
            console.error('Deep Care AI Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }

    }, []);

    return { loading, content, error, fetchAdvice };
}
