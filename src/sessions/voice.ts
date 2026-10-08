/**
 * Picks the most natural Italian voice the device offers. Pure, so it is testable;
 * the browser's voice list is passed in.
 */
export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
}

const QUALITY = /premium|enhanced|neural|natural|siri/i;
/** Voices known to sound good on Apple devices and Android. */
const PREFERRED = /alice|federica|emma|paola|luca|google italiano/i;

export function scoreVoice(voice: VoiceLike): number {
  const lang = voice.lang.toLowerCase().replace('_', '-');
  if (!lang.startsWith('it')) return -1;
  let score = 0;
  if (lang === 'it-it') score += 4;
  if (QUALITY.test(voice.name)) score += 8;
  if (PREFERRED.test(voice.name)) score += 2;
  // Offline voices keep working without network.
  if (voice.localService) score += 3;
  return score;
}

export function pickItalianVoice<V extends VoiceLike>(voices: readonly V[]): V | undefined {
  let best: V | undefined;
  let bestScore = -1;
  for (const voice of voices) {
    const score = scoreVoice(voice);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}
