import { useSyncExternalStore } from 'react';
import type { SittingConfig } from '../timer/plan';
import type { Sitting } from '../timer/session';

/**
 * Which full-screen practice (if any) is on screen. Practices take over the whole app:
 * no tab bar, night theme.
 */
export type Practice = { kind: 'sitting'; config: SittingConfig; sitting: Sitting } | undefined;

let current: Practice;
const listeners = new Set<() => void>();

export function openPractice(practice: Practice): void {
  current = practice;
  for (const listener of listeners) listener();
}

export function closePractice(): void {
  openPractice(undefined);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePractice(): Practice {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => undefined,
  );
}
