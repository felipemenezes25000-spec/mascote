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

export const MAX_LOOKS_PER_USER = 5;

export interface AtelierLook {
  id: string;
  user_id: string;
  name: string;
  /** Snapshot completo da customização — sem user_id/updated_at (recomputed on apply). */
  snapshot: Omit<MascotCustomization, 'user_id' | 'updated_at'>;
  created_at: string;
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
   */
  async save(
    user_id: string,
    name: string,
    customization: MascotCustomization,
  ): Promise<AtelierLook> {
    const trimmedName = name.trim().slice(0, 30) || 'Sem nome';
    return withLock('atelier_looks', async () => {
      const all = await read<AtelierLook>('atelier_looks');
      const mine = all
        .filter(l => l.user_id === user_id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const others = all.filter(l => l.user_id !== user_id);

      // FIFO trim: mantém os MAX-1 mais recentes pra dar espaço pro novo.
      const kept = mine.slice(0, MAX_LOOKS_PER_USER - 1);

      const next: AtelierLook = {
        id: generateId(),
        user_id,
        name: trimmedName,
        snapshot: snapshotOf(customization),
        created_at: new Date().toISOString(),
      };

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
