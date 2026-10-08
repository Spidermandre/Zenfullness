/**
 * Plays a recorded guided session (declared with `audio:` in the front matter) and
 * keeps it aligned with the session clock: pause/resume follow the session, and after
 * the page was hidden the playhead is corrected if it drifted by more than 0.75 s.
 */
export interface Recording {
  start(): void;
  pause(): void;
  resume(elapsed: number): void;
  sync(elapsed: number): void;
  stop(): void;
}

const MAX_DRIFT = 0.75;

export function createRecording(src: string): Recording {
  const audio = new Audio(src);
  audio.preload = 'auto';
  const play = () => {
    void audio.play().catch(() => undefined);
  };
  return {
    start() {
      audio.currentTime = 0;
      play();
    },
    pause() {
      audio.pause();
    },
    resume(elapsed) {
      audio.currentTime = elapsed;
      play();
    },
    sync(elapsed) {
      if (audio.paused || Math.abs(audio.currentTime - elapsed) <= MAX_DRIFT) return;
      audio.currentTime = elapsed;
    },
    stop() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}
