export interface NoteGrade {
  precision: number;
  estabilidad: number;
  total: number;
}

export interface SirenGrade {
  cobertura: number;
  total: number;
}

const MIN_SAMPLES = 5;

/** Califica una nota sostenida a partir de sus desviaciones en cents. */
export function gradeHeldNote(cents: number[]): NoteGrade | null {
  if (cents.length < MIN_SAMPLES) return null;
  const precision = Math.max(0, Math.round(100 - medianAbs(cents)));
  const estabilidad = Math.max(0, Math.round(100 - 2 * std(cents)));
  const total = Math.round(0.6 * precision + 0.4 * estabilidad);
  return { precision, estabilidad, total };
}

/** Promedia las calificaciones de los pasos que tuvieron suficientes muestras. */
export function gradeHeldExercise(perStepCents: number[][]): NoteGrade | null {
  const grades = perStepCents
    .map(gradeHeldNote)
    .filter((g): g is NoteGrade => g !== null);
  if (grades.length === 0) return null;
  const avg = (pick: (g: NoteGrade) => number) =>
    Math.round(grades.reduce((a, g) => a + pick(g), 0) / grades.length);
  return {
    precision: avg((g) => g.precision),
    estabilidad: avg((g) => g.estabilidad),
    total: avg((g) => g.total),
  };
}

/** Cobertura: porcentaje de semitonos del recorrido con al menos una muestra a ±0.5 st. */
export function gradeSiren(midis: number[], lowMidi: number, highMidi: number): SirenGrade | null {
  if (midis.length < MIN_SAMPLES) return null;
  let covered = 0;
  let bins = 0;
  for (let b = lowMidi; b <= highMidi; b++) {
    bins++;
    if (midis.some((m) => Math.abs(m - b) <= 0.5)) covered++;
  }
  const cobertura = Math.round((100 * covered) / bins);
  return { cobertura, total: cobertura };
}

function medianAbs(xs: number[]): number {
  const s = xs.map(Math.abs).sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function std(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length);
}
