import { useEffect, useRef, useState } from 'react';
import { midiToNoteName } from '../music/notes';
import { isValidRange, type VocalRange } from '../music/range';
import { StableNoteDetector, type PitchReading } from '../music/stableNote';
import { PantallaErrorMic } from './PantallaErrorMic';
import { usePitchStream } from './usePitchStream';

type Paso = 'inicio' | 'grave' | 'agudo' | 'listo';

// ~1.2 s de nota sostenida a 20 lecturas/segundo
const DETECTOR_OPTS = { minClarity: 0.9, minRms: 0.01, toleranceCents: 60, requiredCount: 25 };

export function AsistenteRango({ onComplete }: { onComplete(range: VocalRange): void }) {
  const [paso, setPaso] = useState<Paso>('inicio');
  const [lowMidi, setLowMidi] = useState<number | null>(null);
  const [highMidi, setHighMidi] = useState<number | null>(null);
  const detector = useRef(new StableNoteDetector(DETECTOR_OPTS));
  const { reading, error } = usePitchStream(paso === 'grave' || paso === 'agudo');

  useEffect(() => {
    if (!reading) return;
    const midi = detector.current.push(reading);
    if (midi === null) return;
    if (paso === 'grave') {
      setLowMidi(midi);
      detector.current.reset();
      setPaso('agudo');
    } else if (paso === 'agudo') {
      setHighMidi(midi);
      setPaso('listo');
    }
  }, [reading, paso]);

  if (error) return <PantallaErrorMic code={error.code} />;

  const rangoValido =
    lowMidi !== null && highMidi !== null && isValidRange({ lowMidi, highMidi });

  return (
    <section>
      <h1>Afinemos</h1>
      {paso === 'inicio' && (
        <>
          <p>Primero vamos a conocer tu voz: te pediré tu nota cómoda más grave y la más aguda.</p>
          <p>Busca un lugar silencioso y acércate al micrófono.</p>
          <button onClick={() => setPaso('grave')}>Empezar 🎤</button>
        </>
      )}
      {paso === 'grave' && (
        <>
          <h2>Tu nota más grave</h2>
          <p>Canta «aaah» con la voz más grave que te salga cómoda, y sostenla.</p>
          <Escuchando reading={reading} />
        </>
      )}
      {paso === 'agudo' && (
        <>
          <h2>¡Grave lista! {lowMidi !== null && `(${midiToNoteName(lowMidi)})`}</h2>
          <p>Ahora canta «aaah» con la voz más aguda que te salga cómoda, y sostenla.</p>
          <Escuchando reading={reading} />
        </>
      )}
      {paso === 'listo' &&
        (rangoValido ? (
          <>
            <h2>
              Tu rango: {midiToNoteName(lowMidi!)} – {midiToNoteName(highMidi!)}
            </h2>
            <p>Todos los ejercicios usarán notas dentro de este rango.</p>
            <button onClick={() => onComplete({ lowMidi: lowMidi!, highMidi: highMidi! })}>
              Guardar y empezar
            </button>
          </>
        ) : (
          <>
            <p>Las dos notas quedaron muy juntas o invertidas. Intentemos otra vez.</p>
            <button
              onClick={() => {
                setLowMidi(null);
                setHighMidi(null);
                detector.current.reset();
                setPaso('grave');
              }}
            >
              Reintentar
            </button>
          </>
        ))}
    </section>
  );
}

function Escuchando({ reading }: { reading: PitchReading | null }) {
  const oyendo = reading !== null && reading.rms >= 0.01;
  return <p aria-live="polite">{oyendo ? '🎶 Te escucho… sostén la nota' : '… esperando tu voz'}</p>;
}
