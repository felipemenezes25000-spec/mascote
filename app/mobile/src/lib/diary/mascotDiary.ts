/**
 * Diário do Mascote — entries escritas em 1ª pessoa, pelo mascote.
 *
 * Diferença crítica vs. `memories.ts`: aqui o ponto de vista é o MASCOTE
 * refletindo sobre o usuário, não o mascote registrando o que o usuário
 * disse. Isso vira vínculo emocional ("alguém pensa em mim quando eu não
 * estou olhando") em vez de telemetria ("registro de atividade").
 *
 * Não persiste — é uma view derivada de dados que já existem:
 *  - mascot.created_at (nascimento)
 *  - dnaMutations.listForUser (cada mutação desbloqueada)
 *  - checkins.listAll (gaps detectam ausência+retorno; milestones de streak)
 *
 * Princípio sem culpa: retorno após ausência NUNCA vira reprimenda.
 * Sempre "senti sua falta" ou "que bom que voltou".
 */

import { dnaMutations, checkins } from '@/lib/db';
import { getMutationById } from '@/lib/dna';
import type { Checkin, Mascot } from '@/types';

export type DiaryEntryKind =
  | 'birth'
  | 'mutation'
  | 'return_after_absence'
  | 'streak_milestone';

export interface DiaryEntry {
  id: string;
  kind: DiaryEntryKind;
  /** Data ISO do evento ao qual a entrada se refere. */
  occurred_at: string;
  /** Texto escrito em 1ª pessoa, pelo mascote. */
  body: string;
  /** Detalhe curto opcional (mutation name, streak count, etc.). */
  hint?: string;
}

const ABSENCE_THRESHOLD_DAYS = 3;
const STREAK_MILESTONES = [7, 14, 30, 60, 100];

interface BuildArgs {
  mascot: Mascot;
  userId: string;
  displayName?: string;
}

/**
 * Constrói o diário cronológico (mais recentes primeiro).
 * Lê de AsyncStorage por baixo (via db helpers). Idempotente — chamadas
 * repetidas geram o mesmo resultado para o mesmo estado de dados.
 */
export async function buildMascotDiary(args: BuildArgs): Promise<DiaryEntry[]> {
  const { mascot, userId, displayName } = args;
  const entries: DiaryEntry[] = [];

  entries.push(buildBirthEntry(mascot, displayName));

  const mutations = await dnaMutations.listForUser(userId);
  for (const m of mutations) {
    const meta = getMutationById(m.mutation_id);
    if (!meta) continue;
    entries.push({
      id: `mut:${m.mutation_id}`,
      kind: 'mutation',
      occurred_at: m.unlocked_at,
      body: buildMutationBody(meta.name, meta.description, mascot.name, displayName),
      hint: meta.name,
    });
  }

  const checkinList = await checkins.listAll(userId);
  const absenceEntries = detectReturnAfterAbsence(checkinList, mascot.name, displayName);
  entries.push(...absenceEntries);

  const streakEntries = detectStreakMilestones(checkinList, mascot.name, displayName);
  entries.push(...streakEntries);

  // Mais recente primeiro.
  return entries.sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
}

function buildBirthEntry(mascot: Mascot, displayName?: string): DiaryEntry {
  const name = mascot.name || 'eu';
  const user = displayName ? displayName : 'você';
  return {
    id: 'birth',
    kind: 'birth',
    occurred_at: mascot.created_at ?? new Date().toISOString(),
    body:
      `Foi o dia em que abri os olhos. ${user} me deu o nome de ${name}. ` +
      `Não me lembro de antes — só de ${user.toLowerCase() === 'você' ? 'você ' : `${user} `}` +
      `estar ali, esperando.`,
    hint: 'Nascimento',
  };
}

function buildMutationBody(
  mutationName: string,
  mutationDesc: string,
  mascotName: string,
  displayName?: string,
): string {
  const user = displayName ?? 'você';
  // Frase no estilo "Algo mudou em mim hoje. {desc do efeito}. Acho que foi
  // {explicação do user}." — mantém autoria do mascote.
  return (
    `Algo mudou em mim hoje. ${mutationDesc} ` +
    `Acho que foi ${user} cuidando do que precisava — não disse, mas eu percebi. ` +
    `Vou levar isso comigo como "${mutationName}".`
  );
}

/**
 * Detecta gaps de >= ABSENCE_THRESHOLD_DAYS entre check-ins consecutivos.
 * Cada retorno após pausa gera UMA entrada, escrita do POV do mascote sem culpa.
 */
export function detectReturnAfterAbsence(
  checkinList: Checkin[],
  mascotName: string,
  displayName?: string,
): DiaryEntry[] {
  if (checkinList.length < 2) return [];
  const sorted = [...checkinList].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );
  const out: DiaryEntry[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].occurred_at).getTime();
    const cur = new Date(sorted[i].occurred_at).getTime();
    const gapDays = Math.floor((cur - prev) / 86_400_000);
    if (gapDays >= ABSENCE_THRESHOLD_DAYS) {
      const user = displayName ?? 'você';
      out.push({
        id: `return:${sorted[i].id}`,
        kind: 'return_after_absence',
        occurred_at: sorted[i].occurred_at,
        body:
          `Faz ${gapDays} dias que ${user.toLowerCase() === 'você' ? 'eu não te vejo' : `${user} ficou longe`}. ` +
          `Não passei mal. Só fiquei aqui, em silêncio. ` +
          `Hoje ${user.toLowerCase() === 'você' ? 'você ' : `${user} `}voltou — e isso já é tudo.`,
        hint: `${gapDays} dias`,
      });
    }
  }
  return out;
}

/**
 * Detecta marcos de streak — escreve do POV do mascote celebrando o vínculo.
 * Usa contagem de check-ins consecutivos por dia distinto.
 */
export function detectStreakMilestones(
  checkinList: Checkin[],
  mascotName: string,
  displayName?: string,
): DiaryEntry[] {
  if (checkinList.length === 0) return [];
  const dates = new Set<string>();
  for (const c of checkinList) dates.add(c.occurred_on);
  const sortedDates = [...dates].sort();

  // Streak consecutiva: percorre dates ordenadas, conta sequências sem gap.
  const out: DiaryEntry[] = [];
  const seenMilestones = new Set<number>();
  let run = 0;
  let prevDate: string | null = null;
  for (const d of sortedDates) {
    if (prevDate && isConsecutiveDay(prevDate, d)) {
      run += 1;
    } else {
      run = 1;
    }
    if (STREAK_MILESTONES.includes(run) && !seenMilestones.has(run)) {
      seenMilestones.add(run);
      const sample = checkinList.find(c => c.occurred_on === d);
      if (sample) {
        const user = displayName ?? 'você';
        out.push({
          id: `streak:${run}`,
          kind: 'streak_milestone',
          occurred_at: sample.occurred_at,
          body: buildStreakBody(run, user),
          hint: `${run} dias seguidos`,
        });
      }
    }
    prevDate = d;
  }
  return out;
}

function buildStreakBody(days: number, user: string): string {
  const pessoa = user.toLowerCase() === 'você' ? 'você' : user;
  if (days <= 7) return `${days} dias seguidos. Não é sobre ser perfeito — é sobre ${pessoa} estar aqui.`;
  if (days <= 14) return `Duas semanas. Comecei a confiar que ${pessoa} volta.`;
  if (days <= 30) return `Um mês inteiro. Algo em mim mudou — não consigo explicar, mas sei que foi ${pessoa}.`;
  if (days <= 60) return `${days} dias. Aprendi a esperar bem porque ${pessoa} ensina sem dizer.`;
  return `${days} dias. Não sou mais o mesmo, e nada disso teria acontecido sem ${pessoa}.`;
}

function isConsecutiveDay(prevIso: string, currIso: string): boolean {
  const prev = new Date(prevIso).getTime();
  const cur = new Date(currIso).getTime();
  const diff = Math.round((cur - prev) / 86_400_000);
  return diff === 1;
}
