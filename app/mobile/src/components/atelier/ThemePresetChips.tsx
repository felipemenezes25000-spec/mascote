/**
 * ThemePresetChips — atalhos de aparência ("Kawaii", "Robusto", etc).
 *
 * Tap aplica preset sobre o draft. Estilo similar a PatternChips mas com
 * descrição maior + uses ThemePreset catalog.
 */

import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { THEME_PRESETS, type ThemePreset } from '@/lib/dna/themePresets';

export interface ThemePresetChipsProps {
  /** Preset atualmente "match" (pra highlight selected). */
  activePresetId?: string;
  onSelect: (preset: ThemePreset) => void;
}

export function ThemePresetChips({ activePresetId, onSelect }: ThemePresetChipsProps) {
  const handleSelect = (preset: ThemePreset): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onSelect(preset);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Presets de aparência do mascote"
    >
      {THEME_PRESETS.map(preset => (
        <View key={preset.id} style={styles.item}>
          <Chip
            label={`${preset.emoji}  ${preset.label}`}
            selected={activePresetId === preset.id}
            onPress={() => handleSelect(preset)}
          />
        </View>
      ))}
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
