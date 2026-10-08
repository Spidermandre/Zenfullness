import { seededRandom } from '../random';
import { LAYER_FACTORIES, type Layer, type LayerId } from './layers';
import { LAYER_IDS, type Mix } from './mix';

/**
 * Plays a Mix on the ambient bus with soft fades. A once-a-second heartbeat steers the
 * layers; timing-critical events are scheduled ahead on the audio clock, so a late
 * heartbeat only delays the next slow change.
 */
export const FADE_IN = 4;
export const FADE_OUT = 3;
const HEARTBEAT_MS = 1000;

interface Live {
  layer: Layer;
  level: GainNode;
  disposeTimer: number | undefined;
}

export interface SoundscapePlayer {
  /** Fades layers in/out to match `mix`. Starts the heartbeat if needed. */
  play(mix: Mix, fadeIn?: number): void;
  /** Fades everything out, then releases the nodes. */
  stop(fadeOut?: number): void;
  isPlaying(): boolean;
}

export function createSoundscapePlayer(ctx: BaseAudioContext, bus: AudioNode): SoundscapePlayer {
  const live = new Map<LayerId, Live>();
  let heartbeat: number | undefined;
  let lastBeat = 0;
  let playing = false;

  const beat = () => {
    const now = ctx.currentTime;
    const dt = lastBeat ? Math.max(0.1, now - lastBeat) : 1;
    lastBeat = now;
    for (const { layer } of live.values()) layer.tick(now, dt);
  };

  const fadeTo = (node: GainNode, value: number, seconds: number) => {
    const now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(value, now + seconds);
  };

  const release = (id: LayerId, seconds: number) => {
    const entry = live.get(id);
    if (!entry) return;
    fadeTo(entry.level, 0, seconds);
    if (entry.disposeTimer !== undefined) window.clearTimeout(entry.disposeTimer);
    entry.disposeTimer = window.setTimeout(
      () => {
        entry.layer.dispose();
        entry.level.disconnect();
        live.delete(id);
      },
      seconds * 1000 + 200,
    );
  };

  return {
    play(mix, fadeIn = FADE_IN) {
      playing = true;
      for (const id of LAYER_IDS) {
        const want = mix[id].on ? mix[id].level ** 2 : 0;
        let entry = live.get(id);
        if (want === 0) {
          if (entry) release(id, FADE_OUT);
          continue;
        }
        if (!entry) {
          const layer = LAYER_FACTORIES[id](ctx, seededRandom(Math.floor(Math.random() * 2 ** 31)));
          const level = ctx.createGain();
          level.gain.value = 0;
          layer.output.connect(level).connect(bus);
          entry = { layer, level, disposeTimer: undefined };
          live.set(id, entry);
          layer.tick(ctx.currentTime, 1);
        } else if (entry.disposeTimer !== undefined) {
          window.clearTimeout(entry.disposeTimer);
          entry.disposeTimer = undefined;
        }
        fadeTo(entry.level, want, fadeIn);
      }
      heartbeat ??= window.setInterval(beat, HEARTBEAT_MS);
    },
    stop(fadeOut = FADE_OUT) {
      playing = false;
      for (const id of [...live.keys()]) release(id, fadeOut);
      if (heartbeat !== undefined) {
        const id = heartbeat;
        heartbeat = undefined;
        window.setTimeout(
          () => {
            if (!playing) window.clearInterval(id);
            else heartbeat ??= id;
          },
          fadeOut * 1000 + 200,
        );
      }
    },
    isPlaying: () => playing,
  };
}
