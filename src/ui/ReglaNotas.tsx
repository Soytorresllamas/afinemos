import { midiToNoteName } from '../music/notes';
import type { VocalRange } from '../music/range';

/** Regla horizontal: de lo más agudo (izquierda) a lo más grave (derecha),
 *  con todas las notas del rango vocal y las notas objetivo resaltadas. */
export function ReglaNotas({
  range,
  targetMidis = [],
}: {
  range: VocalRange;
  targetMidis?: number[];
}) {
  const notas: number[] = [];
  for (let m = range.highMidi; m >= range.lowMidi; m--) notas.push(m);
  const objetivo =
    targetMidis.length > 0
      ? `; objetivo ${targetMidis.map((t) => midiToNoteName(t)).join(', ')}`
      : '';
  return (
    <div
      className="regla-marco"
      role="img"
      aria-label={`Tu rango de ${midiToNoteName(range.highMidi)} (agudo) a ${midiToNoteName(
        range.lowMidi,
      )} (grave)${objetivo}`}
    >
      <div className="regla-extremos" aria-hidden="true">
        <span>← agudo</span>
        <span>grave →</span>
      </div>
      <div className="regla">
        {notas.map((m) => (
          <span
            key={m}
            className={`regla-nota${targetMidis.includes(m) ? ' regla-objetivo' : ''}`}
          >
            <i className="regla-marca" />
            <span className="regla-etiqueta">{midiToNoteName(m)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
