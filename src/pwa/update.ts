import { useEffect, useState, useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { activity } from './activity';

/**
 * Service-worker lifecycle.
 *
 * The app is precached for offline use. When a new version is deployed, the new
 * service worker installs in the background and WAITS. We only offer to activate it
 * (which reloads the page) when no practice is in progress, so an update can never
 * interrupt a sitting. If the user ignores the offer, the new version activates by
 * itself the next time the app is fully closed and reopened.
 */
export type OfflineState = 'pending' | 'ready' | 'unsupported';

interface UpdateState {
  needRefresh: boolean;
  offline: OfflineState;
}

let state: UpdateState = {
  needRefresh: false,
  offline:
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'pending' : 'unsupported',
};
const listeners = new Set<() => void>();
let applyUpdate: ((reload?: boolean) => Promise<void>) | undefined;

function set(partial: Partial<UpdateState>): void {
  state = { ...state, ...partial };
  for (const listener of listeners) listener();
}

export function initServiceWorker(): void {
  if (state.offline === 'unsupported') return;
  applyUpdate = registerSW({
    onNeedRefresh: () => {
      set({ needRefresh: true });
    },
    onOfflineReady: () => {
      set({ offline: 'ready' });
    },
    onRegisteredSW: (_url, registration) => {
      if (registration?.active) set({ offline: 'ready' });
    },
    onRegisterError: () => {
      set({ offline: 'unsupported' });
    },
  });
}

export function applyPendingUpdate(): void {
  if (activity.isPracticing()) return;
  void applyUpdate?.(true);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUpdateState(): UpdateState {
  return useSyncExternalStore(subscribe, () => state);
}

export function usePracticing(): boolean {
  const [practicing, setPracticing] = useState(activity.isPracticing());
  useEffect(() => activity.subscribe(setPracticing), []);
  return practicing;
}
