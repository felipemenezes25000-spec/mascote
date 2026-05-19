/**
 * Card primitive — superfície base com profundidade visual real.
 *
 * Variants:
 *  - 'flat'     → background + border 1px (uso comum)
 *  - 'elevated' → background + multi-layer shadow + border sutil (cards de destaque)
 *  - 'glass'    → BlurView (nativo) ou backdrop-filter (web) + border luminoso
 *  - 'gradient' → LinearGradient + glow (premium hero)
 *
 * Substitui o padrão `borderWidth: 1; borderColor: border` que ficou plano e
 * sem hierarquia. Cards premium têm sombras MULTI-LAYER:
 *   shadow 1: muito blur, baixa opacity (ambient)
 *   shadow 2: pouco blur, alta opacity (key light) → simulado via inner border
 */

import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/useTheme';
import { makeShadow } from '@/lib/themes';

type Variant = 'flat' | 'elevated' | 'glass' | 'gradient';

interface Props extends ViewProps {
  variant?: Variant;
  /** padding interno em ml de spacing tokens. 'md' = 16, 'lg' = 22 */
  padding?: keyof ReturnType<typeof useTheme>['spacing'] | 'none';
  radius?: keyof ReturnType<typeof useTheme>['radius'];
  gradientColors?: [string, string, ...string[]];
  children: ReactNode;
}

export function Card({
  variant = 'flat',
  padding = 'md',
  radius = 'lg',
  gradientColors,
  style,
  children,
  ...rest
}: Props) {
  const theme = useTheme();
  const isDark = theme.mode === 'dark';

  const baseStyle: ViewStyle = {
    borderRadius: theme.radius[radius],
    padding: padding === 'none' ? 0 : theme.spacing[padding],
    overflow: 'hidden',
  };

  if (variant === 'glass') {
    return (
      <View style={[baseStyle, glassStyles.wrap, style]} {...rest}>
        {Platform.OS === 'web' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark ? 'rgba(34,28,22,0.7)' : 'rgba(255,255,255,0.75)',
                borderRadius: theme.radius[radius],
              } as any,
              {
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              } as any,
            ]}
          />
        ) : (
          <BlurView
            tint={isDark ? 'dark' : 'light'}
            intensity={60}
            style={[StyleSheet.absoluteFill, { borderRadius: theme.radius[radius] }]}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)',
              borderRadius: theme.radius[radius],
            },
          ]}
        />
        <View style={{ position: 'relative' }}>{children}</View>
      </View>
    );
  }

  if (variant === 'gradient') {
    const colors = gradientColors ?? [theme.colors.primary, theme.colors.primaryDeep];
    return (
      <View style={[baseStyle, theme.shadow.md, style]} {...rest}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* highlight superior — simula key light */}
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
        <View>{children}</View>
      </View>
    );
  }

  if (variant === 'elevated') {
    return (
      <View
        style={[
          baseStyle,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          },
          // ambient shadow — muito blur, opacity baixa
          makeShadow(isDark ? '#000' : '#28200F', 0, 8, 20, isDark ? 0.4 : 0.06, 3),
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    );
  }

  // flat (default)
  return (
    <View
      style={[
        baseStyle,
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const glassStyles = StyleSheet.create({
  wrap: { position: 'relative' },
});
