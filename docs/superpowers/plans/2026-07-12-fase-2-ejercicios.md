# Afinemos Fase 2 (Ejercicios guiados) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejercicios guiados (nota sostenida, escalas de 3 y 5 notas, sirenas) con dinámica «la app toca → tú repites» y calificación por precisión y estabilidad, guardando cada sesión en IndexedDB; más despliegue público en GitHub Pages.

**Architecture:** Se agrega el módulo puro `src/exercises/` (generación, calificación y agrupación de lecturas — todo con Vitest) sobre la infraestructura de Fase 1: `usePitchStream` provee lecturas, `tones.ts` gana reproducción de secuencias y sirenas, `store.ts` gana sesiones. La UI suma un menú de ejercicios, la pantalla de ejercicio (escucha → canta → resultado) y un historial. El deploy es un workflow de GitHub Actions a Pages (HTTPS, necesario para el micrófono en el teléfono).

**Tech Stack:** Vite, React 19, TypeScript (strict), pitchy, tone, idb-keyval, Vitest, fake-indexeddb, GitHub Actions + Pages.

## Global Constraints

- Proyecto en `/Users/marcelotorres/Proyectos/afinemos`, rama de trabajo nueva desde `main` (Fase 1 ya mergeada). Spec: `docs/superpowers/specs/2026-07-12-afinemos-design.md`.
- Toda la copy de UI en español de México, principiante total, visual primero; nombres de nota (Do, Re…) como dato secundario.
- Gate de ruido en ejercicios: RMS ≥ 0.01, claridad ≥ 0.85 (constante `GATE` en la UI; `GateOptions` en lógica pura).
- Calificación 0–100. Nota sostenida/escala: `precision = max(0, 100 − medianaAbs(cents))`, `estabilidad = max(0, 100 − 2·desvEst(cents))`, `total = round(0.6·precision + 0.4·estabilidad)`. Sirena: `total = cobertura` (porcentaje de semitonos del recorrido tocados). No cambiar estas fórmulas.
- Duraciones: nota sostenida 3000 ms; nota de escala 1000 ms; sirena 6000 ms (subir y bajar). Se descartan los primeros 300 ms de cada paso (`ONSET_GRACE_MS`).
- Escalas mayores: 3 notas = intervalos `[0,2,4]`; 5 notas = `[0,2,4,5,7]`; se canta subiendo y bajando sin repetir la cima. Si el rango no alcanza para la de 5 (necesita 7 semitonos), se degrada a la de 3.
- El audio (mic y Tone.js) sólo arranca tras clic del usuario (iOS/Safari).
- Sin backend, sin cuentas, sin variables de entorno. TypeScript `strict: true`.
- Racha y exportar/importar JSON se DIFIEREN a una fase posterior.
- Antes de cerrar cada tarea: `npm test` y `npm run build` en verde.

## File Structure

```
src/exercises/types.ts      — tipos de ejercicio y etiquetas               (puro)
src/exercises/generate.ts   — generar ejercicios dentro del rango          (puro)
src/exercises/grade.ts      — calificación precisión/estabilidad/cobertura (puro)
src/exercises/recorder.ts   — agrupar lecturas con tiempo por paso         (puro)
src/progress/store.ts       — MODIFY: sesiones (guardar/listar)
src/audio/tones.ts          — MODIFY: playNotes, playSiren (glue)
src/ui/Ejercicio.tsx        — pantalla de un ejercicio (escucha→canta→resultado)
src/ui/Ejercicios.tsx       — menú de ejercicios
src/ui/Historial.tsx        — historial de sesiones
src/ui/Afinador.tsx         — MODIFY: botón «Ejercicios 🎵»
src/App.tsx                 — MODIFY: navegación entre vistas
src/styles.css              — MODIFY: estilos nuevos (agregar al final)
vite.config.ts              — MODIFY: base './' para Pages
.github/workflows/deploy.yml — build + deploy a GitHub Pages
```

---

### Task 1: `exercises/types.ts` y `exercises/generate.ts`

**Files:**
- Create: `src/exercises/types.ts`, `src/exercises/generate.ts`
- Test: `src/exercises/generate.test.ts`

**Interfaces:**
- Consumes: `VocalRange`, `randomTargetMidi` (src/music/range.ts).
- Produces: `type ExerciseType = 'nota-sostenida' | 'escala-3' | 'escala-5' | 'sirena'`; `interface HeldStep { targetMidi: number; durationMs: number }`; `interface HeldExercise { type: 'nota-sostenida' | 'escala-3' | 'escala-5'; steps: HeldStep[] }`; `interface SirenExercise { type: 'sirena'; lowMidi: number; highMidi: number; durationMs: number }`; `type Exercise = HeldExercise | SirenExercise`; `EXERCISE_LABELS: Record<ExerciseType, string>`; `generateExercise(type, range, rng?): Exercise`; constantes `HELD_NOTE_MS = 3000`, `SCALE_NOTE_MS = 1000`, `SIREN_MS = 6000`.

- [ ] **Step 1: Escribir tests que fallan** — `src/exercises/generate.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/exercises/generate.test.ts` — Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/exercises/types.ts`:

```ts
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
```

`src/exercises/generate.ts`:

```ts
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
  const iv = range.highMidi - range.lowMidi < intervals[intervals.length - 1] ? SCALE_3 : intervals;
  const span = iv[iv.length - 1];
  const maxStart = range.highMidi - span;
  const start = range.lowMidi + Math.floor(rng() * (maxStart - range.lowMidi + 1));
  const up = iv.map((s) => start + s);
  const down = up.slice(0, -1).reverse();
  const steps: HeldStep[] = [...up, ...down].map((m) => ({
    targetMidi: m,
    durationMs: SCALE_NOTE_MS,
  }));
  return { type, steps };
}
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/exercises/generate.test.ts` — Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/exercises
git commit -m "feat: tipos y generación de ejercicios guiados"
```

---

### Task 2: `exercises/grade.ts` — calificación

**Files:**
- Create: `src/exercises/grade.ts`
- Test: `src/exercises/grade.test.ts`

**Interfaces:**
- Produces: `interface NoteGrade { precision: number; estabilidad: number; total: number }` (0–100); `gradeHeldNote(cents: number[]): NoteGrade | null` (null con menos de 5 muestras); `gradeHeldExercise(perStepCents: number[][]): NoteGrade | null` (promedio de pasos calificables; null si ninguno); `interface SirenGrade { cobertura: number; total: number }`; `gradeSiren(midis: number[], lowMidi: number, highMidi: number): SirenGrade | null`.

- [ ] **Step 1: Escribir tests que fallan** — `src/exercises/grade.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/exercises/grade.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implementar** — `src/exercises/grade.ts`:

```ts
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
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/exercises/grade.test.ts` — Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/exercises/grade.ts src/exercises/grade.test.ts
git commit -m "feat: calificación de ejercicios (precisión, estabilidad, cobertura)"
```

---

### Task 3: `exercises/recorder.ts` — agrupar lecturas por paso

**Files:**
- Create: `src/exercises/recorder.ts`
- Test: `src/exercises/recorder.test.ts`

**Interfaces:**
- Consumes: `PitchReading` (src/music/stableNote.ts), `HeldStep` (Task 1).
- Produces: `interface TimedReading extends PitchReading { timeMs: number }`; `interface GateOptions { minClarity: number; minRms: number }`; `ONSET_GRACE_MS = 300`; `bucketReadings(steps: HeldStep[], readings: TimedReading[], gate: GateOptions): number[][]` (midis válidos por paso, descartando los primeros 300 ms de cada paso y lo que caiga fuera); `validMidis(readings: TimedReading[], gate: GateOptions): number[]` (para la sirena).

- [ ] **Step 1: Escribir tests que fallan** — `src/exercises/recorder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bucketReadings, validMidis, type TimedReading } from './recorder';

const GATE = { minClarity: 0.85, minRms: 0.01 };
const r = (timeMs: number, midi: number, clarity = 0.95, rms = 0.1): TimedReading => ({
  timeMs,
  midi,
  clarity,
  rms,
});
const steps = [
  { targetMidi: 60, durationMs: 1000 },
  { targetMidi: 62, durationMs: 1000 },
];

describe('bucketReadings', () => {
  it('agrupa por paso y descarta el inicio de cada paso', () => {
    const readings = [
      r(100, 60), // gracia del paso 0: fuera
      r(400, 60.1),
      r(900, 59.9),
      r(1200, 62), // gracia del paso 1: fuera
      r(1400, 62.2),
      r(2100, 62), // después del final: fuera
    ];
    expect(bucketReadings(steps, readings, GATE)).toEqual([[60.1, 59.9], [62.2]]);
  });

  it('descarta lecturas sin claridad o sin volumen', () => {
    const readings = [r(400, 60, 0.5), r(500, 60, 0.95, 0.001), r(600, 60)];
    expect(bucketReadings(steps, readings, GATE)).toEqual([[60], []]);
  });
});

describe('validMidis', () => {
  it('filtra por gate y devuelve midis', () => {
    const readings = [r(0, 50), r(10, 51, 0.5), r(20, 52, 0.95, 0.001), r(30, 53)];
    expect(validMidis(readings, GATE)).toEqual([50, 53]);
  });
});
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/exercises/recorder.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implementar** — `src/exercises/recorder.ts`:

```ts
import type { PitchReading } from '../music/stableNote';
import type { HeldStep } from './types';

export interface TimedReading extends PitchReading {
  timeMs: number;
}

export interface GateOptions {
  minClarity: number;
  minRms: number;
}

export const ONSET_GRACE_MS = 300;

/** Agrupa las lecturas válidas por paso según el tiempo transcurrido. */
export function bucketReadings(
  steps: HeldStep[],
  readings: TimedReading[],
  gate: GateOptions,
): number[][] {
  const starts: number[] = [];
  let totalMs = 0;
  for (const s of steps) {
    starts.push(totalMs);
    totalMs += s.durationMs;
  }
  const buckets: number[][] = steps.map(() => []);
  for (const r of readings) {
    if (r.clarity < gate.minClarity || r.rms < gate.minRms) continue;
    if (r.timeMs < 0 || r.timeMs >= totalMs) continue;
    let i = steps.length - 1;
    while (i > 0 && r.timeMs < starts[i]) i--;
    if (r.timeMs - starts[i] < ONSET_GRACE_MS) continue;
    buckets[i].push(r.midi);
  }
  return buckets;
}

/** Lecturas válidas sin pasos (para la sirena). */
export function validMidis(readings: TimedReading[], gate: GateOptions): number[] {
  return readings
    .filter((r) => r.clarity >= gate.minClarity && r.rms >= gate.minRms)
    .map((r) => r.midi);
}
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/exercises/recorder.test.ts` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/exercises/recorder.ts src/exercises/recorder.test.ts
git commit -m "feat: agrupación de lecturas por paso con gate de ruido"
```

---

### Task 4: sesiones en `progress/store.ts`

**Files:**
- Modify: `src/progress/store.ts` (agregar al final)
- Modify: `src/progress/store.test.ts` (agregar describe al final)

**Interfaces:**
- Consumes: `ExerciseType` (Task 1).
- Produces: `interface SessionRecord { fecha: string; ejercicio: ExerciseType; calificacion: number }`; `saveSession(record: SessionRecord): Promise<void>`; `listSessions(): Promise<SessionRecord[]>` (más recientes primero).

- [ ] **Step 1: Escribir tests que fallan** — agregar al final de `src/progress/store.test.ts`:

```ts
import { listSessions, saveSession } from './store';

describe('sessions', () => {
  it('lista vacía sin sesiones', async () => {
    expect(await listSessions()).toEqual([]);
  });

  it('guarda y lista con la más reciente primero', async () => {
    await saveSession({ fecha: '2026-07-12T10:00:00Z', ejercicio: 'escala-3', calificacion: 80 });
    await saveSession({ fecha: '2026-07-12T11:00:00Z', ejercicio: 'sirena', calificacion: 65 });
    const all = await listSessions();
    expect(all).toHaveLength(2);
    expect(all[0].ejercicio).toBe('sirena');
    expect(all[1].calificacion).toBe(80);
  });
});
```

(Ajustar el import existente para traer también `listSessions` y `saveSession` desde `./store` en una sola línea de import.)

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/progress/store.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implementar** — agregar al final de `src/progress/store.ts`:

```ts
import type { ExerciseType } from '../exercises/types';

export interface SessionRecord {
  fecha: string; // ISO 8601
  ejercicio: ExerciseType;
  calificacion: number; // 0-100
}

const SESSIONS_KEY = 'afinemos:sessions';

export async function saveSession(record: SessionRecord): Promise<void> {
  const all = (await get<SessionRecord[]>(SESSIONS_KEY)) ?? [];
  all.push(record);
  await set(SESSIONS_KEY, all);
}

export async function listSessions(): Promise<SessionRecord[]> {
  const all = (await get<SessionRecord[]>(SESSIONS_KEY)) ?? [];
  return [...all].reverse();
}
```

(El `import type { ExerciseType }` va arriba del archivo junto a los imports existentes, no al final.)

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/progress/store.test.ts` — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/progress
git commit -m "feat: sesiones de ejercicios en IndexedDB"
```

---

### Task 5: `audio/tones.ts` — secuencias y sirena

**Files:**
- Modify: `src/audio/tones.ts` (agregar al final)

**Interfaces:**
- Consumes: `midiToFreq` (src/music/notes.ts), synth existente.
- Produces: `playNotes(midis: number[], noteSeconds?: number): Promise<void>` (default 1 s por nota); `playSiren(lowMidi: number, highMidi: number, seconds?: number): Promise<void>` (default 6 s: sube la primera mitad, baja la segunda).

Glue de Tone.js sin test unitario; verificación: `npm run build` + verificación manual (Task 8).

- [ ] **Step 1: Implementar** — agregar al final de `src/audio/tones.ts`:

```ts
/** Toca una secuencia de notas, una tras otra. Llamar desde un manejador de clic (iOS). */
export async function playNotes(midis: number[], noteSeconds = 1): Promise<void> {
  await Tone.start();
  synth ??= new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
  const now = Tone.now();
  midis.forEach((midi, i) => {
    synth!.triggerAttackRelease(midiToFreq(midi), noteSeconds * 0.9, now + i * noteSeconds);
  });
}

/** Toca una sirena: sube de low a high y regresa. Llamar desde un manejador de clic (iOS). */
export async function playSiren(lowMidi: number, highMidi: number, seconds = 6): Promise<void> {
  await Tone.start();
  const siren = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
  const now = Tone.now();
  siren.triggerAttack(midiToFreq(lowMidi), now);
  siren.frequency.rampTo(midiToFreq(highMidi), seconds / 2, now);
  siren.frequency.rampTo(midiToFreq(lowMidi), seconds / 2, now + seconds / 2);
  siren.triggerRelease(now + seconds);
  window.setTimeout(() => siren.dispose(), (seconds + 1) * 1000);
}
```

- [ ] **Step 2: Verificar typecheck** — Run: `npm run build` — Expected: sin errores. Run: `npm test` — Expected: todo verde.

- [ ] **Step 3: Commit**

```bash
git add src/audio/tones.ts
git commit -m "feat: reproducción de secuencias de notas y sirenas"
```

---

### Task 6: `ui/Ejercicio.tsx` — pantalla de ejercicio

**Files:**
- Create: `src/ui/Ejercicio.tsx`

**Interfaces:**
- Consumes: `generateExercise` (Task 1); `gradeHeldExercise`, `gradeSiren` (Task 2); `bucketReadings`, `validMidis`, `TimedReading` (Task 3); `saveSession` (Task 4); `playNotes`, `playSiren` (Task 5); `usePitchStream`, `PantallaErrorMic` (Fase 1); `centsOff`, `midiToNoteName` (Fase 1); `EXERCISE_LABELS`, `Exercise`, `ExerciseType` (Task 1); `VocalRange` (Fase 1).
- Produces: `Ejercicio({ type, range, onSalir }: { type: ExerciseType; range: VocalRange; onSalir(): void })`.

Glue de React sin test unitario; verificación: `npm run build` + verificación manual (Task 8).

- [ ] **Step 1: Implementar** — `src/ui/Ejercicio.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { playNotes, playSiren } from '../audio/tones';
import { generateExercise } from '../exercises/generate';
import { gradeHeldExercise, gradeSiren } from '../exercises/grade';
import { bucketReadings, validMidis, type TimedReading } from '../exercises/recorder';
import { EXERCISE_LABELS, type Exercise, type ExerciseType } from '../exercises/types';
import { centsOff, midiToNoteName } from '../music/notes';
import type { VocalRange } from '../music/range';
import { saveSession } from '../progress/store';
import { PantallaErrorMic } from './PantallaErrorMic';
import { usePitchStream } from './usePitchStream';

const GATE = { minClarity: 0.85, minRms: 0.01 };
const LISTEN_NOTE_S = 1;
const TRANSITION_MS = 400;

type Fase = 'listo' | 'escucha' | 'canta' | 'resultado';

interface Resultado {
  total: number;
  detalle: string;
}

function totalMsDe(e: Exercise): number {
  return e.type === 'sirena' ? e.durationMs : e.steps.reduce((a, s) => a + s.durationMs, 0);
}

function calificar(e: Exercise, lecturas: TimedReading[]): Resultado | null {
  if (e.type === 'sirena') {
    const g = gradeSiren(validMidis(lecturas, GATE), e.lowMidi, e.highMidi);
    return g && { total: g.total, detalle: `Cubriste el ${g.cobertura}% del recorrido` };
  }
  const buckets = bucketReadings(e.steps, lecturas, GATE);
  const cents = buckets.map((midis, i) => midis.map((m) => centsOff(m, e.steps[i].targetMidi)));
  const g = gradeHeldExercise(cents);
  return g && { total: g.total, detalle: `Precisión ${g.precision} · Estabilidad ${g.estabilidad}` };
}

function mensaje(total: number): string {
  if (total >= 80) return '¡Excelente! 🌟';
  if (total >= 60) return '¡Muy bien! 🙂';
  if (total >= 40) return 'Vas bien, sigue así 💪';
  return 'Sigue intentando 💪';
}

export function Ejercicio({
  type,
  range,
  onSalir,
}: {
  type: ExerciseType;
  range: VocalRange;
  onSalir(): void;
}) {
  const [ejercicio, setEjercicio] = useState<Exercise>(() => generateExercise(type, range));
  const [fase, setFase] = useState<Fase>('listo');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const lecturas = useRef<TimedReading[]>([]);
  const inicioCanto = useRef(0);
  const { reading, error } = usePitchStream(fase === 'canta');

  // Acumular lecturas con tiempo mientras canta.
  useEffect(() => {
    if (fase !== 'canta' || reading === null) return;
    lecturas.current.push({ ...reading, timeMs: performance.now() - inicioCanto.current });
  }, [fase, reading]);

  // Fase escucha: tocar el ejemplo y pasar a cantar.
  useEffect(() => {
    if (fase !== 'escucha') return;
    let listenMs: number;
    if (ejercicio.type === 'sirena') {
      listenMs = ejercicio.durationMs;
      void playSiren(ejercicio.lowMidi, ejercicio.highMidi, ejercicio.durationMs / 1000);
    } else {
      listenMs = ejercicio.steps.length * LISTEN_NOTE_S * 1000;
      void playNotes(
        ejercicio.steps.map((s) => s.targetMidi),
        LISTEN_NOTE_S,
      );
    }
    const t = window.setTimeout(() => {
      lecturas.current = [];
      inicioCanto.current = performance.now();
      setFase('canta');
    }, listenMs + TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [fase, ejercicio]);

  // Fase canta: al terminar el tiempo, calificar y guardar.
  useEffect(() => {
    if (fase !== 'canta') return;
    const t = window.setTimeout(() => {
      const res = calificar(ejercicio, lecturas.current);
      setResultado(res);
      setFase('resultado');
      if (res !== null) {
        saveSession({
          fecha: new Date().toISOString(),
          ejercicio: ejercicio.type,
          calificacion: res.total,
        }).catch(() => {});
      }
    }, totalMsDe(ejercicio) + TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [fase, ejercicio]);

  if (error) return <PantallaErrorMic code={error.code} />;

  const notas =
    ejercicio.type === 'sirena'
      ? `${midiToNoteName(ejercicio.lowMidi)} → ${midiToNoteName(ejercicio.highMidi)} → ${midiToNoteName(ejercicio.lowMidi)}`
      : ejercicio.steps.map((s) => midiToNoteName(s.targetMidi)).join(' · ');

  const empezar = () => {
    setResultado(null);
    setFase('escucha');
  };

  const otro = () => {
    setEjercicio(generateExercise(type, range));
    setResultado(null);
    setFase('listo');
  };

  return (
    <section>
      <h1>{EXERCISE_LABELS[type]}</h1>
      {fase === 'listo' && (
        <>
          <p>
            {ejercicio.type === 'sirena'
              ? 'Escucha la sirena y luego imítala: sube y baja con tu voz como ella.'
              : 'Escucha las notas y luego repítelas cantando «aaah».'}
          </p>
          <p className="notas-secundarias">{notas}</p>
          <button onClick={empezar}>Escuchar y cantar 🎵</button>
        </>
      )}
      {fase === 'escucha' && <p className="indicacion">🔊 Escucha con atención…</p>}
      {fase === 'canta' && (
        <>
          <p className="indicacion" aria-live="polite">
            🎤 ¡Ahora tú!
          </p>
          <p className="notas-secundarias">{notas}</p>
        </>
      )}
      {fase === 'resultado' &&
        (resultado ? (
          <>
            <p className="calificacion">{resultado.total}</p>
            <p className="indicacion">{mensaje(resultado.total)}</p>
            <p className="notas-secundarias">{resultado.detalle}</p>
          </>
        ) : (
          <p className="indicacion">No te escuché bien 🤔 Acércate al micrófono e intenta de nuevo.</p>
        ))}
      {(fase === 'listo' || fase === 'resultado') && (
        <div className="controles">
          {fase === 'resultado' && <button onClick={empezar}>Repetir 🔁</button>}
          {fase === 'resultado' && <button onClick={otro}>Otro ejercicio 🎲</button>}
          <button className="enlace" onClick={onSalir}>
            Volver a ejercicios
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verificar** — Run: `npm run build` y `npm test` — Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Ejercicio.tsx
git commit -m "feat: pantalla de ejercicio guiado (escucha, canta, resultado)"
```

---

### Task 7: `ui/Ejercicios.tsx`, `ui/Historial.tsx` y estilos

**Files:**
- Create: `src/ui/Ejercicios.tsx`, `src/ui/Historial.tsx`
- Modify: `src/styles.css` (agregar al final)

**Interfaces:**
- Consumes: `EXERCISE_LABELS`, `ExerciseType` (Task 1); `listSessions`, `SessionRecord` (Task 4).
- Produces: `Ejercicios({ onElegir, onHistorial, onVolver }: { onElegir(type: ExerciseType): void; onHistorial(): void; onVolver(): void })`; `Historial({ onVolver }: { onVolver(): void })`.

Glue de React sin test unitario; verificación: `npm run build` + verificación manual (Task 8).

- [ ] **Step 1: Implementar menú** — `src/ui/Ejercicios.tsx`:

```tsx
import { EXERCISE_LABELS, type ExerciseType } from '../exercises/types';

const DESCRIPCIONES: Record<ExerciseType, string> = {
  'nota-sostenida': 'Mantén una nota sin que tiemble',
  'escala-3': 'Do-Re-Mi: tres notas subiendo y bajando',
  'escala-5': 'Cinco notas subiendo y bajando',
  sirena: 'Sube y baja con tu voz como una sirena',
};

const TIPOS: ExerciseType[] = ['nota-sostenida', 'escala-3', 'escala-5', 'sirena'];

export function Ejercicios({
  onElegir,
  onHistorial,
  onVolver,
}: {
  onElegir(type: ExerciseType): void;
  onHistorial(): void;
  onVolver(): void;
}) {
  return (
    <section>
      <h1>Ejercicios 🎵</h1>
      <p>Rutinas cortas: la app toca, tú repites, y te digo qué tal te salió.</p>
      <div className="tarjetas">
        {TIPOS.map((t) => (
          <button key={t} className="tarjeta" onClick={() => onElegir(t)}>
            <strong>{EXERCISE_LABELS[t]}</strong>
            <span>{DESCRIPCIONES[t]}</span>
          </button>
        ))}
      </div>
      <div className="controles">
        <button onClick={onHistorial}>Mi historial 📈</button>
        <button className="enlace" onClick={onVolver}>
          Volver al afinador
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implementar historial** — `src/ui/Historial.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { EXERCISE_LABELS } from '../exercises/types';
import { listSessions, type SessionRecord } from '../progress/store';

export function Historial({ onVolver }: { onVolver(): void }) {
  const [sesiones, setSesiones] = useState<SessionRecord[] | null>(null);

  useEffect(() => {
    listSessions()
      .then(setSesiones)
      .catch(() => setSesiones([]));
  }, []);

  return (
    <section>
      <h1>Mi historial 📈</h1>
      {sesiones === null && <p>Cargando…</p>}
      {sesiones !== null && sesiones.length === 0 && (
        <p>Aún no hay sesiones. ¡Haz tu primer ejercicio!</p>
      )}
      {sesiones !== null && sesiones.length > 0 && (
        <ul className="historial">
          {sesiones.map((s, i) => (
            <li key={i}>
              <span>{new Date(s.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <span>{EXERCISE_LABELS[s.ejercicio]}</span>
              <strong>{s.calificacion}</strong>
            </li>
          ))}
        </ul>
      )}
      <p>
        <button className="enlace" onClick={onVolver}>
          Volver a ejercicios
        </button>
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Agregar estilos** — al final de `src/styles.css`:

```css
.tarjetas {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0;
}
.tarjeta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: left;
}
.tarjeta span {
  font-size: 0.9rem;
  opacity: 0.75;
}
.calificacion {
  font-size: 4rem;
  font-weight: 700;
  margin: 0.5rem 0 0;
}
.notas-secundarias {
  font-size: 0.9rem;
  opacity: 0.7;
}
.historial {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}
.historial li {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid #8884;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
}
```

- [ ] **Step 4: Verificar** — Run: `npm run build` y `npm test` — Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Ejercicios.tsx src/ui/Historial.tsx src/styles.css
git commit -m "feat: menú de ejercicios e historial de sesiones"
```

---

### Task 8: navegación en `App.tsx` y botón en `Afinador.tsx`

**Files:**
- Modify: `src/App.tsx` (reemplazar completo)
- Modify: `src/ui/Afinador.tsx` (agregar prop y botón)

**Interfaces:**
- Consumes: `Ejercicio` (Task 6), `Ejercicios`, `Historial` (Task 7), `ExerciseType` (Task 1), todo lo de Fase 1.
- Produces: `Afinador` gana prop `onEjercicios(): void` (botón «Ejercicios 🎵» junto a los controles existentes).

- [ ] **Step 1: Modificar `src/ui/Afinador.tsx`** — cambiar la firma del componente y agregar el botón. La firma queda:

```tsx
export function Afinador({
  range,
  onResetRange,
  onEjercicios,
}: {
  range: VocalRange;
  onResetRange(): void;
  onEjercicios(): void;
}) {
```

Y dentro del `<div className="controles">` existente (donde están «🔊 Escuchar» y «Otra nota»), agregar al final:

```tsx
        <button onClick={onEjercicios}>Ejercicios 🎵</button>
```

- [ ] **Step 2: Reemplazar `src/App.tsx`** completo:

```tsx
import { useEffect, useState } from 'react';
import type { ExerciseType } from './exercises/types';
import type { VocalRange } from './music/range';
import { clearVocalRange, loadVocalRange, saveVocalRange } from './progress/store';
import { Afinador } from './ui/Afinador';
import { AsistenteRango } from './ui/AsistenteRango';
import { Ejercicio } from './ui/Ejercicio';
import { Ejercicios } from './ui/Ejercicios';
import { Historial } from './ui/Historial';

type Vista = 'afinador' | 'menu-ejercicios' | 'historial' | { tipo: ExerciseType };

export default function App() {
  const [range, setRange] = useState<VocalRange | null | 'cargando'>('cargando');
  const [vista, setVista] = useState<Vista>('afinador');

  useEffect(() => {
    loadVocalRange()
      .then(setRange)
      .catch(() => setRange(null));
  }, []);

  if (range === 'cargando') return <p>Cargando…</p>;
  if (range === null) {
    return (
      <AsistenteRango
        onComplete={(r) => {
          void saveVocalRange(r)
            .then(() => setRange(r))
            .catch(() => setRange(r));
        }}
      />
    );
  }
  if (typeof vista === 'object') {
    return (
      <Ejercicio type={vista.tipo} range={range} onSalir={() => setVista('menu-ejercicios')} />
    );
  }
  if (vista === 'menu-ejercicios') {
    return (
      <Ejercicios
        onElegir={(tipo) => setVista({ tipo })}
        onHistorial={() => setVista('historial')}
        onVolver={() => setVista('afinador')}
      />
    );
  }
  if (vista === 'historial') {
    return <Historial onVolver={() => setVista('menu-ejercicios')} />;
  }
  return (
    <Afinador
      range={range}
      onResetRange={() => {
        void clearVocalRange()
          .then(() => setRange(null))
          .catch(() => setRange(null));
      }}
      onEjercicios={() => setVista('menu-ejercicios')}
    />
  );
}
```

- [ ] **Step 3: Suite completa** — Run: `npm test && npm run build` — Expected: todo verde.

- [ ] **Step 4: Verificación manual (checklist para el humano; el implementador sólo la documenta)**

1. Afinador → botón «Ejercicios 🎵» → aparece el menú con 4 tarjetas.
2. «Nota sostenida» → «Escuchar y cantar 🎵» → suena la nota → «¡Ahora tú!» → cantar 3 s → aparece calificación con precisión/estabilidad.
3. «Escala de 3 notas» → suena do-re-mi-re-do → repetir → calificación.
4. «Sirena» → suena el glissando → imitar → calificación por cobertura.
5. Guardar silencio durante un ejercicio → «No te escuché bien».
6. «Mi historial 📈» → lista las sesiones recién hechas, la más nueva primero.
7. «Volver al afinador» regresa; el afinador sigue funcionando como en Fase 1.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/ui/Afinador.tsx
git commit -m "feat: navegación entre afinador, ejercicios e historial"
```

---

### Task 9: despliegue en GitHub Pages

**Files:**
- Modify: `vite.config.ts` (agregar `base`)
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md` (agregar el link)

**Interfaces:**
- Produces: workflow que en cada push a `main` corre tests, build y publica `dist/` en GitHub Pages. URL resultante: `https://soytorresllamas.github.io/afinemos/`.

- [ ] **Step 1: Ajustar `vite.config.ts`** — agregar `base: './'` al objeto de configuración:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});
```

- [ ] **Step 2: Crear `.github/workflows/deploy.yml`**:

```yaml
name: Deploy a GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 3: Agregar el link al `README.md`** — después del primer párrafo, agregar:

```markdown
**Pruébala en línea:** https://soytorresllamas.github.io/afinemos/
```

- [ ] **Step 4: Verificar** — Run: `npm test && npm run build` — Expected: verde; `dist/index.html` referencia assets con rutas relativas (`./assets/...`).

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts .github/workflows/deploy.yml README.md
git commit -m "feat: despliegue automático a GitHub Pages"
```

(La activación de Pages en el repo — `gh api repos/Soytorresllamas/afinemos/pages -X POST -f build_type=workflow` — y el push a `main` los hace el controlador al cerrar la rama; el workflow corre solo en `main`.)

---

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec (Fase 2):** rutinas cortas ✔ (nota sostenida, escalas 3/5, sirenas — Task 1), dinámica «app toca → tú repites» ✔ (Task 6), calificación por precisión y estabilidad ✔ (Task 2), sesiones (fecha, ejercicio, calificación) en IndexedDB ✔ (Task 4), gate de ruido ✔ (Task 3), gesto iOS ✔ (botones antes de cualquier audio), historial ✔ (Task 7). Racha y export/import diferidos explícitamente (Global Constraints). Deploy agregado por petición del usuario (link para probar).
- **Placeholders:** ninguno; todo el código está en el plan.
- **Consistencia de tipos:** `ExerciseType`/`Exercise`/`HeldStep` (Task 1) usados en 2–4, 6–8; `TimedReading` (Task 3) usado en 6; `SessionRecord` (Task 4) usado en 7; `playNotes`/`playSiren` (Task 5) usados en 6; `Afinador` gana `onEjercicios` (Task 8) y App lo provee.
- **Nota:** `synth` en tones.ts ya existe como variable de módulo en Fase 1 (`let synth: Tone.Synth | null`); `playNotes` la reutiliza.
