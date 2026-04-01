import { runCompanionPipeline } from './src/services/perspectiveEngine';
import { PerspectiveRouterContext } from './src/types';
import fetch from 'node-fetch';

const DEEPSEEK_API_KEY = 'sk-687d2e7349bb480e8973cf32c86c09f9';

async function generateWithDeepSeek(systemPrompt: string, userPrompt: string) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        })
    });
    const json = await response.json();
    return json.choices[0].message.content;
}

const cases: {name: string, ctx: PerspectiveRouterContext}[] = [
    {
        name: "Case 1: Wed 14:02, 4 tabs, no audio, idle 35 mins, returning",
        ctx: {
           local_time: "14:02",
           is_weekend: false,
           tab_count: 4,
           audio_playing: false,
           idle_time_seconds: 35 * 60,
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 2: Wed 14:02, 22 tabs, no audio, idle 35 mins, returning",
        ctx: {
           local_time: "14:02",
           is_weekend: false,
           tab_count: 22,
           audio_playing: false,
           idle_time_seconds: 35 * 60,
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 3: Mon 09:10, 18 tabs, workday, active",
        ctx: {
           local_time: "09:10",
           is_weekend: false,
           tab_count: 18,
           audio_playing: false,
           idle_time_seconds: 0,
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 4: Sat 15:30, 18 tabs, weekend, active",
        ctx: {
           local_time: "15:30",
           is_weekend: true,
           tab_count: 18,
           audio_playing: false,
           idle_time_seconds: 0,
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 5: Sun 21:20, 2 tabs, normal open",
        ctx: {
           local_time: "21:20",
           is_weekend: true,
           tab_count: 2,
           audio_playing: false,
           idle_time_seconds: 0,
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 6: Clicked tired emoji",
        ctx: {
           local_time: "14:00",
           is_weekend: false,
           tab_count: 5,
           audio_playing: false,
           idle_time_seconds: 0,
           clickedEmotion: "exhausted", // "tired" translates to exhausted in the old enum
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 7: Clicked anxious emoji",
        ctx: {
           local_time: "14:00",
           is_weekend: false,
           tab_count: 5,
           audio_playing: false,
           idle_time_seconds: 0,
           clickedEmotion: "anxious",
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 8: Clicked happy emoji",
        ctx: {
           local_time: "14:00",
           is_weekend: false,
           tab_count: 5,
           audio_playing: false,
           idle_time_seconds: 0,
           clickedEmotion: "happy",
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 9: Weekday 23:40, 16 tabs, active",
        ctx: {
           local_time: "23:40",
           is_weekend: false,
           tab_count: 16,
           audio_playing: false,
           idle_time_seconds: 0,
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 10a: New user, quiet return",
        ctx: {
           local_time: "14:02",
           is_weekend: false,
           tab_count: 4,
           audio_playing: false,
           idle_time_seconds: 35 * 60,
           session_count_today: 1,
           language: "Chinese (Simplified)"
        } as any
    },
    {
        name: "Case 10b: Old user, quiet return",
        ctx: {
           local_time: "14:02",
           is_weekend: false,
           tab_count: 4,
           audio_playing: false,
           idle_time_seconds: 35 * 60,
           session_count_today: 45,
           language: "Chinese (Simplified)"
        } as any
    }
];

async function run() {
    for (const c of cases) {
        console.log(`\n===========================================`);
        console.log(`Executing: ${c.name}`);
        const { system, user, state } = runCompanionPipeline(c.ctx, 'Chinese (Simplified)', 1);
        
        console.log(`[RESOLVED STATE]`);
        console.log(`- Scene:        ${state.sceneResolution.scene}`);
        console.log(`- Intent:       ${state.intent}`);
        console.log(`- Emotion Bias: ${state.emotionBias}`);
        console.log(`- Strategy:     ${state.strategy}`);
        
        console.log(`\n[GENERATING OUTPUT VIA DEEPSEEK...]\n`);
        const result = await generateWithDeepSeek(system, user);
        console.log(result);
        console.log(`===========================================\n`);
    }
}

run().catch(console.error);
