import { describe, expect, it } from 'vitest';
import { gradeHeldExercise, gradeHeldNote, gradeSiren } from './grade';

describe('gradeHeldNote', () => {
  it('perfecto: 100 en todo', () => {
    expect(gradeHeldNote(Array(20).fill(0))).toEqual({ precision: 100, estabilidad: 100, total: 100 });
  });

  it('desafinado constante: pierde precisión, no estabilidad', () => {
    expect(gradeHeldNote(Array(20).fill(30))).toEqual({ precision: 70, estabilidad: 100, total: 82 });
  });

  it('tembloroso: pierde estabilidad', () => {
    const cents = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 30 : -30));
    expect(gradeHeldNote(cents)).toEqual({ precision: 70, estabilidad: 40, total: 58 });
  });

  it('con pocas muestras devuelve null', () => {
    expect(gradeHeldNote([0, 0, 0, 0])).toBeNull();
  });
});

describe('gradeHeldExercise', () => {
  it('promedia sólo los pasos calificables', () => {
    const bueno = Array(10).fill(0);
    expect(gradeHeldExercise([bueno, [0, 0]])).toEqual({ precision: 100, estabilidad: 100, total: 100 });
  });

  it('null si ningún paso es calificable', () => {
    expect(gradeHeldExercise([[], [0]])).toBeNull();
  });
});

describe('gradeSiren', () => {
  it('cobertura completa: 100', () => {
    const midis = Array.from({ length: 44 }, (_, i) => 50 + (i * 10) / 43);
    expect(gradeSiren(midis, 50, 59)).toEqual({ cobertura: 100, total: 100 });
  });

  it('cobertura parcial', () => {
    const midis = [50, 51, 52, 53, 54, 50.2, 51.4];
    expect(gradeSiren(midis, 50, 59)).toEqual({ cobertura: 50, total: 50 });
  });

  it('con pocas muestras devuelve null', () => {
    expect(gradeSiren([50, 51], 50, 59)).toBeNull();
  });
});
