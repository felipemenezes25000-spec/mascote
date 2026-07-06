/**
 * LookManager — UI pra salvar e trocar entre snapshots de customização.
 *
 * Renderiza dentro do /atelier:
 *  - Botão "💾 Salvar como look" → reveal de TextInput inline pra nome
 *  - Lista horizontal de chips com nome dos looks salvos
 *  - Tap em chip → aplica look ao draft (não persiste ainda)
 *  - Long-press em chip → confirma delete
 *  - Aviso quando FIFO substituiria (>= MAX_LOOKS - 1)
 */

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { Typography } from '@/components/ui';
import { MAX_LOOKS_PER_USER, type AtelierLook } from '@/lib/db';
import { exportLook, importLook } from '@/lib/dna/lookShare';
import { LookThumbnail } from './LookThumbnail';
import { t } from '@/lib/i18n';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export interface LookManagerProps {
  looks: AtelierLook[];
  onApply: (look: AtelierLook) => void;
  onSave: (name: string) => Promise<void>;
  onDelete: (lookId: string) => Promise<void>;
  /** Salva look importado direto (snapshot já validado). */
  onImport: (name: string, snapshot: AtelierLook['snapshot']) => Promise<void>;
}

export function LookManager({
  looks,
  onApply,
  onSave,
  onDelete,
  onImport,
}: LookManagerProps) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const [inputOpen, setInputOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleExport = async (look: AtelierLook): Promise<void> => {
    const json = exportLook(look);
    try {
      await Clipboard.setStringAsync(json);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      Alert.alert(
        t('atelier.looks.copied_title'),
        t('atelier.looks.copied_body', look.name),
      );
    } catch (e) {
      Alert.alert(t('atelier.looks.copy_error_title'), String(e instanceof Error ? e.message : e));
    }
  };

  const handleImport = async (): Promise<void> => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) {
        Alert.alert(
          t('atelier.looks.nothing_title'),
          t('atelier.looks.nothing_body'),
        );
        return;
      }
      const result = importLook(text);
      if (!result.ok) {
        Alert.alert(t('atelier.looks.invalid_title'), result.error);
        return;
      }
      await onImport(result.name, result.snapshot);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } catch (e) {
      Alert.alert(t('atelier.looks.import_error_title'), String(e instanceof Error ? e.message : e));
    }
  };

  const atLimit = looks.length >= MAX_LOOKS_PER_USER;

  const handleSave = async (): Promise<void> => {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setInputOpen(false);
      return;
    }
    setSaving(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await onSave(trimmed);
      setName('');
      setInputOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (): void => {
    setName('');
    setInputOpen(false);
  };

  const handleApply = (look: AtelierLook): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onApply(look);
  };

  const handleLongPress = (look: AtelierLook): void => {
    Alert.alert(
      `"${look.name}"`,
      t('atelier.looks.action_prompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('atelier.looks.action_share'),
          onPress: () => void handleExport(look),
        },
        {
          text: t('atelier.looks.action_delete'),
          style: 'destructive',
          onPress: () => {
            void onDelete(look.id);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {looks.map(look => (
          <Pressable
            key={look.id}
            onPress={() => handleApply(look)}
            onLongPress={() => handleLongPress(look)}
            delayLongPress={400}
            style={({ pressed }) => [
              styles.lookChip,
              {
                backgroundColor: theme.colors.surface,
                borderColor: look.is_auto ? theme.colors.border + '88' : theme.colors.border,
                borderStyle: look.is_auto ? 'dashed' : 'solid',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('atelier.looks.apply_a11y', look.name, look.is_auto)}
          >
            <LookThumbnail look={look} size={20} />
            <Typography variant="caption" style={{ fontWeight: '700' }}>
              {look.name}
            </Typography>
          </Pressable>
        ))}
        {!inputOpen ? (
          <>
            <PressableScale
              onPress={() => setInputOpen(true)}
              style={[
                styles.lookChip,
                {
                  backgroundColor: theme.colors.primary + '18',
                  borderColor: theme.colors.primary,
                  borderStyle: 'dashed',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('atelier.looks.save_a11y')}
            >
              <Icon name="plus" size={14} color={theme.colors.primary} strokeWidth={2.5} />
              <Typography
                variant="caption"
                style={{ color: theme.colors.primary, fontWeight: '700' }}
              >
                {t('atelier.looks.save_cta')}
              </Typography>
            </PressableScale>
            <PressableScale
              onPress={() => void handleImport()}
              style={[
                styles.lookChip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderStyle: 'dashed',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('atelier.looks.import_a11y')}
            >
              <Icon name="share" size={14} color={theme.colors.textSecondary} strokeWidth={2} />
              <Typography
                variant="caption"
                style={{ color: theme.colors.textSecondary, fontWeight: '700' }}
              >
                {t('atelier.looks.import_cta')}
              </Typography>
            </PressableScale>
          </>
        ) : null}
      </ScrollView>

      {inputOpen ? (
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('atelier.looks.name_placeholder')}
            placeholderTextColor={theme.colors.textSecondary}
            maxLength={30}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void handleSave()}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          />
          <PressableScale
            onPress={handleCancel}
            hitSlop={6}
            style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Icon name="x" size={16} color={theme.colors.textSecondary} strokeWidth={2.2} />
          </PressableScale>
          <PressableScale
            onPress={() => void handleSave()}
            hitSlop={6}
            style={[styles.iconBtn, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.save')}
          >
            <Icon name="check" size={16} color={theme.tokens.semantic.inkOnBrand} strokeWidth={2.5} />
          </PressableScale>
        </View>
      ) : null}

      {atLimit ? (
        <Typography variant="caption" tone="secondary" style={styles.warn}>
          {t('atelier.looks.limit_warn', MAX_LOOKS_PER_USER)}
        </Typography>
      ) : null}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: {
      gap: theme.spacing.sm,
    },
    row: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    lookChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    input: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      fontFamily: 'PlusJakartaSans_500Medium',
      fontSize: 14,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warn: {
      paddingHorizontal: theme.spacing.md,
      fontStyle: 'italic',
    },
  });
}
