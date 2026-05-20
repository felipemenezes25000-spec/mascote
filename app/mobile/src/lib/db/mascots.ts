import type { Mascot } from '@/types';
import { read, write, withLock, uid } from './internal';

export const mascots = {
  async forUser(user_id: string): Promise<Mascot | null> {
    const rows = await read<Mascot>('mascots');
    return rows.find(m => m.user_id === user_id) ?? null;
  },
  async upsert(m: Partial<Mascot> & { user_id: string }): Promise<Mascot> {
    return withLock('mascots', async () => {
      const rows = await read<Mascot>('mascots');
      const existing = rows.find(r => r.user_id === m.user_id);
      const personality = m.personality ?? existing?.personality ?? 'calmo';

      let dna = m.dna ?? existing?.dna;
      let dna_seed = m.dna_seed ?? existing?.dna_seed;
      if (!dna) {
        const { genomeForPersonality } = await import('@/lib/dna/personalities');
        const { genomeFromPreset, sanitizeGenome } = await import('@/lib/dna/genome');
        if (typeof dna_seed !== 'number') {
          let s = 0x811c9dc5;
          for (let i = 0; i < m.user_id.length; i++) {
            s ^= m.user_id.charCodeAt(i);
            s = Math.imul(s, 0x01000193);
          }
          dna_seed = s >>> 0;
        }
        dna = sanitizeGenome(
          genomeFromPreset(dna_seed, genomeForPersonality(personality), 0.1),
        );
      }

      const next: Mascot = {
        id: existing?.id ?? uid('m_'),
        user_id: m.user_id,
        /* v8 ignore next 10 */
        name: m.name ?? existing?.name ?? 'Bipo',
        personality,
        phase: m.phase ?? existing?.phase ?? 'ovo',
        mood: m.mood ?? existing?.mood ?? 'ok',
        xp: m.xp ?? existing?.xp ?? 0,
        level: m.level ?? existing?.level ?? 1,
        energy: m.energy ?? existing?.energy ?? 100,
        health: m.health ?? existing?.health ?? 100,
        dna,
        dna_seed,
        last_seen_at: new Date().toISOString(),
        created_at: existing?.created_at ?? new Date().toISOString(),
      };
      /* v8 ignore next 3 */
      const updated = existing
        ? rows.map(r => (r.id === existing.id ? next : r))
        : [...rows, next];
      await write<Mascot>('mascots', updated);
      return next;
    });
  },
  async updateDna(user_id: string, dna: Mascot['dna']): Promise<Mascot | null> {
    return withLock('mascots', async () => {
      const rows = await read<Mascot>('mascots');
      const idx = rows.findIndex(r => r.user_id === user_id);
      if (idx === -1) return null;
      const { sanitizeGenome } = await import('@/lib/dna/genome');
      const safeDna = dna ? sanitizeGenome(dna) : undefined;
      const next: Mascot = {
        ...rows[idx],
        dna: safeDna,
        last_seen_at: new Date().toISOString(),
      };
      const updated = rows.map(r => (r.id === next.id ? next : r));
      await write<Mascot>('mascots', updated);
      return next;
    });
  },
};
