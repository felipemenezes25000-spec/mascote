import { read, write, withLock } from './internal';

export interface MinigamePlayRow {
  user_id: string;
  /** Data local YYYY-MM-DD das contagens. Vira novo dia → zera. */
  date: string;
  /** Partidas RECOMPENSADAS por jogo hoje (jogar além do cap = só diversão). */
  rewarded_plays: Record<string, number>;
  updated_at: string;
}

function freshRow(user_id: string, date: string): MinigamePlayRow {
  return { user_id, date, rewarded_plays: {}, updated_at: new Date().toISOString() };
}

/**
 * Contador diário de partidas recompensadas por minigame.
 * Anti-double-spend: o increment é atômico via withLock e retorna a contagem
 * APÓS o incremento — o service decide recompensa com base nesse retorno,
 * nunca em leitura separada (TOCTOU).
 */
export const minigamePlays = {
  async get(user_id: string, date: string): Promise<MinigamePlayRow> {
    const rows = await read<MinigamePlayRow>('minigame_plays');
    const row = rows.find(r => r.user_id === user_id);
    if (!row || row.date !== date) return freshRow(user_id, date);
    return row;
  },
  /** Incrementa e retorna a contagem do jogo APÓS incrementar. */
  async increment(user_id: string, date: string, gameId: string): Promise<number> {
    return withLock('minigame_plays', async () => {
      const rows = await read<MinigamePlayRow>('minigame_plays');
      const existing = rows.find(r => r.user_id === user_id);
      const base = existing && existing.date === date
        ? existing
        : freshRow(user_id, date);
      const prev = Number.isFinite(base.rewarded_plays[gameId])
        ? Math.max(0, Math.floor(base.rewarded_plays[gameId]))
        : 0;
      const count = prev + 1;
      const next: MinigamePlayRow = {
        ...base,
        rewarded_plays: { ...base.rewarded_plays, [gameId]: count },
        updated_at: new Date().toISOString(),
      };
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<MinigamePlayRow>('minigame_plays', newRows);
      return count;
    });
  },
};
