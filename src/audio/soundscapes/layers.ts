import type { Random } from '../random';
import { createDrift, poissonTimes, type Drift } from './modulation';
import { fillNoise, LOOP_SECONDS, type NoiseColor } from './noise';

/**
 * Generative soundscape layers. Each layer is a small Web Audio graph whose parameters
 * are steered by slow random drifts; `tick()` runs about once a second and schedules the
 * next few seconds of changes and events on the audio clock. Nothing is sampled and
 * nothing loops audibly: noise beds use two incommensurate buffer loops, and all
 * movement comes from random processes.
 */
export type LayerId = 'rain' | 'wind' | 'water' | 'drone';

export interface Layer {
  /** Connect this to the layer's level gain. */
  readonly output: AudioNode;
  /** Schedules parameter changes and events up to `now + LOOKAHEAD`. */
  tick(now: number, dt: number): void;
  /** Stops every source immediately (call after the output has faded out). */
  dispose(): void;
}

export const LOOKAHEAD = 3;

const buffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor, seconds: number, random: Random) {
  let cache = buffers.get(ctx);
  if (!cache) {
    cache = new Map();
    buffers.set(ctx, cache);
  }
  const key = `${color}-${String(seconds)}`;
  let buffer = cache.get(key);
  if (!buffer) {
    buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    fillNoise(buffer.getChannelData(0), color, random);
    cache.set(key, buffer);
  }
  return buffer;
}

/** Two looped buffers of incommensurate length, summed. */
function noiseBed(ctx: BaseAudioContext, color: NoiseColor, random: Random) {
  const out = ctx.createGain();
  out.gain.value = 0.7;
  const sources = LOOP_SECONDS.map((seconds) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, color, seconds, random);
    src.loop = true;
    src.connect(out);
    src.start(ctx.currentTime, random() * seconds);
    return src;
  });
  return { out, sources };
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, frequency: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

function gain(ctx: BaseAudioContext, value: number) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function panner(ctx: BaseAudioContext, pan: number): AudioNode & { pan?: AudioParam } {
  if (typeof ctx.createStereoPanner !== 'function') return gain(ctx, 1);
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  return p;
}

interface Steer {
  param: AudioParam;
  drift: Drift;
  /** Seconds for the parameter to glide towards each new target. */
  glide: number;
}

function steer(steers: readonly Steer[], now: number, dt: number) {
  for (const s of steers) s.param.setTargetAtTime(s.drift.next(dt), now, s.glide);
}

function stopAll(sources: readonly AudioScheduledSourceNode[]) {
  for (const s of sources) {
    try {
      s.stop();
    } catch {
      // Already stopped.
    }
  }
}

// ── Rain: a hiss bed, distant rumble, and individual drops at a drifting rate ─────────
export function createRain(ctx: BaseAudioContext, random: Random): Layer {
  const out = gain(ctx, 1);
  const bed = noiseBed(ctx, 'pink', random);
  const hp = filter(ctx, 'highpass', 450);
  const lp = filter(ctx, 'lowpass', 5000);
  const bedGain = gain(ctx, 0.35);
  bed.out.connect(hp).connect(lp).connect(bedGain).connect(out);

  const rumble = noiseBed(ctx, 'brown', random);
  const rumbleLp = filter(ctx, 'lowpass', 280);
  rumble.out.connect(rumbleLp).connect(gain(ctx, 0.25)).connect(out);

  const intensity = createDrift(random, { min: 0.25, max: 1, speed: 0.03, initial: 0.55 });
  const steers: Steer[] = [
    {
      param: lp.frequency,
      drift: createDrift(random, { min: 3200, max: 7500, speed: 0.03 }),
      glide: 4,
    },
    {
      param: bedGain.gain,
      drift: createDrift(random, { min: 0.22, max: 0.45, speed: 0.03 }),
      glide: 5,
    },
  ];
  const dropNoise = noiseBuffer(ctx, 'white', LOOP_SECONDS[0], random);
  let scheduledUntil = ctx.currentTime;

  return {
    output: out,
    tick(now, dt) {
      steer(steers, now, dt);
      const level = intensity.next(dt);
      const from = Math.max(scheduledUntil, now);
      const to = now + LOOKAHEAD;
      for (const at of poissonTimes(random, 3 + 22 * level, from, to)) {
        const src = ctx.createBufferSource();
        src.buffer = dropNoise;
        const bp = filter(ctx, 'bandpass', 1400 + random() * 5000, 2 + random() * 6);
        const env = ctx.createGain();
        const peak = (0.03 + random() * 0.12) * (0.6 + level * 0.4);
        const decay = 0.012 + random() * 0.05;
        env.gain.setValueAtTime(0, at);
        env.gain.linearRampToValueAtTime(peak, at + 0.002);
        env.gain.setTargetAtTime(0, at + 0.002, decay / 3);
        src
          .connect(bp)
          .connect(env)
          .connect(panner(ctx, random() * 1.6 - 0.8))
          .connect(out);
        src.start(at, random() * (LOOP_SECONDS[0] - 0.2));
        src.stop(at + decay * 4 + 0.01);
      }
      scheduledUntil = to;
    },
    dispose() {
      stopAll([...bed.sources, ...rumble.sources]);
      out.disconnect();
    },
  };
}

// ── Wind: band-passed brown noise with slow gusts, two bands drifting across the field ──
export function createWind(ctx: BaseAudioContext, random: Random): Layer {
  const out = gain(ctx, 3.5); // balanced against the other layers (≈ −24 dBFS RMS)
  const steers: Steer[] = [];
  const sources: AudioScheduledSourceNode[] = [];
  const bands = [
    { centre: [220, 700], q: [0.6, 2.2], level: [0.05, 0.55], pan: -0.4 },
    { centre: [350, 1100], q: [0.8, 3], level: [0.03, 0.4], pan: 0.4 },
    { centre: [1300, 2600], q: [5, 12], level: [0, 0.06], pan: 0 },
  ] as const;
  for (const band of bands) {
    const bed = noiseBed(ctx, band.centre[0] > 1000 ? 'pink' : 'brown', random);
    sources.push(...bed.sources);
    const bp = filter(ctx, 'bandpass', (band.centre[0] + band.centre[1]) / 2, band.q[0]);
    const g = gain(ctx, band.level[0]);
    const p = panner(ctx, band.pan);
    bed.out.connect(bp).connect(g).connect(p).connect(out);
    steers.push(
      {
        param: bp.frequency,
        drift: createDrift(random, { min: band.centre[0], max: band.centre[1], speed: 0.08 }),
        glide: 2.5,
      },
      {
        param: bp.Q,
        drift: createDrift(random, { min: band.q[0], max: band.q[1], speed: 0.06 }),
        glide: 3,
      },
      // Gusts: faster, weaker pull, so the wind rises and falls in waves.
      {
        param: g.gain,
        drift: createDrift(random, {
          min: band.level[0],
          max: band.level[1],
          speed: 0.12,
          pull: 0.02,
        }),
        glide: 1.8,
      },
    );
    if (p.pan) {
      steers.push({
        param: p.pan,
        drift: createDrift(random, { min: -0.7, max: 0.7, speed: 0.04, initial: band.pan }),
        glide: 4,
      });
    }
  }
  return {
    output: out,
    tick(now, dt) {
      steer(steers, now, dt);
    },
    dispose() {
      stopAll(sources);
      out.disconnect();
    },
  };
}

// ── Water: a soft stream bed plus resonant "bubbles" that jump in pitch ──────────────
export function createWater(ctx: BaseAudioContext, random: Random): Layer {
  const out = gain(ctx, 1);
  const bed = noiseBed(ctx, 'pink', random);
  const bedLp = filter(ctx, 'lowpass', 1100);
  const bedGain = gain(ctx, 0.28);
  bed.out.connect(bedLp).connect(bedGain).connect(out);

  const bubbleBed = noiseBed(ctx, 'white', random);
  const bubbles = Array.from({ length: 4 }, (_, i) => {
    const bp = filter(ctx, 'bandpass', 500 + i * 250, 18 + random() * 12);
    const g = gain(ctx, 0.5);
    bubbleBed.out
      .connect(bp)
      .connect(g)
      .connect(panner(ctx, (i / 3) * 1.2 - 0.6))
      .connect(out);
    return bp;
  });
  const flow = createDrift(random, { min: 4, max: 12, speed: 0.04 });
  const steers: Steer[] = [
    {
      param: bedLp.frequency,
      drift: createDrift(random, { min: 700, max: 1600, speed: 0.04 }),
      glide: 3,
    },
    {
      param: bedGain.gain,
      drift: createDrift(random, { min: 0.18, max: 0.36, speed: 0.03 }),
      glide: 4,
    },
  ];
  let scheduledUntil = ctx.currentTime;

  return {
    output: out,
    tick(now, dt) {
      steer(steers, now, dt);
      const rate = flow.next(dt);
      const from = Math.max(scheduledUntil, now);
      const to = now + LOOKAHEAD;
      for (const bp of bubbles) {
        for (const at of poissonTimes(random, rate, from, to)) {
          bp.frequency.setTargetAtTime(300 + random() * 1400, at, 0.015 + random() * 0.03);
        }
      }
      scheduledUntil = to;
    },
    dispose() {
      stopAll([...bed.sources, ...bubbleBed.sources]);
      out.disconnect();
    },
  };
}

// ── Drone: a slow, breathing chord on D, partials fading in and out independently ───
export function createDrone(ctx: BaseAudioContext, random: Random): Layer {
  const out = gain(ctx, 0.55); // balanced against the other layers (≈ −24 dBFS RMS)
  const lp = filter(ctx, 'lowpass', 900, 0.5);
  lp.connect(out);
  const base = 73.42; // D2
  const ratios = [1, 1.5, 2, 3, 4, 6];
  const sources: AudioScheduledSourceNode[] = [];
  const steers: Steer[] = [
    {
      param: lp.frequency,
      drift: createDrift(random, { min: 350, max: 1400, speed: 0.015 }),
      glide: 8,
    },
  ];
  ratios.forEach((ratio, i) => {
    const g = gain(ctx, 0);
    g.connect(lp);
    // Two slightly detuned voices per partial give a slow, living beat.
    for (const detune of [-1, 1]) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = base * ratio;
      osc.detune.value = detune * (2 + random() * 4);
      osc.connect(g);
      osc.start();
      sources.push(osc);
    }
    const loudest = 0.22 / (1 + i * 0.6);
    steers.push({
      param: g.gain,
      drift: createDrift(random, {
        min: 0,
        max: loudest,
        speed: 0.012,
        initial: loudest * random(),
      }),
      glide: 10,
    });
  });
  return {
    output: out,
    tick(now, dt) {
      steer(steers, now, dt);
    },
    dispose() {
      stopAll(sources);
      out.disconnect();
    },
  };
}

export const LAYER_FACTORIES: Record<LayerId, (ctx: BaseAudioContext, random: Random) => Layer> = {
  rain: createRain,
  wind: createWind,
  water: createWater,
  drone: createDrone,
};
