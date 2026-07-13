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
