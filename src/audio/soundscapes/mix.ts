import type { LayerId } from './layers';

/** Which layers play and how loud (0..1 each). Pure data, stored in settings. */
export type Mix = Record<LayerId, { on: boolean; level: number }>;

export const LAYER_IDS: readonly LayerId[] = ['rain', 'wind', 'water', 'drone'];

export const DEFAULT_MIX: Mix = {
  rain: { on: true, level: 0.7 },
  wind: { on: false, level: 0.6 },
  water: { on: false, level: 0.6 },
  drone: { on: true, level: 0.5 },
};

export function activeLayers(mix: Mix): LayerId[] {
  return LAYER_IDS.filter((id) => mix[id].on && mix[id].level > 0);
}

/** "Pioggia · bordone" */
export function mixLabel(mix: Mix, names: Record<LayerId, string>, none: string): string {
  const active = activeLayers(mix);
  if (active.length === 0) return none;
  const words = active.map((id, i) => (i === 0 ? names[id] : names[id].toLowerCase()));
  return words.join(' · ');
}
