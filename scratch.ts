import { hydrateContext } from './src/services/startlyEngine/1_hydration';
import { RouterEngine } from './src/services/startlyEngine/2_router';

const raw = {
    local_time: "10:10",
    tab_count: 5,
    audio_playing: false,
    download_active: false,
    idle_time_seconds: 0,
    clickedEmotion: null,
    previousEmotion: null,
    isManualRefresh: false,
    refresh_count: 0,
    language: "Chinese (Simplified)",
    familiarity_level: "familiar"
};

try {
    const ctx = hydrateContext(raw as any);
    const result = RouterEngine.evaluate(ctx);
    console.log("Namespace:", result.routing_result.namespace);
    console.log("Pool size:", result.llm_injection.few_shot_pool.length);
} catch (e) {
    console.error("ERROR:", e);
}
