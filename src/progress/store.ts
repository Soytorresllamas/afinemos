import { del, get, set } from 'idb-keyval';
import type { VocalRange } from '../music/range';
import type { ExerciseType } from '../exercises/types';

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

export interface SessionRecord {
  fecha: string; // ISO 8601
  ejercicio: ExerciseType;
  calificacion: number; // 0-100
}

const SESSIONS_KEY = 'afinemos:sessions';

export async function saveSession(record: SessionRecord): Promise<void> {
  const all = (await get<SessionRecord[]>(SESSIONS_KEY)) ?? [];
  all.push(record);
  await set(SESSIONS_KEY, all);
}

export async function listSessions(): Promise<SessionRecord[]> {
  const all = (await get<SessionRecord[]>(SESSIONS_KEY)) ?? [];
  return [...all].reverse();
}
