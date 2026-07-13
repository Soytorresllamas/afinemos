import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { clearVocalRange, loadVocalRange, saveVocalRange } from './store';

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
