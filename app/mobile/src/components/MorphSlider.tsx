/**
 * MorphSlider — slider Sims/Spore-like pra customização de morfologia.
 *
 * **Princípio inviolável**: range visualmente representa [-30%, +30%], mas
 * o valor interno é multiplicador em [MIN_MULT, MAX_MULT] = [0.7, 1.3].
 * Sem isso, usuário poderia destruir a identidade da criatura.
 *
 * Implementação RN web/native:
 *  - PanResponder direto no track (sem dependência de slider-lib externa)
 *  - Acessibilidade: accessibilityRole="adjustable" + accessibilityValue
 *  - reduceMotion: sem easing visual, drag direto
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
import { MAX_MULT, MIN_MULT, clampMultiplier } from '@/lib/dna';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

interface Props {
  /** Nome PT-BR amigável exibido acima do slider. */
  label: string;
  /** Valor atual (multiplicador) — fora de [0.7, 1.3] é clampado. */
  value: number;
  /** Callback com novo multiplicador (já clampado). */
  onChange: (next: number) => void;
  /** Texto pequeno explicativo opcional (ex: "tamanho dos olhos"). */
  hint?: string;
  /** Pra acessibilidade — anuncia mudanças. */
  accessibilityLabel?: string;
}

/**
 * Converte valor interno [0.7, 1.3] em posição percentual no track [0, 1].
 */
function valueToPosition(v: number): number {
  const clamped = clampMultiplier(v);
  return (clamped - MIN_MULT) / (MAX_MULT - MIN_MULT);
}

/**
 * Converte posição [0, 1] em valor interno [0.7, 1.3].
 */
function positionToValue(p: number): number {
  const bounded = Math.max(0, Math.min(1, p));
  return MIN_MULT + bounded * (MAX_MULT - MIN_MULT);
}

export function MorphSlider({ label, value, onChange, hint, accessibilityLabel }: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const trackWidth = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const handleReset = useCallback(() => onChange(1), [onChange]);

  const pan: PanResponderInstance = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: e => {
        const x = e.nativeEvent.locationX;
        const w = trackWidth.current || 1;
        const next = positionToValue(x / w);
        onChange(next);
      },
      onPanResponderMove: (_e, gesture) => {
        const w = trackWidth.current || 1;
        // Acumula dx sobre o valueRef (snapshot na hora do grant via valueRef).
        // Antes havia uma linha morta calculando `x` a partir de moveX que
        // nunca era lida — removida pra evitar confusão em manutenção.
        const baseRatio = valueToPosition(valueRef.current);
        const nextRatio = baseRatio + gesture.dx / w;
        onChange(positionToValue(nextRatio));
      },
    }),
  ).current;

  const position = valueToPosition(value);
  const displayPercent = Math.round((value - 1) * 100);
  const isDefault = Math.abs(value - 1) < 0.005;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          {hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
        {!isDefault && (
          <PressableScale
            onPress={handleReset}
            style={styles.resetBtn}
            accessibilityRole="button"
            accessibilityLabel={`Resetar ${label}`}
          >
            <Icon name="x" size={12} color={theme.colors.textSecondary} strokeWidth={2.2} />
            <Text style={styles.resetText}>reset</Text>
          </PressableScale>
        )}
      </View>
      <View
        style={styles.track}
        onLayout={e => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityValue={{
          min: -30,
          max: 30,
          now: displayPercent,
          text: `${displayPercent > 0 ? '+' : ''}${displayPercent}%`,
        }}
        {...pan.panHandlers}
      >
        {/* Centro (0%) marker */}
        <View style={styles.centerMark} />
        {/* Fill colorido — divide em "negativo" (esquerda) e "positivo" (direita) */}
        <View
          style={[
            styles.fill,
            position < 0.5
              ? {
                  left: `${position * 100}%`,
                  width: `${(0.5 - position) * 100}%`,
                  backgroundColor: theme.colors.coral,
                }
              : {
                  left: '50%',
                  width: `${(position - 0.5) * 100}%`,
                  backgroundColor: theme.colors.primary,
                },
          ]}
        />
        <View
          style={[
            styles.thumb,
            { left: `${position * 100}%` },
          ]}
        />
      </View>
      <View style={styles.scale}>
        <Text style={styles.scaleText}>−30%</Text>
        <Text style={[styles.scaleText, styles.scaleCenter]}>{displayPercent > 0 ? '+' : ''}{displayPercent}%</Text>
        <Text style={styles.scaleText}>+30%</Text>
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
      left: '50%',
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
