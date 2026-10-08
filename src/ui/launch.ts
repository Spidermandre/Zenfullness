import { unlockAudio } from '../audio/engine';
import type { BreathConfig } from '../breath/session';
import type { SittingConfig } from '../timer/plan';
import { startAmbient } from './ambient';
import { openPractice } from './practice';
import { createBreathing } from './screens/Breath';
import { launchGuided } from './screens/Guided';
import { createSitting } from './screens/Sitting';

/**
 * Starting a practice. Must be called synchronously inside the user's tap:
 * iOS only allows audio (and speech) to start from a gesture.
 */
export function launchSitting(config: SittingConfig): void {
  unlockAudio();
  if (config.ambient) startAmbient();
  openPractice({ kind: 'sitting', config, sitting: createSitting(config), startedAt: Date.now() });
}

export function launchBreath(config: BreathConfig, detail: string): void {
  unlockAudio();
  if (config.ambient) startAmbient();
  openPractice({
    kind: 'breath',
    config,
    breathing: createBreathing(config),
    detail,
    startedAt: Date.now(),
  });
}

export { launchGuided };
