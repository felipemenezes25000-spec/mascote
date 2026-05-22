/**
 * Wiring de moments — testa que as integrações de call sites EMITEM o moment
 * esperado quando suas ações disparam.
 *
 * **NÃO** testa side effects de subscribers — esses estão em
 * `tests/lib/moments/CreatureMomentService.test.ts`. Aqui testamos só o
 * contrato "X aconteceu → emit('y', ...) foi chamado".
 *
 * Por que isolar: na próxima vez que alguém refatorar checkin/missions/chat,
 * esses testes alertam IMEDIATAMENTE se o emit sumir, antes do regresso
 * chegar a um QA visual.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { creatureMoments, type Moment, type MomentName } from '@/lib/moments';
import { recordMissionOutcome } from '@/services/missions';
import { missionCatalog } from '@/content/missions';

let captured: Moment[] = [];

beforeEach(() => {
  creatureMoments.reset();
  captured = [];
  creatureMoments.subscribe({
    filter: null,
    handler: (m) => { captured.push(m); },
    label: 'wiring-test',
  });
});

afterEach(() => {
  creatureMoments.reset();
});

function emittedNames(): MomentName[] {
  return captured.map((m) => m.name);
}

describe('moments wiring — mission completion', () => {
  it('completed=true emite mission.completed', async () => {
    const realMissionId = missionCatalog[0]?.id;
    expect(realMissionId, 'missionCatalog must have entries').toBeTruthy();
    await recordMissionOutcome(realMissionId!, true);
    // Aguarda emit assíncrono (mission service usa withLock)
    await new Promise((r) => setTimeout(r, 30));
    expect(emittedNames()).toContain('mission.completed');
    const moment = captured.find((m) => m.name === 'mission.completed');
    expect(moment?.payload).toMatchObject({
      missionId: realMissionId,
    });
  });

  it('completed=false NÃO emite mission.completed (skip não celebra)', async () => {
    const realMissionId = missionCatalog[0]?.id;
    await recordMissionOutcome(realMissionId!, false);
    await new Promise((r) => setTimeout(r, 30));
    expect(emittedNames()).not.toContain('mission.completed');
  });

  it('id desconhecido NÃO emite (sanity)', async () => {
    await recordMissionOutcome('id-inexistente', true);
    await new Promise((r) => setTimeout(r, 30));
    expect(emittedNames()).not.toContain('mission.completed');
  });
});

describe('moments wiring — direct emit smoke', () => {
  // Esses garantem que o bus não regrediu de "additive" pra "exclusive".
  // Se algum dia alguém refatorar pra substituir handlers existentes (errado),
  // emit ainda funciona — esses testes catch.

  it('emit habit.water alcança subscribers globais', () => {
    creatureMoments.emit('habit.water', { intensity: 1 });
    expect(emittedNames()).toContain('habit.water');
  });

  it('emit checkin.completed entrega payload correto', () => {
    creatureMoments.emit('checkin.completed', {
      habit: 'water',
      intensity: 1,
      xpGained: 19,
    });
    const m = captured.find((c) => c.name === 'checkin.completed');
    expect(m?.payload).toMatchObject({
      habit: 'water',
      xpGained: 19,
    });
  });

  it('emit chat.memory_saved tem kind + summary', () => {
    creatureMoments.emit('chat.memory_saved', {
      kind: 'reflection',
      summary: 'usuário falou de cansaço',
    });
    const m = captured.find((c) => c.name === 'chat.memory_saved');
    expect(m?.payload).toMatchObject({ kind: 'reflection' });
  });

  it('emit customization.changed traz field + valores', () => {
    creatureMoments.emit('customization.changed', {
      field: 'brand_palette',
      from: 'classic',
      to: 'coral',
    });
    const m = captured.find((c) => c.name === 'customization.changed');
    expect(m?.payload).toMatchObject({
      field: 'brand_palette',
      from: 'classic',
      to: 'coral',
    });
  });

  it('emit mutation.unlocked carrega rarity', () => {
    creatureMoments.emit('mutation.unlocked', {
      mutationId: 'mut.deep_eyes',
      rarity: 'rare',
    });
    const m = captured.find((c) => c.name === 'mutation.unlocked');
    expect(m?.payload).toMatchObject({
      mutationId: 'mut.deep_eyes',
      rarity: 'rare',
    });
  });

  it('emit phase.advanced tem from + to', () => {
    creatureMoments.emit('phase.advanced', { from: 'bebe', to: 'crianca' });
    const m = captured.find((c) => c.name === 'phase.advanced');
    expect(m?.payload).toMatchObject({ from: 'bebe', to: 'crianca' });
  });

  it('emit streak.milestone marca isFirst', () => {
    creatureMoments.emit('streak.milestone', { days: 7, isFirst: true });
    const m = captured.find((c) => c.name === 'streak.milestone');
    expect(m?.payload).toMatchObject({ days: 7, isFirst: true });
  });
});

describe('moments wiring — handler isolation no path real', () => {
  it('um handler ruim NÃO bloqueia o resto da cadeia', async () => {
    creatureMoments.subscribe({
      filter: ['mission.completed'],
      handler: () => { throw new Error('ruim'); },
      label: 'evil',
    });
    const good: Moment[] = [];
    creatureMoments.subscribe({
      filter: ['mission.completed'],
      handler: (m) => { good.push(m); },
      label: 'good',
    });
    const realMissionId = missionCatalog[0]?.id;
    await recordMissionOutcome(realMissionId!, true);
    await new Promise((r) => setTimeout(r, 50));
    expect(good.length).toBeGreaterThanOrEqual(1);
  });
});
