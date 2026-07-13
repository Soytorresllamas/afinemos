# Afinemos Fase 1 (Afinador vocal) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web que detecta tu rango vocal y te da retroalimentación visual en tiempo real sobre tu afinación al cantar una nota objetivo.

**Architecture:** SPA 100 % cliente (Vite + React + TS). El micrófono entra por Web Audio API; `pitchy` detecta el tono ~20 veces/segundo; Tone.js toca las notas de referencia; el rango vocal se guarda en IndexedDB (`idb-keyval`). Toda la lógica musical vive en módulos puros (`src/music/`) con pruebas Vitest; el pegamento de navegador (`src/audio/`, `src/ui/`) es delgado y se verifica manualmente.

**Tech Stack:** Vite, React 18, TypeScript (strict), pitchy, tone, idb-keyval, Vitest, fake-indexeddb (tests).

## Global Constraints

- Proyecto en `/Users/marcelotorres/Proyectos/afinemos` (repo git ya inicializado; el spec vive en `docs/superpowers/specs/2026-07-12-afinemos-design.md`).
- Toda la copy de UI en español de México, lenguaje para principiante total: visual primero («Sube un poco ↑»), nombre de nota (Do, Re, Mi…) como dato secundario.
- Umbrales de afinación: verde `afinado` ±25 cents, ámbar `cerca` ±50 cents, rojo `lejos` más allá. Copiados del spec; no cambiarlos.
- Buffer de análisis: 2048 muestras; lecturas cada 50 ms; gate de ruido: RMS ≥ 0.01 y claridad pitchy ≥ 0.85 (0.9 en el asistente de rango).
- El audio (mic y Tone.js) sólo arranca tras un clic del usuario (requisito iOS/Safari).
- Sin backend, sin cuentas, sin variables de entorno. TypeScript `strict: true`.
- PWA/instalable se DIFIERE a una fase posterior (nada de Fase 1 lo necesita); para probar en el teléfono se usa `npm run dev -- --host` en la misma red wifi.
- Antes de cerrar cada tarea: `npm test` y `npm run build` en verde.

## File Structure

```
index.html
package.json / tsconfig.json / vite.config.ts
src/main.tsx                  — arranque React
src/App.tsx                   — enrutado por estado: asistente vs afinador
src/styles.css                — estilos globales
src/music/notes.ts            — frecuencia↔midi, nombres, cents, estatus     (puro)
src/music/range.ts            — tipo VocalRange, validación, nota objetivo   (puro)
src/music/stableNote.ts       — detector de nota sostenida estable           (puro)
src/audio/pitch.ts            — RMS + wrapper de pitchy (testeable sin DOM)
src/audio/mic.ts              — getUserMedia + AnalyserNode (glue navegador)
src/audio/tones.ts            — Tone.js: tocar nota de referencia (glue)
src/progress/store.ts         — guardar/leer rango vocal en IndexedDB
src/ui/usePitchStream.ts      — hook: mic + análisis → lecturas en estado
src/ui/PantallaErrorMic.tsx   — pantalla de error de micrófono
src/ui/AsistenteRango.tsx     — asistente de rango vocal (3 pasos)
src/ui/BurbujaTono.tsx        — visualización de la burbuja
src/ui/Afinador.tsx           — pantalla principal de afinación
```

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `.gitignore`

**Interfaces:**
- Produces: proyecto Vite+React+TS que compila, con `npm test` (Vitest) y `npm run build` funcionando. Scripts: `dev`, `build`, `test`, `preview`.

- [ ] **Step 1: Inicializar npm e instalar dependencias**

```bash
cd /Users/marcelotorres/Proyectos/afinemos
npm init -y
npm install react react-dom pitchy tone idb-keyval
npm install -D typescript vite @vitejs/plugin-react vitest fake-indexeddb @types/react @types/react-dom
```

- [ ] **Step 2: Escribir configuración**

`package.json` — reemplazar `scripts` y fijar `"type": "module"`:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node' },
});
```

`.gitignore`:

```
node_modules
dist
```

- [ ] **Step 3: Escribir el shell mínimo**

`index.html`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Afinemos</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (provisional, se reemplaza en Task 11):

```tsx
export default function App() {
  return <h1>Afinemos</h1>;
}
```

`src/styles.css`:

```css
:root {
  font-family: system-ui, sans-serif;
  color-scheme: light dark;
}
body {
  margin: 0;
  display: flex;
  justify-content: center;
}
#root {
  width: min(28rem, 100vw);
  padding: 1.5rem;
  box-sizing: border-box;
  text-align: center;
}
button {
  font-size: 1.1rem;
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid #888;
  cursor: pointer;
}
```

- [ ] **Step 4: Verificar build y test runner**

Run: `npm run build`
Expected: compila sin errores, genera `dist/`.

Run: `npm test`
Expected: `No test files found` con exit code 0 — si Vitest sale con error por falta de tests, agregar `"test": "vitest run --passWithNoTests"`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS con Vitest"
```

---

### Task 2: `music/notes.ts` — matemática de notas

**Files:**
- Create: `src/music/notes.ts`
- Test: `src/music/notes.test.ts`

**Interfaces:**
- Produces: `freqToMidi(freq: number): number`, `midiToFreq(midi: number): number`, `midiToNoteName(midi: number): string` (nombres latinos: `La4`, `Do4`), `centsOff(midi: number, targetMidi: number): number` (midi puede ser fraccional), `type TuningStatus = 'afinado' | 'cerca' | 'lejos'`, `tuningStatus(cents: number): TuningStatus`.

- [ ] **Step 1: Escribir tests que fallan** — `src/music/notes.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/music/notes.test.ts` — Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar** — `src/music/notes.ts`:

```ts
export const A4_FREQ = 440;
export const A4_MIDI = 69;

export function freqToMidi(freq: number): number {
  return A4_MIDI + 12 * Math.log2(freq / A4_FREQ);
}

export function midiToFreq(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - A4_MIDI) / 12);
}

const NOTE_NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

/** Desviación en cents de un midi (posiblemente fraccional) respecto al objetivo. */
export function centsOff(midi: number, targetMidi: number): number {
  return (midi - targetMidi) * 100;
}

export type TuningStatus = 'afinado' | 'cerca' | 'lejos';

export function tuningStatus(cents: number): TuningStatus {
  const abs = Math.abs(cents);
  if (abs <= 25) return 'afinado';
  if (abs <= 50) return 'cerca';
  return 'lejos';
}
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/music/notes.test.ts` — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/music
git commit -m "feat: matemática de notas (midi, nombres latinos, cents, estatus)"
```

---

### Task 3: `music/range.ts` — rango vocal y nota objetivo

**Files:**
- Create: `src/music/range.ts`
- Test: `src/music/range.test.ts`

**Interfaces:**
- Produces: `interface VocalRange { lowMidi: number; highMidi: number }`, `isValidRange(r: VocalRange): boolean` (enteros y al menos 5 semitonos de separación), `randomTargetMidi(range: VocalRange, rng?: () => number): number` (entero dentro del rango, evitando los extremos cuando hay margen).

- [ ] **Step 1: Escribir tests que fallan** — `src/music/range.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/music/range.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implementar** — `src/music/range.ts`:

```ts
export interface VocalRange {
  lowMidi: number;
  highMidi: number;
}

const MIN_SEMITONES = 5;

export function isValidRange(r: VocalRange): boolean {
  return (
    Number.isInteger(r.lowMidi) &&
    Number.isInteger(r.highMidi) &&
    r.highMidi - r.lowMidi >= MIN_SEMITONES
  );
}

/** Nota objetivo aleatoria dentro del rango, evitando los extremos cuando hay margen. */
export function randomTargetMidi(range: VocalRange, rng: () => number = Math.random): number {
  const low = range.lowMidi + 1;
  const high = range.highMidi - 1;
  const lo = high >= low ? low : range.lowMidi;
  const hi = high >= low ? high : range.highMidi;
  return lo + Math.floor(rng() * (hi - lo + 1));
}
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/music/range.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/music/range.ts src/music/range.test.ts
git commit -m "feat: rango vocal y generación de nota objetivo"
```

---

### Task 4: `music/stableNote.ts` — detector de nota sostenida

**Files:**
- Create: `src/music/stableNote.ts`
- Test: `src/music/stableNote.test.ts`

**Interfaces:**
- Produces: `interface PitchReading { midi: number; clarity: number; rms: number }`, `interface StableNoteOptions { minClarity: number; minRms: number; toleranceCents: number; requiredCount: number }`, `class StableNoteDetector { constructor(opts); push(reading: PitchReading): number | null; reset(): void }` — `push` devuelve el midi entero promedio cuando acumula `requiredCount` lecturas consecutivas válidas dentro de la tolerancia; lecturas ruidosas o silencio reinician el conteo.

- [ ] **Step 1: Escribir tests que fallan** — `src/music/stableNote.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { StableNoteDetector, type PitchReading } from './stableNote';

const OPTS = { minClarity: 0.9, minRms: 0.01, toleranceCents: 60, requiredCount: 5 };
const lectura = (midi: number, clarity = 0.95, rms = 0.1): PitchReading => ({ midi, clarity, rms });

describe('StableNoteDetector', () => {
  it('detecta una nota sostenida estable', () => {
    const d = new StableNoteDetector(OPTS);
    expect(d.push(lectura(60.1))).toBeNull();
    expect(d.push(lectura(59.9))).toBeNull();
    expect(d.push(lectura(60.05))).toBeNull();
    expect(d.push(lectura(60.0))).toBeNull();
    expect(d.push(lectura(60.02))).toBe(60);
  });

  it('reinicia si el tono salta fuera de tolerancia', () => {
    const d = new StableNoteDetector(OPTS);
    for (let i = 0; i < 4; i++) d.push(lectura(60));
    expect(d.push(lectura(63))).toBeNull(); // salto de 300 cents: reinicia con 63 de ancla
    for (let i = 0; i < 3; i++) expect(d.push(lectura(63))).toBeNull();
    expect(d.push(lectura(63))).toBe(63);
  });

  it('ignora silencio y lecturas sin claridad', () => {
    const d = new StableNoteDetector(OPTS);
    for (let i = 0; i < 4; i++) d.push(lectura(60));
    expect(d.push(lectura(60, 0.5))).toBeNull(); // claridad baja: reinicia
    expect(d.push(lectura(60, 0.95, 0.001))).toBeNull(); // silencio: reinicia
    for (let i = 0; i < 4; i++) expect(d.push(lectura(60))).toBeNull();
    expect(d.push(lectura(60))).toBe(60);
  });
});
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/music/stableNote.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implementar** — `src/music/stableNote.ts`:

```ts
export interface PitchReading {
  midi: number;
  clarity: number;
  rms: number;
}

export interface StableNoteOptions {
  minClarity: number;
  minRms: number;
  toleranceCents: number;
  requiredCount: number;
}

export class StableNoteDetector {
  private readings: number[] = [];

  constructor(private opts: StableNoteOptions) {}

  /** Devuelve el midi entero cuando la nota se estabiliza; si no, null. */
  push(reading: PitchReading): number | null {
    if (reading.clarity < this.opts.minClarity || reading.rms < this.opts.minRms) {
      this.readings = [];
      return null;
    }
    const anchor = this.readings[0];
    if (anchor !== undefined && Math.abs(reading.midi - anchor) * 100 > this.opts.toleranceCents) {
      this.readings = [reading.midi];
      return null;
    }
    this.readings.push(reading.midi);
    if (this.readings.length >= this.opts.requiredCount) {
      const avg = this.readings.reduce((a, b) => a + b, 0) / this.readings.length;
      this.readings = [];
      return Math.round(avg);
    }
    return null;
  }

  reset(): void {
    this.readings = [];
  }
}
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/music/stableNote.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/music/stableNote.ts src/music/stableNote.test.ts
git commit -m "feat: detector de nota sostenida estable"
```

---

### Task 5: `audio/pitch.ts` — análisis con pitchy

**Files:**
- Create: `src/audio/pitch.ts`
- Test: `src/audio/pitch.test.ts`

**Interfaces:**
- Consumes: `freqToMidi` (Task 2), `PitchReading` (Task 4).
- Produces: `rms(buf: Float32Array): number`, `createAnalyzer(bufferSize: number, sampleRate: number): (buf: Float32Array) => PitchReading | null` — devuelve `null` cuando pitchy no encuentra un tono válido.

- [ ] **Step 1: Escribir tests que fallan** — `src/audio/pitch.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/audio/pitch.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implementar** — `src/audio/pitch.ts`:

```ts
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
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/audio/pitch.test.ts` — Expected: PASS. Si el test de silencio falla porque pitchy devuelve una frecuencia espuria con claridad ~0, cambiar la aserción a `expect(analyze(new Float32Array(SIZE))?.clarity ?? 0).toBeLessThan(0.5)` — el gate real vive en los consumidores vía `minClarity`/`minRms`.

- [ ] **Step 5: Commit**

```bash
git add src/audio
git commit -m "feat: análisis de pitch con pitchy y RMS"
```

---

### Task 6: `progress/store.ts` — persistencia del rango

**Files:**
- Create: `src/progress/store.ts`
- Test: `src/progress/store.test.ts`

**Interfaces:**
- Consumes: `VocalRange` (Task 3).
- Produces: `saveVocalRange(range: VocalRange): Promise<void>`, `loadVocalRange(): Promise<VocalRange | null>`, `clearVocalRange(): Promise<void>`.

- [ ] **Step 1: Escribir tests que fallan** — `src/progress/store.test.ts`:

```ts
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { clearVocalRange, loadVocalRange, saveVocalRange } from './store';

describe('store', () => {
  it('devuelve null sin rango guardado', async () => {
    expect(await loadVocalRange()).toBeNull();
  });

  it('guarda, lee y borra el rango', async () => {
    await saveVocalRange({ lowMidi: 48, highMidi: 60 });
    expect(await loadVocalRange()).toEqual({ lowMidi: 48, highMidi: 60 });
    await clearVocalRange();
    expect(await loadVocalRange()).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que fallan** — Run: `npx vitest run src/progress/store.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implementar** — `src/progress/store.ts`:

```ts
import { del, get, set } from 'idb-keyval';
import type { VocalRange } from '../music/range';

const RANGE_KEY = 'afinemos:vocal-range';

export async function saveVocalRange(range: VocalRange): Promise<void> {
  await set(RANGE_KEY, range);
}

export async function loadVocalRange(): Promise<VocalRange | null> {
  return (await get<VocalRange>(RANGE_KEY)) ?? null;
}

export async function clearVocalRange(): Promise<void> {
  await del(RANGE_KEY);
}
```

- [ ] **Step 4: Verificar que pasan** — Run: `npx vitest run src/progress/store.test.ts` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/progress
git commit -m "feat: persistencia del rango vocal en IndexedDB"
```

---

### Task 7: `audio/mic.ts` y `audio/tones.ts` — pegamento de navegador

**Files:**
- Create: `src/audio/mic.ts`, `src/audio/tones.ts`

**Interfaces:**
- Consumes: `midiToFreq` (Task 2).
- Produces: `type MicErrorCode = 'permiso-denegado' | 'sin-microfono' | 'desconocido'`; `class MicError extends Error { code: MicErrorCode }`; `interface MicSession { sampleRate: number; readBuffer(): Float32Array; stop(): void }`; `startMic(bufferSize?: number): Promise<MicSession>` (lanza `MicError`); `playNote(midi: number, seconds?: number): Promise<void>`.

Sin test unitario: es glue de APIs de navegador (getUserMedia, AudioContext, Tone). El ciclo de verificación de esta tarea es `npm run build` (typecheck) + la verificación manual de la Task 11.

- [ ] **Step 1: Implementar mic** — `src/audio/mic.ts`:

```ts
export type MicErrorCode = 'permiso-denegado' | 'sin-microfono' | 'desconocido';

export class MicError extends Error {
  constructor(public code: MicErrorCode) {
    super(code);
    this.name = 'MicError';
  }
}

function toMicError(err: unknown): MicError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
      return new MicError('permiso-denegado');
    }
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      return new MicError('sin-microfono');
    }
  }
  return new MicError('desconocido');
}

export interface MicSession {
  sampleRate: number;
  /** Llena y devuelve el buffer interno con las muestras más recientes. */
  readBuffer(): Float32Array;
  stop(): void;
}

export async function startMic(bufferSize = 2048): Promise<MicSession> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (err) {
    throw toMicError(err);
  }
  const ctx = new AudioContext();
  await ctx.resume();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = bufferSize;
  source.connect(analyser);
  const buf = new Float32Array(bufferSize);
  return {
    sampleRate: ctx.sampleRate,
    readBuffer() {
      analyser.getFloatTimeDomainData(buf);
      return buf;
    },
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
```

- [ ] **Step 2: Implementar tonos** — `src/audio/tones.ts`:

```ts
import * as Tone from 'tone';
import { midiToFreq } from '../music/notes';

let synth: Tone.Synth | null = null;

/** Toca la nota de referencia. Debe llamarse desde un manejador de clic (iOS). */
export async function playNote(midi: number, seconds = 1.2): Promise<void> {
  await Tone.start();
  synth ??= new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
  synth.triggerAttackRelease(midiToFreq(midi), seconds);
}
```

- [ ] **Step 3: Verificar typecheck** — Run: `npm run build` — Expected: sin errores. Run: `npm test` — Expected: todo sigue en verde.

- [ ] **Step 4: Commit**

```bash
git add src/audio/mic.ts src/audio/tones.ts
git commit -m "feat: captura de micrófono y notas de referencia con Tone.js"
```

---

### Task 8: `ui/usePitchStream.ts` y `ui/PantallaErrorMic.tsx`

**Files:**
- Create: `src/ui/usePitchStream.ts`, `src/ui/PantallaErrorMic.tsx`

**Interfaces:**
- Consumes: `startMic`, `MicError`, `MicErrorCode`, `MicSession` (Task 7); `createAnalyzer` (Task 5); `PitchReading` (Task 4).
- Produces: `usePitchStream(active: boolean): { reading: PitchReading | null; error: MicError | null }` (lecturas cada 50 ms mientras `active`); `PantallaErrorMic({ code }: { code: MicErrorCode })`.

Glue de React sin test unitario; ciclo de verificación: `npm run build` + verificación manual (Task 11).

- [ ] **Step 1: Implementar hook** — `src/ui/usePitchStream.ts`:

```ts
import { useEffect, useState } from 'react';
import { MicError, startMic, type MicSession } from '../audio/mic';
import { createAnalyzer } from '../audio/pitch';
import type { PitchReading } from '../music/stableNote';

const BUFFER_SIZE = 2048;
const INTERVAL_MS = 50;

export function usePitchStream(active: boolean): {
  reading: PitchReading | null;
  error: MicError | null;
} {
  const [reading, setReading] = useState<PitchReading | null>(null);
  const [error, setError] = useState<MicError | null>(null);

  useEffect(() => {
    if (!active) {
      setReading(null);
      return;
    }
    let session: MicSession | null = null;
    let timer: number | undefined;
    let cancelled = false;
    startMic(BUFFER_SIZE)
      .then((s) => {
        if (cancelled) {
          s.stop();
          return;
        }
        session = s;
        const analyze = createAnalyzer(BUFFER_SIZE, s.sampleRate);
        timer = window.setInterval(() => {
          setReading(analyze(s.readBuffer()));
        }, INTERVAL_MS);
      })
      .catch((e: unknown) => {
        setError(e instanceof MicError ? e : new MicError('desconocido'));
      });
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      session?.stop();
    };
  }, [active]);

  return { reading, error };
}
```

- [ ] **Step 2: Implementar pantalla de error** — `src/ui/PantallaErrorMic.tsx`:

```tsx
import type { MicErrorCode } from '../audio/mic';

const MENSAJES: Record<MicErrorCode, string> = {
  'permiso-denegado':
    'El navegador no tiene permiso para usar el micrófono. Actívalo en la configuración del sitio (el candado junto a la dirección) y recarga la página.',
  'sin-microfono': 'No se encontró ningún micrófono. Conecta uno o revisa tu configuración de audio.',
  desconocido: 'No se pudo acceder al micrófono. Recarga la página e intenta de nuevo.',
};

export function PantallaErrorMic({ code }: { code: MicErrorCode }) {
  return (
    <section>
      <h2>Micrófono no disponible 🎤</h2>
      <p>{MENSAJES[code]}</p>
    </section>
  );
}
```

- [ ] **Step 3: Verificar** — Run: `npm run build` — Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/ui
git commit -m "feat: hook de lecturas de pitch y pantalla de error de micrófono"
```

---

### Task 9: `ui/AsistenteRango.tsx` — asistente de rango vocal

**Files:**
- Create: `src/ui/AsistenteRango.tsx`

**Interfaces:**
- Consumes: `usePitchStream`, `PantallaErrorMic` (Task 8); `StableNoteDetector`, `PitchReading` (Task 4); `midiToNoteName` (Task 2); `isValidRange`, `VocalRange` (Task 3).
- Produces: `AsistenteRango({ onComplete }: { onComplete(range: VocalRange): void })`.

- [ ] **Step 1: Implementar** — `src/ui/AsistenteRango.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { midiToNoteName } from '../music/notes';
import { isValidRange, type VocalRange } from '../music/range';
import { StableNoteDetector, type PitchReading } from '../music/stableNote';
import { PantallaErrorMic } from './PantallaErrorMic';
import { usePitchStream } from './usePitchStream';

type Paso = 'inicio' | 'grave' | 'agudo' | 'listo';

// ~1.2 s de nota sostenida a 20 lecturas/segundo
const DETECTOR_OPTS = { minClarity: 0.9, minRms: 0.01, toleranceCents: 60, requiredCount: 25 };

export function AsistenteRango({ onComplete }: { onComplete(range: VocalRange): void }) {
  const [paso, setPaso] = useState<Paso>('inicio');
  const [lowMidi, setLowMidi] = useState<number | null>(null);
  const [highMidi, setHighMidi] = useState<number | null>(null);
  const detector = useRef(new StableNoteDetector(DETECTOR_OPTS));
  const { reading, error } = usePitchStream(paso === 'grave' || paso === 'agudo');

  useEffect(() => {
    if (!reading) return;
    const midi = detector.current.push(reading);
    if (midi === null) return;
    if (paso === 'grave') {
      setLowMidi(midi);
      detector.current.reset();
      setPaso('agudo');
    } else if (paso === 'agudo') {
      setHighMidi(midi);
      setPaso('listo');
    }
  }, [reading, paso]);

  if (error) return <PantallaErrorMic code={error.code} />;

  const rangoValido =
    lowMidi !== null && highMidi !== null && isValidRange({ lowMidi, highMidi });

  return (
    <section>
      <h1>Afinemos</h1>
      {paso === 'inicio' && (
        <>
          <p>Primero vamos a conocer tu voz: te pediré tu nota cómoda más grave y la más aguda.</p>
          <p>Busca un lugar silencioso y acércate al micrófono.</p>
          <button onClick={() => setPaso('grave')}>Empezar 🎤</button>
        </>
      )}
      {paso === 'grave' && (
        <>
          <h2>Tu nota más grave</h2>
          <p>Canta «aaah» con la voz más grave que te salga cómoda, y sostenla.</p>
          <Escuchando reading={reading} />
        </>
      )}
      {paso === 'agudo' && (
        <>
          <h2>¡Grave lista! {lowMidi !== null && `(${midiToNoteName(lowMidi)})`}</h2>
          <p>Ahora canta «aaah» con la voz más aguda que te salga cómoda, y sostenla.</p>
          <Escuchando reading={reading} />
        </>
      )}
      {paso === 'listo' &&
        (rangoValido ? (
          <>
            <h2>
              Tu rango: {midiToNoteName(lowMidi!)} – {midiToNoteName(highMidi!)}
            </h2>
            <p>Todos los ejercicios usarán notas dentro de este rango.</p>
            <button onClick={() => onComplete({ lowMidi: lowMidi!, highMidi: highMidi! })}>
              Guardar y empezar
            </button>
          </>
        ) : (
          <>
            <p>Las dos notas quedaron muy juntas o invertidas. Intentemos otra vez.</p>
            <button
              onClick={() => {
                setLowMidi(null);
                setHighMidi(null);
                detector.current.reset();
                setPaso('grave');
              }}
            >
              Reintentar
            </button>
          </>
        ))}
    </section>
  );
}

function Escuchando({ reading }: { reading: PitchReading | null }) {
  const oyendo = reading !== null && reading.rms >= 0.01;
  return <p aria-live="polite">{oyendo ? '🎶 Te escucho… sostén la nota' : '… esperando tu voz'}</p>;
}
```

- [ ] **Step 2: Verificar** — Run: `npm run build` y `npm test` — Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add src/ui/AsistenteRango.tsx
git commit -m "feat: asistente de rango vocal en tres pasos"
```

---

### Task 10: `ui/BurbujaTono.tsx`, `ui/Afinador.tsx` y estilos

**Files:**
- Create: `src/ui/BurbujaTono.tsx`, `src/ui/Afinador.tsx`
- Modify: `src/styles.css` (agregar al final)

**Interfaces:**
- Consumes: `usePitchStream`, `PantallaErrorMic` (Task 8); `centsOff`, `midiToNoteName`, `tuningStatus`, `TuningStatus` (Task 2); `randomTargetMidi`, `VocalRange` (Task 3); `playNote` (Task 7).
- Produces: `BurbujaTono({ cents, status }: { cents: number | null; status: TuningStatus | null })`; `Afinador({ range, onResetRange }: { range: VocalRange; onResetRange(): void })`.

- [ ] **Step 1: Implementar burbuja** — `src/ui/BurbujaTono.tsx`:

```tsx
import type { TuningStatus } from '../music/notes';

const COLORS: Record<TuningStatus, string> = {
  afinado: '#3a9d5d',
  cerca: '#d9a521',
  lejos: '#c94f4f',
};

export function BurbujaTono({ cents, status }: { cents: number | null; status: TuningStatus | null }) {
  // +100 cents (agudo) arriba, -100 (grave) abajo; el centro es la nota objetivo.
  const clamped = Math.max(-100, Math.min(100, cents ?? 0));
  const y = 50 - clamped * 0.45; // % desde arriba del carril
  return (
    <div className="burbuja-pista" role="img" aria-label="Indicador de afinación">
      <div className="burbuja-linea" />
      {cents !== null && status !== null && (
        <div className="burbuja" style={{ top: `${y}%`, background: COLORS[status] }} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implementar afinador** — `src/ui/Afinador.tsx`:

```tsx
import { useState } from 'react';
import { playNote } from '../audio/tones';
import { centsOff, midiToNoteName, tuningStatus } from '../music/notes';
import { randomTargetMidi, type VocalRange } from '../music/range';
import { BurbujaTono } from './BurbujaTono';
import { PantallaErrorMic } from './PantallaErrorMic';
import { usePitchStream } from './usePitchStream';

const MIN_RMS = 0.01;
const MIN_CLARITY = 0.85;

export function Afinador({ range, onResetRange }: { range: VocalRange; onResetRange(): void }) {
  const [target, setTarget] = useState(() => randomTargetMidi(range));
  const [activo, setActivo] = useState(false);
  const { reading, error } = usePitchStream(activo);

  if (error) return <PantallaErrorMic code={error.code} />;

  const valido = reading !== null && reading.rms >= MIN_RMS && reading.clarity >= MIN_CLARITY;
  const cents = valido ? centsOff(reading.midi, target) : null;
  const status = cents !== null ? tuningStatus(cents) : null;

  return (
    <section>
      <h1>Afinemos</h1>
      <p className="objetivo">
        Nota objetivo: <strong>{midiToNoteName(target)}</strong>
      </p>
      <div className="controles">
        <button onClick={() => void playNote(target)}>🔊 Escuchar</button>
        <button
          onClick={() => {
            setTarget(randomTargetMidi(range));
          }}
        >
          Otra nota
        </button>
      </div>
      {!activo ? (
        <p>
          <button onClick={() => setActivo(true)}>Empezar a cantar 🎤</button>
        </p>
      ) : (
        <>
          <BurbujaTono cents={cents} status={status} />
          <p className="indicacion" aria-live="polite">
            {indicacion(cents)}
          </p>
        </>
      )}
      <p>
        <button className="enlace" onClick={onResetRange}>
          Volver a medir mi rango
        </button>
      </p>
    </section>
  );
}

function indicacion(cents: number | null): string {
  if (cents === null) return 'Canta la nota…';
  if (cents < -25) return 'Sube un poco ↑ (estás grave)';
  if (cents > 25) return 'Baja un poco ↓ (estás agudo)';
  return '¡Afinado! 🎉';
}
```

- [ ] **Step 3: Agregar estilos** — al final de `src/styles.css`:

```css
.burbuja-pista {
  position: relative;
  height: 16rem;
  width: 6rem;
  margin: 1rem auto;
  border: 1px solid #8884;
  border-radius: 3rem;
  overflow: hidden;
}
.burbuja-linea {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  border-top: 2px dashed #888;
}
.burbuja {
  position: absolute;
  left: 50%;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: top 80ms linear;
}
.controles {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin: 1rem 0;
}
.indicacion {
  font-size: 1.25rem;
  min-height: 1.5em;
}
.enlace {
  background: none;
  border: none;
  font-size: 0.9rem;
  text-decoration: underline;
  color: inherit;
  opacity: 0.7;
}
```

- [ ] **Step 4: Verificar** — Run: `npm run build` y `npm test` — Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src/ui/BurbujaTono.tsx src/ui/Afinador.tsx src/styles.css
git commit -m "feat: pantalla de afinación con burbuja de tono"
```

---

### Task 11: `App.tsx` — cableado final y verificación manual

**Files:**
- Modify: `src/App.tsx` (reemplazar completo)
- Create: `README.md`

**Interfaces:**
- Consumes: `AsistenteRango` (Task 9), `Afinador` (Task 10), `loadVocalRange`/`saveVocalRange`/`clearVocalRange` (Task 6), `VocalRange` (Task 3).

- [ ] **Step 1: Reemplazar `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { VocalRange } from './music/range';
import { clearVocalRange, loadVocalRange, saveVocalRange } from './progress/store';
import { Afinador } from './ui/Afinador';
import { AsistenteRango } from './ui/AsistenteRango';

export default function App() {
  const [range, setRange] = useState<VocalRange | null | 'cargando'>('cargando');

  useEffect(() => {
    void loadVocalRange().then(setRange);
  }, []);

  if (range === 'cargando') return <p>Cargando…</p>;
  if (range === null) {
    return (
      <AsistenteRango
        onComplete={(r) => {
          void saveVocalRange(r).then(() => setRange(r));
        }}
      />
    );
  }
  return (
    <Afinador
      range={range}
      onResetRange={() => {
        void clearVocalRange().then(() => setRange(null));
      }}
    />
  );
}
```

- [ ] **Step 2: Escribir `README.md`**

```markdown
# Afinemos 🎤

Entrenador vocal personal: detecta tu rango, te da una nota objetivo y te
muestra en tiempo real si estás afinado. 100 % local: nada sale de tu
navegador.

## Uso

​```bash
npm install
npm run dev          # en la Mac
npm run dev -- --host  # para abrirla desde el teléfono (misma red wifi)
​```

La primera vez, el asistente mide tu rango vocal (nota cómoda más grave y
más aguda). Después: escucha la nota objetivo, cántala, y la burbuja te
dice si vas bien (verde), cerca (ámbar) o lejos (rojo).

Consejo: deja de cantar mientras suena la nota de referencia; el micrófono
la puede captar.

Diseño y fases futuras: `docs/superpowers/specs/2026-07-12-afinemos-design.md`.
```

(Nota: quitar los zero-width `​` antes de los backticks internos al escribir el archivo real.)

- [ ] **Step 3: Suite completa** — Run: `npm test && npm run build` — Expected: todo verde.

- [ ] **Step 4: Verificación manual (checklist)**

Arrancar `npm run dev` y en el navegador:

1. Primera visita → aparece el asistente; el audio NO arranca hasta pulsar «Empezar 🎤».
2. Conceder permiso de micrófono → cantar nota grave sostenida ~1.5 s → pasa al paso agudo mostrando el nombre de la nota.
3. Cantar nota aguda → resumen del rango → «Guardar y empezar» → aparece el afinador.
4. «🔊 Escuchar» toca la nota; cantar y ver la burbuja moverse con colores y la indicación «Sube ↑ / Baja ↓ / ¡Afinado!».
5. Guardar silencio → la burbuja desaparece y vuelve «Canta la nota…».
6. Recargar la página → va directo al afinador (rango persistido).
7. «Volver a medir mi rango» → regresa al asistente.
8. Denegar el permiso de micrófono (en una ventana privada) → aparece `PantallaErrorMic` con instrucciones.
9. Abrir desde el teléfono (`npm run dev -- --host` + IP local) → todo lo anterior funciona; en iPhone el audio arranca sólo tras el botón.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx README.md
git commit -m "feat: cableado de la app y README"
```

---

## Self-Review (hecho al escribir el plan)

- **Cobertura del spec (Fase 1):** asistente de rango ✔ (Task 9), afinación con burbuja y colores ±25/±50 ✔ (Tasks 2 y 10), lenguaje visual primero ✔ (copy en Tasks 9–10), permiso de mic ✔ (Tasks 7–8), gate de ruido ✔ (Tasks 4–5, umbrales en 9–10), gesto iOS ✔ (botones «Empezar»), persistencia IndexedDB ✔ (Task 6), tests con señales sintéticas ✔ (Task 5). PWA diferida explícitamente (Global Constraints).
- **Placeholders:** ninguno; todo el código está en el plan.
- **Consistencia de tipos:** `PitchReading` (Task 4) usado en 5, 8, 9; `centsOff(midi, target)` definido en Task 2 y usado así en Task 10; `MicError.code` producido en Task 7 y consumido en 8–10.
