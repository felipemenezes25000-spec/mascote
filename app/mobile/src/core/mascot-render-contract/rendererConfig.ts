/**
 * Feature flags do renderer mascote (Three.js / Unity / 2D).
 *
 * Variáveis EXPO_PUBLIC_* são substituídas em build time pelo Metro.
 */

import type { MascotRendererMode, UnityQualityPreset } from './types';

function readEnv(name: string): string | undefined {
  const v = process.env?.[name];
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim().toLowerCase();
  return trimmed.length === 0 ? undefined : trimmed;
}

function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) return defaultValue;
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return defaultValue;
}

const VALID_MODES: readonly MascotRendererMode[] = ['three', 'unity', 'fallback2d'];
const VALID_QUALITY: readonly UnityQualityPreset[] = ['auto', 'low', 'medium', 'high'];

export interface MascotRendererConfig {
  mode: MascotRendererMode;
  unityEnabled: boolean;
  unityQuality: UnityQualityPreset;
  unityDebugPanel: boolean;
}

export function getMascotRendererMode(): MascotRendererMode {
  const raw = readEnv('EXPO_PUBLIC_MASCOT_RENDERER');
  if (raw && (VALID_MODES as readonly string[]).includes(raw)) {
    return raw as MascotRendererMode;
  }
  return 'three';
}

export function isUnityEnabled(): boolean {
  return parseBool(readEnv('EXPO_PUBLIC_UNITY_ENABLED'), false);
}

/** Unity na Home tab — opt-in separado de /mascot-room; exige EXPO_PUBLIC_UNITY_ENABLED. */
export function isUnityHomeEnabled(): boolean {
  return isUnityEnabled() && parseBool(readEnv('EXPO_PUBLIC_UNITY_HOME'), false);
}

export function getUnityQuality(): UnityQualityPreset {
  const raw = readEnv('EXPO_PUBLIC_UNITY_QUALITY');
  if (raw && (VALID_QUALITY as readonly string[]).includes(raw)) {
    return raw as UnityQualityPreset;
  }
  return 'auto';
}

export function isUnityDebugPanelEnabled(): boolean {
  return parseBool(readEnv('EXPO_PUBLIC_UNITY_DEBUG_PANEL'), false);
}

/** Config efetiva: Unity só ativa se flag + mode unity. */
export function getMascotRendererConfig(): MascotRendererConfig {
  const mode = getMascotRendererMode();
  const unityEnabled = isUnityEnabled();
  return {
    mode: mode === 'unity' && !unityEnabled ? 'three' : mode,
    unityEnabled,
    unityQuality: getUnityQuality(),
    unityDebugPanel: isUnityDebugPanelEnabled(),
  };
}

/** Modo resolvido para o MascotRenderer (respeita unityEnabled). */
export function resolveEffectiveRendererMode(): MascotRendererMode {
  const cfg = getMascotRendererConfig();
  if (cfg.mode === 'unity' && cfg.unityEnabled) return 'unity';
  if (cfg.mode === 'fallback2d') return 'fallback2d';
  return 'three';
}

export interface ResolveRendererModeOptions {
  /** Rotas dedicadas (ex.: /mascot-room) tentam Unity quando a flag está ativa. */
  preferUnity?: boolean;
}

/**
 * Modo efetivo do renderer — home usa env global; rotas premium podem preferir Unity.
 */
export function resolveRendererMode(options: ResolveRendererModeOptions = {}): MascotRendererMode {
  if (options.preferUnity && isUnityEnabled()) return 'unity';
  return resolveEffectiveRendererMode();
}
