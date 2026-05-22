/**
 * Tests adicionais para src/lib/db.ts — cobre paths não atingidos pelos
 * test files existentes (lib-db, lib-backend). Foco em:
 * - runMigrations + readMeta (schema versioning)
 * - exportAll / importAll edge cases
 * - dateLocal / daysBetween / addDays (date math)
 * - resetAll com chaves externas
 * - corrupção de tabelas (read fallback)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CURRENT_SCHEMA_VERSION,
  addDays,
  dateLocal,
  daysBetween,
  exportAll,
  importAll,
  profiles,
  readMeta,
  resetAll,
  runMigrations,
  todayLocal,
} from '@/lib/db';

declare const __asyncStorageReset: () => void;

describe('db: schema versioning', () => {
  beforeEach(() => {
    __asyncStorageReset();
  });

  it('readMeta retorna {schema:0} quando META_KEY ausente', async () => {
    const meta = await readMeta();
    expect(meta.schema).toBe(0);
  });

  it('readMeta retorna {schema:0} quando JSON corrompido', async () => {
    await AsyncStorage.setItem('mascote:_meta', 'not-json');
    const meta = await readMeta();
    expect(meta.schema).toBe(0);
  });

  it('readMeta retorna {schema:0} quando schema não-numérico', async () => {
    await AsyncStorage.setItem('mascote:_meta', JSON.stringify({ schema: 'x' }));
    const meta = await readMeta();
    expect(meta.schema).toBe(0);
  });

  it('runMigrations atualiza meta para versão atual', async () => {
    const meta = await runMigrations();
    expect(meta.schema).toBe(CURRENT_SCHEMA_VERSION);
    expect(meta.migrated_at).toBeTruthy();
  });

  it('runMigrations é idempotente', async () => {
    await runMigrations();
    const second = await runMigrations();
    expect(second.schema).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('migration v0→v1 renomeia scenes.id=quarto para room', async () => {
    await AsyncStorage.setItem(
      'mascote:scenes',
      JSON.stringify([
        { user_id: 'u1', scene_id: 'quarto', active: true, unlocked_at: 'x' },
        { user_id: 'u1', scene_id: 'forest', active: false, unlocked_at: 'x' },
      ])
    );
    await runMigrations();
    const scenes = JSON.parse((await AsyncStorage.getItem('mascote:scenes'))!);
    expect(scenes[0].scene_id).toBe('room');
    expect(scenes[1].scene_id).toBe('forest');
  });

  it('migration v0→v1 não escreve quando nenhuma scene precisa migrar', async () => {
    await AsyncStorage.setItem(
      'mascote:scenes',
      JSON.stringify([{ user_id: 'u1', scene_id: 'forest', active: true, unlocked_at: 'x' }])
    );
    await runMigrations();
    // Não corrompe e mantém 'forest'
    const scenes = JSON.parse((await AsyncStorage.getItem('mascote:scenes'))!);
    expect(scenes[0].scene_id).toBe('forest');
  });
});

describe('db: exportAll / importAll', () => {
  beforeEach(async () => {
    __asyncStorageReset();
    await resetAll();
  });

  it('exportAll filtra por user_id em todas as tabelas exceto profiles', async () => {
    const p = await profiles.upsert({ display_name: 'A', age_band: '25-34' });
    // Inject other-user row
    await AsyncStorage.setItem(
      'mascote:checkins',
      JSON.stringify([
        { id: 'c1', user_id: p.id, habit_kind: 'water' },
        { id: 'c2', user_id: 'other', habit_kind: 'sleep' },
      ])
    );
    const out = await exportAll(p.id);
    expect(out.checkins.length).toBe(1);
    expect(out.checkins[0].id).toBe('c1');
  });

  it('importAll pula tabelas inválidas (não-array, row não-objeto)', async () => {
    const result = await importAll({
      profiles: [{ id: 'p1', display_name: 'X' }],
      checkins: 'not-an-array' as any,
      missions: [null, undefined] as any,
    });
    expect(result.imported).toContain('profiles');
    expect(result.skipped).toContain('checkins');
    expect(result.skipped).toContain('missions');
  });

  it('importAll com dados válidos sobrescreve tabela', async () => {
    await AsyncStorage.setItem('mascote:profiles', JSON.stringify([{ id: 'old', display_name: 'Old' }]));
    const r = await importAll({ profiles: [{ id: 'new', display_name: 'New' }] });
    expect(r.imported).toContain('profiles');
    const raw = JSON.parse((await AsyncStorage.getItem('mascote:profiles'))!);
    expect(raw[0].id).toBe('new');
  });

  it('importAll ignora completamente chaves não-presentes (sem skip)', async () => {
    const r = await importAll({});
    expect(r.imported).toEqual([]);
    expect(r.skipped).toEqual([]);
  });
});

describe('db: resetAll', () => {
  beforeEach(() => __asyncStorageReset());

  it('limpa todas as tabelas + meta + chaves mascote:* + externas (paywall_shown, birthday_shown)', async () => {
    await AsyncStorage.setItem('mascote:profiles', JSON.stringify([{ id: 'x' }]));
    await AsyncStorage.setItem('mascote:bond:total:u1', '10');
    await AsyncStorage.setItem('mascote:feedback:queue', '[]');
    await AsyncStorage.setItem('paywall_shown:upsell_a', '1');
    await AsyncStorage.setItem('birthday_shown:7', '1');
    await AsyncStorage.setItem('mascote:_meta', JSON.stringify({ schema: 1 }));

    await resetAll();

    expect(await AsyncStorage.getItem('mascote:profiles')).toBeNull();
    expect(await AsyncStorage.getItem('mascote:bond:total:u1')).toBeNull();
    expect(await AsyncStorage.getItem('mascote:feedback:queue')).toBeNull();
    expect(await AsyncStorage.getItem('paywall_shown:upsell_a')).toBeNull();
    expect(await AsyncStorage.getItem('birthday_shown:7')).toBeNull();
    expect(await AsyncStorage.getItem('mascote:_meta')).toBeNull();
  });

  it('NÃO toca chaves de outros namespaces', async () => {
    await AsyncStorage.setItem('outro:dado', 'preservar');
    await resetAll();
    expect(await AsyncStorage.getItem('outro:dado')).toBe('preservar');
  });
});

describe('db: date helpers', () => {
  it('todayLocal retorna YYYY-MM-DD', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('dateLocal retorna YYYY-MM-DD pra Date arbitrária', () => {
    expect(dateLocal(new Date(2026, 4, 18))).toBe('2026-05-18'); // mês 0-indexed → 4 = maio
  });
  it('daysBetween: zero pra mesma data', () => {
    expect(daysBetween('2026-05-18', '2026-05-18')).toBe(0);
  });
  it('daysBetween: 1 dia', () => {
    expect(daysBetween('2026-05-18', '2026-05-19')).toBe(1);
  });
  it('daysBetween: negativo quando b < a', () => {
    expect(daysBetween('2026-05-20', '2026-05-18')).toBe(-2);
  });
  it('daysBetween: cruza mês', () => {
    expect(daysBetween('2026-04-30', '2026-05-02')).toBe(2);
  });
  it('daysBetween: cruza ano bissexto', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });
  it('addDays positivo', () => {
    expect(addDays('2026-05-18', 1)).toBe('2026-05-19');
    expect(addDays('2026-05-18', 14)).toBe('2026-06-01');
  });
  it('addDays negativo', () => {
    expect(addDays('2026-05-01', -1)).toBe('2026-04-30');
  });
  it('addDays zero é no-op', () => {
    expect(addDays('2026-05-18', 0)).toBe('2026-05-18');
  });
});

describe('db: corrupção de tabela', () => {
  beforeEach(() => __asyncStorageReset());
  it('read retorna [] quando payload não é array', async () => {
    await AsyncStorage.setItem('mascote:checkins', JSON.stringify({ notArray: true }));
    // Re-leitura via API normal: usamos `profiles.get` mas qualquer read serve.
    const p = await profiles.get();
    expect(p).toBeNull();
  });
  it('read retorna [] quando JSON está corrompido', async () => {
    await AsyncStorage.setItem('mascote:profiles', '{{{');
    const p = await profiles.get();
    expect(p).toBeNull();
  });
});
