/**
 * CyberClaw — synthesized cat sounds (Web Audio API, no audio files).
 *
 * The reveal effect for a finished scan plays a short cat vocalisation that
 * matches the verdict:
 *   • danger  → a low, rumbling growl + a sharp hiss (the cat is NOT happy)
 *   • warning → a soft, questioning "mrrow?"
 *   • clean   → a happy two-tone "meow!"
 *
 * Everything is generated on the fly with oscillators + a filter + white-noise
 * hiss so the app ships zero binary audio assets. Playback is best-effort:
 * browsers block audio until the first user gesture, and some environments
 * (SSR / jsdom) have no AudioContext at all — every path is guarded so a
 * failure never breaks the visual reveal.
 */

type SoundVerdict = 'danger' | 'warning' | 'clean';

let ctx: AudioContext | null = null;

/** Lazily create (and resume) a shared AudioContext. Returns null when the
 *  Web Audio API is unavailable or still blocked by the autoplay policy. */
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** One shaped "voice" element: an oscillator swept between two frequencies
 *  through a band-pass-ish filter, faded in/out with a gain envelope. */
function voice(
  audio: AudioContext,
  opts: {
    type: OscillatorType;
    from: number;
    to: number;
    start: number; // seconds offset from now
    duration: number;
    gain: number;
    filter?: BiquadFilterType;
    filterFreq?: number;
    q?: number;
  }
): void {
  const t0 = audio.currentTime + opts.start;
  const osc = audio.createOscillator();
  const amp = audio.createGain();

  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.duration);

  // Smooth attack/decay so nothing clicks.
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(opts.gain, t0 + opts.duration * 0.25);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

  osc.connect(amp);

  if (opts.filter) {
    const filter = audio.createBiquadFilter();
    filter.type = opts.filter;
    filter.frequency.value = opts.filterFreq ?? 1200;
    filter.Q.value = opts.q ?? 1;
    amp.connect(filter);
    filter.connect(audio.destination);
  } else {
    amp.connect(audio.destination);
  }

  osc.start(t0);
  osc.stop(t0 + opts.duration + 0.02);
}

/** Filtered white-noise burst — used for the danger "hiss". */
function hiss(audio: AudioContext, start: number, duration: number, peak: number): void {
  const t0 = audio.currentTime + start;
  const frames = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Slight taper so the noise fades naturally at the tail.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }

  const src = audio.createBufferSource();
  src.buffer = buffer;

  const hp = audio.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 3500;

  const amp = audio.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(hp);
  hp.connect(amp);
  amp.connect(audio.destination);

  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

/**
 * Play the verdict-appropriate cat sound. Safe to call from any handler —
 * it silently no-ops when audio is unavailable or still blocked.
 *
 * @returns true when playback was actually scheduled, false otherwise.
 */
export function playCatSound(verdict: SoundVerdict, enabled = true): boolean {
  if (!enabled) return false;
  const audio = getCtx();
  if (!audio) return false;

  try {
    if (verdict === 'danger') {
      // Low growl rising into a frustrated "mrrow" + a sharp hiss.
      voice(audio, { type: 'sawtooth', from: 140, to: 320, start: 0, duration: 0.45, gain: 0.14, filter: 'lowpass', filterFreq: 900, q: 3 });
      voice(audio, { type: 'triangle', from: 320, to: 180, start: 0.42, duration: 0.5, gain: 0.11, filter: 'bandpass', filterFreq: 700, q: 2 });
      hiss(audio, 0.86, 0.7, 0.16);
    } else if (verdict === 'warning') {
      // A soft, questioning double "mrrow?" — rising then gently falling.
      voice(audio, { type: 'triangle', from: 420, to: 640, start: 0, duration: 0.28, gain: 0.1, filter: 'bandpass', filterFreq: 900, q: 2 });
      voice(audio, { type: 'triangle', from: 640, to: 380, start: 0.3, duration: 0.4, gain: 0.09, filter: 'bandpass', filterFreq: 800, q: 2 });
    } else {
      // Happy two-tone "meow!": a bright rise then a friendly resolution.
      voice(audio, { type: 'triangle', from: 520, to: 760, start: 0, duration: 0.22, gain: 0.12, filter: 'bandpass', filterFreq: 1100, q: 2 });
      voice(audio, { type: 'triangle', from: 760, to: 560, start: 0.24, duration: 0.34, gain: 0.1, filter: 'bandpass', filterFreq: 1000, q: 2 });
      // A chirpy purr tail.
      voice(audio, { type: 'sine', from: 900, to: 1200, start: 0.6, duration: 0.16, gain: 0.06 });
    }
    return true;
  } catch {
    return false;
  }
}

export type { SoundVerdict };
