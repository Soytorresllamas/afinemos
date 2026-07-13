import { useEffect, useState } from 'react';
import { MicError, startMic, type MicSession } from '../audio/mic';
import { createAnalyzer } from '../audio/pitch';
import type { PitchReading } from '../music/stableNote';

const BUFFER_SIZE = 2048;
const INTERVAL_MS = 50;

export function usePitchStream(active: boolean): {
  reading: PitchReading | null;
  error: MicError | null;
} {
  const [reading, setReading] = useState<PitchReading | null>(null);
  const [error, setError] = useState<MicError | null>(null);

  useEffect(() => {
    if (!active) {
      setReading(null);
      return;
    }
    let session: MicSession | null = null;
    let timer: number | undefined;
    let cancelled = false;
    startMic(BUFFER_SIZE)
      .then((s) => {
        if (cancelled) {
          s.stop();
          return;
        }
        session = s;
        const analyze = createAnalyzer(BUFFER_SIZE, s.sampleRate);
        timer = window.setInterval(() => {
          setReading(analyze(s.readBuffer()));
        }, INTERVAL_MS);
      })
      .catch((e: unknown) => {
        setError(e instanceof MicError ? e : new MicError('desconocido'));
      });
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      session?.stop();
    };
  }, [active]);

  return { reading, error };
}
