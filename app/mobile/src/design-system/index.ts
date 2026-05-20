/**
 * Design System V2 — barrel export.
 *
 * Importe daqui em vez de paths individuais para facilitar reorganização:
 *   import { ProgressBar, tokens, space, radius } from '@/design-system';
 */
export { ProgressBar, type ProgressBarColor } from './ProgressBar';
export {
  tokens,
  space,
  radius,
  z,
  motion,
  elevation,
  font,
  hitSlop,
} from './tokens';
export type { SpaceKey, RadiusKey, ZKey } from './tokens';
