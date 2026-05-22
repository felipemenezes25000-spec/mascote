/**
 * CreatureHero — wrapper "Mascote como protagonista" pra topo de telas.
 *
 * Composição:
 *  - Mascote (passado como children) em destaque
 *  - Linha contextual abaixo ("Bipo está calmo hoje", "Lulu sentiu sua aurora")
 *  - Aura/halo derivada do mood (decorativa, layer atrás)
 *  - Padding generoso (tokens), sem hex hardcoded
 *
 * Princípio: TODA tela "central de habitat" (Home, Customize, Evolução) deve
 * abrir com um CreatureHero. Substitui o costume atual de espalhar um <View>
 * com mascote+texto em cada tela.
 */

import { View, type ViewStyle } from 'react-native';
import { Typography } from './Typography';
import { useTheme } from '@/lib/useTheme';

export interface CreatureHeroProps {
  /** Mascote ou placeholder visual — render-prop livre. */
  children: React.ReactNode;
  /** Frase contextual logo abaixo do mascote. */
  caption?: string;
  /** Frase secundária menor (e.g. estado, próxima ação). */
  hint?: string;
  /** Halo sutil de fundo (default true). */
  halo?: boolean;
  /** Padding vertical (default lg). */
  spacing?: 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

export function CreatureHero({
  children,
  caption,
  hint,
  halo = true,
  spacing = 'lg',
  style,
}: CreatureHeroProps) {
  const theme = useTheme();
  const vGap = spacing === 'md' ? theme.spacing.md
    : spacing === 'xl' ? theme.spacing.xl
    : theme.spacing.lg;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          paddingTop: vGap,
          paddingBottom: vGap,
          paddingHorizontal: theme.spacing.md,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {/* Halo decorativo — sutil aura atrás do mascote. */}
      {halo ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            top: vGap,
            width: 220,
            height: 220,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.primary,
            opacity: 0.08,
          }}
        />
      ) : null}
      <View style={{ zIndex: 1 }}>{children}</View>
      {(caption || hint) ? (
        <View style={{ alignItems: 'center', gap: theme.spacing.xs / 2, paddingTop: theme.spacing.xs }}>
          {caption ? (
            <Typography variant="title" align="center" numberOfLines={2}>
              {caption}
            </Typography>
          ) : null}
          {hint ? (
            <Typography variant="caption" align="center" tone="secondary" numberOfLines={2}>
              {hint}
            </Typography>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
