/**
 * Session clock based on absolute instants, never on counted ticks.
 *
 * Elapsed time is always derived from wall-clock timestamps (`Date.now()` in the app),
 * so a tab throttled or frozen by the browser shows the right state the moment it
 * wakes up, and the sitting ends at the right instant regardless of timer jitter.
 * All functions are pure: they take the current instant as an argument.
 */
export interface ClockState {
  /** Wall-clock ms when the session started. */
  startedAt: number;
  /** Total ms spent paused in completed pauses. */
  pausedTotal: number;
  /** Wall-clock ms when the current pause began, if paused. */
  pausedAt: number | undefined;
}

export function startClock(now: number): ClockState {
  return { startedAt: now, pausedTotal: 0, pausedAt: undefined };
}

export function pauseClock(state: ClockState, now: number): ClockState {
  if (state.pausedAt !== undefined) return state;
  return { ...state, pausedAt: now };
}

export function resumeClock(state: ClockState, now: number): ClockState {
  if (state.pausedAt === undefined) return state;
  return {
    ...state,
    pausedTotal: state.pausedTotal + Math.max(0, now - state.pausedAt),
    pausedAt: undefined,
  };
}

export function isPaused(state: ClockState): boolean {
  return state.pausedAt !== undefined;
}

/** Elapsed practice time in seconds (pauses excluded). Never negative. */
export function elapsedSeconds(state: ClockState, now: number): number {
  const end = state.pausedAt ?? now;
  return Math.max(0, (end - state.startedAt - state.pausedTotal) / 1000);
}
