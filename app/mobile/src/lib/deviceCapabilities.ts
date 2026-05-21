/**
 * Detector de capabilities pra decidir se renderiza Mascot 3D ou fallback 2D.
 *
 * Lê sinais conservadores: plataforma, versão do SO, RAM disponível
 * (via Constants do Expo quando disponível). Default = 3D habilitado.
 * Override via Settings.use2DMascotOverride (futuro).
 *
 * Falsos negativos (devices capazes que caem no 2D) são preferíveis a
 * falsos positivos (devices fracos que travam tentando 3D).
 */

import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

/** expo-gl nativo — ausente em dev clients antigos sem rebuild. */
function hasExpoGLNative(): boolean {
  if (Platform.OS === 'web') return true;
  return requireOptionalNativeModule('ExponentGLObjectManager') != null;
}

/**
 * Checa se o browser tem WebGL real disponível (não só o canvas API).
 * Cacheia o resultado — query do contexto é cara, e capability não muda
 * dentro de uma sessão.
 */
let webglCache: boolean | null = null;
function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  if (typeof document === 'undefined') {
    webglCache = false;
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    webglCache = gl != null;
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export interface Capabilities {
  /** true se podemos renderizar Mascot3D com R3F. */
  canRender3D: boolean;
  /** Descritivo curto pra logs/telemetria. */
  reason: string;
  /** Sugestão de qualidade: 'low' | 'medium' | 'high'. */
  qualityTier: 'low' | 'medium' | 'high';
}

/**
 * Decide capabilities a partir de sinais disponíveis.
 *
 * IMPORTANTE: web SEMPRE pode renderizar 3D (Three.js roda em qualquer
 * navegador moderno). Mobile usa heurística mais conservadora.
 *
 * @param override Se true/false explícito, retorna esse valor (configurações).
 */
export function detectCapabilities(override?: boolean): Capabilities {
  if (override === true) {
    return { canRender3D: true, reason: 'user override (on)', qualityTier: 'high' };
  }
  if (override === false) {
    return { canRender3D: false, reason: 'user override (off)', qualityTier: 'low' };
  }

  // Web: checa WebGL real. Antes assumíamos disponível, mas QA flagrou que
  // headless browsers (Playwright, e2e) e alguns devices low-end caem em
  // canvas vazio sem disparar o Mascot3DBoundary (que só pega throws).
  if (Platform.OS === 'web') {
    if (hasWebGL()) {
      return { canRender3D: true, reason: 'web (WebGL OK)', qualityTier: 'high' };
    }
    return { canRender3D: false, reason: 'web sem WebGL', qualityTier: 'low' };
  }

  if (!hasExpoGLNative()) {
    return {
      canRender3D: false,
      reason: 'expo-gl nativo indisponível (rebuild do app)',
      qualityTier: 'low',
    };
  }

  // iOS: 14+ → 3D ativado.
  if (Platform.OS === 'ios') {
    const v = parseInt(String(Platform.Version).split('.')[0] ?? '0', 10);
    if (Number.isFinite(v) && v >= 14) {
      return {
        canRender3D: true,
        reason: `iOS ${Platform.Version}`,
        qualityTier: v >= 16 ? 'high' : 'medium',
      };
    }
    return { canRender3D: false, reason: `iOS ${Platform.Version} (<14)`, qualityTier: 'low' };
  }

  // Android: API level (Platform.Version é número no Android).
  if (Platform.OS === 'android') {
    const v = typeof Platform.Version === 'number' ? Platform.Version : 0;
    // API 26 = Android 8.0 (Oreo). Cobre ~98% do mercado BR ativo.
    if (v >= 28) {
      return { canRender3D: true, reason: `Android API ${v}`, qualityTier: 'high' };
    }
    if (v >= 26) {
      return { canRender3D: true, reason: `Android API ${v}`, qualityTier: 'medium' };
    }
    return { canRender3D: false, reason: `Android API ${v} (<26)`, qualityTier: 'low' };
  }

  // Plataformas exóticas (windows desktop expo, macOS, etc): conservador.
  return { canRender3D: false, reason: `plataforma desconhecida: ${Platform.OS}`, qualityTier: 'low' };
}
