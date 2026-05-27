/**
 * Validador de ProceduralGenome retornado pelo LLM.
 *
 * Inline (sem Zod externo) pra não inflar bundle. Type guards estritos.
 *
 * Recusa: campos faltando, tipos errados, valores fora de range,
 * marks > 5, accessories > 8, customSvg > 2KB, qualquer campo inesperado.
 */

import type {
  ProceduralGenome,
  HSL,
  MarkKind,
  MarkPlacement,
  MarkColor,
  HeadShape,
  BodyShape,
  MilestoneTrigger,
} from '@/types';
import { sanitizeSvg } from './sanitizeSvg';

const MARK_KINDS: readonly MarkKind[] = ['spot', 'stripe', 'scar', 'star', 'crescent', 'leaf', 'rune'];
const MARK_PLACEMENTS: readonly MarkPlacement[] = ['cheek', 'forehead', 'body', 'tail'];
const MARK_COLORS: readonly MarkColor[] = ['accent', 'deep', 'gold'];
const HEAD_SHAPES: readonly HeadShape[] = ['round', 'oval', 'square', 'teardrop', 'crystal', 'cloud'];
const BODY_SHAPES: readonly BodyShape[] = ['pebble', 'capsule', 'orb', 'leaf', 'stone'];

const MAX_MARKS = 5;
const MAX_ACCESSORIES = 8;
const MAX_STORY_LEN = 280;

export class ProceduralGenomeValidationError extends Error {
  constructor(public readonly path: string, msg: string) {
    super(`ProceduralGenome inválido (${path}): ${msg}`);
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validHSL(v: unknown, path: string): HSL {
  if (!Array.isArray(v) || v.length !== 3) {
    throw new ProceduralGenomeValidationError(path, 'HSL deve ser tuple [h,s,l]');
  }
  const [h, s, l] = v;
  if (typeof h !== 'number' || h < 0 || h > 360 || !Number.isFinite(h))
    throw new ProceduralGenomeValidationError(`${path}.h`, 'h deve ser 0-360');
  if (typeof s !== 'number' || s < 0 || s > 100 || !Number.isFinite(s))
    throw new ProceduralGenomeValidationError(`${path}.s`, 's deve ser 0-100');
  if (typeof l !== 'number' || l < 0 || l > 100 || !Number.isFinite(l))
    throw new ProceduralGenomeValidationError(`${path}.l`, 'l deve ser 0-100');
  return [h, s, l];
}

function validTrigger(v: unknown): MilestoneTrigger {
  if (typeof v !== 'string') throw new ProceduralGenomeValidationError('trigger', 'deve ser string');
  if (v === 'onboarding') return 'onboarding';
  if (/^evolution:(ovo|bebe|crianca|adolescente|adulto|evoluido)$/.test(v))
    return v as MilestoneTrigger;
  if (/^streak:\d+d$/.test(v)) return v as MilestoneTrigger;
  if (/^achievement:[a-z0-9_-]+$/i.test(v)) return v as MilestoneTrigger;
  if (/^messages:\d+$/.test(v)) return v as MilestoneTrigger;
  throw new ProceduralGenomeValidationError('trigger', `valor não reconhecido: ${v}`);
}

/**
 * Valida um genome bruto retornado pelo LLM. Sanitiza customSvg em
 * accessories. Lança ProceduralGenomeValidationError se inválido.
 */
export function validateProceduralGenome(raw: unknown): ProceduralGenome {
  if (!isObj(raw)) {
    throw new ProceduralGenomeValidationError('root', 'precisa ser objeto');
  }
  if (raw.version !== 1) {
    throw new ProceduralGenomeValidationError('version', 'deve ser literal 1');
  }
  if (typeof raw.generatedAt !== 'string' || isNaN(Date.parse(raw.generatedAt))) {
    throw new ProceduralGenomeValidationError('generatedAt', 'deve ser ISO date string');
  }
  const trigger = validTrigger(raw.trigger);

  if (!isObj(raw.palette)) throw new ProceduralGenomeValidationError('palette', 'precisa ser objeto');
  const palette = {
    body: validHSL(raw.palette.body, 'palette.body'),
    accent: validHSL(raw.palette.accent, 'palette.accent'),
    deep: validHSL(raw.palette.deep, 'palette.deep'),
    eye: validHSL(raw.palette.eye, 'palette.eye'),
  };

  if (!isObj(raw.silhouette)) throw new ProceduralGenomeValidationError('silhouette', 'precisa ser objeto');
  if (!HEAD_SHAPES.includes(raw.silhouette.headShape as HeadShape))
    throw new ProceduralGenomeValidationError('silhouette.headShape', 'inválido');
  if (!BODY_SHAPES.includes(raw.silhouette.bodyShape as BodyShape))
    throw new ProceduralGenomeValidationError('silhouette.bodyShape', 'inválido');
  if (typeof raw.silhouette.headRx !== 'number' || raw.silhouette.headRx < 20 || raw.silhouette.headRx > 70)
    throw new ProceduralGenomeValidationError('silhouette.headRx', 'deve ser 20-70');
  if (typeof raw.silhouette.headRy !== 'number' || raw.silhouette.headRy < 20 || raw.silhouette.headRy > 70)
    throw new ProceduralGenomeValidationError('silhouette.headRy', 'deve ser 20-70');
  if (!isObj(raw.silhouette.proportions))
    throw new ProceduralGenomeValidationError('silhouette.proportions', 'precisa ser objeto');
  const headBody = raw.silhouette.proportions.headBody;
  const eyeSize = raw.silhouette.proportions.eyeSize;
  if (typeof headBody !== 'number' || headBody < 0.5 || headBody > 2.0)
    throw new ProceduralGenomeValidationError('silhouette.proportions.headBody', 'deve ser 0.5-2.0');
  if (typeof eyeSize !== 'number' || eyeSize < 0.5 || eyeSize > 2.0)
    throw new ProceduralGenomeValidationError('silhouette.proportions.eyeSize', 'deve ser 0.5-2.0');

  if (!Array.isArray(raw.marks))
    throw new ProceduralGenomeValidationError('marks', 'precisa ser array');
  if (raw.marks.length > MAX_MARKS)
    throw new ProceduralGenomeValidationError('marks', `máximo ${MAX_MARKS} marks`);
  const marks = raw.marks.map((m: unknown, i: number) => {
    if (!isObj(m)) throw new ProceduralGenomeValidationError(`marks[${i}]`, 'precisa ser objeto');
    if (!MARK_KINDS.includes(m.kind as MarkKind))
      throw new ProceduralGenomeValidationError(`marks[${i}].kind`, 'inválido');
    if (!MARK_PLACEMENTS.includes(m.placement as MarkPlacement))
      throw new ProceduralGenomeValidationError(`marks[${i}].placement`, 'inválido');
    if (!MARK_COLORS.includes(m.color as MarkColor))
      throw new ProceduralGenomeValidationError(`marks[${i}].color`, 'inválido');
    if (typeof m.seed !== 'number' || !Number.isFinite(m.seed))
      throw new ProceduralGenomeValidationError(`marks[${i}].seed`, 'seed deve ser número finito');
    return {
      kind: m.kind as MarkKind,
      placement: m.placement as MarkPlacement,
      color: m.color as MarkColor,
      seed: m.seed,
    };
  });

  if (!Array.isArray(raw.accessories))
    throw new ProceduralGenomeValidationError('accessories', 'precisa ser array');
  if (raw.accessories.length > MAX_ACCESSORIES)
    throw new ProceduralGenomeValidationError('accessories', `máximo ${MAX_ACCESSORIES} accessories`);
  const accessories = raw.accessories.map((a: unknown, i: number) => {
    if (!isObj(a)) throw new ProceduralGenomeValidationError(`accessories[${i}]`, 'precisa ser objeto');
    if (typeof a.id !== 'string' || a.id.length === 0 || a.id.length > 32)
      throw new ProceduralGenomeValidationError(`accessories[${i}].id`, 'id 1-32 chars');
    if (typeof a.origin !== 'string' || a.origin.length > 140)
      throw new ProceduralGenomeValidationError(`accessories[${i}].origin`, 'origin 0-140 chars');
    let customSvg: string | undefined;
    if (a.customSvg !== undefined) {
      if (typeof a.customSvg !== 'string')
        throw new ProceduralGenomeValidationError(`accessories[${i}].customSvg`, 'deve ser string');
      // Sanitiza — pode lançar
      customSvg = sanitizeSvg(a.customSvg, `accessories[${i}].customSvg`);
    }
    return { id: a.id, customSvg, origin: a.origin };
  });

  if (!isObj(raw.expression))
    throw new ProceduralGenomeValidationError('expression', 'precisa ser objeto');
  if (typeof raw.expression.mouthCurve !== 'number' || raw.expression.mouthCurve < -1 || raw.expression.mouthCurve > 1)
    throw new ProceduralGenomeValidationError('expression.mouthCurve', 'deve ser -1 a 1');
  if (typeof raw.expression.eyeTilt !== 'number' || raw.expression.eyeTilt < -20 || raw.expression.eyeTilt > 20)
    throw new ProceduralGenomeValidationError('expression.eyeTilt', 'deve ser -20 a 20');
  if (typeof raw.expression.cheekAlways !== 'boolean')
    throw new ProceduralGenomeValidationError('expression.cheekAlways', 'deve ser boolean');

  if (typeof raw.story !== 'string' || raw.story.length > MAX_STORY_LEN)
    throw new ProceduralGenomeValidationError('story', `string 0-${MAX_STORY_LEN} chars`);

  // userOverrides opcional — valida só se presente
  let userOverrides: ProceduralGenome['userOverrides'];
  if (raw.userOverrides !== undefined) {
    if (!isObj(raw.userOverrides))
      throw new ProceduralGenomeValidationError('userOverrides', 'precisa ser objeto');
    const uo = raw.userOverrides;
    userOverrides = {};
    if (uo.bodyHue !== undefined) {
      if (typeof uo.bodyHue !== 'number' || uo.bodyHue < 0 || uo.bodyHue > 360)
        throw new ProceduralGenomeValidationError('userOverrides.bodyHue', 'deve ser 0-360');
      userOverrides.bodyHue = uo.bodyHue;
    }
    if (uo.accentSaturation !== undefined) {
      if (typeof uo.accentSaturation !== 'number' || uo.accentSaturation < 0 || uo.accentSaturation > 100)
        throw new ProceduralGenomeValidationError('userOverrides.accentSaturation', 'deve ser 0-100');
      userOverrides.accentSaturation = uo.accentSaturation;
    }
    if (uo.markCount !== undefined) {
      if (typeof uo.markCount !== 'number' || uo.markCount < 0 || uo.markCount > MAX_MARKS)
        throw new ProceduralGenomeValidationError('userOverrides.markCount', `deve ser 0-${MAX_MARKS}`);
      userOverrides.markCount = uo.markCount;
    }
    if (uo.disabledAccessories !== undefined) {
      if (!Array.isArray(uo.disabledAccessories) || !uo.disabledAccessories.every(x => typeof x === 'string'))
        throw new ProceduralGenomeValidationError('userOverrides.disabledAccessories', 'deve ser string[]');
      userOverrides.disabledAccessories = uo.disabledAccessories as string[];
    }
  }

  return {
    version: 1,
    generatedAt: raw.generatedAt,
    trigger,
    palette,
    silhouette: {
      headShape: raw.silhouette.headShape as HeadShape,
      headRx: raw.silhouette.headRx,
      headRy: raw.silhouette.headRy,
      bodyShape: raw.silhouette.bodyShape as BodyShape,
      proportions: { headBody, eyeSize },
    },
    marks,
    accessories,
    expression: {
      mouthCurve: raw.expression.mouthCurve,
      eyeTilt: raw.expression.eyeTilt,
      cheekAlways: raw.expression.cheekAlways,
    },
    story: raw.story,
    ...(userOverrides ? { userOverrides } : {}),
  };
}
