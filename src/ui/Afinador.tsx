import { useEffect, useRef, useState } from 'react';
import { preferredMicId, setPreferredMicId } from '../audio/mic';
import { playNote } from '../audio/tones';
import { centsOff, midiToNoteName, tuningStatus } from '../music/notes';
import { randomTargetMidi, type VocalRange } from '../music/range';
import { CirculoTono } from './CirculoTono';
import { CONSEJOS_GENERALES, consejoPara } from './consejos';
import { PantallaErrorMic } from './PantallaErrorMic';
import { ReglaNotas } from './ReglaNotas';
import { SelectorMic } from './SelectorMic';
import { usePitchStream } from './usePitchStream';

const MIN_RMS = 0.01;
const MIN_CLARITY = 0.85;

export function Afinador({
  range,
  onResetRange,
  onEjercicios,
}: {
  range: VocalRange;
  onResetRange(): void;
  onEjercicios(): void;
}) {
  const [target, setTarget] = useState(() => randomTargetMidi(range));
  const [activo, setActivo] = useState(false);
  const [micId, setMicId] = useState<string | null>(() => preferredMicId());
  const { reading, error } = usePitchStream(activo, micId);

  if (error) return <PantallaErrorMic code={error.code} />;

  const valido = reading !== null && reading.rms >= MIN_RMS && reading.clarity >= MIN_CLARITY;
  const cents = valido ? centsOff(reading.midi, target) : null;
  const status = cents !== null ? tuningStatus(cents) : null;

  // Promedio de desviación con esta nota objetivo: el consejo se basa en la
  // tendencia («en promedio vas grave/agudo»), no en la lectura del instante.
  const media = useRef({ n: 0, sum: 0 });
  useEffect(() => {
    media.current = { n: 0, sum: 0 };
  }, [target, activo]);
  useEffect(() => {
    if (reading === null) return;
    if (reading.rms < MIN_RMS || reading.clarity < MIN_CLARITY) return;
    media.current.n += 1;
    media.current.sum += centsOff(reading.midi, target);
  }, [reading, target]);
  const promedio = media.current.n >= 10 ? media.current.sum / media.current.n : null;

  return (
    <section>
      <h1>Afinemos</h1>
      <p className="objetivo">
        Nota objetivo: <strong>{midiToNoteName(target)}</strong>
      </p>
      <div className="controles">
        <button onClick={() => void playNote(target)}>🔊 Escuchar</button>
        <button
          onClick={() => {
            setTarget(randomTargetMidi(range));
          }}
        >
          Otra nota
        </button>
        <button onClick={onEjercicios}>Ejercicios 🎵</button>
      </div>
      {!activo ? (
        <p>
          <button onClick={() => setActivo(true)}>Empezar a cantar 🎤</button>
        </p>
      ) : (
        <>
          <CirculoTono
            estado={status ?? 'esperando'}
            cents={cents}
            nota={valido ? midiToNoteName(reading.midi) : null}
          />
          <p className="indicacion" aria-live="polite">
            {indicacion(cents)}
          </p>
          {promedio !== null && Math.abs(promedio) > 25 && (
            <p className="consejo-contextual">
              💡 {promedio < 0 ? 'En promedio vas grave (sube). ' : 'En promedio vas agudo (baja). '}
              {consejoPara(promedio, target)}
            </p>
          )}
        </>
      )}
      <ReglaNotas range={range} targetMidis={[target]} />
      <SelectorMic
        activo={activo}
        value={micId}
        onChange={(id) => {
          setPreferredMicId(id);
          setMicId(id);
        }}
      />
      <details className="consejos">
        <summary>Consejos para modular mejor</summary>
        <ul>
          {CONSEJOS_GENERALES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
      <p>
        <button className="enlace" onClick={onResetRange}>
          Volver a medir mi rango
        </button>
      </p>
    </section>
  );
}

function indicacion(cents: number | null): string {
  if (cents === null) return 'Canta la nota…';
  if (cents < -25) return 'Sube un poco ↑ (estás grave)';
  if (cents > 25) return 'Baja un poco ↓ (estás agudo)';
  return '¡Afinado! 🎉';
}

