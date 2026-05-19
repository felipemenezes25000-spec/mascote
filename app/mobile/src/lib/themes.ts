/**
 * Sistema de temas + paletas trocáveis (handoff oficial).
 *
 * Light / Sepia / Dark × 5 paletas (classic, sunset, peach, coral, sun).
 * Cada combinação produz um objeto Theme. `useTheme()` retorna o atual
 * lendo do store; componentes reagem via Zustand selector.
 */

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'sepia' | 'dark' | 'system';
export type BrandPalette = 'classic' | 'sunset' | 'peach' | 'coral' | 'sun';

export interface BrandPaletteSpec {
  id: BrandPalette;
  name: string;
  brand: string;
  deep: string;
  soft: string;
  tint: string;
}

export const PALETTES: Record<BrandPalette, BrandPaletteSpec> = {
  classic: { id: 'classic', name: 'Laranja Mascote', brand: '#FF8030', deep: '#E5651A', soft: '#FFD3B5', tint: '#FFF1E6' },
  sunset:  { id: 'sunset',  name: 'Pôr-do-sol',     brand: '#E85A2A', deep: '#B5391A', soft: '#F7B59A', tint: '#FCE6DA' },
  peach:   { id: 'peach',   name: 'Pêssego',        brand: '#FFA76A', deep: '#E47F3D', soft: '#FFE0CC', tint: '#FFF4EA' },
  coral:   { id: 'coral',   name: 'Coral',          brand: '#FF6F61', deep: '#D14438', soft: '#FFC0B7', tint: '#FFE9E5' },
  sun:     { id: 'sun',     name: 'Sol',            brand: '#FFB347', deep: '#E08F1A', soft: '#FFDB9B', tint: '#FFF6E2' },
};

interface ModeSurfaces {
  bg: string;
  bg2: string;
  surface: string;
  surface2: string;
  text: string;
  textSecondary: string;
  textDim: string;
  border: string;
  border2: string;
  inkInverse: string;
  glass: string;
  overlay: string;
}

type ResolvedMode = Exclude<ThemeMode, 'system'>;

const SURFACES: Record<ResolvedMode, ModeSurfaces> = {
  light: {
    bg: '#FBF6F1',
    bg2: '#F4ECE2',
    surface: '#FFFFFF',
    surface2: '#FBF6F1',
    text: '#1F1A14',
    textSecondary: '#5E5448',
    textDim: '#9A8F80',
    border: '#ECE2D5',
    border2: '#DDD1C2',
    inkInverse: '#FFFFFF',
    glass: 'rgba(255,255,255,0.88)',
    overlay: 'rgba(40,30,15,0.45)',
  },
  sepia: {
    bg: '#F1E6D3',
    bg2: '#E8D9C0',
    surface: '#F7EDDB',
    surface2: '#F1E6D3',
    text: '#2A1F11',
    textSecondary: '#6B5840',
    textDim: '#A89578',
    border: '#DDC9A8',
    border2: '#C9B28C',
    inkInverse: '#FFFFFF',
    glass: 'rgba(247,237,219,0.88)',
    overlay: 'rgba(40,30,15,0.45)',
  },
  dark: {
    bg: '#15110D',
    bg2: '#1E1812',
    surface: '#221C16',
    surface2: '#1A1510',
    text: '#FCF3E7',
    textSecondary: '#C6B6A0',
    textDim: '#8E7E68',
    border: '#34291F',
    border2: '#4A3B2C',
    inkInverse: '#15110D',
    glass: 'rgba(34,28,22,0.88)',
    overlay: 'rgba(0,0,0,0.65)',
  },
};

const FIXED = {
  sage: '#7BAE7A',
  sageDeep: '#4A7A52',
  coral: '#E96B5C',
  coralDeep: '#B23F33',
  lilac: '#B79FD4',
  lilacDeep: '#6B4F8E',
  gold: '#F2C14E',
  sky: '#6FA9CA',
  success: '#7BAE7A',
  warning: '#F2C14E',
  error: '#E96B5C',
  // moods
  moodTriste: '#9AABBE',
  moodOk: '#B79FD4',
  moodFeliz: '#FFB347',
  moodEmpolgado: '#F2C14E',
  moodExausto: '#A89578',
  // personalidades
  calmo: '#7BAE7A',
  motivador: '#FF8030',
  fofo: '#E96B5C',
  sabio: '#B79FD4',
};

/**
 * Cross-platform shadow. Web emite `boxShadow` (CSS string), nativo emite
 * `shadowColor/shadowOffset/shadowOpacity/shadowRadius/elevation`. Mata os
 * warnings "shadow* style props are deprecated" do RN-web 0.19+.
 */
export function makeShadow(
  color: string,
  offsetX: number,
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number,
) {
  if (Platform.OS === 'web') {
    const rgba = hexToRgba(color, opacity);
    return { boxShadow: `${offsetX}px ${offsetY}px ${blur}px ${rgba}` } as any;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation,
  };
}

/**
 * Companion de `makeShadow` para zerar sombra cross-platform. Use em estados
 * "done/disabled" onde você quer suprimir um shadow herdado sem misturar
 * `shadowOpacity: 0` (deprecated em RN-web) com `boxShadow` (deprecated em ios).
 */
export function noShadow() {
  if (Platform.OS === 'web') {
    return { boxShadow: 'none' } as any;
  }
  return { shadowOpacity: 0, shadowRadius: 0, elevation: 0 };
}

function hexToRgba(color: string, alpha: number): string {
  if (color.startsWith('rgba') || color.startsWith('rgb(')) return color;
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Faixa segura do multiplicador de fonte:
 * - 0.85 evita textos minúsculos onde labels viram ilegíveis em devices densos
 * - 1.5 evita overflow / clip em chips, badges, e CTAs com line-height fixo
 *
 * Equivalente conceitualmente ao limite que iOS/Android impõem em accessibility.
 */
export const DYNAMIC_TEXT_RANGE = { min: 0.85, max: 1.5 } as const;

export function clampDynamicScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.max(DYNAMIC_TEXT_RANGE.min, Math.min(DYNAMIC_TEXT_RANGE.max, scale));
}

export interface BuildThemeOptions {
  /** Multiplicador aplicado em fontSize/lineHeight quando `dynamic_text` está ON. */
  textScale?: number;
}

export function buildTheme(
  mode: ThemeMode,
  paletteId: BrandPalette,
  options: BuildThemeOptions = {}
) {
  const palette = PALETTES[paletteId];
  const resolvedMode: ResolvedMode = mode === 'system' ? 'light' : mode;
  const surfaces = SURFACES[resolvedMode];
  // No dark, brand tint vira "burnt" não "claro"
  const brandTint = resolvedMode === 'dark' ? `${palette.brand}22` : palette.tint;
  const scale = clampDynamicScale(options.textScale ?? 1);
  const sz = (n: number) => Math.round(n * scale * 100) / 100;
  return {
    mode: resolvedMode,
    palette: paletteId,
    colors: {
      ...FIXED,
      primary: palette.brand,
      primarySoft: palette.soft,
      primaryDeep: palette.deep,
      primaryTint: brandTint,
      secondary: FIXED.gold,
      secondarySoft: '#FFE5A8',
      // personalidade motivador acompanha brand (sempre laranja da paleta atual)
      motivador: palette.brand,
      ...surfaces,
      bgDark: SURFACES.dark.bg,
      surfaceDark: SURFACES.dark.surface,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 22,
      xl: 32,
      xxl: 48,
    },
    radius: {
      sm: 8,
      md: 16,
      lg: 22,
      xl: 28,
      pill: 999,
    },
    /** Escala atualmente aplicada (1.0 = padrão). Útil pra debug e testes. */
    textScale: scale,
    text: {
      // títulos editoriais usam Instrument Serif (contraste humano com UI)
      h1: { fontSize: sz(32), fontFamily: 'InstrumentSerif_400Regular', lineHeight: sz(38), letterSpacing: -0.5 } as const,
      h2: { fontSize: sz(24), fontFamily: 'InstrumentSerif_400Regular', lineHeight: sz(30), letterSpacing: -0.3 } as const,
      // UI bold usa Plus Jakarta Sans
      h3: { fontSize: sz(18), fontFamily: 'PlusJakartaSans_700Bold', lineHeight: sz(24) } as const,
      body: { fontSize: sz(14.5), fontFamily: 'PlusJakartaSans_400Regular', lineHeight: sz(22) } as const,
      bodyBold: { fontSize: sz(14.5), fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: sz(22) } as const,
      sm: { fontSize: sz(13), fontFamily: 'PlusJakartaSans_500Medium', lineHeight: sz(18) } as const,
      // rótulos técnicos mono uppercase
      xs: { fontSize: sz(11), fontFamily: 'JetBrainsMono_500Medium', lineHeight: sz(16), letterSpacing: 0.6 } as const,
      // wordmark "mascote" e marca
      brand: { fontSize: sz(28), fontFamily: 'Quicksand_700Bold', letterSpacing: -1 } as const,
      serif: { fontSize: sz(28), fontFamily: 'InstrumentSerif_400Regular_Italic', fontStyle: 'italic' as const } as const,
    },
    shadow: {
      sm: makeShadow(
        resolvedMode === 'dark' ? '#000' : '#28200F',
        0, 2, 6,
        resolvedMode === 'dark' ? 0.3 : 0.06,
        2,
      ),
      md: makeShadow(
        resolvedMode === 'dark' ? '#000' : '#28200F',
        0, 10, 30,
        resolvedMode === 'dark' ? 0.45 : 0.1,
        4,
      ),
      glass: makeShadow(
        resolvedMode === 'dark' ? '#000' : '#28200F',
        0, 10, 30,
        resolvedMode === 'dark' ? 0.5 : 0.12,
        6,
      ),
    },
  };
}

export type Theme = ReturnType<typeof buildTheme>;
