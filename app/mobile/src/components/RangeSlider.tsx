/**
 * RangeSlider — slider signed [min, max] genérico (ex: posture_lean [-0.2, 0.2]).
 *
 * Diferente do MorphSlider (que é fixo em [0.7, 1.3] e mostra ±30%), aceita
 * qualquer range e exibe valor cru ou via formatter. Mesma UX de center mark
 * + reset btn quando valor != defaultValue.
 *
 * Use casos típicos:
 *  - posture_lean em radianos [-0.2, 0.2]
 *  - qualquer parâmetro que não seja multiplicador simétrico
 */

import { useCallback, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type PanResponderInstance,
} from 'react-native';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  label: string;
  value: number;
  onChange: (next: number) => void;
  /** Mínimo do range. */
  min: number;
  /** Máximo do range. */
  max: number;
  /** Valor de "default" pro reset btn aparecer só quando != esse valor. */
  defaultValue?: number;
  /** Hint pequeno abaixo do label. */
  hint?: string;
  /** Formatter pra exibir o valor (ex: rad → graus). Default: 2 casas decimais. */
  format?: (v: number) => string;
  accessibilityLabel?: string;
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min + (max - min) / 2;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function valueToPosition(v: number, min: number, max: number): number {
  const c = clamp(v, min, max);
  return (c - min) / (max - min);
}

function positionToValue(p: number, min: number, max: number): number {
  const b = Math.max(0, Math.min(1, p));
  return min + b * (max - min);
}

const defaultFormat = (v: number): string => v.toFixed(2);

export function RangeSlider({
  label,
  value,
  onChange,
  min,
  max,
  defaultValue,
  hint,
  format = defaultFormat,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const trackWidth = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const defaultVal = defaultValue ?? (min + max) / 2;
  const handleReset = useCallback(() => onChange(defaultVal), [onChange, defaultVal]);

  const pan: PanResponderInstance = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const x = e.nativeEvent.locationX;
        const w = trackWidth.current || 1;
        onChange(positionToValue(x / w, min, max));
      },
      onPanResponderMove: (_e, gesture) => {
        const w = trackWidth.current || 1;
        const baseRatio = valueToPosition(valueRef.current, min, max);
        const nextRatio = baseRatio + gesture.dx / w;
        onChange(positionToValue(nextRatio, min, max));
      },
    }),
  ).current;

  const position = valueToPosition(value, min, max);
  // Default em meio do range → "centro". Posição relativa do default:
  const defaultPosition = valueToPosition(defaultVal, min, max);
  const isDefault = Math.abs(value - defaultVal) < (max - min) * 0.005;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
        {!isDefault ? (
          <PressableScale
            onPress={handleReset}
            // rótulo "reset" dá largura; só falta altura → hitSlop vertical p/ ~44px
            hitSlop={{ top: 12, bottom: 12 }}
            style={styles.resetBtn}
            accessibilityRole="button"
            accessibilityLabel={`Resetar ${label}`}
          >
            <Icon name="x" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.resetText}>reset</Text>
          </PressableScale>
        ) : null}
      </View>
      <View
        style={styles.track}
        onLayout={e => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityValue={{
          min,
          max,
          now: value,
          text: format(value),
        }}
        {...pan.panHandlers}
      >
        {/* Center/default marker */}
        <View style={[styles.centerMark, { left: `${defaultPosition * 100}%` }]} />
        {/* Fill */}
        <View
          style={[
            styles.fill,
            position < defaultPosition
              ? {
                  left: `${position * 100}%`,
                  width: `${(defaultPosition - position) * 100}%`,
                  backgroundColor: theme.colors.coral,
                }
              : {
                  left: `${defaultPosition * 100}%`,
                  width: `${(position - defaultPosition) * 100}%`,
                  backgroundColor: theme.colors.primary,
                },
          ]}
        />
        <View style={[styles.thumb, { left: `${position * 100}%` }]} />
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleText}>{format(min)}</Text>
        <Text style={[styles.scaleText, styles.scaleCenter]}>{format(value)}</Text>
        <Text style={styles.scaleText}>{format(max)}</Text>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: {
      gap: 6,
      paddingVertical: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    label: {
      ...theme.text.bodyBold,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 17,
      letterSpacing: -0.2,
    },
    hint: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    resetText: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    track: {
      height: 36,
      justifyContent: 'center',
      position: 'relative',
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    centerMark: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: theme.colors.border,
    },
    fill: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      borderRadius: 14,
      opacity: 0.7,
    },
    thumb: {
      position: 'absolute',
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.colors.primary,
      borderWidth: 3,
      borderColor: '#fff',
      top: 7,
      transform: [{ translateX: -11 }],
      ...theme.shadow.sm,
    },
    scale: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    scaleText: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 9.5,
      letterSpacing: 0.3,
    },
    scaleCenter: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
  });
}
