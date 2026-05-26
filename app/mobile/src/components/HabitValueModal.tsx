import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { habitMeta } from '@/content/missions';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { HabitKind } from '@/types';

/**
 * Bottom sheet premium pra ajustar quantidade do hábito (long-press no chip).
 * Stepper +/- com botões circulares, quick presets em pills, tipografia
 * editorial no número grande (Instrument Serif).
 */

interface Props {
  visible: boolean;
  kind: HabitKind | null;
  onClose: () => void;
  onConfirm: (value: number) => void;
}

const HABIT_ICONS: Record<HabitKind, IconName> = {
  water: 'droplet',
  sleep: 'moon',
  exercise: 'dumbbell',
  breath: 'wind',
  meditation: 'heart',
  reading: 'book',
  journaling: 'pencil',
  outdoor: 'tree',
  sun: 'sun',
};

const configs: Record<HabitKind, { unit: string; min: number; max: number; step: number; default: number; tip?: string }> = {
  water: { unit: 'copo', min: 1, max: 12, step: 1, default: 1, tip: 'Cada copo conta' },
  sleep: { unit: 'horas', min: 4, max: 12, step: 1, default: 7, tip: 'Quantas horas você dormiu?' },
  exercise: { unit: 'min', min: 5, max: 120, step: 5, default: 15, tip: 'Pode ser caminhada' },
  meditation: { unit: 'min', min: 1, max: 60, step: 1, default: 5 },
  reading: { unit: 'pág', min: 1, max: 100, step: 1, default: 5 },
  journaling: { unit: 'entradas', min: 1, max: 10, step: 1, default: 1 },
  breath: { unit: 'min', min: 1, max: 30, step: 1, default: 3 },
  outdoor: { unit: 'min', min: 1, max: 120, step: 5, default: 10 },
  sun: { unit: 'min', min: 1, max: 60, step: 1, default: 5 },
};

export function HabitValueModal({ visible, kind, onClose, onConfirm }: Props) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const config = kind ? configs[kind] : null;
  const [value, setValue] = useState<number>(config?.default ?? 1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (kind) {
      setValue(configs[kind].default);
      setSubmitting(false);
    }
  }, [kind]);

  // Guard contra duplo-tap (backend tem withLock mas UI deve evitar 2
  // analytics events e 2 chamadas no pipeline).
  function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    onConfirm(value);
  }

  if (!kind || !config) return null;
  const meta = habitMeta[kind];
  const iconName = HABIT_ICONS[kind];

  function bump(delta: number) {
    const next = Math.max(config!.min, Math.min(config!.max, value + delta));
    setValue(next);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <View style={styles.iconCircle}>
            <Icon name={iconName} size={28} color={theme.colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.title}>{meta.label}</Text>
          {config.tip && <Text style={styles.tip}>{config.tip}</Text>}

          <View style={styles.stepper}>
            <PressableScale onPress={() => bump(-config.step)} style={styles.btnRound} accessibilityLabel="Diminuir">
              <Icon name="x" size={20} color={theme.colors.text} strokeWidth={2.4} />
            </PressableScale>
            <View style={styles.valueWrap}>
              <Text style={styles.value}>{value}</Text>
              <Text style={styles.unit}>{config.unit}{value > 1 && config.unit !== 'min' && config.unit !== 'horas' && config.unit !== 'pág' ? 's' : ''}</Text>
            </View>
            <PressableScale onPress={() => bump(config.step)} style={styles.btnRound} accessibilityLabel="Aumentar">
              <Icon name="plus" size={20} color={theme.colors.text} strokeWidth={2.4} />
            </PressableScale>
          </View>

          <View style={styles.quickRow}>
            {[config.default, config.default * 2, config.max].map(v => (
              <PressableScale
                key={v}
                onPress={() => setValue(v)}
                style={[styles.quickBtn, value === v && styles.quickBtnActive]}
              >
                <Text style={[styles.quickText, value === v && styles.quickTextActive]}>{v}</Text>
              </PressableScale>
            ))}
          </View>

          <View style={styles.actions}>
            <Button variant="secondary" label="Cancelar" style={{ flex: 1 }} onPress={onClose} disabled={submitting} />
            <Button label="Anotar" style={{ flex: 1 }} onPress={handleConfirm} disabled={submitting} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.bg,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
      alignItems: 'center',
      ...theme.shadow.glass,
    },
    dragHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border,
      marginBottom: 4,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primarySoft,
    },
    title: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.4,
    },
    tip: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 13.5,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
      marginTop: theme.spacing.md,
    },
    btnRound: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadow.sm,
    },
    valueWrap: { alignItems: 'center', minWidth: 110, gap: 2 },
    value: {
      fontSize: 56,
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -1.2,
      lineHeight: 60,
    },
    unit: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    quickRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    quickBtn: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minWidth: 52,
      alignItems: 'center',
    },
    quickBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      ...theme.shadow.sm,
    },
    quickText: {
      ...theme.text.sm,
      color: theme.colors.text,
      fontWeight: '700',
      fontFamily: 'PlusJakartaSans_700Bold',
    },
    quickTextActive: { color: '#fff' },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      width: '100%',
      marginTop: theme.spacing.md,
    },
  });
}
