import * as Tone from 'tone';
import { midiToFreq } from '../music/notes';

export type Instrumento = 'sinte' | 'piano' | 'flauta';

export const INSTRUMENTOS: Record<Instrumento, string> = {
  sinte: 'Sinte',
  piano: 'Piano',
  flauta: 'Flauta suave',
};

const SOUND_KEY = 'afinemos:instrumento';

/** Sonido de referencia preferido (persistido en este navegador). */
export function preferredInstrument(): Instrumento {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    return v === 'piano' || v === 'flauta' ? v : 'sinte';
  } catch {
    return 'sinte';
  }
}

export function setPreferredInstrument(i: Instrumento): void {
  try {
    localStorage.setItem(SOUND_KEY, i);
  } catch {
    /* almacenamiento no disponible: la selección no persiste */
  }
}

let synth: Tone.Synth | null = null;
let flauta: Tone.Synth | null = null;
let piano: Tone.Sampler | null = null;

interface Tocable {
  triggerAttackRelease(freq: number, duration: number, time?: number): unknown;
}

/** Instancia (perezosa) del instrumento elegido. El piano descarga sus
 *  muestras (Salamander) la primera vez; `Tone.loaded()` espera a que estén. */
async function instrumento(): Promise<Tocable> {
  const pref = preferredInstrument();
  if (pref === 'piano') {
    piano ??= new Tone.Sampler({
      urls: {
        C3: 'C3.mp3',
        'D#3': 'Ds3.mp3',
        'F#3': 'Fs3.mp3',
        A3: 'A3.mp3',
        C4: 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4: 'A4.mp3',
        C5: 'C5.mp3',
      },
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).toDestination();
    await Tone.loaded();
    return piano;
  }
  if (pref === 'flauta') {
    if (flauta === null) {
      const vibrato = new Tone.Vibrato(5, 0.1).toDestination();
      flauta = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.08, decay: 0.05, sustain: 0.9, release: 0.4 },
      }).connect(vibrato);
    }
    return flauta;
  }
  synth ??= new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
  return synth;
}

/** Toca la nota de referencia. Debe llamarse desde un manejador de clic (iOS). */
export async function playNote(midi: number, seconds = 1.2): Promise<void> {
  await Tone.start();
  const inst = await instrumento();
  inst.triggerAttackRelease(midiToFreq(midi), seconds);
}

/** Toca una secuencia de notas, una tras otra. Llamar desde un manejador de clic (iOS). */
export async function playNotes(midis: number[], noteSeconds = 1): Promise<void> {
  await Tone.start();
  const inst = await instrumento();
  const now = Tone.now();
  midis.forEach((midi, i) => {
    inst.triggerAttackRelease(midiToFreq(midi), noteSeconds * 0.9, now + i * noteSeconds);
  });
}

/** Toca una sirena: sube de low a high y regresa. Siempre con sinte (el
 *  glissando necesita rampa continua de frecuencia; el piano no puede). */
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
