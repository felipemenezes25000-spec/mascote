/**
 * Geração de ProceduralGenome via proxy LLM.
 *
 * Chama POST {EXPO_PUBLIC_AI_PROXY_URL}/v1/mascot/procedural-genome.
 *
 * Fallback determinístico: quando o proxy não está configurado (dev sem chave
 * OpenAI) ou falha, gera um genome plausível derivado da personalidade +
 * trigger via PRNG mulberry32 — o app não fica preso esperando rede ou erro.
 *
 * Rate limit: 1 geração / 24h por user. Implementado client-side em
 * `shouldRegenerate()` — server-side TODO (ver spec § Decisões e TODOs).
 */

import type {
  HSL,
  MilestoneTrigger,
  Personality,
  ProceduralGenome,
  HabitKind,
  MascotPhase,
} from '@/types';
import { logger } from '@/lib/logger';
import { getAiProxyUrl } from '@/ai/ProxyMascotAI';
import { validateProceduralGenome } from './schema';

const PROXY_TIMEOUT_MS = 25_000;
const REGEN_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface GenerateInput {
  userId?: string;
  personality: Personality;
  trigger: MilestoneTrigger;
  currentGenome?: ProceduralGenome | null;
  recentActions?: readonly HabitKind[];
  recentChatThemes?: readonly string[];
  streak?: number;
  phase?: MascotPhase;
  mascotName?: string;
}

/**
 * Decide se podemos regenerar agora. Use ANTES de chamar `generate` pra
 * economizar token gasto em geração que vai ser descartada.
 */
export function shouldRegenerate(current: ProceduralGenome | null | undefined): boolean {
  if (!current) return true;
  const last = Date.parse(current.generatedAt);
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= REGEN_COOLDOWN_MS;
}

/**
 * Tenta gerar via proxy LLM. Se proxy não configurado ou falha, devolve
 * fallback determinístico. Nunca lança — sempre retorna um genome.
 */
export async function generateProceduralGenome(input: GenerateInput): Promise<ProceduralGenome> {
  const base = getAiProxyUrl();
  if (base) {
    try {
      const proxyGenome = await fetchFromProxy(base, input);
      if (proxyGenome) return proxyGenome;
    } catch (err) {
      logger.warn('[procedural] proxy falhou, usando fallback', { err: String(err) });
    }
  }
  return fallbackGenome(input);
}

async function fetchFromProxy(base: string, input: GenerateInput): Promise<ProceduralGenome | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/mascot/procedural-genome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        version: 1,
        userId: input.userId,
        personality: input.personality,
        trigger: input.trigger,
        currentGenome: input.currentGenome ?? null,
        recentActions: input.recentActions ?? [],
        recentChatThemes: input.recentChatThemes ?? [],
        streak: input.streak ?? 0,
        phase: input.phase ?? null,
        mascotName: input.mascotName ?? null,
      }),
    });
    if (!res.ok) {
      logger.warn('[procedural] proxy HTTP error', { status: res.status });
      return null;
    }
    const json = await res.json();
    return validateProceduralGenome(json);
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// Fallback determinístico (sem LLM)
// ============================================================

function mulberry32(a: number) {
  return function () {
    let t = (a = (a + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PERSONALITY_HUE: Record<Personality, number> = {
  calmo: 150,      // sage
  motivador: 28,   // brand orange
  fofo: 5,         // coral pink
  sabio: 280,      // lilac
};

const HEAD_SHAPES_BY_PERSONALITY: Record<Personality, ProceduralGenome['silhouette']['headShape']> = {
  calmo: 'round',
  motivador: 'oval',
  fofo: 'round',
  sabio: 'crystal',
};

const BODY_SHAPES_BY_PERSONALITY: Record<Personality, ProceduralGenome['silhouette']['bodyShape']> = {
  calmo: 'pebble',
  motivador: 'capsule',
  fofo: 'orb',
  sabio: 'stone',
};

/**
 * Gera genome plausível sem LLM. Determinístico por (personality + trigger + userId).
 */
export function fallbackGenome(input: GenerateInput): ProceduralGenome {
  const seedStr = `${input.personality}|${input.trigger}|${input.userId ?? 'anon'}`;
  const seed = hashStr(seedStr);
  const rng = mulberry32(seed);

  const baseHue = PERSONALITY_HUE[input.personality];
  const hueDrift = Math.floor(rng() * 40) - 20; // ±20°
  const bodyHue = (baseHue + hueDrift + 360) % 360;
  const accentHue = (bodyHue + 22 + Math.floor(rng() * 10)) % 360;
  const deepHue = (bodyHue + 200 + Math.floor(rng() * 20)) % 360;

  const body: HSL = [bodyHue, 55 + Math.floor(rng() * 20), 60 + Math.floor(rng() * 10)];
  const accent: HSL = [accentHue, 65 + Math.floor(rng() * 15), 55 + Math.floor(rng() * 10)];
  const deep: HSL = [deepHue, 35 + Math.floor(rng() * 20), 30 + Math.floor(rng() * 10)];
  const eye: HSL = [25, 65, 15]; // sempre escuro pra contraste

  const headShape = HEAD_SHAPES_BY_PERSONALITY[input.personality];
  const bodyShape = BODY_SHAPES_BY_PERSONALITY[input.personality];

  // Marcas únicas: número depende do streak (max 5)
  const markCount = Math.min(5, Math.floor((input.streak ?? 0) / 30) + 1);
  const markKinds: ProceduralGenome['marks'][number]['kind'][] = ['spot', 'star', 'crescent', 'rune', 'leaf'];
  const placements: ProceduralGenome['marks'][number]['placement'][] = ['cheek', 'forehead', 'body', 'tail'];
  const colors: ProceduralGenome['marks'][number]['color'][] = ['accent', 'deep', 'gold'];
  const marks = Array.from({ length: markCount }, () => ({
    kind: markKinds[Math.floor(rng() * markKinds.length)]!,
    placement: placements[Math.floor(rng() * placements.length)]!,
    color: colors[Math.floor(rng() * colors.length)]!,
    seed: Math.floor(rng() * 1_000_000),
  }));

  const story = buildFallbackStory(input, markCount);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    trigger: input.trigger,
    palette: { body, accent, deep, eye },
    silhouette: {
      headShape,
      headRx: 48 + Math.floor(rng() * 8),
      headRy: 46 + Math.floor(rng() * 8),
      bodyShape,
      proportions: {
        headBody: 1.0 + (rng() - 0.5) * 0.3,
        eyeSize: 1.0 + (rng() - 0.5) * 0.3,
      },
    },
    marks,
    accessories: [],
    expression: {
      mouthCurve: input.personality === 'fofo' ? 0.7 : input.personality === 'sabio' ? 0.2 : 0.5,
      eyeTilt: input.personality === 'sabio' ? -5 : 0,
      cheekAlways: input.personality === 'fofo',
    },
    story,
  };
}

function buildFallbackStory(input: GenerateInput, markCount: number): string {
  const name = input.mascotName ?? 'seu mascote';
  const streak = input.streak ?? 0;
  const phase = input.phase ?? 'bebe';
  if (input.trigger.startsWith('evolution:')) {
    return `${name} alcançou a fase ${phase}. ${markCount > 0 ? `${markCount} marcas únicas surgiram nesta evolução.` : 'Pronto pra próxima jornada.'}`;
  }
  if (input.trigger.startsWith('streak:')) {
    return `${name} carrega ${streak} dias de presença — cada marca aqui é um capítulo dessa história.`;
  }
  if (input.trigger.startsWith('messages:')) {
    return `${name} cresceu com cada conversa. Você já é parte dele.`;
  }
  return `${name} é único — feito do que você vive.`;
}
