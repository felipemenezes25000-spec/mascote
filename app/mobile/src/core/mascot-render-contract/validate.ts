/**
 * Validação básica do UnityMascotState v1 (headless, sem Unity).
 */

import { GENE_KEYS, GENE_MAX, GENE_MIN } from '@/lib/dna/genome';
import type { UnityMascotState } from './types';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

export function validateUnityMascotState(state: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!state || typeof state !== 'object') {
    return { ok: false, issues: [issue('', 'state must be an object')] };
  }

  const s = state as Record<string, unknown>;

  if (s.schemaVersion !== 1) {
    issues.push(issue('schemaVersion', 'must be 1'));
  }

  const requiredTop = [
    'identity',
    'progression',
    'state',
    'dna',
    'visuals',
    'morphology',
    'accessories',
    'mutations',
    'environment',
  ] as const;

  for (const key of requiredTop) {
    if (s[key] === undefined || s[key] === null) {
      issues.push(issue(key, 'is required'));
    }
  }

  const identity = s.identity as Record<string, unknown> | undefined;
  if (identity) {
    for (const f of ['id', 'name', 'personality', 'seed', 'baseModel'] as const) {
      if (identity[f] === undefined || identity[f] === '') {
        issues.push(issue(`identity.${f}`, 'is required'));
      }
    }
  }

  const progression = s.progression as Record<string, unknown> | undefined;
  if (progression) {
    if (typeof progression.level !== 'number' || progression.level < 1) {
      issues.push(issue('progression.level', 'must be >= 1'));
    }
    if (typeof progression.xp !== 'number' || progression.xp < 0) {
      issues.push(issue('progression.xp', 'must be >= 0'));
    }
  }

  const dna = s.dna as Record<string, unknown> | undefined;
  if (dna) {
    for (const key of GENE_KEYS) {
      const v = dna[key];
      if (typeof v !== 'number' || Number.isNaN(v)) {
        issues.push(issue(`dna.${key}`, 'must be a number'));
      } else if (v < 0 || v > 1) {
        issues.push(issue(`dna.${key}`, 'must be in [0, 1] for Unity contract'));
      } else if (v < GENE_MIN || v > GENE_MAX) {
        issues.push(issue(`dna.${key}`, `outside genome range [${GENE_MIN}, ${GENE_MAX}]`));
      }
    }
  }

  const live = s.state as Record<string, unknown> | undefined;
  if (live?.animation && typeof live.animation !== 'object') {
    issues.push(issue('state.animation', 'must be an object'));
  }

  if (!Array.isArray(s.accessories)) {
    issues.push(issue('accessories', 'must be an array'));
  }
  if (!Array.isArray(s.mutations)) {
    issues.push(issue('mutations', 'must be an array'));
  }

  return { ok: issues.length === 0, issues };
}

export function assertValidUnityMascotState(state: unknown): asserts state is UnityMascotState {
  const result = validateUnityMascotState(state);
  if (!result.ok) {
    const summary = result.issues.map(i => `${i.path}: ${i.message}`).join('; ');
    throw new Error(`Invalid UnityMascotState: ${summary}`);
  }
}
