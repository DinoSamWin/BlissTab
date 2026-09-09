export const PERSPECTIVE_ENVIRONMENT_SCOPE_KEY = 'focus_tab_perspective_environment_scope_v1';
export const SIGNIFICANT_ENVIRONMENT_GAP_MS = 30 * 60 * 1000;

export type EnvironmentChangeReason =
  | 'first_observation'
  | 'same_environment'
  | 'environment_changed'
  | 'significant_time_gap';

export interface EnvironmentCacheScope {
  fingerprint: string;
  scopeId: string;
  revision: number;
  lastUsedAt: number;
}

export interface EnvironmentCacheDecision extends EnvironmentCacheScope {
  changed: boolean;
  reason: EnvironmentChangeReason;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let volatileScope: EnvironmentCacheScope | undefined;

function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function compactHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function isScope(value: unknown): value is EnvironmentCacheScope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EnvironmentCacheScope>;
  return typeof candidate.fingerprint === 'string'
    && typeof candidate.scopeId === 'string'
    && typeof candidate.revision === 'number'
    && Number.isFinite(candidate.revision)
    && typeof candidate.lastUsedAt === 'number'
    && Number.isFinite(candidate.lastUsedAt);
}

function readScope(storage: StorageLike | undefined): EnvironmentCacheScope | undefined {
  if (!storage) return volatileScope;
  try {
    const parsed = JSON.parse(storage.getItem(PERSPECTIVE_ENVIRONMENT_SCOPE_KEY) || 'null');
    return isScope(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function persistScope(scope: EnvironmentCacheScope, storage: StorageLike | undefined): void {
  if (!storage) {
    volatileScope = scope;
    return;
  }
  try {
    storage.setItem(PERSPECTIVE_ENVIRONMENT_SCOPE_KEY, JSON.stringify(scope));
  } catch {
    volatileScope = scope;
  }
}

/**
 * Keeps reloads and New Perspective clicks in one cache scope while the
 * meaningful environment is stable. A state transition or a quiet 30-minute
 * gap creates a new scope even when an older matching pool still exists.
 */
export function resolveEnvironmentCacheScope(
  fingerprint: string,
  now: number = Date.now(),
  storage: StorageLike | undefined = getBrowserStorage()
): EnvironmentCacheDecision {
  const previous = readScope(storage);
  const elapsed = previous ? now - previous.lastUsedAt : Number.POSITIVE_INFINITY;
  const sameEnvironment = previous?.fingerprint === fingerprint;
  const withinFreshnessWindow = elapsed >= 0 && elapsed < SIGNIFICANT_ENVIRONMENT_GAP_MS;

  if (previous && sameEnvironment && withinFreshnessWindow) {
    const continuedScope = { ...previous, lastUsedAt: now };
    persistScope(continuedScope, storage);
    return { ...continuedScope, changed: false, reason: 'same_environment' };
  }

  const revision = (previous?.revision || 0) + 1;
  const scope: EnvironmentCacheScope = {
    fingerprint,
    revision,
    scopeId: `${now.toString(36)}_${revision.toString(36)}_${compactHash(fingerprint)}`,
    lastUsedAt: now
  };
  persistScope(scope, storage);

  const reason: EnvironmentChangeReason = !previous
    ? 'first_observation'
    : sameEnvironment ? 'significant_time_gap' : 'environment_changed';
  return { ...scope, changed: true, reason };
}

export function clearEnvironmentCacheScope(storage: StorageLike | undefined = getBrowserStorage()): void {
  volatileScope = undefined;
  try {
    storage?.removeItem(PERSPECTIVE_ENVIRONMENT_SCOPE_KEY);
  } catch {
    // The in-memory scope is already cleared.
  }
}
