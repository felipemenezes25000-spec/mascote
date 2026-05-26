/**
 * /atelier-settings — preferências do Atelier.
 *
 * Tela pequena com 2 toggles:
 *  - Resetar tutorial: remove flag atelier_onboarded — wizard reaparece
 *  - Desabilitar snapshot semanal: não cria looks "Semana N (auto)"
 *
 * Acessível via link no LookManager ou debug menu. Não tem botão de save —
 * cada toggle persiste imediato.
 */

import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader } from '@/components/ScreenHeader';
import { HideToggleRow } from '@/components/atelier/HideToggleRow';
import { SectionHeader, Typography } from '@/components/ui';
import { settings as settingsDb } from '@/lib/db';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const ONBOARDED_KEY = 'mascote:atelier_onboarded:v1';

export default function AtelierSettings() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const settings = useStore(s => s.settings);
  const refreshSettings = useStore(s => s.refreshSettings);

  const [onboardedFlag, setOnboardedFlag] = useState<boolean>(false);

  useEffect(() => {
    void AsyncStorage.getItem(ONBOARDED_KEY).then(raw => setOnboardedFlag(raw === 'true'));
  }, []);

  const handleResetOnboarding = async (): Promise<void> => {
    Alert.alert(
      'Resetar tutorial?',
      'O wizard de boas-vindas vai aparecer da próxima vez que você abrir o Atelier.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          onPress: async () => {
            await AsyncStorage.removeItem(ONBOARDED_KEY);
            setOnboardedFlag(false);
          },
        },
      ],
    );
  };

  const handleToggleSnapshot = async (): Promise<void> => {
    if (!profile) return;
    const current = settings?.atelier_disable_weekly_snapshot ?? false;
    await settingsDb.update(profile.id, {
      atelier_disable_weekly_snapshot: !current,
    });
    await refreshSettings();
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Ateliê" variant="back" />
      </SafeAreaView>
    );
  }

  const snapshotDisabled = settings?.atelier_disable_weekly_snapshot ?? false;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Preferências"
        subtitle="comportamento do Ateliê"
        variant="back"
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader title="Tutorial" />
        <View style={styles.section}>
          <HideToggleRow
            label="Resetar tutorial do Ateliê"
            description={
              onboardedFlag
                ? 'O wizard de boas-vindas vai reaparecer na próxima visita.'
                : 'Wizard já marcado como não-visto.'
            }
            hidden={!onboardedFlag}
            onChange={() => {
              if (onboardedFlag) void handleResetOnboarding();
            }}
          />
          <Typography variant="caption" tone="dim" style={styles.hint}>
            O toggle só faz algo se você já tinha visto o tutorial antes.
          </Typography>
        </View>

        <SectionHeader title="Snapshots automáticos" />
        <View style={styles.section}>
          <HideToggleRow
            label="Desabilitar snapshot semanal"
            description={
              snapshotDisabled
                ? 'Looks "Semana N (auto)" não serão criados automaticamente.'
                : 'A cada 7 dias, um look "Semana N (auto)" é criado em background.'
            }
            hidden={snapshotDisabled}
            onChange={() => void handleToggleSnapshot()}
          />
          <Typography variant="caption" tone="dim" style={styles.hint}>
            Snapshots automáticos têm cota separada — não competem com seus
            looks manuais. Desabilitar não apaga snapshots já criados.
          </Typography>
        </View>

        <View style={styles.footer}>
          <Typography variant="caption" tone="secondary" align="center">
            Outras preferências (tema, contraste, etc) ficam em Configurações.
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    scroll: {
      paddingBottom: theme.spacing.xxl,
    },
    section: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    hint: {
      paddingHorizontal: theme.spacing.md,
      fontStyle: 'italic',
    },
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
    },
  });
}
