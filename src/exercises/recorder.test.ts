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
