import type { MascotMood } from '@/types';

type LivingMomentTag =
  | 'cochilou'
  | 'olhou_janela'
  | 'reorganizou_cantinho'
  | 'treinou_animacao'
  | 'alongou'
  | 'meditou';

interface LivingMomentSeed {
  tag: LivingMomentTag;
  message: string;
}

const LIVING_MOMENTS: readonly LivingMomentSeed[] = [
  { tag: 'cochilou', message: 'Dei um cochilo curto pra recarregar.' },
  { tag: 'olhou_janela', message: 'Fiquei olhando a janela por um tempinho.' },
  { tag: 'reorganizou_cantinho', message: 'Reorganizei meu cantinho enquanto você estava fora.' },
  { tag: 'treinou_animacao', message: 'Treinei uns movimentos novos em silêncio.' },
  { tag: 'alongou', message: 'Fiz um alongamento leve pra destravar.' },
  { tag: 'meditou', message: 'Respirei fundo e meditei um pouco.' },
];

export interface LivingMomentInput {
  hoursAway: number;
  mood: MascotMood;
  energy: number;
  nowMs: number;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function momentPoolFor(input: LivingMomentInput): readonly LivingMomentSeed[] {
  if (input.hoursAway >= 36) return LIVING_MOMENTS;
  if (input.energy <= 30 || input.mood === 'exausto') {
    return LIVING_MOMENTS.filter(m => m.tag === 'cochilou' || m.tag === 'meditou' || m.tag === 'alongou');
  }
  if (input.mood === 'triste') {
    return LIVING_MOMENTS.filter(m => m.tag === 'olhou_janela' || m.tag === 'meditou' || m.tag === 'cochilou');
  }
  return LIVING_MOMENTS.filter(m => m.tag !== 'meditou');
}

/** Gera um momento pequeno e determinístico para o período offline. */
export function generateLivingMoment(input: LivingMomentInput): LivingMomentSeed | null {
  if (input.hoursAway < 6) return null;
  const pool = momentPoolFor(input);
  if (pool.length === 0) return null;
  const dayKey = new Date(input.nowMs).toISOString().slice(0, 10);
  const idx = hashString(`${dayKey}:${Math.round(input.hoursAway)}:${input.energy}:${input.mood}`) % pool.length;
  return pool[idx] ?? pool[0];
}

