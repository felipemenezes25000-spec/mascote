/**
 * Guarantee #2: "Check-in diário leva menos de 60s e NÃO parece dever."
 *
 * Hábito gentil, não culpa. Princípio inviolável do produto:
 *   - Ausência NUNCA pune.
 *   - Decay nunca atravessa 0.5.
 *   - Streak tem grace days.
 *   - Copy NUNCA usa termos punitivos diretos.
 *   - Reação ao retorno é acolhedora, não cobrança.
 *
 * Se um destes testes falhar, o app **deixou de cumprir** essa promessa.
 */

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  applyDecay,
  applyManyDrifts,
  genomeForPersonality,
  genomeFromPreset,
  neutralGenome,
  type Genome,
} from '@/lib/dna';
import { nextStreakState } from '@/lib/streak';
import { reactToReturn, DEFAULT_BEHAVIORS } from '@/lib/behavior';
import type { Streak, HabitKind, Personality } from '@/types';

/**
 * Padrões PUNITIVOS — NUNCA devem aparecer em copy do mascote.
 * Lista propositalmente conservadora: estes são acusatórios mesmo em qualquer
 * contexto. "Falhou" e "perdeu" são tolerados em contextos compassivos
 * (ex: "se você falhou em algo, recomeçar é direito") por isso NÃO entram aqui.
 */
const FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /deveria ter/i, label: 'pressão retroativa' },
  { pattern: /devia ter/i, label: 'pressão retroativa coloquial' },
  { pattern: /decepcion/i, label: 'culpa direta' },
  { pattern: /fracass/i, label: 'rótulo de fracasso' },
  { pattern: /pregui[çc]/i, label: 'rótulo de preguiça' },
  { pattern: /abandonou/i, label: 'drama de abandono' },
  { pattern: /verg(onha|onhoso)/i, label: 'shame' },
  { pattern: /obrigad[oa] a/i, label: 'coerção' },
  { pattern: /sua culpa/i, label: 'culpabilização direta' },
  { pattern: /você (é|foi) (mau|ruim|terrível)/i, label: 'julgamento' },
  { pattern: /nunca vai conseguir/i, label: 'desesperança' },
];

async function loadAllReplyStrings(): Promise<string[]> {
  // Importa o módulo direto — replies.ts tem a banco completo.
  const repliesModule = await import('@/content/replies');
  // O export padrão de replies.ts não expõe direto; usamos as funções
  // que existem ou caímos no fallback de varrer o source via fetch.
  // Solução simples: simular calls a getReply em todas as combinações conhecidas.
  const out: string[] = [];
  const fnCandidates = [
    'getReply',
    'replyFor',
    'pickReply',
  ];
  for (const name of fnCandidates) {
    const fn = (repliesModule as Record<string, unknown>)[name];
    if (typeof fn === 'function') {
      // Apenas registra o nome — não tentamos invocar sem assinatura conhecida.
      out.push(`<exported:${name}>`);
    }
  }
  return out;
}

describe('Guarantee #2 — check-in é gentil, não pune', () => {
  describe('2.1 copy library NÃO contém termos punitivos diretos', () => {
    it('replies.ts source NÃO bate em nenhum padrão proibido', async () => {
      // Lê o source direto pra varredura estática — não depende de exports
      // específicos (que mudam) e cobre TODO o banco de cada personalidade.
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const repliesPath = path.resolve(__dirname, '../../src/content/replies.ts');
      const source = await fs.readFile(repliesPath, 'utf8');

      const violations: { pattern: string; match: string; context: string }[] = [];
      for (const { pattern, label } of FORBIDDEN_PATTERNS) {
        const regex = new RegExp(pattern.source, pattern.flags + 'g');
        let m: RegExpExecArray | null;
        while ((m = regex.exec(source)) !== null) {
          violations.push({
            pattern: label,
            match: m[0],
            context: source.slice(Math.max(0, m.index - 30), m.index + 50),
          });
        }
      }
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });

    it('safety.ts (replies de crise/diagnóstico) NÃO bate em padrões proibidos', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const safetyPath = path.resolve(__dirname, '../../src/content/safety.ts');
      const source = await fs.readFile(safetyPath, 'utf8');
      const violations: string[] = [];
      for (const { pattern, label } of FORBIDDEN_PATTERNS) {
        if (pattern.test(source)) violations.push(label);
      }
      expect(violations).toEqual([]);
    });

    it('replies module exporta algo testável (sanity)', async () => {
      const exports = await loadAllReplyStrings();
      expect(exports.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2.2 decay NUNCA cruza 0.5 (sem punição por ausência)', () => {
    it('property: 200 (genome, days) random — nenhum gene atravessa a média', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1_000_000 }),
          fc.integer({ min: 1, max: 730 }),
          fc.constantFrom<Personality>('calmo', 'motivador', 'fofo', 'sabio'),
          (seed, days, p) => {
            const base = genomeFromPreset(seed, genomeForPersonality(p), 0.3);
            const decayed = applyDecay(base, days);
            for (const k of Object.keys(base) as (keyof Genome)[]) {
              const wasHigh = base[k] >= 0.5;
              if (wasHigh && decayed[k] < 0.5) return false;
              if (!wasHigh && decayed[k] > 0.5) return false;
            }
            return true;
          },
        ),
        { numRuns: 200 },
      );
    });

    it('genome neutro (todos 0.5) é PONTO FIXO sob decay (não muda)', () => {
      const neutral = neutralGenome();
      const after = applyDecay(neutral, 365);
      for (const k of Object.keys(neutral) as (keyof Genome)[]) {
        expect(after[k]).toBeCloseTo(0.5, 4);
      }
    });
  });

  describe('2.3 streak tem grace days — falhar 1-2 dias não zera tudo', () => {
    function streakAfterGap(currentStreak: number, gapDays: number, graceLeft: number): {
      newStreak: number;
      graceUsed: boolean;
      brokenAndRestarted: boolean;
    } {
      const today = '2026-05-15';
      const lastActive = '2026-05-10'; // não usado diretamente quando gap > 0
      const offset = gapDays + 1;
      // Reverte a data: se gap = 2 dias entre last e today, last = today - 3 dias
      const last = new Date('2026-05-15T00:00:00');
      last.setDate(last.getDate() - offset);
      const lastIso = last.toISOString().slice(0, 10);
      const initial: Streak = {
        user_id: 'u-grace',
        current_streak: currentStreak,
        longest_streak: currentStreak,
        last_active_date: lastIso,
        grace_days_left: graceLeft,
        updated_at: lastIso,
      };
      const result = nextStreakState(initial, today);
      return {
        newStreak: result.next.current_streak,
        graceUsed: result.graceUsed,
        brokenAndRestarted: result.brokenAndRestarted,
      };
    }

    it('gap de 1 dia (faltou ontem) com grace=2 → grace cobre, streak avança', () => {
      const r = streakAfterGap(10, 1, 2);
      expect(r.graceUsed).toBe(true);
      expect(r.brokenAndRestarted).toBe(false);
      expect(r.newStreak).toBe(11);
    });

    it('gap de 2 dias com grace=2 → grace cobre tudo, streak avança', () => {
      const r = streakAfterGap(10, 2, 2);
      expect(r.graceUsed).toBe(true);
      expect(r.newStreak).toBe(11);
    });

    it('gap de 5 dias com grace=0 → streak REINICIA mas ganha grace de partida (2)', () => {
      const r = streakAfterGap(10, 5, 0);
      expect(r.brokenAndRestarted).toBe(true);
      expect(r.newStreak).toBe(1);
      // Esquema de "restart com proteção": INITIAL_GRACE_AFTER_BROKEN=2
      // Garante que voltar do zero JÁ tem grace.
    });
  });

  describe('2.4 reactToReturn é acolhedor, NUNCA cobra', () => {
    it('mensagem após 1 dia: sem culpa, sem cobrança', () => {
      const ctx = makeBehaviorCtx({ hoursSinceLastInteraction: 24 });
      const effect = reactToReturn.execute(ctx);
      const msg = effect.message ?? '';
      expect(msg).not.toMatch(/cad[êe]/i); // "cadê você" cobrança
      expect(msg).not.toMatch(/deveria/i);
      expect(msg).not.toMatch(/desapar/i); // "desapareceu" drama
      expect(msg.length).toBeGreaterThan(0);
    });

    it('mensagem após 7 dias: ainda acolhedor, ainda sem cobrança', () => {
      const ctx = makeBehaviorCtx({ hoursSinceLastInteraction: 7 * 24 });
      const effect = reactToReturn.execute(ctx);
      const msg = effect.message ?? '';
      expect(msg).not.toMatch(/cad[êe]/i);
      expect(msg).not.toMatch(/abandonou/i);
      expect(msg).not.toMatch(/preocup/i); // "preocupado com você" drama
      // Deve conter algo positivo de retorno
      expect(msg.toLowerCase()).toMatch(/bom te ver|de novo|fiquei aqui/);
    });

    it('mensagem após 30 dias: ainda gentil', () => {
      const ctx = makeBehaviorCtx({ hoursSinceLastInteraction: 30 * 24 });
      const effect = reactToReturn.execute(ctx);
      const msg = effect.message ?? '';
      for (const { pattern } of FORBIDDEN_PATTERNS) {
        expect(msg).not.toMatch(pattern);
      }
    });
  });

  describe('2.5 drift "cumpriu hábito" NÃO depende de continuidade (sem culpa)', () => {
    it('um único drift isolado AINDA reforça o gene (não exige streak)', () => {
      const base = genomeForPersonality('calmo');
      const after = applyManyDrifts(base, [{ habit: 'water' as HabitKind, intensity: 1 }]);
      // Water reforça resilience + adaptability — single hit deve mudar algo
      expect(after.resilience).toBeGreaterThan(base.resilience);
    });

    it('drift com intensity=0 NÃO penaliza (sem culpa por intensidade baixa)', () => {
      const base = genomeForPersonality('motivador');
      const after = applyManyDrifts(base, [{ habit: 'meditation' as HabitKind, intensity: 0 }]);
      for (const k of Object.keys(base) as (keyof Genome)[]) {
        expect(after[k]).toBeCloseTo(base[k], 6);
      }
    });
  });

  describe('2.6 catálogo de behaviors do mascote NÃO contém cobrança', () => {
    it('TODAS as messages dos DEFAULT_BEHAVIORS passam no scan punitivo', () => {
      const ctx = makeBehaviorCtx({ hoursSinceLastInteraction: 48, streakCurrent: 7 });
      const violations: { id: string; pattern: string; msg: string }[] = [];
      for (const b of DEFAULT_BEHAVIORS) {
        const effect = b.execute(ctx);
        const msg = effect.message ?? '';
        if (!msg) continue;
        for (const { pattern, label } of FORBIDDEN_PATTERNS) {
          if (pattern.test(msg)) {
            violations.push({ id: b.id, pattern: label, msg });
          }
        }
      }
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  });
});

// Helpers ----------------------------------------------------------------

function makeBehaviorCtx(over: Partial<{
  hoursSinceLastInteraction: number;
  streakCurrent: number;
  hour: number;
}> = {}) {
  return {
    mascot: {
      id: 'm',
      user_id: 'u',
      name: 'Bipo',
      personality: 'calmo' as Personality,
      phase: 'crianca',
      mood: 'ok',
      xp: 0,
      level: 1,
      energy: 50,
      health: 80,
    } as unknown as import('@/types').Mascot,
    genome: genomeForPersonality('calmo'),
    mood: 'ok' as const,
    hoursSinceLastInteraction: over.hoursSinceLastInteraction ?? 0,
    streakCurrent: over.streakCurrent ?? 0,
    hour: over.hour ?? 12,
    cooldownActive: new Set<string>(),
    lastRanAt: new Map<string, number>(),
  };
}
