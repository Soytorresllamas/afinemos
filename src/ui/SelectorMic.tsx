import { useEffect, useState } from 'react';
import { listMics, type MicDevice } from '../audio/mic';

/** Selector de entrada de audio (celular, computadora, audífonos…).
 *  Los nombres reales aparecen cuando el navegador ya concedió el permiso. */
export function SelectorMic({
  activo,
  value,
  onChange,
}: {
  activo: boolean;
  value: string | null;
  onChange(id: string): void;
}) {
  const [mics, setMics] = useState<MicDevice[]>([]);

  useEffect(() => {
    if (!activo || !navigator.mediaDevices?.enumerateDevices) return;
    let cancelado = false;
    listMics()
      .then((m) => {
        if (!cancelado) setMics(m);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [activo]);

  if (mics.length < 2) return null;

  return (
    <label className="selector-mic">
      Micrófono
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          Elige uno…
        </option>
        {mics.map((m) => (
          <option key={m.deviceId} value={m.deviceId}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );
}
