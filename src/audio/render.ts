import type { StrikeSpec } from './instruments';

/**
 * Renders a StrikeSpec with Web Audio nodes, scheduled at an exact AudioContext time.
 * Each mode is a sine oscillator with a fast linear attack and an exponential decay
 * (setTargetAtTime with τ = T60 / ln(1000)); the mallet is a band-passed noise burst.
 */
export interface Voice {
  cancel(): void;
}

const LN_1000 = Math.log(1000);
const SILENCE = 0.0001;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

export function renderStrike(
  ctx: BaseAudioContext,
  destination: AudioNode,
  spec: StrikeSpec,
  when: number,
): Voice {
  const start = Math.max(when, ctx.currentTime);
  const sources: AudioScheduledSourceNode[] = [];
  const voice = ctx.createGain();
  voice.gain.value = spec.level;
  voice.connect(destination);

  for (const mode of spec.modes) {
    if (mode.frequency >= ctx.sampleRate / 2) continue;
    const osc = ctx.createOscillator();
    osc.frequency.value = mode.frequency;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(mode.gain, start + spec.attack);
    env.gain.setTargetAtTime(0, start + spec.attack, mode.t60 / LN_1000);
    osc.connect(env).connect(voice);
    osc.start(start);
    osc.stop(start + spec.attack + mode.t60 * 1.2);
    sources.push(osc);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = spec.noise.frequency;
  filter.Q.value = spec.noise.q;
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(spec.noise.gain, start);
  noiseEnv.gain.exponentialRampToValueAtTime(SILENCE, start + spec.noise.duration);
  noise.connect(filter).connect(noiseEnv).connect(voice);
  noise.start(start, Math.random() * 0.5);
  noise.stop(start + spec.noise.duration + 0.01);
  sources.push(noise);

  let remaining = sources.length;
  for (const source of sources) {
    source.onended = () => {
      remaining -= 1;
      if (remaining === 0) voice.disconnect();
    };
  }

  return {
    cancel() {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
      }
    },
  };
}
