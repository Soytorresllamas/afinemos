import { useEffect, useRef, useState } from 'react';
import { playNotes, playSiren } from '../audio/tones';
import { generateExercise } from '../exercises/generate';
import { gradeHeldExercise, gradeSiren } from '../exercises/grade';
import { bucketReadings, validMidis, type TimedReading } from '../exercises/recorder';
import { EXERCISE_LABELS, type Exercise, type ExerciseType } from '../exercises/types';
import { centsOff, midiToNoteName } from '../music/notes';
import type { VocalRange } from '../music/range';
import { saveSession } from '../progress/store';
import { PantallaErrorMic } from './PantallaErrorMic';
import { usePitchStream } from './usePitchStream';

const GATE = { minClarity: 0.85, minRms: 0.01 };
const LISTEN_NOTE_S = 1;
const TRANSITION_MS = 400;

type Fase = 'listo' | 'escucha' | 'canta' | 'resultado';

interface Resultado {
  total: number;
  detalle: string;
}

function totalMsDe(e: Exercise): number {
  return e.type === 'sirena' ? e.durationMs : e.steps.reduce((a, s) => a + s.durationMs, 0);
}

function calificar(e: Exercise, lecturas: TimedReading[]): Resultado | null {
  if (e.type === 'sirena') {
    const g = gradeSiren(validMidis(lecturas, GATE), e.lowMidi, e.highMidi);
    return g && { total: g.total, detalle: `Cubriste el ${g.cobertura}% del recorrido` };
  }
  const buckets = bucketReadings(e.steps, lecturas, GATE);
  const cents = buckets.map((midis, i) => midis.map((m) => centsOff(m, e.steps[i].targetMidi)));
  const g = gradeHeldExercise(cents);
  return g && { total: g.total, detalle: `Precisión ${g.precision} · Estabilidad ${g.estabilidad}` };
}

function mensaje(total: number): string {
  if (total >= 80) return '¡Excelente! 🌟';
  if (total >= 60) return '¡Muy bien! 🙂';
  if (total >= 40) return 'Vas bien, sigue así 💪';
  return 'Sigue intentando 💪';
}

export function Ejercicio({
  type,
  range,
  onSalir,
}: {
  type: ExerciseType;
  range: VocalRange;
  onSalir(): void;
}) {
  const [ejercicio, setEjercicio] = useState<Exercise>(() => generateExercise(type, range));
  const [fase, setFase] = useState<Fase>('listo');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const lecturas = useRef<TimedReading[]>([]);
  const inicioCanto = useRef(0);
  const { reading, error } = usePitchStream(fase === 'canta');

  // Acumular lecturas con tiempo mientras canta.
  useEffect(() => {
    if (fase !== 'canta' || reading === null) return;
    lecturas.current.push({ ...reading, timeMs: performance.now() - inicioCanto.current });
  }, [fase, reading]);

  // Fase escucha: calcular duración y pasar a cantar tras finalizar la reproducción.
  useEffect(() => {
    if (fase !== 'escucha') return;
    let listenMs: number;
    if (ejercicio.type === 'sirena') {
      listenMs = ejercicio.durationMs;
    } else {
      listenMs = ejercicio.steps.length * LISTEN_NOTE_S * 1000;
    }
    const t = window.setTimeout(() => {
      lecturas.current = [];
      inicioCanto.current = performance.now();
      setFase('canta');
    }, listenMs + TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [fase, ejercicio]);

  // Fase canta: al terminar el tiempo, calificar y guardar.
  useEffect(() => {
    if (fase !== 'canta') return;
    const t = window.setTimeout(() => {
      const res = calificar(ejercicio, lecturas.current);
      setResultado(res);
      setFase('resultado');
      if (res !== null) {
        saveSession({
          fecha: new Date().toISOString(),
          ejercicio: ejercicio.type,
          calificacion: res.total,
        }).catch(() => {});
      }
    }, totalMsDe(ejercicio) + TRANSITION_MS);
    return () => window.clearTimeout(t);
  }, [fase, ejercicio]);

  if (error) return <PantallaErrorMic code={error.code} />;

  const notas =
    ejercicio.type === 'sirena'
      ? `${midiToNoteName(ejercicio.lowMidi)} → ${midiToNoteName(ejercicio.highMidi)} → ${midiToNoteName(ejercicio.lowMidi)}`
      : ejercicio.steps.map((s) => midiToNoteName(s.targetMidi)).join(' · ');

  const reproducir = () => {
    if (ejercicio.type === 'sirena') {
      void playSiren(ejercicio.lowMidi, ejercicio.highMidi, ejercicio.durationMs / 1000);
    } else {
      void playNotes(
        ejercicio.steps.map((s) => s.targetMidi),
        LISTEN_NOTE_S,
      );
    }
  };

  const empezar = () => {
    setResultado(null);
    reproducir();
    setFase('escucha');
  };

  const otro = () => {
    setEjercicio(generateExercise(type, range));
    setResultado(null);
    setFase('listo');
  };

  return (
    <section>
      <h1>{EXERCISE_LABELS[type]}</h1>
      {fase === 'listo' && (
        <>
          <p>
            {ejercicio.type === 'sirena'
              ? 'Escucha la sirena y luego imítala: sube y baja con tu voz como ella.'
              : 'Escucha las notas y luego repítelas cantando «aaah».'}
          </p>
          <p className="notas-secundarias">{notas}</p>
          <button onClick={empezar}>Escuchar y cantar 🎵</button>
        </>
      )}
      {fase === 'escucha' && <p className="indicacion">🔊 Escucha con atención…</p>}
      {fase === 'canta' && (
        <>
          <p className="indicacion" aria-live="polite">
            🎤 ¡Ahora tú!
          </p>
          <p className="notas-secundarias">{notas}</p>
        </>
      )}
      {fase === 'resultado' &&
        (resultado ? (
          <>
            <p className="calificacion">{resultado.total}</p>
            <p className="indicacion">{mensaje(resultado.total)}</p>
            <p className="notas-secundarias">{resultado.detalle}</p>
          </>
        ) : (
          <p className="indicacion">No te escuché bien 🤔 Acércate al micrófono e intenta de nuevo.</p>
        ))}
      {(fase === 'listo' || fase === 'resultado') && (
        <div className="controles">
          {fase === 'resultado' && <button onClick={empezar}>Repetir 🔁</button>}
          {fase === 'resultado' && <button onClick={otro}>Otro ejercicio 🎲</button>}
          <button className="enlace" onClick={onSalir}>
            Volver a ejercicios
          </button>
        </div>
      )}
    </section>
  );
}
