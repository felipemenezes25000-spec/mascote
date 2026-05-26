import type { XpEvent } from '@/types';
import { read, write, withLock, uid } from './internal';

// Cap defensivo: xpEvents agregava TODOS os ganhos de XP da vida do app
// (checkin, mission, streak_bonus, achievement). Sem trim, lista cresce
// indefinidamente até quota exhaustion. 2000 eventos cobrem ~6 meses de
// usuário ativo; mais antigos são truncados (totais agregados continuam
// porque o XP cumulativo está em mascot.xp, não derivado dessa lista).
const MAX_XP_EVENTS = 2000;

export const xpEvents = {
  async add(e: Omit<XpEvent, 'id' | 'created_at'>): Promise<void> {
    return withLock('xp_events', async () => {
      const rows = await read<XpEvent>('xp_events');
      const next: XpEvent = { ...e, id: uid('x_'), created_at: new Date().toISOString() };
      const combined = [...rows, next];
      const trimmed = combined.length > MAX_XP_EVENTS
        ? combined.slice(-MAX_XP_EVENTS)
        : combined;
      await write<XpEvent>('xp_events', trimmed);
    });
  },
  async total(user_id: string): Promise<number> {
    const rows = await read<XpEvent>('xp_events');
    // `?? 0` defende contra payload corrompido em AsyncStorage (1 NaN
    // contamina todo o total e o usuário vê "NaN XP" pra sempre).
    return rows
      .filter(e => e.user_id === user_id)
      .reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  },
};
