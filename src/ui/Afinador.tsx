import { useState } from 'react';
import { playNote } from '../audio/tones';
import { centsOff, midiToNoteName, tuningStatus } from '../music/notes';
import { randomTargetMidi, type VocalRange } from '../music/range';
import { BurbujaTono } from './BurbujaTono';
import { PantallaErrorMic } from './PantallaErrorMic';
import { usePitchStream } from './usePitchStream';

const MIN_RMS = 0.01;
const MIN_CLARITY = 0.85;

export function Afinador({ range, onResetRange }: { range: VocalRange; onResetRange(): void }) {
  const [target, setTarget] = useState(() => randomTargetMidi(range));
  const [activo, setActivo] = useState(false);
  const { reading, error } = usePitchStream(activo);

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
      </div>
      {!activo ? (
        <p>
          <button onClick={() => setActivo(true)}>Empezar a cantar 🎤</button>
        </p>
      ) : (
        <>
          <BurbujaTono cents={cents} status={status} />
          <p className="indicacion" aria-live="polite">
            {indicacion(cents)}
          </p>
        </>
      )}
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
