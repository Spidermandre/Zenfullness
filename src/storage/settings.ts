import type { BellSet, Period, SittingConfig } from '../timer/plan';

/**
 * Light settings, kept in localStorage (synchronous, tiny, read at startup).
 * Every field is validated on load; anything missing or malformed falls back to its
 * default, so a corrupted or older value can never break the app.
 */
export interface SavedPreset {
  id: string;
  periods: Period[];
}

export interface Settings {
  version: 1;
  /** 0..1 */
  bellVolume: number;
  /** 0..1 */
  ambientVolume: number;
  /** Last sitting configuration, restored on the Zazen screen. */
  sitting: SittingConfig;
  presets: SavedPreset[];
}

export const STORAGE_KEY = 'zenfullness.settings';

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  bellVolume: 0.8,
  ambientVolume: 0.6,
  sitting: {
    periods: [{ kind: 'zazen', minutes: 25 }],
    prepSeconds: 10,
    bells: 'traditional',
    midBell: false,
    showTime: false,
  },
  presets: [],
};

type Unknown = Record<string, unknown>;

const isObject = (v: unknown): v is Unknown => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const BELL_SETS: readonly BellSet[] = ['traditional', 'inkin', 'wood'];

function periods(v: unknown): Period[] | undefined {
  if (!Array.isArray(v) || v.length === 0 || v.length > 20) return undefined;
  const out: Period[] = [];
  for (const p of v) {
    if (!isObject(p) || (p.kind !== 'zazen' && p.kind !== 'kinhin')) return undefined;
    out.push({ kind: p.kind, minutes: Math.round(num(p.minutes, 25, 1, 120)) });
  }
  return out;
}

function sitting(v: unknown): SittingConfig {
  const d = DEFAULT_SETTINGS.sitting;
  if (!isObject(v)) return d;
  return {
    periods: periods(v.periods) ?? d.periods,
    prepSeconds: num(v.prepSeconds, d.prepSeconds, 0, 300),
    bells: BELL_SETS.find((b) => b === v.bells) ?? d.bells,
    midBell: bool(v.midBell, d.midBell),
    showTime: bool(v.showTime, d.showTime),
  };
}

export function parseSettings(raw: unknown): Settings {
  if (!isObject(raw)) return DEFAULT_SETTINGS;
  const presets = Array.isArray(raw.presets)
    ? raw.presets.flatMap((p): SavedPreset[] => {
        if (!isObject(p) || typeof p.id !== 'string') return [];
        const ps = periods(p.periods);
        return ps ? [{ id: p.id, periods: ps }] : [];
      })
    : [];
  return {
    version: 1,
    bellVolume: num(raw.bellVolume, DEFAULT_SETTINGS.bellVolume, 0, 1),
    ambientVolume: num(raw.ambientVolume, DEFAULT_SETTINGS.ambientVolume, 0, 1),
    sitting: sitting(raw.sitting),
    presets,
  };
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSettings(store: KeyValueStore): Settings {
  try {
    const text = store.getItem(STORAGE_KEY);
    return text ? parseSettings(JSON.parse(text)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(store: KeyValueStore, settings: Settings): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or disabled (private mode): settings stay in memory for this visit.
  }
}

/** Two period lists describe the same sequence. */
export function samePeriods(a: readonly Period[], b: readonly Period[]): boolean {
  return (
    a.length === b.length && a.every((p, i) => p.kind === b[i]?.kind && p.minutes === b[i].minutes)
  );
}
