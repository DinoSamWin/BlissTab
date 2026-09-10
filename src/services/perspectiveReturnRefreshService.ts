import { determineTimeBlock } from './perspectiveEngine/inputLayer';
import type { TimeBlock } from './perspectiveEngine/types';

export const PERSPECTIVE_REFRESH_CHECKPOINT_KEY = 'startlytab_perspective_refresh_checkpoint_v1';
export const RETURN_REFRESH_MIN_AWAY_MS = 20 * 60 * 1000;
export const RETURN_REFRESH_MAX_STATE_AGE_MS = 4 * 60 * 60 * 1000;

export type PerspectiveStageGroup =
  | 'early'
  | 'morning'
  | 'pre_lunch'
  | 'midday'
  | 'post_lunch'
  | 'afternoon'
  | 'closing'
  | 'evening'
  | 'late_evening'
  | 'night';

export interface PerspectiveRefreshCheckpoint {
  refreshedAt: number;
  localDate: string;
  timeBlock: TimeBlock;
  stageGroup: PerspectiveStageGroup;
}

export type ReturnRefreshReason =
  | 'no_hidden_timestamp'
  | 'away_too_short'
  | 'no_refresh_checkpoint'
  | 'same_state_fresh'
  | 'date_changed'
  | 'stage_changed'
  | 'state_stale';

export interface ReturnRefreshDecision {
  shouldRefresh: boolean;
  reason: ReturnRefreshReason;
  awayMs: number;
  stateAgeMs: number;
  currentTimeBlock: TimeBlock;
  currentStageGroup: PerspectiveStageGroup;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let volatileCheckpoint: PerspectiveRefreshCheckpoint | undefined;

function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function getPerspectiveStageGroup(timeBlock: TimeBlock): PerspectiveStageGroup {
  switch (timeBlock) {
    case 'early_morning':
      return 'early';
    case 'arrival_window':
    case 'morning_focus':
      return 'morning';
    case 'pre_lunch':
      return 'pre_lunch';
    case 'midday_break':
      return 'midday';
    case 'post_lunch_reset':
      return 'post_lunch';
    case 'afternoon':
      return 'afternoon';
    case 'closing_window':
      return 'closing';
    case 'evening':
      return 'evening';
    case 'late_evening':
      return 'late_evening';
    case 'late_night':
      return 'night';
  }
}

function isCheckpoint(value: unknown): value is PerspectiveRefreshCheckpoint {
  if (!value || typeof value !== 'object') return false;
  const checkpoint = value as Partial<PerspectiveRefreshCheckpoint>;
  return typeof checkpoint.refreshedAt === 'number'
    && Number.isFinite(checkpoint.refreshedAt)
    && typeof checkpoint.localDate === 'string'
    && typeof checkpoint.timeBlock === 'string'
    && typeof checkpoint.stageGroup === 'string';
}

export function readPerspectiveRefreshCheckpoint(
  storage: StorageLike | undefined = getBrowserStorage()
): PerspectiveRefreshCheckpoint | undefined {
  if (!storage) return volatileCheckpoint;
  try {
    const parsed = JSON.parse(storage.getItem(PERSPECTIVE_REFRESH_CHECKPOINT_KEY) || 'null');
    return isCheckpoint(parsed) ? parsed : volatileCheckpoint;
  } catch {
    return volatileCheckpoint;
  }
}

export function savePerspectiveRefreshCheckpoint(
  input: { refreshedAt?: number; localDate: string; timeBlock: TimeBlock },
  storage: StorageLike | undefined = getBrowserStorage()
): PerspectiveRefreshCheckpoint {
  const checkpoint: PerspectiveRefreshCheckpoint = {
    refreshedAt: input.refreshedAt ?? Date.now(),
    localDate: input.localDate,
    timeBlock: input.timeBlock,
    stageGroup: getPerspectiveStageGroup(input.timeBlock)
  };
  volatileCheckpoint = checkpoint;
  try {
    storage?.setItem(PERSPECTIVE_REFRESH_CHECKPOINT_KEY, JSON.stringify(checkpoint));
  } catch {
    // The current in-memory render remains valid when storage is unavailable.
  }
  return checkpoint;
}

export function resolveReturnRefreshDecision(input: {
  now: number;
  hiddenAt?: number;
  localDate: string;
  localTime: string;
  checkpoint?: PerspectiveRefreshCheckpoint;
}): ReturnRefreshDecision {
  const currentTimeBlock = determineTimeBlock(input.localTime);
  const currentStageGroup = getPerspectiveStageGroup(currentTimeBlock);
  const awayMs = input.hiddenAt === undefined
    ? 0
    : Math.max(0, input.now - input.hiddenAt);
  const stateAgeMs = input.checkpoint
    ? Math.max(0, input.now - input.checkpoint.refreshedAt)
    : Number.POSITIVE_INFINITY;

  const decision = (shouldRefresh: boolean, reason: ReturnRefreshReason): ReturnRefreshDecision => ({
    shouldRefresh,
    reason,
    awayMs,
    stateAgeMs,
    currentTimeBlock,
    currentStageGroup
  });

  if (input.hiddenAt === undefined) return decision(false, 'no_hidden_timestamp');
  if (awayMs < RETURN_REFRESH_MIN_AWAY_MS) return decision(false, 'away_too_short');
  if (!input.checkpoint) return decision(false, 'no_refresh_checkpoint');
  if (input.localDate !== input.checkpoint.localDate) return decision(true, 'date_changed');
  if (currentStageGroup !== input.checkpoint.stageGroup) return decision(true, 'stage_changed');
  if (stateAgeMs >= RETURN_REFRESH_MAX_STATE_AGE_MS) return decision(true, 'state_stale');
  return decision(false, 'same_state_fresh');
}
