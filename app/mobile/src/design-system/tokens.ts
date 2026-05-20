/**
 * Design System — tokens semânticos consolidados (V2).
 *
 * Por que esse arquivo existe (em vez de só usar `theme.colors.*` direto):
 *  - Da nomes semânticos ("brand/500") aos hex já existentes em `lib/themes.ts`,
 *    facilitando re-skinning futuro e leitura de código.
 *  - Adiciona space/radius/motion/elevation/z numa única struct.
 *  - NÃO substitui `useTheme()` — esse é o source-of-truth runtime que reage a
 *    mudanças de mode/paleta. Aqui são CONSTANTES adicionais que não dependem
 *    do modo (radius, space, motion).
 *
 * Importação típica:
 *   import { space, radius, motion, z } from '@/design-system/tokens';
 *   import { useTheme } from '@/lib/useTheme';   // para cores reativas
 */

import { Easing } from 'react-native-reanimated';

// ============================================================================
// Spacing (4pt grid) — substitui valores ad-hoc em StyleSheet.
// ============================================================================
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
  20: 80,
} as const;
export type SpaceKey = keyof typeof space;

// ============================================================================
// Radius — mesmos valores do theme.radius mas com nomes semânticos.
// ============================================================================
export const radius = {
  none: 0,
  sm: 8,        // chips, inputs
  md: 16,       // cards, bottom sheets
  lg: 22,       // cards de destaque
  xl: 28,       // hero cards (card do mascote)
  pill: 999,    // botões pílula, badges
} as const;
export type RadiusKey = keyof typeof radius;

// ============================================================================
// Z-index — evita conflitos entre overlays.
// ============================================================================
export const z = {
  base: 0,
  sticky: 10,
  dropdown: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
} as const;
export type ZKey = keyof typeof z;

// ============================================================================
// Motion — durações + easings + spring presets.
// ============================================================================
export const motion = {
  duration: {
    instant: 0,
    fast: 120,
    base: 200,
    slow: 320,
    emphasis: 480,
    slowest: 720,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    emphasized: Easing.bezier(0.3, 0, 0.1, 1),
    decelerated: Easing.bezier(0, 0, 0, 1),
    accelerated: Easing.bezier(0.3, 0, 1, 1),
  },
  spring: {
    gentle: { damping: 18, stiffness: 120, mass: 1 },
    bouncy: { damping: 10, stiffness: 180, mass: 0.9 },
    snappy: { damping: 22, stiffness: 260, mass: 1 },
  },
} as const;

// ============================================================================
// Elevation — mapeia para theme.shadow.* mas com nomes semânticos consistentes.
// Componentes consomem via `theme.shadow.sm`, este enum é só pra readability.
// ============================================================================
export const elevation = {
  0: 'none',
  1: 'sm',         // botões, chips
  2: 'md',         // cards
  3: 'glass',      // modais, sheets
} as const;

// ============================================================================
// Font families — fonte de verdade pro V2 (depois de cortar Quicksand fora do brand).
// ============================================================================
export const font = {
  serif:    'InstrumentSerif_400Regular',
  serifIt:  'InstrumentSerif_400Regular_Italic',
  ui:       'PlusJakartaSans_400Regular',
  uiMed:    'PlusJakartaSans_500Medium',
  uiSemi:   'PlusJakartaSans_600SemiBold',
  uiBold:   'PlusJakartaSans_700Bold',
  uiExtra:  'PlusJakartaSans_800ExtraBold',
  mono:     'JetBrainsMono_500Medium',
  monoReg:  'JetBrainsMono_400Regular',
  // Quicksand RESTRITA ao wordmark/splash — NÃO usar em UI geral
  brand:    'Quicksand_700Bold',
} as const;

// ============================================================================
// Hit-slop padrão pra elementos pequenos clicáveis.
// ============================================================================
export const hitSlop = {
  sm: { top: 6, right: 6, bottom: 6, left: 6 },
  md: { top: 12, right: 12, bottom: 12, left: 12 },
  lg: { top: 16, right: 16, bottom: 16, left: 16 },
} as const;

// ============================================================================
// Re-export único — componentes podem fazer:
//   import { space, radius, motion } from '@/design-system/tokens';
// ============================================================================
export const tokens = {
  space,
  radius,
  z,
  motion,
  elevation,
  font,
  hitSlop,
} as const;

export default tokens;
