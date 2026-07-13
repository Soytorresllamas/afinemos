import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { clearVocalRange, loadVocalRange, saveVocalRange, listSessions, saveSession } from './store';

describe('store', () => {
  it('devuelve null sin rango guardado', async () => {
    expect(await loadVocalRange()).toBeNull();
  });

  it('guarda, lee y borra el rango', async () => {
    await saveVocalRange({ lowMidi: 48, highMidi: 60 });
    expect(await loadVocalRange()).toEqual({ lowMidi: 48, highMidi: 60 });
    await clearVocalRange();
    expect(await loadVocalRange()).toBeNull();
  });
});

describe('sessions', () => {
  it('lista vacía sin sesiones', async () => {
    expect(await listSessions()).toEqual([]);
  });

  it('guarda y lista con la más reciente primero', async () => {
    await saveSession({ fecha: '2026-07-12T10:00:00Z', ejercicio: 'escala-3', calificacion: 80 });
    await saveSession({ fecha: '2026-07-12T11:00:00Z', ejercicio: 'sirena', calificacion: 65 });
    const all = await listSessions();
    expect(all).toHaveLength(2);
    expect(all[0].ejercicio).toBe('sirena');
    expect(all[1].calificacion).toBe(80);
  });
});
