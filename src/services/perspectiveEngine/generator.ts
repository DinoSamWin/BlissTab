import { PipelineState } from './types';

/**
 * Generates the strictly constrained prompt based on the resolved pipeline state.
 */
export function buildCompanionPrompt(state: PipelineState, language: string, batchSize: number = 20): { system: string, user: string } {
    const { input, sceneResolution, intent, emotionBias, strategy } = state;
    
    // 1. Dual-Track Routing Logic
    const isEmotionResponse = !!input.clickedEmotion;
    const trackName = isEmotionResponse ? 'EMOTION_RESPONSE' : 'HOMEPAGE_DEFAULT';
    
    // 2. Language Constraints
    const isChinese = language.toLowerCase().includes('zh') || language.toLowerCase().includes('chinese');
    const lengthConstraint = isChinese 
        ? "16-28 characters (理想区间 18-24个字，绝对不能超过 60 个字符，不能少于 12 个字符)" 
        : "10-14 words (Strictly no more than 60 characters, no less than 7 words)";
    
    // 3. System Base Identity
    const systemPrompt = `You are the StartlyTab Light Companion Engine.
Your core mandate: "Turn passive context into emotionally aware micro-support."

ROLE RESTRICTION: You MUST NOT infer the scene, intent, emotion bias, or strategy. These have been deterministically resolved by upstream rule engines. Your ONLY job is to generate text that strictly conforms to the provided contextual parameters.
Use the provided Scene and Strategy as fixed constraints. Do not reinterpret or override them.`;

    // 4. Constructing User Prompt
    let userPrompt = `### GENERATION CONTEXT ###
Track: ${trackName}
Language: ${language}
Output Format: A JSON array containing ${batchSize} objects.
Example: [{"text": "...", "style": "...", "track": "...", "dimension": "example_dim_01"}]

### CORE V2 RULES: Context-Aware Observation ###
1. The line MUST NOT feel like a generic quote or a pseudo-companion sentence.
2. In the HOMEPAGE_DEFAULT route, EVERY line MUST include a subtle but recognizable "context anchor" (e.g., just returned to this page, screen is visibly full, current page is still here, time-of-day rhythm, narrowed present visible scope).
3. Do NOT expose raw metrics (e.g. "you have 15 tabs").
4. Do NOT sound analytical or creepy.
5. Do NOT assume hidden emotional context.
6. Default copy should primarily use "Observation" or "Observation + Light Comment".
7. Avoid: generic poetic lines, pseudo-therapeutic comfort, vague emotional metaphors, weather-only descriptions, and lines that could apply to almost any moment.

`;

    if (isEmotionResponse) {
        userPrompt += `[EMOTION_RESPONSE ROUTE ACTIVATED]\nUser recently clicked emotion: ${input.clickedEmotion}\n\n`;
    } else {
        userPrompt += `[HOMEPAGE_DEFAULT ROUTE ACTIVATED]\n(Do not acknowledge any explicit emotions, just accompany the space)\n\n`;
    }

    userPrompt += `### UPSTREAM RESOLVED STATE ###
- Scene: ${sceneResolution.scene} (Override: ${sceneResolution.isOverride})
- Day Tone Modifier: ${sceneResolution.dayToneModifier || 'None'}
- Intent: ${intent}
- Emotion Bias: ${emotionBias}
- Target Strategy: ${strategy}

### RAW INPUT SIGNALS ###
- TimeBlock: ${input.timeBlock}
- TabCountBucket: ${input.tabCountBucket}
- Has Audible Tab: ${input.hasAudibleTab} (Count: ${input.audibleTabCount})
- Idle State: ${input.idleBucket} (Reentry: ${input.reentryState})
`;

    userPrompt += `
### RESPONSE STRATEGY EXECUTION RULES ###
Based on the Strategy: ${strategy.toUpperCase()}
`;
    // Attach strategy specific rules
    switch(strategy) {
        case 'mirror':
            userPrompt += `-> MIRROR: Gently reflect the physical environment or time context.
[IF Emotion Bias is 'positive'/'okay']: Reflect lightness without sounding cheerful, congratulatory, or weather-generic. Avoid pure environment description with no emotional trace. Keep the tone warm but understated. Example: "这会儿的轻一点，刚刚好。" or "这一点好的感觉，不用急着过去。"
[IF Default]: Reflect without giving advice, directions, or analyzing feelings.\n`;
            break;
        case 'soothe':
            userPrompt += `-> SOOTHE: Catch their current emotional weight gently without probing further or offering solutions. DO NOT command them to relax or breathe. Example: "这会儿不用变轻那么快。" or "这一会儿，不用逼自己太满。" or "下午可以先放轻一点。"\n`;
            break;
        case 'ground':
            userPrompt += `-> GROUND: The line MUST gently narrow attention. It should not be just a description of light, weather, or screen appearance. Give a sense of landing in the present over scenic observation. Have a specific physical landing point. Example: "先只看眼前这一页。" or "眼前这一小块，已经够了。" or "先让目光落在手边这一处就好。"\n`;
            break;
        case 'focus':
            userPrompt += `-> FOCUS: Reduce scope without sounding productive or instructive. Usually happens when the screen is full. You MUST NOT use words like "专注" (focus) or "进入状态" (get into state). Prefer containment over execution pressure. Example: "现在开着的内容有点多，先只看这一件。" or "这一屏已经很满了，先别一起处理。" or "开着的东西不少，先让一件留在前面。"\n`;
            break;
        case 'rhythm':
            userPrompt += `-> RHYTHM: Acknowledge the pacing of the day or week, giving a sense of being caught safely in time. DO NOT be overly poetic or write a diary entry. Example: "下午这段时间，本来就不太利落。" or "周一早上，节奏通常都还没完全起来。" or "周末晚上，很多事都会慢一点。"\n`;
            break;
        case 'reentry':
            // Explicit focus on quiet return based on user feedback
            userPrompt += `-> REENTRY: The line MUST explicitly feel like a gentle return to the moment. It MUST acknowledge resuming (e.g., returning to this page). It should NOT be a generic afternoon observation. It should NOT sound like someone has been emotionally waiting for them. Prefer quiet resuming language over poetic welcoming. Example: "你刚回到这一页。" or "这一页还停在这里。" or "你刚回到这一页，先从这里重新接上。" (DO NOT use "接住你" or "在等你")\n`;
            break;
    }

    userPrompt += `
### HARD CONSTRAINTS ###
1. LENGTH: ${lengthConstraint}. ONE single sentence only.
2. NO EXACT CLOCK TIME: Do not state the time. Focus on the feeling of the TimeBlock.
3. NO THERAPY LANGUAGE: Do not use "take a deep breath", "relax", "you can overcome this", "don't give up". Do not mention the user's inner state explicitly.
4. NO SCOLDING OR PREACHING: No productivity coaching or nagging. 
5. NO EXCLAMATION MARKS (! / ！) & NO QUESTIONS.
6. NO QUOTES, EMOJIS, HASHTAGS, MARKDOWN.
7. NO REPETITION: Make sure all ${batchSize} results are distinct. Assign a unique "dimension" code to each describing the angle (e.g. "desk_shadow", "time_flow").
8. ALL OUTPUTS MUST BE IN JSON EXACT ARRAY. No markdown wrapping block surrounding the array. Just the JSON array starting with '[' and ending with ']'.`;

    return {
        system: systemPrompt,
        user: userPrompt
    };
}
