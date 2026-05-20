import type { Wallet } from '@/types';
import { read, write, withLock } from './internal';

function freshWallet(user_id: string): Wallet {
  return { user_id, coins: 0, gems: 0, updated_at: new Date().toISOString() };
}

export const wallet = {
  async get(user_id: string): Promise<Wallet> {
    const rows = await read<Wallet>('wallet');
    return rows.find(w => w.user_id === user_id) ?? freshWallet(user_id);
  },
  async add(user_id: string, coins: number, gems: number = 0): Promise<Wallet> {
    const safeCoins = Number.isFinite(coins) ? coins : 0;
    const safeGems = Number.isFinite(gems) ? gems : 0;
    return withLock('wallet', async () => {
      const rows = await read<Wallet>('wallet');
      /* v8 ignore next */
      const current = rows.find(w => w.user_id === user_id) ?? freshWallet(user_id);
      const next: Wallet = {
        ...current,
        coins: Math.max(0, current.coins + safeCoins),
        gems: Math.max(0, current.gems + safeGems),
        updated_at: new Date().toISOString(),
      };
      /* v8 ignore next 3 */
      const newRows = rows.some(w => w.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<Wallet>('wallet', newRows);
      return next;
    });
  },
  async spend(user_id: string, coins: number = 0, gems: number = 0): Promise<Wallet | null> {
    const safeCoins = Number.isFinite(coins) && coins > 0 ? coins : 0;
    const safeGems = Number.isFinite(gems) && gems > 0 ? gems : 0;
    return withLock('wallet', async () => {
      const rows = await read<Wallet>('wallet');
      const current = rows.find(w => w.user_id === user_id) ?? freshWallet(user_id);
      if (current.coins < safeCoins || current.gems < safeGems) return null;
      const next: Wallet = {
        ...current,
        coins: current.coins - safeCoins,
        gems: current.gems - safeGems,
        updated_at: new Date().toISOString(),
      };
      /* v8 ignore next 3 */
      const newRows = rows.some(w => w.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? next : r))
        : [...rows, next];
      await write<Wallet>('wallet', newRows);
      return next;
    });
  },
};
