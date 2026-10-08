import { getSoundscape, setBusVolume } from '../audio/engine';
import { getSettings } from './useSettings';

/** Fade-out at the end of a practice: long and soft. */
export const PRACTICE_FADE_OUT = 8;

/** Starts (or updates) the ambient soundscape with the saved mix and volume. */
export function startAmbient(fadeIn?: number): void {
  const { mix, ambientVolume } = getSettings();
  setBusVolume('ambient', ambientVolume);
  getSoundscape().play(mix, fadeIn);
}

export function stopAmbient(fadeOut?: number): void {
  getSoundscape().stop(fadeOut);
}
