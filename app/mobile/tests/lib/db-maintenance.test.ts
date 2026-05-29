/**
 * Regressão: chaves datadas (ai_usage / ai_cost / bond:daily) acumulavam sem
 * GC de rotina (~3 chaves/dia/user, ~1095/ano). sweepStaleDateKeys varre e
 * remove as mais velhas que a janela de retenção, preservando recentes e
 * qualquer chave NÃO-datada.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sweepStaleDateKeys } from '@/lib/db/maintenance';

describe('sweepStaleDateKeys', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('remove chaves datadas mais velhas que a janela e preserva recentes + não-datadas', async () => {
    const today = '2026-05-28';
    // Velhas (antes do cutoff 2026-05-21):
    await AsyncStorage.setItem('mascote:ai_usage:u1:2026-05-01', '5');
    await AsyncStorage.setItem('mascote:ai_cost:u1:2026-05-10', '900');
    await AsyncStorage.setItem('mascote:bond:daily:u1:2026-04-30', '50');
    // Recentes (dentro da janela):
    await AsyncStorage.setItem('mascote:ai_usage:u1:2026-05-28', '2');
    await AsyncStorage.setItem('mascote:bond:daily:u1:2026-05-25', '10');
    // Não-datadas (NUNCA tocar):
    await AsyncStorage.setItem('mascote:bond:total:u1', '1234');
    await AsyncStorage.setItem('mascote:memory:u1', '[]');

    const removed = await sweepStaleDateKeys(7, today);

    expect(removed).toBe(3);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toContain('mascote:ai_usage:u1:2026-05-28');
    expect(keys).toContain('mascote:bond:daily:u1:2026-05-25');
    expect(keys).toContain('mascote:bond:total:u1');
    expect(keys).toContain('mascote:memory:u1');
    expect(keys).not.toContain('mascote:ai_usage:u1:2026-05-01');
    expect(keys).not.toContain('mascote:ai_cost:u1:2026-05-10');
    expect(keys).not.toContain('mascote:bond:daily:u1:2026-04-30');
  });

  it('não remove nada quando todas as chaves estão dentro da janela', async () => {
    const today = '2026-05-28';
    await AsyncStorage.setItem('mascote:ai_usage:u1:2026-05-28', '2');
    await AsyncStorage.setItem('mascote:ai_cost:u1:2026-05-27', '300');

    const removed = await sweepStaleDateKeys(7, today);

    expect(removed).toBe(0);
    expect(await AsyncStorage.getAllKeys()).toHaveLength(2);
  });

  it('ignora segmento final não-ISO (não confunde id com data)', async () => {
    const today = '2026-05-28';
    // bond:total termina em userId, não em data — prefixo diferente, mas garante
    // que o filtro de data não quebra se algum dia um prefixo datado mudar.
    await AsyncStorage.setItem('mascote:ai_usage:u1:naoehdata', '9');

    const removed = await sweepStaleDateKeys(7, today);

    expect(removed).toBe(0);
    expect(await AsyncStorage.getAllKeys()).toContain('mascote:ai_usage:u1:naoehdata');
  });
});
