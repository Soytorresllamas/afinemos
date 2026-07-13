import { useState } from 'react';
import { preferredMicId, setPreferredMicId } from '../audio/mic';
import { playNote } from '../audio/tones';
import { centsOff, midiToNoteName, tuningStatus } from '../music/notes';
import { randomTargetMidi, type VocalRange } from '../music/range';
import { CirculoTono } from './CirculoTono';
import { CONSEJOS_AGUDO, CONSEJOS_GENERALES, CONSEJOS_GRAVE } from './consejos';
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
          {cents !== null && Math.abs(cents) > 25 && (
            <Consejo cents={cents} target={target} />
          )}
        </>
      )}
      <ReglaNotas range={range} targetMidi={target} />
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

/** Un consejo contextual estable por nota objetivo (no parpadea entre lecturas). */
function Consejo({ cents, target }: { cents: number; target: number }) {
  const lista = cents < 0 ? CONSEJOS_GRAVE : CONSEJOS_AGUDO;
  const consejo = lista[target % lista.length];
  return <p className="consejo-contextual">💡 {consejo}</p>;
}
