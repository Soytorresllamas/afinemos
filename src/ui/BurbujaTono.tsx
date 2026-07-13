import type { TuningStatus } from '../music/notes';

const COLORS: Record<TuningStatus, string> = {
  afinado: '#3a9d5d',
  cerca: '#d9a521',
  lejos: '#c94f4f',
};

export function BurbujaTono({ cents, status }: { cents: number | null; status: TuningStatus | null }) {
  // +100 cents (agudo) arriba, -100 (grave) abajo; el centro es la nota objetivo.
  const clamped = Math.max(-100, Math.min(100, cents ?? 0));
  const y = 50 - clamped * 0.45; // % desde arriba del carril
  return (
    <div className="burbuja-pista" role="img" aria-label="Indicador de afinación">
      <div className="burbuja-linea" />
      {cents !== null && status !== null && (
        <div className="burbuja" style={{ top: `${y}%`, background: COLORS[status] }} />
      )}
    </div>
  );
}
