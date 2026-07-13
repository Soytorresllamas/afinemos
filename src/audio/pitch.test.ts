import { describe, expect, it } from 'vitest';
import { createAnalyzer, rms } from './pitch';

const SAMPLE_RATE = 44100;
const SIZE = 2048;

function sine(freq: number, amplitude = 0.5): Float32Array {
  const buf = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    buf[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return buf;
}

describe('pitch', () => {
  it('calcula RMS', () => {
    expect(rms(new Float32Array(SIZE))).toBe(0);
    expect(rms(sine(440))).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });

  it('detecta 440 Hz como La4 (midi 69) con alta claridad', () => {
    const analyze = createAnalyzer(SIZE, SAMPLE_RATE);
    const reading = analyze(sine(440));
    expect(reading).not.toBeNull();
    expect(reading!.midi).toBeCloseTo(69, 1);
    expect(reading!.clarity).toBeGreaterThan(0.95);
    expect(reading!.rms).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });

  it('devuelve null en silencio', () => {
    const analyze = createAnalyzer(SIZE, SAMPLE_RATE);
    expect(analyze(new Float32Array(SIZE))).toBeNull();
  });
});
