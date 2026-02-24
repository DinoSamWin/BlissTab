import { TrackType } from '../types';

export const TRACK_AFFINITY_KEY = 'focus_tab_track_affinity';

export interface EngagementData {
    userId?: string;
    trackType: TrackType;
    durationMs: number;
    exitReason: 'REFRESH' | 'NAVIGATE' | 'EMOTION_CLICK' | 'HIDDEN';
}

/**
 * Core: Dwell time preference calculator
 */
export async function updateTrackAffinity(data: EngagementData) {
    if (!data.trackType) return;
    const durationSec = data.durationMs / 1000;
    let affinityDelta = 0;

    // 判定 1：强烈排斥 (Active Reject) - Refresh < 3s = -0.3
    if (data.exitReason === 'REFRESH' && durationSec < 3.0) {
        affinityDelta = -0.3;
    }
    // 判定 2：正常跳出 (Neutral) - Navigate < 3s = 0
    else if ((data.exitReason === 'NAVIGATE' || data.exitReason === 'HIDDEN') && durationSec < 3.0) {
        affinityDelta = 0;
    }
    // 判定 3：有效阅读 (Passive Consume) - Navigate 3s - 10s = +0.05
    else if ((data.exitReason === 'NAVIGATE' || data.exitReason === 'HIDDEN') && durationSec >= 3.0 && durationSec <= 10.0) {
        affinityDelta = +0.05;
    }
    // 判定 4：深度共鸣 (Resonance) - Navigate > 10s = +0.2
    else if ((data.exitReason === 'NAVIGATE' || data.exitReason === 'HIDDEN') && durationSec > 10.0) {
        affinityDelta = +0.2;
    }
    // 判定 5：高价值互动 (Active Engage) - Emotion Click (任意时长) = +0.4
    if (data.exitReason === 'EMOTION_CLICK') {
        affinityDelta = +0.4;
    }

    if (affinityDelta !== 0) {
        await applyAffinityDeltaToUser(data.userId, data.trackType, affinityDelta);
    }
}

export async function getUserAffinity(userId: string | undefined, trackType: TrackType): Promise<number> {
    try {
        const key = userId ? `${TRACK_AFFINITY_KEY}_${userId}` : TRACK_AFFINITY_KEY;
        const data = localStorage.getItem(key);
        if (!data) return 1.0; // Default affinity is 1.0

        const affinities: Record<string, number> = JSON.parse(data);
        return affinities[trackType] ?? 1.0;
    } catch (e) {
        return 1.0;
    }
}

async function applyAffinityDeltaToUser(userId: string | undefined, trackType: TrackType, delta: number) {
    const currentAffinity = await getUserAffinity(userId, trackType);

    let newAffinity = currentAffinity + delta;
    // 边界保护：最低 0.1 (保留极小概率探索)，最高 2.0 (防止信息茧房)
    newAffinity = Math.max(0.1, Math.min(newAffinity, 2.0));

    await saveUserAffinity(userId, trackType, newAffinity);
}

async function saveUserAffinity(userId: string | undefined, trackType: TrackType, affinity: number) {
    try {
        const key = userId ? `${TRACK_AFFINITY_KEY}_${userId}` : TRACK_AFFINITY_KEY;
        const data = localStorage.getItem(key);
        const affinities: Record<string, number> = data ? JSON.parse(data) : {};

        affinities[trackType] = Number(affinity.toFixed(2));

        localStorage.setItem(key, JSON.stringify(affinities));
    } catch (e) {
        console.error('Failed to save track affinity', e);
    }
}

export async function getAllTrackAffinities(userId?: string): Promise<Record<TrackType, number>> {
    return getAllTrackAffinitiesSync(userId);
}

export function getAllTrackAffinitiesSync(userId?: string): Record<TrackType, number> {
    try {
        const key = userId ? `${TRACK_AFFINITY_KEY}_${userId}` : TRACK_AFFINITY_KEY;
        const data = localStorage.getItem(key);
        if (!data) return {} as Record<TrackType, number>;
        return JSON.parse(data);
    } catch {
        return {} as Record<TrackType, number>;
    }
}
