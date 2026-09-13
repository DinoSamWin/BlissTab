import { PerspectiveContentTrack, PerspectiveHistory } from '../../types';
import { EngineInput, NoveltyPlan, ResponseStrategy, SceneResolution } from './types';
import { countRecentProductivityLines } from './contentSignals';

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

const REFRESH_TRACK_SEQUENCE: PerspectiveContentTrack[] = [
  'friendly_nudge',
  'small_delight',
  'leisure_outing',
  'social_connection',
  'curiosity_play',
  'home_ritual',
  'everyday_care',
  'object_humor',
  'poetic_glimpse',
  'grounded_observation'
];

const PAGE_RELOAD_TRACKS: PerspectiveContentTrack[] = [
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
  'sensory_reset',
  'unexpected_perspective',
  'life_boundary',
  'permission_pause',
  'playful_boundary',
  'philosophical_zoom_out'
];

/** Manual refreshes rotate by product rule, not by a random model choice. */
export function getRefreshTargetTrack(consecutiveClicks: number): PerspectiveContentTrack {
  const index = (Math.max(1, consecutiveClicks) - 1) % REFRESH_TRACK_SEQUENCE.length;
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
  if (resolution.scene === 'emotional_checkin' || resolution.scene === 'emotional_followup') {
    if (['angry', 'sad', 'anxious', 'exhausted'].includes(input.activeEmotion || '')) {
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

  // A browser reload is an ordinary revisit, not a New Perspective button
  // click. It gets a broad, history-aware pool instead of the fixed sequence.
  if (input.isPageReload && !input.isNewEnvironment) return PAGE_RELOAD_TRACKS;

  if (resolution.scene === 'refresh_loop') {
    return [getRefreshTargetTrack(input.consecutiveClicks)];
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
  const sceneAllowedTracks = allowedTracksFor(input, resolution, strategy);
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

  const forcedRefreshTrack = resolution.scene === 'refresh_loop'
    ? getRefreshTargetTrack(input.consecutiveClicks)
    : undefined;
  let targetTrack: PerspectiveContentTrack;

  if (forcedRefreshTrack) {
    targetTrack = forcedRefreshTrack;
  } else if (input.isPageReload && !input.isNewEnvironment) {
    const freshTracks = sceneAllowedTracks.filter(track => !tracksOnCooldown.has(track));
    const reloadTracks = freshTracks.length > 0 ? freshTracks : sceneAllowedTracks;
    const rankedTracks = reloadTracks.map((track) => {
      const recency = history.findIndex(item => item.contentTrack === track);
      return { track, recency: recency === -1 ? Number.POSITIVE_INFINITY : recency };
    });
    const oldestRecency = Math.max(...rankedTracks.map(item => item.recency));
    const leastRecentlyUsed = rankedTracks.filter(item => item.recency === oldestRecency);
    targetTrack = leastRecentlyUsed[seed % leastRecentlyUsed.length]?.track || sceneAllowedTracks[0];
  } else {
    let selectedIndex = seed % sceneAllowedTracks.length;
    for (let offset = 0; offset < sceneAllowedTracks.length; offset += 1) {
      const candidateIndex = (selectedIndex + offset) % sceneAllowedTracks.length;
      if (!tracksOnCooldown.has(sceneAllowedTracks[candidateIndex])) {
        selectedIndex = candidateIndex;
        break;
      }
    }
    targetTrack = sceneAllowedTracks[selectedIndex];
  }

  const cacheFillTracks = (
    (!input.isManualRefresh || input.isNewEnvironment)
    && !input.clickedEmotion
    && !input.isEmotionFollowup
  )
    ? REFRESH_TRACK_SEQUENCE
    : [];
  const allowedTracks = [
    ...sceneAllowedTracks,
    ...cacheFillTracks.filter(track => !sceneAllowedTracks.includes(track))
  ];

  return {
    targetTrack,
    allowedTracks: [targetTrack, ...allowedTracks.filter(track => track !== targetTrack)],
    cacheFillTracks,
    avoidSemanticCores: recentUnique(history, 'semanticCore', 12).slice(0, 6),
    avoidActions: recentUnique(history, 'actionTag', 6).slice(0, 4),
    avoidObjects: recentUnique(history, 'objectTag', 5).slice(0, 4),
    avoidMetaphors: recentUnique(history, 'metaphorTag', 6).slice(0, 4),
    avoidOpeners: recentUnique(history, 'openerTag', 5).slice(0, 3),
    avoidSentenceShapes: recentUnique(history, 'sentenceShape', 4).slice(0, 3),
    recentTexts: history.slice(0, 3).map(item => item.text.slice(0, 48)),
    recentProductivityCount: countRecentProductivityLines(history),
    rotationReason: forcedRefreshTrack
      ? `manual_refresh_${input.consecutiveClicks}:${forcedRefreshTrack}`
      : input.isPageReload && !input.isNewEnvironment
        ? `page_reload_variety:${targetTrack}`
        : tracksOnCooldown.size > 0
          ? `rotated_away_from:${[...tracksOnCooldown].join(',')}`
          : `daily_scene_seed:${seed % 997}`
  };
}
