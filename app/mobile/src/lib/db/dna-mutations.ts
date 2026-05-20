import type { UnlockedMutation } from '@/lib/dna/mutations';
import { read, write, withLock } from './internal';

export const dnaMutations = {
  async listForUser(user_id: string): Promise<UnlockedMutation[]> {
    const rows = await read<UnlockedMutation>('dna_mutations');
    return rows.filter(m => m.user_id === user_id);
  },
  async idsForUser(user_id: string): Promise<Set<string>> {
    const list = await dnaMutations.listForUser(user_id);
    return new Set(list.map(m => m.mutation_id));
  },
  async unlock(user_id: string, mutation_id: string): Promise<UnlockedMutation> {
    return withLock('dna_mutations', async () => {
      const rows = await read<UnlockedMutation>('dna_mutations');
      const existing = rows.find(
        m => m.user_id === user_id && m.mutation_id === mutation_id,
      );
      if (existing) return existing;
      const next: UnlockedMutation = {
        user_id,
        mutation_id,
        unlocked_at: new Date().toISOString(),
      };
      await write<UnlockedMutation>('dna_mutations', [...rows, next]);
      return next;
    });
  },
};
