/**
 * Preferências de acessibilidade do sistema operacional.
 * Usado na primeira persistência de settings e no hydrate.
 */

import { AccessibilityInfo, Platform } from 'react-native';

/** Web: `prefers-reduced-motion`. Nativo: AccessibilityInfo. */
export async function readSystemReduceMotion(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}
