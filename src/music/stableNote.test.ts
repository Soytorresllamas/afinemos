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
