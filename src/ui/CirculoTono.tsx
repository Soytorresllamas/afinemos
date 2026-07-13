import type { TuningStatus } from '../music/notes';

export type EstadoCirculo = 'esperando' | 'escuchando' | TuningStatus;

const COLORS: Record<EstadoCirculo, string> = {
  esperando: 'rgba(233, 231, 242, 0.35)',
  escuchando: '#00ffcc',
  afinado: '#3dffa0',
  cerca: '#ffe04a',
  lejos: '#ff4d5e',
};

const ICONOS: Record<EstadoCirculo, string> = {
  esperando: '🎤',
  escuchando: '🎶',
  afinado: '✓',
  cerca: '~',
  lejos: '!',
};

const ETIQUETAS: Record<EstadoCirculo, string> = {
  esperando: 'esperando tu voz',
  escuchando: 'te escucho',
  afinado: 'afinado',
  cerca: 'cerca',
  lejos: 'lejos',
};

/** Módulo central circular: color, ícono y etiqueta cambian con el estado. */
export function CirculoTono({
  estado,
  cents = null,
  nota = null,
}: {
  estado: EstadoCirculo;
  cents?: number | null;
  nota?: string | null;
}) {
  const color = COLORS[estado];
  const conTono = estado !== 'esperando' && estado !== 'escuchando';
  const principal = conTono
    ? cents !== null && cents < -25
      ? '↑'
      : cents !== null && cents > 25
        ? '↓'
        : ICONOS[estado]
    : ICONOS[estado];
  return (
    <div
      className={`circulo ${conTono ? '' : 'circulo-latido'}`}
      role="img"
      aria-label={`Estado: ${ETIQUETAS[estado]}`}
      style={{ borderColor: color, boxShadow: `0 0 20px ${color}44, inset 0 0 24px ${color}22` }}
    >
      <span className="circulo-principal" style={{ color }}>
        {principal}
      </span>
      {conTono && cents !== null && (
        <span className="circulo-cents" style={{ color }}>
          {cents > 0 ? '+' : ''}
          {Math.round(cents)} cents
        </span>
      )}
      {conTono && nota !== null && <span className="circulo-nota">{nota}</span>}
      <span className="circulo-etiqueta">{ETIQUETAS[estado]}</span>
    </div>
  );
}
