import { useEffect, useState } from 'react';
import type { VocalRange } from './music/range';
import { clearVocalRange, loadVocalRange, saveVocalRange } from './progress/store';
import { Afinador } from './ui/Afinador';
import { AsistenteRango } from './ui/AsistenteRango';

export default function App() {
  const [range, setRange] = useState<VocalRange | null | 'cargando'>('cargando');

  useEffect(() => {
    void loadVocalRange().then(setRange);
  }, []);

  if (range === 'cargando') return <p>Cargando…</p>;
  if (range === null) {
    return (
      <AsistenteRango
        onComplete={(r) => {
          void saveVocalRange(r).then(() => setRange(r));
        }}
      />
    );
  }
  return (
    <Afinador
      range={range}
      onResetRange={() => {
        void clearVocalRange().then(() => setRange(null));
      }}
    />
  );
}
