import { describe, expect, it } from 'vitest';
import type { VocalRange } from '../music/range';
import { generateExercise, HELD_NOTE_MS, SIREN_MS } from './generate';

const rango: VocalRange = { lowMidi: 48, highMidi: 60 };

describe('generateExercise', () => {
  it('nota sostenida: una nota dentro del rango, 3 s', () => {
    const e = generateExercise('nota-sostenida', rango, () => 0);
    if (e.type === 'sirena') throw new Error('tipo inesperado');
    expect(e.steps).toEqual([{ targetMidi: 49, durationMs: HELD_NOTE_MS }]);
  });

  it('escala de 3: sube y baja sin repetir la cima', () => {
    const e = generateExercise('escala-3', rango, () => 0);
    if (e.type === 'sirena') throw new Error('tipo inesperado');
    expect(e.steps.map((s) => s.targetMidi)).toEqual([48, 50, 52, 50, 48]);
    expect(e.steps.every((s) => s.durationMs === 1000)).toBe(true);
  });

  it('escala de 5: intervalos mayores y dentro del rango', () => {
    const e = generateExercise('escala-5', rango, () => 0.9999);
    if (e.type === 'sirena') throw new Error('tipo inesperado');
    expect(e.steps.map((s) => s.targetMidi)).toEqual([53, 55, 57, 58, 60, 58, 57, 55, 53]);
    for (const s of e.steps) {
      expect(s.targetMidi).toBeGreaterThanOrEqual(rango.lowMidi);
      expect(s.targetMidi).toBeLessThanOrEqual(rango.highMidi);
    }
  });

  it('escala de 5 en rango angosto se degrada a 3', () => {
    const angosto: VocalRange = { lowMidi: 60, highMidi: 65 };
    const e = generateExercise('escala-5', angosto, () => 0);
    if (e.type === 'sirena') throw new Error('tipo inesperado');
    expect(e.steps.map((s) => s.targetMidi)).toEqual([60, 62, 64, 62, 60]);
  });

  it('sirena: extremos sin tocar los límites y 6 s', () => {
    const e = generateExercise('sirena', rango);
    expect(e).toEqual({ type: 'sirena', lowMidi: 49, highMidi: 59, durationMs: SIREN_MS });
  });
});
