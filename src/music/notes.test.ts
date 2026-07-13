import { describe, expect, it } from 'vitest';
import { centsOff, freqToMidi, midiToFreq, midiToNoteName, tuningStatus } from './notes';

describe('notes', () => {
  it('convierte 440 Hz a midi 69 y de vuelta', () => {
    expect(freqToMidi(440)).toBeCloseTo(69, 6);
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
  });

  it('nombra notas en latino', () => {
    expect(midiToNoteName(69)).toBe('La4');
    expect(midiToNoteName(60)).toBe('Do4');
    expect(midiToNoteName(61)).toBe('Do#4');
    expect(midiToNoteName(59)).toBe('Si3');
  });

  it('calcula desviación en cents', () => {
    expect(centsOff(69, 69)).toBe(0);
    expect(centsOff(freqToMidi(466.16), 69)).toBeCloseTo(100, 0);
    expect(centsOff(68.5, 69)).toBeCloseTo(-50, 6);
  });

  it('clasifica el estatus según umbrales del spec', () => {
    expect(tuningStatus(0)).toBe('afinado');
    expect(tuningStatus(25)).toBe('afinado');
    expect(tuningStatus(-25)).toBe('afinado');
    expect(tuningStatus(26)).toBe('cerca');
    expect(tuningStatus(-50)).toBe('cerca');
    expect(tuningStatus(51)).toBe('lejos');
  });
});
