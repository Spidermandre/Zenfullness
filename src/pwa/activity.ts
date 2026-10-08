/**
 * Tracks whether a practice (sitting, breathing, guided session) is in progress.
 * Anything that would disrupt the user — reloading for an app update, for example —
 * checks this first. Kept framework-free so it can be unit-tested.
 */
type Listener = (practicing: boolean) => void;

export interface ActivityTracker {
  /** Marks a practice as started; returns a function that marks it as ended. */
  begin(): () => void;
  isPracticing(): boolean;
  subscribe(listener: Listener): () => void;
}

export function createActivityTracker(): ActivityTracker {
  let active = 0;
  const listeners = new Set<Listener>();
  const emit = () => {
    for (const listener of listeners) listener(active > 0);
  };

  return {
    begin() {
      active += 1;
      emit();
      let ended = false;
      return () => {
        if (ended) return;
        ended = true;
        active -= 1;
        emit();
      };
    },
    isPracticing: () => active > 0,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const activity = createActivityTracker();

/** Whether to show the app-update offer right now. */
export function shouldOfferUpdate(needRefresh: boolean, practicing: boolean): boolean {
  return needRefresh && !practicing;
}
