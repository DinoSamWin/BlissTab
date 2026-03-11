export * from './types';
export * from './inputLayer';
export * from './sceneResolver';
export * from './intentResolver';
export * from './emotionBiasResolver';
export * from './strategySelector';
export * from './generator';

import { PerspectiveRouterContext } from '../../types';
import { PipelineState } from './types';
import { buildEngineInput } from './inputLayer';
import { resolveScene } from './sceneResolver';
import { resolveIntent } from './intentResolver';
import { resolveEmotionBias } from './emotionBiasResolver';
import { selectResponseStrategy } from './strategySelector';
import { buildCompanionPrompt } from './generator';

/**
 * The main entry point for the Light Companion Engine.
 * Takes the raw application context and runs it through the deterministic 6-layer pipeline.
 * Returns the prompt strings ready to be sent to the LLM.
 */
export function runCompanionPipeline(context: PerspectiveRouterContext, language: string, batchSize: number = 20): { system: string, user: string, state: PipelineState } {
    // 1. Raw Inputs
    const input = buildEngineInput(context);

    // 2. Scene
    const sceneResolution = resolveScene(input);

    // 3. Intent
    const intent = resolveIntent(sceneResolution);

    // 4. Emotion Bias
    const emotionBias = resolveEmotionBias(input, sceneResolution);

    // 5. Strategy
    const strategy = selectResponseStrategy(sceneResolution, intent, emotionBias);

    // Package the state
    const state: PipelineState = {
        input,
        sceneResolution,
        intent,
        emotionBias,
        strategy,
        constraints: {
            englishWordsRange: [8, 16],
            chineseCharsRange: [12, 24],
            maxLengthChars: 60
        }
    };

    // 6. Generate Prompt
    const { system, user } = buildCompanionPrompt(state, language, batchSize);

    return { system, user, state };
}
