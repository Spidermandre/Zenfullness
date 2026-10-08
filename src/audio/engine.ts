import { strikeSpec } from './instruments';
import { renderStrike, type Voice } from './render';
import type { Random } from './random';
import type { Instrument } from '../timer/plan';
import type { CuePlayer } from '../timer/scheduler';
import { createSoundscapePlayer, type SoundscapePlayer } from './soundscapes/player';

/**
 * The single AudioContext of the app and its mixing buses.
 *
 *   bells ─┐
 *          ├─ master ─ limiter ─ destination
 *   ambient┘
 *
 * Browsers only allow audio to start from a user gesture: call `unlockAudio()`
 * synchronously inside the click/tap handler that starts a practice.
 *
 * Without Web Audio (or if the context cannot be created) every function degrades to a
 * silent no-op: practices still run on the absolute clock, only without sound.
 */
interface AudioSessionLike {
  type: string;
}

interface Engine {
  ctx: AudioContext;
  bells: GainNode;
  ambient: GainNode;
}

let engine: Engine | null | undefined;

export function isAudioSupported(): boolean {
  return typeof window !== 'undefined' && 'AudioContext' in window;
}

function create(): Engine | null {
  if (!isAudioSupported()) return null;
  try {
    const ctx = new AudioContext({ latencyHint: 'playback' });
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    limiter.connect(ctx.destination);
    const master = ctx.createGain();
    master.connect(limiter);
    const bells = ctx.createGain();
    bells.connect(master);
    const ambient = ctx.createGain();
    ambient.connect(master);
    return { ctx, bells, ambient };
  } catch {
    return null;
  }
}

function getEngine(): Engine | null {
  if (engine === undefined) engine = create();
  return engine;
}

/** Seconds on the audio clock (or a monotonic clock when there is no audio). */
export function audioNow(): number {
  return getEngine()?.ctx.currentTime ?? performance.now() / 1000;
}

/**
 * Must run inside a user gesture. Resumes the context, plays one silent sample (needed
 * by older iOS to fully unlock) and asks iOS to treat our sound as media playback so
 * it is audible even when the ring/silent switch is set to silent (iOS 17+).
 */
export function unlockAudio(): void {
  const session = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  if (session) {
    try {
      session.type = 'playback';
    } catch {
      // Not allowed in this browser; sound will follow the silent switch.
    }
  }
  const e = getEngine();
  if (!e) return;
  if (e.ctx.state !== 'running') void e.ctx.resume().catch(() => undefined);
  const silent = e.ctx.createBufferSource();
  silent.buffer = e.ctx.createBuffer(1, 1, e.ctx.sampleRate);
  silent.connect(e.ctx.destination);
  silent.start();
}

/** Tries to resume a context suspended by the OS (works best inside a tap). */
export function resumeAudio(): void {
  const e = getEngine();
  if (e && e.ctx.state !== 'running') void e.ctx.resume().catch(() => undefined);
}

/** False when the OS has suspended audio (e.g. after a reload, until the next tap). */
export function isAudioRunning(): boolean {
  const e = getEngine();
  return !e || e.ctx.state === 'running';
}

/** Calls `listener(running)` whenever the audio context starts or stops running. */
export function onAudioState(listener: (running: boolean) => void): () => void {
  const e = getEngine();
  if (!e) return () => undefined;
  const ctx = e.ctx;
  const handler = () => {
    listener(ctx.state === 'running');
  };
  ctx.addEventListener('statechange', handler);
  return () => {
    ctx.removeEventListener('statechange', handler);
  };
}

/** Sets a bus volume with a short ramp to avoid clicks. `volume` is 0..1 (perceptual). */
export function setBusVolume(bus: 'bells' | 'ambient', volume: number): void {
  const e = getEngine();
  if (!e) return;
  const gain = e[bus].gain;
  const now = e.ctx.currentTime;
  gain.cancelScheduledValues(now);
  gain.setTargetAtTime(Math.max(0, Math.min(1, volume)) ** 2, now, 0.05);
}

const SILENT_VOICE: Voice = { cancel: () => undefined };

export function strike(
  instrument: Instrument,
  when: number,
  random: Random = Math.random,
  gain = 1,
): Voice {
  const e = getEngine();
  if (!e) return SILENT_VOICE;
  return renderStrike(e.ctx, e.bells, strikeSpec(instrument, random, gain), when);
}

/** Plays a single strike right now (previews, "Prova"). Call inside a tap. */
export function strikeNow(instrument: Instrument): void {
  unlockAudio();
  strike(instrument, audioNow());
}

/** Plays timed cues on the audio clock: used by every practice. */
export function cuePlayer(): CuePlayer {
  return {
    now: audioNow,
    play: (cue, when) => strike(cue.instrument, when, Math.random, cue.gain),
  };
}

const SILENT_SOUNDSCAPE: SoundscapePlayer = {
  play: () => undefined,
  stop: () => undefined,
  isPlaying: () => false,
};

let soundscape: SoundscapePlayer | undefined;

/** The single ambient soundscape player, on the ambient bus. */
export function getSoundscape(): SoundscapePlayer {
  const e = getEngine();
  if (!e) return SILENT_SOUNDSCAPE;
  soundscape ??= createSoundscapePlayer(e.ctx, e.ambient);
  return soundscape;
}
