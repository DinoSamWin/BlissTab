import { PerspectiveRouterContext, WorkSchedule } from '../../types';
import { EngineInput, IdleBucket, TabCountBucket, TimeBlock } from './types';

const DEFAULT_WORK_SCHEDULE: Required<Omit<WorkSchedule, 'workDays'>> = {
  workStart: '09:00',
  lunchStart: '12:00',
  lunchEnd: '13:30',
  workEnd: '18:00'
};
const BROWSER_SIGNAL_MAX_AGE_MS = 2 * 60 * 1000;

function parseMinute(value: string | undefined, fallback: string): number {
  const source = /^\d{2}:\d{2}$/.test(value || '') ? value! : fallback;
  const [hours, minutes] = source.split(':').map(Number);
  return hours * 60 + minutes;
}

function localDateString(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

/**
 * Converts clock time into a product scene boundary. User-configured schedule
 * wins; defaults are only used as low-assumption time anchors.
 */
export function determineTimeBlock(localTimeStr: string, schedule?: WorkSchedule): TimeBlock {
  const nowMinute = parseMinute(localTimeStr, '12:00');
  const workStart = parseMinute(schedule?.workStart, DEFAULT_WORK_SCHEDULE.workStart);
  const lunchStart = parseMinute(schedule?.lunchStart, DEFAULT_WORK_SCHEDULE.lunchStart);
  const lunchEnd = parseMinute(schedule?.lunchEnd, DEFAULT_WORK_SCHEDULE.lunchEnd);
  const workEnd = parseMinute(schedule?.workEnd, DEFAULT_WORK_SCHEDULE.workEnd);

  if (nowMinute < 5 * 60 || nowMinute >= 23 * 60 + 30) return 'late_night';
  if (nowMinute < Math.max(5 * 60, workStart - 90)) return 'early_morning';
  if (nowMinute < workStart + 30) return 'arrival_window';
  if (nowMinute < Math.max(workStart + 30, lunchStart - 40)) return 'morning_focus';
  if (nowMinute < lunchStart) return 'pre_lunch';
  if (nowMinute < lunchEnd) return 'midday_break';
  if (nowMinute < lunchEnd + 60) return 'post_lunch_reset';
  if (nowMinute < Math.max(lunchEnd + 60, workEnd - 75)) return 'afternoon';
  if (nowMinute < workEnd + 30) return 'closing_window';
  if (nowMinute < 21 * 60) return 'evening';
  return 'late_evening';
}

function resolveTabBucket(rawTabCount?: number): TabCountBucket {
  if (rawTabCount === undefined || !Number.isFinite(rawTabCount)) return 'unknown';
  if (rawTabCount <= 4) return 'light';
  if (rawTabCount <= 10) return 'normal';
  if (rawTabCount <= 15) return 'heavy';
  return 'overloaded';
}

function resolveIdle(
  idleTimeSeconds: number | undefined,
  minutesSincePreviousOpen: number | undefined,
  firstOpenToday: boolean
): { idleBucket: IdleBucket; reentryState: EngineInput['reentryState'] } {
  if (idleTimeSeconds !== undefined && Number.isFinite(idleTimeSeconds)) {
    if (idleTimeSeconds >= 30 * 60) return { idleBucket: 'long_away', reentryState: 'recent_return' };
    if (idleTimeSeconds >= 5 * 60) return { idleBucket: 'away', reentryState: 'recent_return' };
    return { idleBucket: 'active', reentryState: 'continuous' };
  }

  // A gap between StartlyTab opens is a weaker signal than system idle. It is
  // useful for re-entry only within the same day, never for the first open.
  if (!firstOpenToday && minutesSincePreviousOpen !== undefined) {
    if (minutesSincePreviousOpen >= 30 && minutesSincePreviousOpen <= 180) {
      return { idleBucket: 'long_away', reentryState: 'recent_return' };
    }
    if (minutesSincePreviousOpen >= 5 && minutesSincePreviousOpen < 30) {
      return { idleBucket: 'away', reentryState: 'recent_return' };
    }
  }

  return { idleBucket: 'unknown', reentryState: 'unknown' };
}

/**
 * Normalizes application context without inventing missing facts. Unknown
 * browser signals remain unknown instead of becoming "1 tab", "silent", or
 * "active".
 */
export function buildEngineInput(context: PerspectiveRouterContext): EngineInput {
  const timeBlock = determineTimeBlock(context.local_time || '12:00', context.work_schedule);
  const browserSignalsAllowed = context.allow_context_sensing === true;
  const browserObservedAt = context.browser_context_observed_at;
  const browserSignalsFresh = browserSignalsAllowed
    && typeof browserObservedAt === 'number'
    && Number.isFinite(browserObservedAt)
    && Math.abs(Date.now() - browserObservedAt) <= BROWSER_SIGNAL_MAX_AGE_MS;
  const tabCountScope = browserSignalsFresh ? context.tab_count_scope || 'unknown' : 'unknown';
  const rawTabCount = browserSignalsFresh
    && tabCountScope === 'all_browser_tabs'
    && context.tab_count !== undefined
    ? context.tab_count
    : undefined;
  const tabCountBucket = resolveTabBucket(rawTabCount);
  const audibleStateKnown = browserSignalsFresh && context.audio_playing !== undefined;
  const firstOpenToday = context.first_open_today ?? context.session_count_today === 0;
  const idleSeconds = browserSignalsFresh ? context.idle_time_seconds : undefined;
  const { idleBucket, reentryState } = resolveIdle(
    idleSeconds,
    context.minutes_since_previous_open,
    firstOpenToday
  );

  const inferredDayKind = context.day_kind
    || (context.is_weekend ? 'rest_day' : 'workday');
  const trigger = context.trigger
    || (context.clickedEmotion ? 'emotion_click' : context.isManualRefresh ? 'manual_refresh' : 'initial_open');
  const lastHistoryBlock = context.recent_history?.[0]?.timeBlock;
  const weatherKnown = !!context.weather && !['unknown', 'sunny'].includes(context.weather.toLowerCase());
  const screenModeKnown = browserSignalsFresh
    && (context.window_state !== undefined || context.is_fullscreen !== undefined);
  const customThemes = (context.custom_themes || [])
    .filter((theme): theme is string => typeof theme === 'string')
    .map(theme => theme.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 3);

  return {
    localDate: context.local_date || localDateString(),
    weekday: Number.isInteger(context.weekday) ? context.weekday : new Date().getDay(),
    timeBlock,
    dayKind: inferredDayKind,
    isWeekend: context.is_weekend,
    holidayPhase: context.holiday_phase || 'none',
    holidayDayIndex: context.holiday_day_index,
    daysToHoliday: context.days_to_holiday,
    daysSinceHoliday: context.days_since_holiday,
    confirmedWorkStatus: context.confirmed_work_status,

    tabCountBucket,
    tabCountScope,
    hasAudibleTab: audibleStateKnown ? !!context.audio_playing : false,
    audibleStateKnown,
    audibleTabCount: audibleStateKnown && context.audio_playing ? 1 : 0,
    idleBucket,
    reentryState,

    clickedEmotion: context.clickedEmotion,
    trigger,
    rawTabCount,
    rawIdleMinutes: idleSeconds === undefined ? undefined : Math.floor(idleSeconds / 60),
    minutesSincePreviousOpen: context.minutes_since_previous_open,
    sessionDurationMinutes: context.session_duration_minutes,
    consecutiveClicks: Math.max(1, context.consecutiveClicks || 1),
    isNewUser: context.isNewUser ?? (context.recent_history?.length || 0) < 10,
    isFirstInTimeBlock: context.isFirstInTimeBlock ?? lastHistoryBlock !== timeBlock,
    isManualRefresh: trigger === 'manual_refresh',
    tabSwitches10m: browserSignalsFresh ? context.tab_switches_10m : undefined,

    weather: weatherKnown ? context.weather : undefined,
    weatherKnown,
    userLanguage: context.language,
    screenMode: screenModeKnown
      ? (context.is_fullscreen ? 'fullscreen' : context.window_state || 'normal')
      : undefined,
    screenModeKnown,
    selectedPersona: context.selectedPersona || 'soulmate',
    customThemes,

    confidence: {
      time: 'high',
      calendar: context.day_kind ? 'high' : 'medium',
      browser: rawTabCount === undefined ? 'unknown' : 'high',
      reentry: idleSeconds !== undefined ? 'high' : reentryState === 'recent_return' ? 'medium' : 'unknown',
      emotion: context.clickedEmotion ? 'high' : 'unknown'
    }
  };
}
