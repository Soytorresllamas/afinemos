import { midiToNoteName } from '../music/notes';
import type { VocalRange } from '../music/range';

/** Regla horizontal: de lo más agudo (izquierda) a lo más grave (derecha),
 *  con todas las notas del rango vocal y la nota objetivo resaltada. */
export function ReglaNotas({ range, targetMidi }: { range: VocalRange; targetMidi: number }) {
  const notas: number[] = [];
  for (let m = range.highMidi; m >= range.lowMidi; m--) notas.push(m);
  return (
    <div
      className="regla-marco"
      role="img"
      aria-label={`Tu rango de ${midiToNoteName(range.highMidi)} (agudo) a ${midiToNoteName(
        range.lowMidi,
      )} (grave); nota objetivo ${midiToNoteName(targetMidi)}`}
    >
      <div className="regla-extremos" aria-hidden="true">
        <span>← agudo</span>
        <span>grave →</span>
      </div>
      <div className="regla">
        {notas.map((m) => (
          <span key={m} className={`regla-nota${m === targetMidi ? ' regla-objetivo' : ''}`}>
            <i className="regla-marca" />
            <span className="regla-etiqueta">{midiToNoteName(m)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
