import { describe, expect, it } from 'vitest';
import { isValidRange, randomTargetMidi, type VocalRange } from './range';

describe('range', () => {
  const rango: VocalRange = { lowMidi: 48, highMidi: 60 };

  it('valida rangos', () => {
    expect(isValidRange(rango)).toBe(true);
    expect(isValidRange({ lowMidi: 60, highMidi: 62 })).toBe(false); // muy angosto
    expect(isValidRange({ lowMidi: 60, highMidi: 48 })).toBe(false); // invertido
    expect(isValidRange({ lowMidi: 48.5, highMidi: 60 })).toBe(false); // no entero
  });

  it('genera objetivos dentro del rango, sin extremos', () => {
    expect(randomTargetMidi(rango, () => 0)).toBe(49);
    expect(randomTargetMidi(rango, () => 0.9999)).toBe(59);
  });

  it('en un rango mínimo usa los límites reales', () => {
    const angosto: VocalRange = { lowMidi: 60, highMidi: 65 };
    const valores = new Set(
      Array.from({ length: 50 }, (_, i) => randomTargetMidi(angosto, () => i / 50)),
    );
    for (const v of valores) {
      expect(v).toBeGreaterThanOrEqual(60);
      expect(v).toBeLessThanOrEqual(65);
    }
  });
});
