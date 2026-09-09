export interface RefreshStreakState {
  count: number;
  lastAt: number;
}

interface RefreshStreakStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface NavigationPerformance {
  getEntriesByType?: (type: string) => ArrayLike<unknown>;
  navigation?: { type?: number };
}

// v3 is page-reload-only. Earlier versions mixed this count with the
// New Perspective button and must not seed the new revisit policy.
const REFRESH_STREAK_KEY = 'startlytab_page_reload_streak_v3';
export const REFRESH_STREAK_WINDOW_MS = 3 * 60 * 1000;

const EMPTY_STREAK: RefreshStreakState = { count: 0, lastAt: 0 };

function getSessionStorage(): RefreshStreakStorage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage;
  } catch {
    return undefined;
  }
}

export function readRefreshStreak(
  now: number = Date.now(),
  storage: RefreshStreakStorage | undefined = getSessionStorage()
): RefreshStreakState {
  if (!storage) return { ...EMPTY_STREAK };

  try {
    const parsed = JSON.parse(storage.getItem(REFRESH_STREAK_KEY) || 'null') as Partial<RefreshStreakState> | null;
    const count = Number(parsed?.count);
    const lastAt = Number(parsed?.lastAt);
    if (
      !Number.isInteger(count)
      || count < 1
      || !Number.isFinite(lastAt)
      || lastAt <= 0
      || now - lastAt > REFRESH_STREAK_WINDOW_MS
      || lastAt > now + 5000
    ) {
      return { ...EMPTY_STREAK };
    }
    return { count, lastAt };
  } catch {
    return { ...EMPTY_STREAK };
  }
}

export function advanceRefreshStreak(
  now: number = Date.now(),
  storage: RefreshStreakStorage | undefined = getSessionStorage()
): RefreshStreakState {
  const current = readRefreshStreak(now, storage);
  const next = { count: current.count + 1, lastAt: now };
  try {
    storage?.setItem(REFRESH_STREAK_KEY, JSON.stringify(next));
  } catch {
    // In-memory refs in App still preserve the streak for this page lifetime.
  }
  return next;
}

export function resetRefreshStreak(
  storage: RefreshStreakStorage | undefined = getSessionStorage()
): void {
  try {
    storage?.removeItem(REFRESH_STREAK_KEY);
  } catch {
    // Storage is best-effort in hardened browser modes.
  }
}

export function isPageReloadNavigation(
  performanceApi: NavigationPerformance | undefined = typeof performance === 'undefined' ? undefined : performance
): boolean {
  try {
    const navigationEntry = performanceApi?.getEntriesByType?.('navigation')?.[0] as { type?: string } | undefined;
    if (navigationEntry?.type) return navigationEntry.type === 'reload';
    return performanceApi?.navigation?.type === 1;
  } catch {
    return false;
  }
}

/**
 * A normal navigation starts a new page-reload sequence. Browser reloads keep
 * only this revisit count; the New Perspective button is managed separately.
 */
export function initializePageRefreshStreak(
  isReload: boolean = isPageReloadNavigation(),
  now: number = Date.now(),
  storage: RefreshStreakStorage | undefined = getSessionStorage()
): RefreshStreakState & { isReload: boolean } {
  if (!isReload) {
    resetRefreshStreak(storage);
    return { ...EMPTY_STREAK, isReload: false };
  }

  return { ...readRefreshStreak(now, storage), isReload: true };
}
