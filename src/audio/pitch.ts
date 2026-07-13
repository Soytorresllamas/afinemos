import { PitchDetector } from 'pitchy';
import { freqToMidi } from '../music/notes';
import type { PitchReading } from '../music/stableNote';

export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export function createAnalyzer(
  bufferSize: number,
  sampleRate: number,
): (buf: Float32Array) => PitchReading | null {
  const detector = PitchDetector.forFloat32Array(bufferSize);
  return (buf) => {
    const level = rms(buf);
    const [freq, clarity] = detector.findPitch(buf, sampleRate);
    if (!Number.isFinite(freq) || freq <= 0) return null;
    return { midi: freqToMidi(freq), clarity, rms: level };
  };
}
