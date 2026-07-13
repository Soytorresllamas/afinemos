import { del, get, set } from 'idb-keyval';
import type { VocalRange } from '../music/range';

const RANGE_KEY = 'afinemos:vocal-range';

export async function saveVocalRange(range: VocalRange): Promise<void> {
  await set(RANGE_KEY, range);
}

export async function loadVocalRange(): Promise<VocalRange | null> {
  return (await get<VocalRange>(RANGE_KEY)) ?? null;
}

export async function clearVocalRange(): Promise<void> {
  await del(RANGE_KEY);
}
