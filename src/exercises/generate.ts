import { randomTargetMidi, type VocalRange } from '../music/range';
import type { Exercise, ExerciseType, HeldExercise, HeldStep } from './types';

export const HELD_NOTE_MS = 3000;
export const SCALE_NOTE_MS = 1000;
export const SIREN_MS = 6000;

const SCALE_3 = [0, 2, 4]; // do-re-mi (mayor)
const SCALE_5 = [0, 2, 4, 5, 7]; // do-re-mi-fa-sol (mayor)

export function generateExercise(
  type: ExerciseType,
  range: VocalRange,
  rng: () => number = Math.random,
): Exercise {
  switch (type) {
    case 'nota-sostenida':
      return {
        type,
        steps: [{ targetMidi: randomTargetMidi(range, rng), durationMs: HELD_NOTE_MS }],
      };
    case 'escala-3':
      return scaleExercise(type, SCALE_3, range, rng);
    case 'escala-5':
      return scaleExercise(type, SCALE_5, range, rng);
    case 'sirena':
      return {
        type,
        lowMidi: range.lowMidi + 1,
        highMidi: range.highMidi - 1,
        durationMs: SIREN_MS,
      };
  }
}

function scaleExercise(
  type: HeldExercise['type'],
  intervals: number[],
  range: VocalRange,
  rng: () => number,
): HeldExercise {
  // Si la escala no cabe en el rango, degradar a la de 3 (span 4 siempre cabe: rango mínimo 5).
  const degraded = range.highMidi - range.lowMidi < intervals[intervals.length - 1];
  const iv = degraded ? SCALE_3 : intervals;
  const resultType: HeldExercise['type'] = degraded && type === 'escala-5' ? 'escala-3' : type;
  const span = iv[iv.length - 1];
  const maxStart = range.highMidi - span;
  const start = range.lowMidi + Math.floor(rng() * (maxStart - range.lowMidi + 1));
  const up = iv.map((s) => start + s);
  const down = up.slice(0, -1).reverse();
  const steps: HeldStep[] = [...up, ...down].map((m) => ({
    targetMidi: m,
    durationMs: SCALE_NOTE_MS,
  }));
  return { type: resultType, steps };
}
