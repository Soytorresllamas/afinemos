export type ExerciseType = 'nota-sostenida' | 'escala-3' | 'escala-5' | 'sirena';

export interface HeldStep {
  targetMidi: number;
  durationMs: number;
}

export interface HeldExercise {
  type: 'nota-sostenida' | 'escala-3' | 'escala-5';
  steps: HeldStep[];
}

export interface SirenExercise {
  type: 'sirena';
  lowMidi: number;
  highMidi: number;
  durationMs: number;
}

export type Exercise = HeldExercise | SirenExercise;

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  'nota-sostenida': 'Nota sostenida',
  'escala-3': 'Escala de 3 notas',
  'escala-5': 'Escala de 5 notas',
  sirena: 'Sirena',
};
