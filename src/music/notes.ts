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
