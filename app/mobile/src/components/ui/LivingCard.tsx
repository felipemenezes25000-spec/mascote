/**
 * LivingCard — card orgânico do design "Living Identity".
 *
 * Características:
 *  - Raio "lg" (22px) — formas orgânicas, não cartão fintech
 *  - Borda sutil derivada do mode (dark/light/sepia)
 *  - Sombra suave usando token `shadow.sm`
 *  - Tom opcional pra contexto emocional (`tone`): "neutral" | "warm" | "calm"
 *    | "celebrative". Tones alteram BG sutil + borda sem mudar tipografia.
 *  - Sem hex hardcoded. Sem spacing mágico.
 *
 * Filosofia: substitui `<View style={{ backgroundColor: '#FFF', padding: 16, ... }}>`
 * que polui as telas hoje. Toda card "feature" do app deve usar este.
 */

import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';

export type LivingCardTone = 'neutral' | 'warm' | 'calm' | 'celebrative' | 'glass';

export interface LivingCardProps {
  tone?: LivingCardTone;
  /** Padding interno (default md). */
  padding?: 'sm' | 'md' | 'lg';
  /** Habilita interação (Pressable). */
  onPress?: () => void;
  /** Realce de borda — útil pra "card do dia". */
  highlighted?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
  /** Acessibilidade — se onPress, esses props vão pro Pressable. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function LivingCard({
  tone = 'neutral',
  padding = 'md',
  onPress,
  highlighted = false,
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: LivingCardProps) {
  const theme = useTheme();
  const pad = padding === 'sm' ? theme.spacing.sm
    : padding === 'lg' ? theme.spacing.lg
    : theme.spacing.md;

  const bg = toneBackground(tone, theme);
  const borderColor = highlighted ? theme.colors.primary : theme.colors.border;
  const borderWidth = highlighted ? 1.5 : 1;

  const baseStyle: ViewStyle = {
    backgroundColor: bg,
    borderRadius: theme.radius.lg,
    padding: pad,
    borderColor,
    borderWidth,
    ...theme.shadow.sm,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        testID={testID}
        style={({ pressed }) => [
          baseStyle,
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[baseStyle, style]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {children}
    </View>
  );
}

/**
 * Resolve cor de fundo por tom. Tons "warm/calm/celebrative" usam tints
 * existentes nos tokens — preserva legibilidade do texto. Sem hex inventado.
 */
function toneBackground(tone: LivingCardTone, theme: ReturnType<typeof useTheme>): string {
  switch (tone) {
    case 'glass':       return theme.colors.glass;
    case 'warm':        return theme.colors.primaryTint;     // tint da paleta atual (ex: peach)
    case 'calm':        return theme.tokens.emotion.calm.bg; // verde sálvia claro
    case 'celebrative': return theme.tokens.emotion.proud.bg; // dourado claro
    case 'neutral':
    default:            return theme.colors.surface;
  }
}
