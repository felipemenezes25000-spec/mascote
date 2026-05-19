import { useMemo } from 'react';
import { PixelRatio, useColorScheme } from 'react-native';
import { useStore } from '@/store';
import { buildTheme, type BrandPalette, type Theme, type ThemeMode } from '@/lib/themes';

type ResolvedMode = Exclude<ThemeMode, 'system'>;

/**
 * Resolve o multiplicador de fonte:
 * - dynamic_text OFF → sempre 1.0 (escala fixa, design original)
 * - dynamic_text ON  → segue `PixelRatio.getFontScale()` (preferência OS).
 *   Garante que usuário com fonte grande no Android/iOS vê textos maiores.
 *
 * `clampDynamicScale` em themes.ts protege contra valores absurdos.
 */
export function resolveTextScale(
  dynamicTextEnabled: boolean,
  osFontScale: number = 1,
): number {
  if (!dynamicTextEnabled) return 1;
  return osFontScale;
}

/**
 * Hook que retorna o Theme atual baseado em settings.theme_mode + settings.brand_palette.
 * Suporta 'system' resolvendo via useColorScheme do RN.
 * Aplica high contrast modifier quando settings.high_contrast = true.
 * Aplica escala de fonte quando settings.dynamic_text = true.
 */
export function useTheme(): Theme {
  const settings = useStore(s => s.settings);
  const systemScheme = useColorScheme();
  const mode = (settings?.theme_mode ?? 'system') as ThemeMode;
  const palette = (settings?.brand_palette ?? 'classic') as BrandPalette;
  const highContrast = settings?.high_contrast ?? false;
  const dynamicText = settings?.dynamic_text ?? false;
  const osScale = PixelRatio.getFontScale?.() ?? 1;
  const textScale = resolveTextScale(dynamicText, osScale);

  // Após resolver 'system' o modo é sempre concreto — narrow type pra
  // pegar bugs caso 'system' vaze pra buildTheme em refactors futuros.
  const effectiveMode: ResolvedMode =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  return useMemo(() => {
    const base = buildTheme(effectiveMode, palette, { textScale });
    if (highContrast) {
      // ink mais escuro, hairlines mais visíveis
      return {
        ...base,
        colors: {
          ...base.colors,
          textSecondary: base.colors.text,
          border: base.colors.textDim,
          border2: base.colors.textDim,
        },
      };
    }
    return base;
  }, [effectiveMode, palette, highContrast, textScale]);
}

export function useStyles<S>(maker: (theme: Theme) => S): S {
  const theme = useTheme();
  return useMemo(() => maker(theme), [theme]);
}

export function getStaticTheme(): Theme {
  return buildTheme('light', 'classic');
}
