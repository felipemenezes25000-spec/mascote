/**
 * PatternChips — 5 chips horizontais pros padrões visuais do mascote.
 *
 * Cada padrão tem emoji ilustrativo + label PT-BR. Tap dispara haptic light
 * e seleciona — apenas 1 ativo por vez. Modo `plain` significa "respeitar o
 * que o DNA gerou" (sem override).
 */

import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import type { MascotCustomization } from '@/types';

type Pattern = MascotCustomization['preferred_pattern'];

interface PatternOption {
  value: Pattern;
  label: string;
  emoji: string;
}

const OPTIONS: ReadonlyArray<PatternOption> = [
  { value: 'plain', label: 'Liso', emoji: '⚪' },
  { value: 'stripes', label: 'Listras', emoji: '🦓' },
  { value: 'spots', label: 'Pintas', emoji: '🐆' },
  { value: 'fractal', label: 'Fractal', emoji: '🌀' },
  { value: 'cells', label: 'Células', emoji: '🍯' },
];

export interface PatternChipsProps {
  value: Pattern;
  onChange: (next: Pattern) => void;
}

export function PatternChips({ value, onChange }: PatternChipsProps) {
  const handleSelect = (next: Pattern): void => {
    if (next === value) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange(next);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Padrão visual do mascote"
    >
      {OPTIONS.map(opt => {
        const isSelected = value === opt.value;
        return (
          <View key={opt.value} style={styles.item}>
            <Chip
              label={`${opt.emoji}  ${opt.label}`}
              selected={isSelected}
              onPress={() => handleSelect(opt.value)}
              accessibilityRole="radio"
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {},
});
