/**
 * Gesto one-shot de animação por tipo de ação (MascotAnimationKind), em unidades
 * do viewBox/transform do CreatureRenderer.
 *
 * Pico de cada canal — o efeito reanimated no componente interpola o canal do
 * repouso até o pico e de volta. Mantido PURO (sem reanimated/SVG) pra ser
 * testável: a DECISÃO (como cada ação parece) vive aqui; o MECANISMO (sequências
 * reanimated) vive no componente, verificado visualmente.
 *
 * Não usa `dnaToAnimationState` de propósito: aquele devolve nomes de animação
 * esqueletal ('excited'/'celebrate'…) pensados pro renderer 3D removido, que não
 * mapeiam pro sistema reanimated (translate/scale/rotate) do SVG atual.
 *
 * Canais:
 * - `y`: translateY em px (negativo = pra cima)
 * - `scale`: multiplicador de escala (1 = repouso)
 * - `x`: translateX em px
 * - `rot`: rotação extra em graus (somada ao tilt de humor)
 */
import type { MascotAnimationKind } from '@/lib/animation-triggers';

export interface ActionGesture {
  y: number;
  scale: number;
  x: number;
  rot: number;
}

const NEUTRAL: ActionGesture = { y: 0, scale: 1, x: 0, rot: 0 };

const ACTION_GESTURES: Record<MascotAnimationKind, ActionGesture> = {
  // Salto alegre (hábito feito / toque) — o mesmo espírito do reactTrigger.
  bounce: { ...NEUTRAL, y: -12 },
  // Comemoração (missão/evolução) — salto maior + pop de escala.
  celebrate: { ...NEUTRAL, y: -16, scale: 1.12 },
  // Espreguiçar (treino) — estica sem sair do lugar.
  stretch: { ...NEUTRAL, scale: 1.1 },
  // Pulso (respiração) — pop sutil de escala.
  pulse: { ...NEUTRAL, scale: 1.08 },
  // Observar (meditação/saudade) — inclina a cabeça curioso.
  observe: { ...NEUTRAL, rot: -7 },
  // Vagar (retorno) — balança levemente na horizontal.
  wander: { ...NEUTRAL, x: 7 },
  // Descansar (sono/leitura) — assenta pra baixo de leve.
  rest: { ...NEUTRAL, y: 4 },
};

/** Gesto de uma ação; kind desconhecido cai em `bounce` (nunca neutro/sem-animação). */
export function actionGesture(kind: MascotAnimationKind): ActionGesture {
  return ACTION_GESTURES[kind] ?? ACTION_GESTURES.bounce;
}
