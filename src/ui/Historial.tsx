import { useEffect, useState } from 'react';
import { EXERCISE_LABELS } from '../exercises/types';
import { listSessions, type SessionRecord } from '../progress/store';

export function Historial({ onVolver }: { onVolver(): void }) {
  const [sesiones, setSesiones] = useState<SessionRecord[] | null>(null);

  useEffect(() => {
    listSessions()
      .then(setSesiones)
      .catch(() => setSesiones([]));
  }, []);

  return (
    <section>
      <h1>Mi historial 📈</h1>
      {sesiones === null && <p>Cargando…</p>}
      {sesiones !== null && sesiones.length === 0 && (
        <p>Aún no hay sesiones. ¡Haz tu primer ejercicio!</p>
      )}
      {sesiones !== null && sesiones.length > 0 && (
        <ul className="historial">
          {sesiones.map((s, i) => (
            <li key={i}>
              <span>{new Date(s.fecha).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <span>{EXERCISE_LABELS[s.ejercicio]}</span>
              <strong>{s.calificacion}</strong>
            </li>
          ))}
        </ul>
      )}
      <p>
        <button className="enlace" onClick={onVolver}>
          Volver a ejercicios
        </button>
      </p>
    </section>
  );
}
