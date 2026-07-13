import { EXERCISE_LABELS, type ExerciseType } from '../exercises/types';
import type { VocalRange } from '../music/range';
import { ReglaNotas } from './ReglaNotas';

const DESCRIPCIONES: Record<ExerciseType, string> = {
  'nota-sostenida': 'Mantén una nota sin que tiemble',
  'escala-3': 'Do-Re-Mi: tres notas subiendo y bajando',
  'escala-5': 'Cinco notas subiendo y bajando',
  sirena: 'Sube y baja con tu voz como una sirena',
};

const TIPOS: ExerciseType[] = ['nota-sostenida', 'escala-3', 'escala-5', 'sirena'];

export function Ejercicios({
  range,
  onElegir,
  onHistorial,
  onVolver,
}: {
  range: VocalRange;
  onElegir(type: ExerciseType): void;
  onHistorial(): void;
  onVolver(): void;
}) {
  return (
    <section>
      <h1>Ejercicios 🎵</h1>
      <p>Rutinas cortas: la app toca, tú repites, y te digo qué tal te salió.</p>
      <div className="tarjetas">
        {TIPOS.map((t) => (
          <button key={t} className="tarjeta" onClick={() => onElegir(t)}>
            <strong>{EXERCISE_LABELS[t]}</strong>
            <span>{DESCRIPCIONES[t]}</span>
          </button>
        ))}
      </div>
      <ReglaNotas range={range} />
      <div className="controles">
        <button onClick={onHistorial}>Mi historial 📈</button>
        <button className="enlace" onClick={onVolver}>
          Volver al afinador
        </button>
      </div>
    </section>
  );
}
