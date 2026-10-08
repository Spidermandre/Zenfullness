import { cuePlayer, setBusVolume, unlockAudio } from '../audio/engine';
import { wholeBreaths } from '../breath/patterns';
import type { BreathConfig } from '../breath/session';
import { findSession } from '../sessions/catalog';
import type { GuidedSession } from '../sessions/format';
import { startGuided } from '../sessions/session';
import { isSpeechSupported, unlockSpeech } from '../sessions/speech';
import { buildPlan, type SittingConfig } from '../timer/plan';
import type { PracticeState } from '../timer/practice';
import { startAmbient } from './ambient';
import { loadActive, saveActive, shouldRestore, clearActive } from './persist';
import { currentPractice, openPractice } from './practice';
import { createBreathing } from './screens/Breath';
import { createSitting } from './screens/Sitting';
import { getSettings, updateSettings } from './useSettings';

/**
 * Starting (and restoring) practices.
 * `launch*` must be called synchronously inside the user's tap: iOS only allows audio
 * and speech to start from a gesture. A second tap while a practice is already open is
 * ignored (no double bells). Every state change is saved, so `restorePractice` can
 * bring a practice back after a reload or after iOS closed the app.
 */
export function launchSitting(
  config: SittingConfig,
  restore?: PracticeState,
  startedAt = Date.now(),
): void {
  if (currentPractice()) return;
  if (!restore) unlockAudio();
  if (config.ambient && !restore) startAmbient();
  const sitting = createSitting(config, {
    ...(restore ? { restore } : {}),
    onChange: (state) => {
      saveActive({ kind: 'sitting', startedAt, config, state });
    },
  });
  openPractice({ kind: 'sitting', config, sitting, startedAt });
}

export function launchBreath(
  config: BreathConfig,
  detail: string,
  restore?: PracticeState,
  startedAt = Date.now(),
): void {
  if (currentPractice()) return;
  if (!restore) unlockAudio();
  if (config.ambient && !restore) startAmbient();
  const breathing = createBreathing(config, {
    ...(restore ? { restore } : {}),
    onChange: (state) => {
      saveActive({ kind: 'breath', startedAt, config, detail, state });
    },
  });
  openPractice({ kind: 'breath', config, breathing, detail, startedAt });
}

export function launchGuided(
  session: GuidedSession,
  restore?: { state: PracticeState; voice: boolean; ambient: boolean; startedAt: number },
): void {
  if (currentPractice()) return;
  const settings = getSettings();
  const voice = restore?.voice ?? (settings.guided.voice && isSpeechSupported() && !session.audio);
  const ambient = restore?.ambient ?? settings.guided.ambient;
  const startedAt = restore?.startedAt ?? Date.now();
  if (!restore) {
    unlockAudio();
    if (voice) unlockSpeech();
    if (ambient) startAmbient();
    updateSettings((s) => ({ ...s, guided: { ...s.guided, last: session.id } }));
  }
  setBusVolume('bells', settings.bellVolume);
  const guided = startGuided(session, {
    now: () => Date.now(),
    player: cuePlayer(),
    ...(restore ? { restore: restore.state } : {}),
    onChange: (state) => {
      saveActive({ kind: 'guided', startedAt, sessionId: session.id, voice, ambient, state });
    },
  });
  openPractice({ kind: 'guided', guided, voice, ambient, startedAt });
}

/**
 * Called once at startup. Brings back a practice interrupted by a reload or by iOS
 * closing the app, if it is still running, paused, or ended less than 10 minutes ago.
 * Audio stays silent until the next tap (iOS rule); the screen says so.
 * The ambient soundscape is not restored.
 */
export function restorePractice(now = Date.now()): void {
  const active = loadActive();
  if (!active) return;
  try {
    if (active.kind === 'sitting') {
      // Totals come from the pure plans: never build a practice just to measure it
      // (that would schedule its bells).
      if (!shouldRestore(active.state, buildPlan(active.config).total, now)) {
        clearActive();
        return;
      }
      launchSitting({ ...active.config, ambient: false }, active.state, active.startedAt);
    } else if (active.kind === 'breath') {
      const total = wholeBreaths(active.config.phases, active.config.minutes);
      if (!shouldRestore(active.state, total, now)) {
        clearActive();
        return;
      }
      launchBreath(
        { ...active.config, ambient: false },
        active.detail,
        active.state,
        active.startedAt,
      );
    } else {
      const session = findSession(active.sessionId);
      if (!session || !shouldRestore(active.state, session.minutes * 60, now)) {
        clearActive();
        return;
      }
      launchGuided(session, {
        state: active.state,
        voice: active.voice,
        ambient: false,
        startedAt: active.startedAt,
      });
    }
  } catch {
    clearActive();
  }
}
