/**
 * BlendPanel — UI pra combinar 2 ThemePresets em proporção variável.
 *
 * Layout:
 *   [Chip A]  ←————●————→  [Chip B]
 *                 0.5
 *   [ Aplicar blend ]
 *
 * Tap em chip → menu com lista de presets pra escolher A ou B.
 * Slider 0-1 mostra "intensidade" do mix (0 = só A, 1 = só B, 0.5 = igual).
 * "Aplicar" chama callback com result de blendPresets(A, B, t).
 *
 * Default: A = primeiro preset, B = segundo. Slider em 0.5.
 *
 * Por que separar do ThemePresetChips: presets aplicados isoladamente
 * são "stamps" diretos. Blend é uma operação composta, merece UI dedicada.
 */

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { RangeSlider } from '@/components/RangeSlider';
import { Typography } from '@/components/ui';
import { Chip } from '@/components/ui/Chip';
import {
  blendPresets,
  findPreset,
  THEME_PRESETS,
  type ThemePreset,
} from '@/lib/dna/themePresets';
import { t } from '@/lib/i18n';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { MascotCustomization } from '@/types';

type DraftFields = Omit<MascotCustomization, 'user_id' | 'updated_at'>;

export interface BlendPanelProps {
  /** Callback com result do blend pronto pra aplicar no draft. */
  onApply: (blended: DraftFields) => void;
}

export function BlendPanel({ onApply }: BlendPanelProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [aId, setAId] = useState<string>(THEME_PRESETS[0].id);
  const [bId, setBId] = useState<string>(THEME_PRESETS[1]?.id ?? THEME_PRESETS[0].id);
  // `mix` é o slider 0..1 (0 = só A, 1 = só B). Antes era `t`, renomeado
  // pra liberar o nome global de i18n helper t() sem shadow.
  const [mix, setMix] = useState<number>(0.5);

  const presetA = findPreset(aId) ?? THEME_PRESETS[0];
  const presetB = findPreset(bId) ?? THEME_PRESETS[1] ?? THEME_PRESETS[0];

  const pickPreset = (slot: 'A' | 'B'): void => {
    const currentId = slot === 'A' ? aId : bId;
    Alert.alert(
      `Preset ${slot}`,
      t('atelier.blend.pick_prompt'),
      [
        ...THEME_PRESETS.map(p => ({
          text: `${p.emoji}  ${p.label}${p.id === currentId ? ' ✓' : ''}`,
          onPress: () => {
            if (slot === 'A') setAId(p.id);
            else setBId(p.id);
          },
        })),
        { text: t('atelier.actions.cancel'), style: 'cancel' as const },
      ],
    );
  };

  const handleApply = (): void => {
    if (presetA.id === presetB.id) {
      // Mesmo preset dos dois lados → aplicação direta sem blend.
      onApply({ ...({} as DraftFields), ...(presetA.patch as Partial<DraftFields>) } as DraftFields);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      return;
    }
    const blended = blendPresets(presetA, presetB, mix);
    onApply(blended);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.chipsRow}>
        <View style={styles.chipWrap}>
          <Typography variant="caption" tone="secondary" style={styles.slotLabel}>
            A
          </Typography>
          <PressableScale
            onPress={() => pickPreset('A')}
            accessibilityRole="button"
            accessibilityLabel={t('atelier.blend.a11y_pick_slot', 'A', presetA.label)}
          >
            <Chip label={`${presetA.emoji}  ${presetA.label}`} selected />
          </PressableScale>
        </View>

        <Icon
          name="arrow-right"
          size={14}
          color={theme.colors.textSecondary}
          strokeWidth={2}
        />

        <View style={styles.chipWrap}>
          <Typography variant="caption" tone="secondary" style={styles.slotLabel}>
            B
          </Typography>
          <PressableScale
            onPress={() => pickPreset('B')}
            accessibilityRole="button"
            accessibilityLabel={t('atelier.blend.a11y_pick_slot', 'B', presetB.label)}
          >
            <Chip label={`${presetB.emoji}  ${presetB.label}`} selected />
          </PressableScale>
        </View>
      </View>

      <View style={styles.sliderWrap}>
        <RangeSlider
          label={t('atelier.blend.slider_label')}
          hint={t('atelier.blend.slider_hint', presetA.label, presetB.label)}
          value={mix}
          min={0}
          max={1}
          defaultValue={0.5}
          format={v => `${Math.round(v * 100)}%`}
          onChange={setMix}
        />
      </View>

      <PressableScale
        onPress={handleApply}
        style={[
          styles.applyBtn,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('atelier.blend.a11y_apply')}
      >
        <Icon
          name="sparkles"
          size={16}
          color={theme.tokens.semantic.inkOnBrand}
          strokeWidth={2.2}
        />
        <Typography
          variant="bodyBold"
          style={{ color: theme.tokens.semantic.inkOnBrand }}
        >
          {t('atelier.blend.apply')}
        </Typography>
      </PressableScale>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    chipsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.sm,
      justifyContent: 'center',
    },
    chipWrap: {
      alignItems: 'center',
      gap: 4,
    },
    slotLabel: {
      fontFamily: 'JetBrainsMono_500Medium',
      fontSize: 10,
      letterSpacing: 1,
    },
    sliderWrap: {
      paddingHorizontal: 0,
    },
    applyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      marginTop: theme.spacing.xs,
    },
  });
}
