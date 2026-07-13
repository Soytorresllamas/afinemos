import * as Tone from 'tone';
import { midiToFreq } from '../music/notes';

let synth: Tone.Synth | null = null;

/** Toca la nota de referencia. Debe llamarse desde un manejador de clic (iOS). */
export async function playNote(midi: number, seconds = 1.2): Promise<void> {
  await Tone.start();
  synth ??= new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
  synth.triggerAttackRelease(midiToFreq(midi), seconds);
}
