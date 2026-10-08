import { useSyncExternalStore } from 'react';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const memory = new Map<string, string>();
const store = storage() ?? {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
};

let current: Settings = loadSettings(store);
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(change: (s: Settings) => Settings): void {
  current = change(current);
  saveSettings(store, current);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings);
}
