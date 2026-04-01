import { useState, useCallback } from 'react';

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

export function useDeepCareAI() {
    const [loading, setLoading] = useState(false);
    const [content, setContent] = useState<DeepCareContent | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchAdvice = useCallback(async (proportions: EmotionProportion[], language: string) => {
        if (!proportions || proportions.length === 0) return;

        setLoading(true);
        setError(null);

        // Extract credentials logic (matches geminiService.ts)
        const deepseekKey = (import.meta.env as any)?.VITE_DEEPSEEK_API_KEY || '';
        const siliconKey = (import.meta.env as any)?.VITE_SILICONFLOW_API_KEY || '';
        const zhipuKey = (import.meta.env as any)?.VITE_ZHIPUAI_API_KEY || '';

        const apiKey = deepseekKey || siliconKey || zhipuKey;

        let apiBase = (import.meta.env as any)?.VITE_DEEPSEEK_API_BASE || 'https://api.deepseek.com';
        let model = (import.meta.env as any)?.VITE_DEEPSEEK_MODEL || 'deepseek-chat';

        if (siliconKey && !deepseekKey) {
            apiBase = (import.meta.env as any)?.VITE_SILICONFLOW_API_BASE || 'https://api.siliconflow.cn/v1';
            const envModel = (import.meta.env as any)?.VITE_SILICONFLOW_MODEL;
            if (envModel && (envModel.includes('R1') || envModel.includes('Reasoning'))) {
                model = 'deepseek-ai/DeepSeek-V3'; // Fallback to faster V3
            } else {
                model = envModel || 'deepseek-ai/DeepSeek-V3';
            }
        } else if (zhipuKey && !deepseekKey && !siliconKey) {
            apiBase = (import.meta.env as any)?.VITE_ZHIPUAI_API_BASE || 'https://open.bigmodel.cn/api/paas/v4';
            model = (import.meta.env as any)?.VITE_ZHIPUAI_MODEL || 'glm-4-flash';
        }

        const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
        if (!isExtension && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            if (deepseekKey) apiBase = '/api/deepseek';
            else if (siliconKey) apiBase = '/api/siliconflow';
            else if (zhipuKey) apiBase = '/api/zhipuai';
        }

        if (!apiKey) {
            setError('No API Key found. Using fallback text.');
            setLoading(false);
            return;
        }

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

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(`${apiBase}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'system', content: systemPrompt }],
                    temperature: 0.8,
                    response_format: { type: "json_object" } // Tell compatible models to output JSON
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('API request failed');

            const result = await response.json();
            const rawText = result.choices?.[0]?.message?.content || "";

            // Clean up backticks if the LLM ignored the "no markdown" rule
            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedText) as DeepCareContent;

            if (parsed.title && parsed.p1 && parsed.p2 && parsed.p3) {
                setContent(parsed);
            } else {
                throw new Error('Invalid JSON structure');
            }

        } catch (err) {
            console.error('Deep Care AI Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }

    }, []);

    return { loading, content, error, fetchAdvice };
}
