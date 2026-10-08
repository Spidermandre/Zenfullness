import { pickItalianVoice } from './voice';

/**
 * Text-to-speech in Italian with the Web Speech API.
 * iOS only speaks after a user gesture: call `unlockSpeech()` inside the start tap.
 * If the browser has no speech synthesis, every function is a silent no-op and the
 * instructions are only shown as text.
 */
const synth: SpeechSynthesis | undefined =
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined;

export function isSpeechSupported(): boolean {
  return synth !== undefined;
}

function voice(): SpeechSynthesisVoice | undefined {
  return synth ? pickItalianVoice(synth.getVoices()) : undefined;
}

export function unlockSpeech(): void {
  if (!synth) return;
  synth.cancel();
  const silent = new SpeechSynthesisUtterance(' ');
  silent.volume = 0;
  synth.speak(silent);
}

export function speak(text: string): void {
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/\n+/g, ' '));
  const v = voice();
  if (v) utterance.voice = v;
  utterance.lang = v?.lang ?? 'it-IT';
  utterance.rate = 0.88;
  utterance.pitch = 1;
  synth.speak(utterance);
}

export function stopSpeech(): void {
  synth?.cancel();
}
