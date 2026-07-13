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
