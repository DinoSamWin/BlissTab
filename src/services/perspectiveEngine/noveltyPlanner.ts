import { PerspectiveContentTrack, PerspectiveHistory } from '../../types';
import { EngineInput, NoveltyPlan, ResponseStrategy, SceneResolution } from './types';

const DEFAULT_TRACKS: PerspectiveContentTrack[] = [
  'grounded_observation',
  'everyday_care',
  'friendly_nudge',
  'small_delight',
  'leisure_outing',
  'social_connection',
  'curiosity_play',
  'home_ritual',
  'object_humor',
  'poetic_glimpse',
  'work_companion'
];

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
      return [
        'friendly_nudge',
        'grounded_observation',
        'everyday_care',
        'permission_pause',
        'sensory_reset',
        'life_boundary'
      ];
    }
    return [
      'friendly_nudge',
      'small_delight',
      'curiosity_play',
      'social_connection',
      'home_ritual',
      'playful_boundary',
      'grounded_observation',
      'unexpected_perspective',
      'object_humor'
    ];
  }

  const isProtectedRestDay = (
    input.dayKind === 'rest_day' || input.dayKind === 'public_holiday'
  ) && !['working', 'overtime', 'workplace_arrival'].includes(input.confirmedWorkStatus || '');

  if (isProtectedRestDay) {
    // A weekend is not a softer workday. Start with life-positive subjects
    // rather than talking about tasks merely to tell the user to ignore them.
    return [
      'leisure_outing',
      'small_delight',
      'curiosity_play',
      'social_connection',
      'home_ritual',
      'everyday_care',
      'friendly_nudge',
      'object_humor',
      'sensory_reset',
      'poetic_glimpse',
      'grounded_observation'
    ];
  }

  if (resolution.scene === 'refresh_loop') {
    return [
      'friendly_nudge',
      'everyday_care',
      'small_delight',
      'leisure_outing',
      'social_connection',
      'curiosity_play',
      'home_ritual',
      'poetic_glimpse',
      'object_humor',
      'grounded_observation'
    ];
  }
  if (resolution.scene === 'overloaded_browser' || strategy === 'reduce') {
    return [
      'work_companion',
      'friendly_nudge',
      'grounded_observation',
      'everyday_care',
      'small_delight',
      'curiosity_play',
      'home_ritual',
      'social_connection',
      'playful_boundary',
      'permission_pause',
      'life_boundary'
    ];
  }

  switch (resolution.baseScene) {
    case 'pre_lunch_transition':
    case 'midday_release':
      return [
        'everyday_care',
        'small_delight',
        'leisure_outing',
        'social_connection',
        'curiosity_play',
        'home_ritual',
        'friendly_nudge',
        'playful_boundary',
        'life_boundary',
        'object_humor',
        'permission_pause',
        'sensory_reset',
        'poetic_glimpse'
      ];
    case 'closing_runway':
    case 'evening_transition':
      return [
        'friendly_nudge',
        'work_companion',
        'everyday_care',
        'small_delight',
        'leisure_outing',
        'social_connection',
        'curiosity_play',
        'home_ritual',
        'playful_boundary',
        'life_boundary',
        'permission_pause',
        'unexpected_perspective',
        'object_humor',
        'poetic_glimpse'
      ];
    case 'late_evening_boundary':
    case 'night_guard':
      return [
        'friendly_nudge',
        'everyday_care',
        'home_ritual',
        'social_connection',
        'curiosity_play',
        'permission_pause',
        'life_boundary',
        'grounded_observation',
        'sensory_reset',
        'unexpected_perspective',
        'poetic_glimpse'
      ];
    case 'post_lunch_reentry':
    case 'afternoon_stretch':
      return [
        'work_companion',
        'everyday_care',
        'friendly_nudge',
        'small_delight',
        'leisure_outing',
        'social_connection',
        'curiosity_play',
        'home_ritual',
        'playful_boundary',
        'sensory_reset',
        'grounded_observation',
        'permission_pause',
        'object_humor',
        'poetic_glimpse'
      ];
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

function localDateForTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

/**
 * Captures the first recorded content direction from recent previous days.
 * This prevents the daily hash from coincidentally choosing the same opening
 * domain several mornings in a row even when the wording itself is new.
 */
function recentDailyOpeningTracks(
  history: PerspectiveHistory[],
  currentLocalDate: string,
  maxDays: number = 4
): PerspectiveContentTrack[] {
  const byDate = new Map<string, PerspectiveContentTrack>();
  for (const item of [...history].sort((a, b) => a.timestamp - b.timestamp)) {
    if (!item.contentTrack) continue;
    const dateKey = localDateForTimestamp(item.timestamp);
    if (dateKey === currentLocalDate || byDate.has(dateKey)) continue;
    byDate.set(dateKey, item.contentTrack);
  }
  return [...byDate.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, maxDays)
    .map(([, track]) => track);
}

export function buildNoveltyPlan(
  input: EngineInput,
  resolution: SceneResolution,
  strategy: ResponseStrategy,
  history: PerspectiveHistory[] = []
): NoveltyPlan {
  const allowedTracks = allowedTracksFor(input, resolution, strategy);
  const recentTracks = history
    .slice(0, 5)
    .map(item => item.contentTrack)
    .filter((track): track is PerspectiveContentTrack => !!track);
  const recentDailyTracks = recentDailyOpeningTracks(history, input.localDate);
  const tracksOnCooldown = new Set([...recentTracks, ...recentDailyTracks]);
  const seed = hashString([
    input.localDate,
    resolution.baseScene,
    resolution.scene,
    input.consecutiveClicks,
    history.length
  ].join(':'));

  let selectedIndex = seed % allowedTracks.length;
  for (let offset = 0; offset < allowedTracks.length; offset += 1) {
    const candidateIndex = (selectedIndex + offset) % allowedTracks.length;
    if (!tracksOnCooldown.has(allowedTracks[candidateIndex])) {
      selectedIndex = candidateIndex;
      break;
    }
  }
  const targetTrack = allowedTracks[selectedIndex];

  return {
    targetTrack,
    allowedTracks: [targetTrack, ...allowedTracks.filter(track => track !== targetTrack)],
    avoidSemanticCores: recentUnique(history, 'semanticCore', 12).slice(0, 6),
    avoidActions: recentUnique(history, 'actionTag', 6).slice(0, 4),
    avoidObjects: recentUnique(history, 'objectTag', 5).slice(0, 4),
    avoidMetaphors: recentUnique(history, 'metaphorTag', 6).slice(0, 4),
    avoidOpeners: recentUnique(history, 'openerTag', 5).slice(0, 3),
    avoidSentenceShapes: recentUnique(history, 'sentenceShape', 4).slice(0, 3),
    recentTexts: history.slice(0, 3).map(item => item.text.slice(0, 48)),
    rotationReason: tracksOnCooldown.size > 0
      ? `rotated_away_from:${[...tracksOnCooldown].join(',')}`
      : `daily_scene_seed:${seed % 997}`
  };
}
