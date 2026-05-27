import type { Combo } from '@/types';
import { read, write, withLock } from './internal';

const COMBO_TIMEOUT_HOURS = 24;

function freshCombo(user_id: string): Combo {
  return {
    user_id,
    current: 1,
    last_action_at: null,
    updated_at: new Date().toISOString(),
  };
}

// Storage corrompido (import malicioso ou bug futuro) poderia trazer current
// fora de [1..5]; comboXpBonus dependia disso pra calcular bônus, multiplicando
// XP por valor arbitrário. Guard repara em todos os reads — bump já clampa
// crescimento, mas reads diretos de storage também precisam de proteção.
function clampCurrent(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.floor(n)));
}

function decayCombo(c: Combo, now: Date = new Date()): Combo {
  const safeCurrent = clampCurrent(c.current);
  const repaired = safeCurrent !== c.current ? { ...c, current: safeCurrent } : c;
  if (!repaired.last_action_at) return repaired;
  // last_action_at vem de toISOString() em writes próprios, mas storage corrompido
  // pode trazer string inválida — Date inválida → NaN → comparação NaN > X é false,
  // então combo nunca decairia. Guard explícito repara o estado.
  const lastMs = new Date(repaired.last_action_at).getTime();
  if (!Number.isFinite(lastMs)) {
    return { ...repaired, current: 1, last_action_at: null, updated_at: now.toISOString() };
  }
  const hoursSince = (now.getTime() - lastMs) / (1000 * 60 * 60);
  if (hoursSince > COMBO_TIMEOUT_HOURS && repaired.current > 1) {
    return { ...repaired, current: 1, updated_at: now.toISOString() };
  }
  return repaired;
}

export const combo = {
  async get(user_id: string): Promise<Combo> {
    const rows = await read<Combo>('combo');
    const found = rows.find(r => r.user_id === user_id) ?? freshCombo(user_id);
    return decayCombo(found);
  },
  async bump(user_id: string): Promise<Combo> {
    return withLock('combo', async () => {
      const rows = await read<Combo>('combo');
      const stored = rows.find(r => r.user_id === user_id) ?? freshCombo(user_id);
      const current = decayCombo(stored);
      const now = new Date();
      const last = current.last_action_at ? new Date(current.last_action_at) : null;
      const hoursSince = last ? (now.getTime() - last.getTime()) / (1000 * 60 * 60) : 0;
      let next = current.current;
      if (last && hoursSince > COMBO_TIMEOUT_HOURS) {
        next = 1;
      } else if (current.current < 5) {
        next = current.current + 1;
      }
      const updated: Combo = {
        user_id,
        current: next,
        last_action_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      /* v8 ignore next */
      const newRows = rows.some(r => r.user_id === user_id)
        ? rows.map(r => (r.user_id === user_id ? updated : r))
        : [...rows, updated];
      await write<Combo>('combo', newRows);
      return updated;
    });
  },
};

export function comboXpBonus(level: number): number {
  // Defesa em profundidade: combo.bump clampa current a [1..5] e decayCombo
  // repara reads, mas comboXpBonus pode ser chamado com input arbitrário
  // (testes, refactors futuros). Clamp aqui evita bônus inflacionado se a
  // contenção upstream falhar.
  if (!Number.isFinite(level) || level < 1) return 0;
  const clamped = Math.min(5, Math.floor(level));
  return (clamped - 1) * 25;
}
