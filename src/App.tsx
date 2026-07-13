import { useEffect, useState } from 'react';
import type { ExerciseType } from './exercises/types';
import type { VocalRange } from './music/range';
import { clearVocalRange, loadVocalRange, saveVocalRange } from './progress/store';
import { Afinador } from './ui/Afinador';
import { AsistenteRango } from './ui/AsistenteRango';
import { Ejercicio } from './ui/Ejercicio';
import { Ejercicios } from './ui/Ejercicios';
import { Historial } from './ui/Historial';

type Vista = 'afinador' | 'menu-ejercicios' | 'historial' | { tipo: ExerciseType };

export default function App() {
  const [range, setRange] = useState<VocalRange | null | 'cargando'>('cargando');
  const [vista, setVista] = useState<Vista>('afinador');

  useEffect(() => {
    loadVocalRange()
      .then(setRange)
      .catch(() => setRange(null));
  }, []);

  if (range === 'cargando') return <p>Cargando…</p>;
  if (range === null) {
    return (
      <AsistenteRango
        onComplete={(r) => {
          void saveVocalRange(r)
            .then(() => setRange(r))
            .catch(() => setRange(r));
        }}
      />
    );
  }
  if (typeof vista === 'object') {
    return (
      <Ejercicio type={vista.tipo} range={range} onSalir={() => setVista('menu-ejercicios')} />
    );
  }
  if (vista === 'menu-ejercicios') {
    return (
      <Ejercicios
        range={range}
        onElegir={(tipo) => setVista({ tipo })}
        onHistorial={() => setVista('historial')}
        onVolver={() => setVista('afinador')}
      />
    );
  }
  if (vista === 'historial') {
    return <Historial onVolver={() => setVista('menu-ejercicios')} />;
  }
  return (
    <Afinador
      range={range}
      onResetRange={() => {
        void clearVocalRange()
          .then(() => setRange(null))
          .catch(() => setRange(null));
      }}
      onEjercicios={() => setVista('menu-ejercicios')}
    />
  );
}
