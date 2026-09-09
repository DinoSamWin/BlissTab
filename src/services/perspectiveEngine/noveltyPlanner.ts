import { PerspectiveContentTrack, PerspectiveHistory } from '../../types';
import { EngineInput, NoveltyPlan, ResponseStrategy, SceneResolution } from './types';

const DEFAULT_TRACKS: PerspectiveContentTrack[] = [
  'playful_boundary',
  'grounded_observation',
  'life_boundary',
  'permission_pause',
  'object_humor',
  'sensory_reset',
  'unexpected_perspective'
];

const REFRESH_TRACK_SEQUENCE: PerspectiveContentTrack[] = [
  'sensory_reset',
  'object_humor',
  'playful_boundary',
  'life_boundary',
  'philosophical_zoom_out',
  'permission_pause'
];

/** Manual refreshes rotate by product rule, not by a random model choice. */
export function getRefreshTargetTrack(consecutiveClicks: number): PerspectiveContentTrack {
  const index = Math.min(Math.max(1, consecutiveClicks), REFRESH_TRACK_SEQUENCE.length) - 1;
  return REFRESH_TRACK_SEQUENCE[index];
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function allowedTracksFor(
  input: EngineInput,
  resolution: SceneResolution,
  strategy: ResponseStrategy
): PerspectiveContentTrack[] {
  if (resolution.scene === 'emotional_checkin') {
    if (['angry', 'sad', 'anxious', 'exhausted'].includes(input.clickedEmotion || '')) {
      return ['grounded_observation', 'permission_pause', 'sensory_reset', 'life_boundary'];
    }
    return ['playful_boundary', 'grounded_observation', 'unexpected_perspective', 'object_humor'];
  }

  if (resolution.scene === 'refresh_loop') {
    return [getRefreshTargetTrack(input.consecutiveClicks)];
  }
  if (resolution.scene === 'overloaded_browser' || strategy === 'reduce') {
    return ['playful_boundary', 'grounded_observation', 'permission_pause', 'life_boundary'];
  }

  switch (resolution.baseScene) {
    case 'pre_lunch_transition':
    case 'midday_release':
      return ['playful_boundary', 'life_boundary', 'object_humor', 'permission_pause', 'sensory_reset'];
    case 'closing_runway':
    case 'evening_transition':
      return ['playful_boundary', 'life_boundary', 'permission_pause', 'unexpected_perspective', 'object_humor'];
    case 'late_evening_boundary':
    case 'night_guard':
      return ['permission_pause', 'life_boundary', 'grounded_observation', 'sensory_reset', 'unexpected_perspective'];
    case 'post_lunch_reentry':
    case 'afternoon_stretch':
      return ['playful_boundary', 'sensory_reset', 'grounded_observation', 'permission_pause', 'object_humor'];
    default:
      return DEFAULT_TRACKS;
  }
}

function recentUnique(history: PerspectiveHistory[], key: keyof PerspectiveHistory, count: number): string[] {
  const values = history
    .slice(0, count)
    .map(item => item[key])
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
  return [...new Set(values)];
}

export function buildNoveltyPlan(
  input: EngineInput,
  resolution: SceneResolution,
  strategy: ResponseStrategy,
  history: PerspectiveHistory[] = []
): NoveltyPlan {
  const allowedTracks = allowedTracksFor(input, resolution, strategy);
  const recentTracks = history
    .slice(0, 2)
    .map(item => item.contentTrack)
    .filter((track): track is PerspectiveContentTrack => !!track);
  const seed = hashString([
    input.localDate,
    resolution.baseScene,
    resolution.scene,
    input.consecutiveClicks,
    history.length
  ].join(':'));

  const forcedRefreshTrack = resolution.scene === 'refresh_loop'
    ? getRefreshTargetTrack(input.consecutiveClicks)
    : undefined;
  let targetTrack: PerspectiveContentTrack;

  if (forcedRefreshTrack) {
    targetTrack = forcedRefreshTrack;
  } else {
    let selectedIndex = seed % allowedTracks.length;
    for (let offset = 0; offset < allowedTracks.length; offset += 1) {
      const candidateIndex = (selectedIndex + offset) % allowedTracks.length;
      if (!recentTracks.includes(allowedTracks[candidateIndex])) {
        selectedIndex = candidateIndex;
        break;
      }
    }
    targetTrack = allowedTracks[selectedIndex];
  }

  return {
    targetTrack,
    allowedTracks: [targetTrack, ...allowedTracks.filter(track => track !== targetTrack)],
    avoidSemanticCores: recentUnique(history, 'semanticCore', 20).slice(0, 10),
    avoidActions: recentUnique(history, 'actionTag', 8).slice(0, 6),
    avoidObjects: recentUnique(history, 'objectTag', 6).slice(0, 5),
    avoidMetaphors: recentUnique(history, 'metaphorTag', 10).slice(0, 8),
    avoidOpeners: recentUnique(history, 'openerTag', 8).slice(0, 6),
    avoidSentenceShapes: recentUnique(history, 'sentenceShape', 5).slice(0, 4),
    recentTexts: history.slice(0, 2).map(item => item.text.slice(0, 48)),
    rotationReason: forcedRefreshTrack
      ? `manual_refresh_${Math.min(input.consecutiveClicks, REFRESH_TRACK_SEQUENCE.length)}:${forcedRefreshTrack}`
      : recentTracks.length > 0
        ? `rotated_away_from:${recentTracks.join(',')}`
        : `daily_scene_seed:${seed % 997}`
  };
}
