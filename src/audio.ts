let context: AudioContext | null = null;

export function unlockAudio(): void {
  const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!context) context = new AudioCtx();
  if (context.state === 'suspended') void context.resume();
}

export function playBeep(): void {
  unlockAudio();
  if (!context) return;
  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(740, now);
  osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(now);
  osc.stop(now + 0.34);
}

export function vibrateAlert(): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate([160, 70, 160]);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
