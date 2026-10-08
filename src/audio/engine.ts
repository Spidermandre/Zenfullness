import { strikeSpec } from './instruments';
import { renderStrike, type Voice } from './render';
import type { Random } from './random';
import type { Instrument } from '../timer/plan';

/**
 * The single AudioContext of the app and its mixing buses.
 *
 *   bells ─┐
 *          ├─ master ─ limiter ─ destination
 *   ambient┘
 *
 * Browsers only allow audio to start from a user gesture: call `unlockAudio()`
 * synchronously inside the click/tap handler that starts a practice.
 */
interface AudioSessionLike {
  type: string;
}

interface Engine {
  ctx: AudioContext;
  bells: GainNode;
  ambient: GainNode;
}

let engine: Engine | undefined;

export function isAudioSupported(): boolean {
  return typeof window !== 'undefined' && 'AudioContext' in window;
}

function create(): Engine {
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
}

export function getEngine(): Engine {
  engine ??= create();
  return engine;
}

/**
 * Must run inside a user gesture. Resumes the context, plays one silent sample (needed
 * by older iOS to fully unlock) and asks iOS to treat our sound as media playback so
 * it is audible even when the ring/silent switch is set to silent (iOS 17+).
 */
export function unlockAudio(): AudioContext {
  const session = (navigator as Navigator & { audioSession?: AudioSessionLike }).audioSession;
  if (session) {
    try {
      session.type = 'playback';
    } catch {
      // Not allowed in this browser; sound will follow the silent switch.
    }
  }
  const { ctx } = getEngine();
  if (ctx.state !== 'running') void ctx.resume();
  const silent = ctx.createBufferSource();
  silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  silent.connect(ctx.destination);
  silent.start();
  return ctx;
}

/** Sets a bus volume with a short ramp to avoid clicks. `volume` is 0..1 (perceptual). */
export function setBusVolume(bus: 'bells' | 'ambient', volume: number): void {
  const e = getEngine();
  const gain = e[bus].gain;
  const now = e.ctx.currentTime;
  gain.cancelScheduledValues(now);
  gain.setTargetAtTime(Math.max(0, Math.min(1, volume)) ** 2, now, 0.05);
}

export function strike(
  instrument: Instrument,
  when: number,
  random: Random = Math.random,
  gain = 1,
): Voice {
  const e = getEngine();
  return renderStrike(e.ctx, e.bells, strikeSpec(instrument, random, gain), when);
}
