/**
 * atelierLooks DB layer — CRUD + FIFO trim.
 *
 * Invariantes:
 *  - list ordena mais recente primeiro
 *  - save sanitiza customization (cap [0.7, 1.3])
 *  - save trunca pra MAX_LOOKS_PER_USER (FIFO)
 *  - apply persiste customization da snapshot
 *  - delete remove só o look do user (não leak entre users)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  atelierLooks,
  customization as customizationDb,
  MAX_LOOKS_PER_USER,
} from '@/lib/db';
import type { MascotCustomization } from '@/types';

function baseCustomization(user_id: string): MascotCustomization {
  return {
    user_id,
    eye_size: 1.1,
    eye_spread: 0.95,
    body_height: 1.2,
    body_width: 0.9,
    aura_intensity: 1.15,
    pattern_density: 1.05,
    preferred_pattern: 'spots',
    posture_lean: 0.05,
    force_hide_tail: false,
    force_hide_antennae: false,
    force_hide_spikes: true,
    updated_at: new Date().toISOString(),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('atelierLooks.save + list', () => {
  it('salva e lista pelo usuário', async () => {
    const c = baseCustomization('user-A');
    await atelierLooks.save('user-A', 'Festivo', c);
    const list = await atelierLooks.list('user-A');
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('Festivo');
    expect(list[0].user_id).toBe('user-A');
  });

  it('lista ordena mais recente primeiro', async () => {
    const c = baseCustomization('user-A');
    await atelierLooks.save('user-A', 'Primeiro', c);
    await new Promise(r => setTimeout(r, 5)); // garante created_at distinto
    await atelierLooks.save('user-A', 'Segundo', c);
    const list = await atelierLooks.list('user-A');
    expect(list[0].name).toBe('Segundo');
    expect(list[1].name).toBe('Primeiro');
  });

  it('isolamento entre users', async () => {
    const c = baseCustomization('user-A');
    await atelierLooks.save('user-A', 'A1', c);
    await atelierLooks.save('user-B', 'B1', baseCustomization('user-B'));
    expect((await atelierLooks.list('user-A')).length).toBe(1);
    expect((await atelierLooks.list('user-B')).length).toBe(1);
  });

  it('nome trim + max 30 chars', async () => {
    const c = baseCustomization('user-A');
    const longName = '  Look com nome muito muito muito longo demais   ';
    const saved = await atelierLooks.save('user-A', longName, c);
    expect(saved.name.length).toBeLessThanOrEqual(30);
    expect(saved.name).not.toMatch(/^\s/);
    expect(saved.name).not.toMatch(/\s$/);
  });

  it('nome vazio vira "Sem nome"', async () => {
    const c = baseCustomization('user-A');
    const saved = await atelierLooks.save('user-A', '   ', c);
    expect(saved.name).toBe('Sem nome');
  });
});

describe('atelierLooks FIFO trim', () => {
  it(`limita pra MAX_LOOKS_PER_USER=${MAX_LOOKS_PER_USER} substituindo o mais antigo`, async () => {
    const c = baseCustomization('user-A');
    for (let i = 0; i < MAX_LOOKS_PER_USER + 3; i++) {
      await atelierLooks.save('user-A', `Look-${i}`, c);
      await new Promise(r => setTimeout(r, 2));
    }
    const list = await atelierLooks.list('user-A');
    expect(list.length).toBe(MAX_LOOKS_PER_USER);
    // O mais antigo (Look-0) foi removido — só sobreviveram os 5 mais recentes
    expect(list.map(l => l.name)).not.toContain('Look-0');
    expect(list[0].name).toBe(`Look-${MAX_LOOKS_PER_USER + 2}`); // mais recente
  });
});

describe('atelierLooks.delete', () => {
  it('remove só o look indicado', async () => {
    const c = baseCustomization('user-A');
    const a = await atelierLooks.save('user-A', 'A', c);
    await new Promise(r => setTimeout(r, 2));
    const b = await atelierLooks.save('user-A', 'B', c);

    await atelierLooks.delete('user-A', a.id);

    const list = await atelierLooks.list('user-A');
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(b.id);
  });

  it('delete cross-user não funciona', async () => {
    const a = await atelierLooks.save('user-A', 'A', baseCustomization('user-A'));
    await atelierLooks.delete('user-B', a.id); // user-B tenta apagar de user-A
    const list = await atelierLooks.list('user-A');
    expect(list.length).toBe(1);
  });
});

describe('atelierLooks.apply', () => {
  it('persiste snapshot como customization atual', async () => {
    const original = baseCustomization('user-A');
    const saved = await atelierLooks.save('user-A', 'Snapshot', original);

    // Modifica customization atual
    await customizationDb.update('user-A', { eye_size: 1, body_height: 1 });

    // Aplica o look — deve restaurar valores do snapshot
    const applied = await atelierLooks.apply('user-A', saved.id);
    expect(applied?.eye_size).toBe(original.eye_size);
    expect(applied?.body_height).toBe(original.body_height);
    expect(applied?.preferred_pattern).toBe(original.preferred_pattern);

    // Confirma que persistiu na customização real
    const current = await customizationDb.get('user-A');
    expect(current.eye_size).toBe(original.eye_size);
  });

  it('apply com look_id inexistente retorna null', async () => {
    const result = await atelierLooks.apply('user-A', 'nope-id');
    expect(result).toBeNull();
  });
});

describe('atelierLooks sanitização', () => {
  it('snapshot armazena valores clampados (cap 0.7-1.3)', async () => {
    const c: MascotCustomization = {
      ...baseCustomization('user-A'),
      eye_size: 2.5, // fora do cap
    };
    const saved = await atelierLooks.save('user-A', 'Test', c);
    expect(saved.snapshot.eye_size).toBeLessThanOrEqual(1.3);
  });
});
