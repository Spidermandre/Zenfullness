import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  parseSettings,
  samePeriods,
  saveSettings,
  STORAGE_KEY,
  type KeyValueStore,
} from './settings';

function memoryStore(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('settings', () => {
  it('defaults to a single 25-minute zazen with traditional bells', () => {
    expect(loadSettings(memoryStore()).sitting).toEqual({
      periods: [{ kind: 'zazen', minutes: 25 }],
      prepSeconds: 10,
      bells: 'traditional',
      midBell: false,
      showTime: false,
    });
  });

  it('round-trips through storage', () => {
    const store = memoryStore();
    const custom = {
      ...DEFAULT_SETTINGS,
      bellVolume: 0.3,
      presets: [{ id: 'a', periods: [{ kind: 'zazen' as const, minutes: 40 }] }],
    };
    saveSettings(store, custom);
    expect(loadSettings(store)).toEqual(custom);
  });

  it('survives corrupted JSON', () => {
    expect(loadSettings(memoryStore('{not json'))).toEqual(DEFAULT_SETTINGS);
  });

  it('repairs malformed fields one by one', () => {
    const parsed = parseSettings({
      bellVolume: 7,
      ambientVolume: 'loud',
      sitting: { periods: [{ kind: 'nap', minutes: 3 }], prepSeconds: 30, bells: 'gong' },
      presets: [{ id: 1 }, { id: 'ok', periods: [{ kind: 'kinhin', minutes: 999 }] }],
    });
    expect(parsed.bellVolume).toBe(1);
    expect(parsed.ambientVolume).toBe(DEFAULT_SETTINGS.ambientVolume);
    expect(parsed.sitting.periods).toEqual(DEFAULT_SETTINGS.sitting.periods);
    expect(parsed.sitting.prepSeconds).toBe(30);
    expect(parsed.sitting.bells).toBe('traditional');
    expect(parsed.presets).toEqual([{ id: 'ok', periods: [{ kind: 'kinhin', minutes: 120 }] }]);
  });

  it('keeps working when storage throws (private mode)', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => {
      saveSettings(broken, DEFAULT_SETTINGS);
    }).not.toThrow();
  });

  it('validates breath settings', () => {
    const parsed = parseSettings({
      breath: { pattern: 'custom', custom: { inhale: 0, exhale: 50 }, minutes: 7, sound: false },
    });
    expect(parsed.breath).toEqual({
      pattern: 'custom',
      custom: { inhale: 1, holdIn: 2, exhale: 20, holdOut: 2 },
      minutes: DEFAULT_SETTINGS.breath.minutes,
      sound: false,
      haptics: true,
    });
  });

  it('compares sequences', () => {
    const a = [{ kind: 'zazen' as const, minutes: 25 }];
    expect(samePeriods(a, [{ kind: 'zazen', minutes: 25 }])).toBe(true);
    expect(samePeriods(a, [{ kind: 'zazen', minutes: 20 }])).toBe(false);
  });
});
