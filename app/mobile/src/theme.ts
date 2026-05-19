/**
 * Theme default — re-export de buildTheme('light', 'classic').
 * Mantido por retrocompat. Componentes que querem reagir a mudanças
 * de tema/paleta devem usar `useTheme()` em vez de importar daqui.
 */

export { buildTheme, PALETTES } from '@/lib/themes';
export type { Theme, ThemeMode, BrandPalette } from '@/lib/themes';
import { buildTheme as build } from '@/lib/themes';

export const theme = build('light', 'classic');
