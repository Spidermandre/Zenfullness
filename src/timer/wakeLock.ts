/**
 * Keeps the screen on during a practice.
 *
 * Uses the Screen Wake Lock API and re-acquires the lock whenever the page becomes
 * visible again (browsers release it automatically when the page is hidden).
 * Fallback, only when the API is missing or refuses: a tiny muted, invisible video fed
 * by a canvas stream, played in a loop — playing media keeps most mobile browsers from
 * dimming the screen. iOS 18.4+ (including the installed PWA) supports the real API.
 */
export type WakeLockMode = 'api' | 'video' | 'none';

export interface WakeLockHandle {
  mode(): WakeLockMode;
  release(): void;
}

function startVideoFallback(): (() => void) | undefined {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext('2d');
    if (!context || typeof canvas.captureStream !== 'function') return undefined;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.style.position = 'fixed';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.srcObject = canvas.captureStream(1);
    document.body.appendChild(video);
    // Repaint once a second so the stream stays live.
    let tick = 0;
    const id = window.setInterval(() => {
      tick = 1 - tick;
      context.fillStyle = tick ? 'black' : 'white';
      context.fillRect(0, 0, 2, 2);
    }, 1000);
    void video.play().catch(() => undefined);
    return () => {
      window.clearInterval(id);
      video.pause();
      video.srcObject = null;
      video.remove();
    };
  } catch {
    return undefined;
  }
}

export function keepScreenOn(): WakeLockHandle {
  let sentinel: WakeLockSentinel | undefined;
  let stopVideo: (() => void) | undefined;
  let mode: WakeLockMode = 'none';
  let released = false;
  const isReleased = () => released;

  const fallback = () => {
    if (stopVideo || released) return;
    stopVideo = startVideoFallback();
    mode = stopVideo ? 'video' : 'none';
  };

  const acquire = async () => {
    if (released || document.visibilityState !== 'visible') return;
    if (!('wakeLock' in navigator)) {
      fallback();
      return;
    }
    try {
      sentinel = await navigator.wakeLock.request('screen');
      mode = 'api';
      // The practice may have ended while the request was pending.
      if (isReleased()) void sentinel.release();
    } catch {
      fallback();
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire();
  };

  document.addEventListener('visibilitychange', onVisibility);
  void acquire();

  return {
    mode: () => mode,
    release() {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel && !sentinel.released) void sentinel.release();
      stopVideo?.();
    },
  };
}
