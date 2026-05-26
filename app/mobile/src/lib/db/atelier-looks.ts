/**
 * atelierLooks — snapshots de customização salvos pelo usuário.
 *
 * Cada look = uma cópia imutável de MascotCustomization + nome + timestamp.
 * Usuário salva múltiplas "vibes" e troca rapidamente entre elas.
 *
 * Limit: 5 looks por usuário. Quando bater limite, save substitui o mais
 * antigo (FIFO) — comportamento explícito (não silenciosamente falha).
 */

import type { MascotCustomization } from '@/types';
import { sanitizeCustomization } from '@/lib/dna/customization';
import { read, withLock, write } from './internal';

/** Cota de looks MANUAIS por usuário (criados explicitamente). */
export const MAX_LOOKS_PER_USER = 5;

/** Cota de looks AUTO por usuário (weekly snapshots etc) — separada dos manuais. */
export const MAX_AUTO_LOOKS_PER_USER = 8;

export interface AtelierLook {
  id: string;
  user_id: string;
  name: string;
  /** Snapshot completo da customização — sem user_id/updated_at (recomputed on apply). */
  snapshot: Omit<MascotCustomization, 'user_id' | 'updated_at'>;
  created_at: string;
  /**
   * True = look criado por sistema (weekly snapshot, etc). False/undefined = manual.
   * Cotas separadas: manuais ≤ MAX_LOOKS_PER_USER, autos ≤ MAX_AUTO_LOOKS_PER_USER.
   */
  is_auto?: boolean;
}

function generateId(): string {
  return `look_${Date.now().toString(36)}_${Math.floor(Math.random() * 36 ** 4).toString(36)}`;
}

function snapshotOf(c: MascotCustomization): AtelierLook['snapshot'] {
  const { user_id: _u, updated_at: _t, ...rest } = sanitizeCustomization(c);
  return rest;
}

export const atelierLooks = {
  /**
   * Lista looks do usuário, mais recentes primeiro.
   */
  async list(user_id: string): Promise<AtelierLook[]> {
    const all = await read<AtelierLook>('atelier_looks');
    return all
      .filter(l => l.user_id === user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  /**
   * Salva look novo. Trunca pra MAX_LOOKS_PER_USER (mais antigo removido).
   * Aceita `customization` parcial — preenche faltantes via sanitize.
   *
   * Quando `isAuto=true`, conta na cota MAX_AUTO_LOOKS_PER_USER (separada).
   */
  async save(
    user_id: string,
    name: string,
    customization: MascotCustomization,
    options: { isAuto?: boolean } = {},
  ): Promise<AtelierLook> {
    const trimmedName = name.trim().slice(0, 30) || 'Sem nome';
    const isAuto = options.isAuto ?? false;
    const maxCota = isAuto ? MAX_AUTO_LOOKS_PER_USER : MAX_LOOKS_PER_USER;

    return withLock('atelier_looks', async () => {
      const all = await read<AtelierLook>('atelier_looks');
      const others = all.filter(l => l.user_id !== user_id);
      const mine = all.filter(l => l.user_id === user_id);

      // Separa em manuais e autos — cotas independentes.
      const manuais = mine
        .filter(l => !l.is_auto)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const autos = mine
        .filter(l => l.is_auto === true)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));

      const next: AtelierLook = {
        id: generateId(),
        user_id,
        name: trimmedName,
        snapshot: snapshotOf(customization),
        created_at: new Date().toISOString(),
        is_auto: isAuto,
      };

      // FIFO trim só na cota relevante — outra cota fica intacta.
      const kept =
        isAuto
          ? [...manuais, ...autos.slice(0, maxCota - 1)]
          : [...manuais.slice(0, maxCota - 1), ...autos];

      await write<AtelierLook>('atelier_looks', [...others, next, ...kept]);
      return next;
    });
  },

  /**
   * Pega look específico. Retorna null se não existe ou não pertence ao user.
   */
  async get(user_id: string, look_id: string): Promise<AtelierLook | null> {
    const all = await read<AtelierLook>('atelier_looks');
    const found = all.find(l => l.id === look_id && l.user_id === user_id);
    return found ?? null;
  },

  /**
   * Remove um look.
   */
  async delete(user_id: string, look_id: string): Promise<void> {
    return withLock('atelier_looks', async () => {
      const all = await read<AtelierLook>('atelier_looks');
      const filtered = all.filter(l => !(l.id === look_id && l.user_id === user_id));
      await write<AtelierLook>('atelier_looks', filtered);
    });
  },

  /**
   * Aplica um look — sobrescreve `customization` do user com o snapshot.
   * Retorna o customization resultante (já persistido).
   */
  async apply(user_id: string, look_id: string): Promise<MascotCustomization | null> {
    const look = await atelierLooks.get(user_id, look_id);
    if (!look) return null;
    // Import dinâmico pra evitar ciclo customization ↔ atelierLooks ↔ customization.
    const { customization: customizationDb } = await import('./customization');
    return customizationDb.update(user_id, look.snapshot);
  },
};
