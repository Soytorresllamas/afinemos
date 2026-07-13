import * as Tone from 'tone';
import { midiToFreq } from '../music/notes';

let synth: Tone.Synth | null = null;

/** Toca la nota de referencia. Debe llamarse desde un manejador de clic (iOS). */
export async function playNote(midi: number, seconds = 1.2): Promise<void> {
  await Tone.start();
  synth ??= new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
  synth.triggerAttackRelease(midiToFreq(midi), seconds);
}

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
