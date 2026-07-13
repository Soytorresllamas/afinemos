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
