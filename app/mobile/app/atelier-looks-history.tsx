/**
 * /atelier-looks-history — historico de looks AUTO (weekly snapshots).
 *
 * Por que separado de /atelier:
 *   O carousel de looks no /atelier ja exibe os manuais (cota 5).
 *   Os autos (cota 8) sao snapshots cronologicos da jornada — uma view
 *   linear faz mais sentido pra eles ("voce era assim ha 4 semanas").
 *
 * Funcionalidades:
 *   - Lista chronological reversa dos snapshots auto-criados.
 *   - Cada item: thumbnail (MascotRenderer mini) + caption + data.
 *   - Tap em "Carregar" aplica o snapshot como customizacao ativa
 *     (apos confirm — substitui o atual sem destruir o snapshot).
 *   - Tap em "Apagar" remove o snapshot (apos confirm).
 *
 * Principio "sem culpa": snapshots sao memorias, nao metricas. Nenhuma
 * comparacao "voce piorou" ou "voce melhorou".
 */

import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MascotRenderer } from '@/components/MascotRenderer';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/ui';
import { atelierLooks, customization as customizationDb, type AtelierLook } from '@/lib/db';
import { t } from '@/lib/i18n';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function LooksHistoryScreen() {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const [autoLooks, setAutoLooks] = useState<AtelierLook[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile?.id) return;
    const all = await atelierLooks.list(profile.id);
    setAutoLooks(all.filter(l => l.is_auto === true));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLoad = useCallback(
    async (look: AtelierLook) => {
      if (!profile?.id) return;
      await customizationDb.update(profile.id, look.snapshot);
      router.back();
    },
    [profile?.id],
  );

  const handleDelete = useCallback(
    (look: AtelierLook) => {
      if (!profile?.id) return;
      Alert.alert(
        t('atelier.looks_history.delete_confirm_title'),
        t('atelier.looks_history.delete_confirm_body'),
        [
          { text: t('atelier.actions.cancel'), style: 'cancel' },
          {
            text: t('atelier.looks_history.delete_action'),
            style: 'destructive',
            onPress: () => {
              void atelierLooks.delete(profile.id, look.id).then(refresh);
            },
          },
        ],
      );
    },
    [profile?.id, refresh],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('atelier.looks_history.title')}
        subtitle={t('atelier.looks_history.subtitle')}
        variant="modal"
        onClose={() => router.back()}
      />
      {loading ? (
        <View style={styles.emptyState}>
          <Typography variant="body" tone="secondary">
            {t('atelier.preview.loading')}
          </Typography>
        </View>
      ) : autoLooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Typography variant="body" tone="secondary" align="center">
            {t('atelier.looks_history.empty')}
          </Typography>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={autoLooks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const date = new Date(item.created_at);
            const formatted = date.toLocaleDateString();
            return (
              <View style={[styles.card, { borderColor: theme.colors.border }]}>
                <View style={styles.thumb}>
                  {mascot ? (
                    <MascotRenderer
                      personality={mascot.personality}
                      phase={mascot.phase}
                      mood="ok"
                      size={80}
                      customization={{
                        ...item.snapshot,
                        user_id: profile?.id ?? '',
                        updated_at: item.created_at,
                      }}
                      reduceMotion
                    />
                  ) : null}
                </View>
                <View style={styles.meta}>
                  <Typography variant="bodyBold">{item.name}</Typography>
                  <Typography variant="caption" tone="secondary">
                    {formatted}
                  </Typography>
                </View>
                <View style={styles.actions}>
                  <PressableScale
                    onPress={() => void handleLoad(item)}
                    style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('atelier.looks_history.load')}
                  >
                    <Typography variant="caption" style={{ color: theme.tokens.semantic.inkOnBrand }}>
                      {t('atelier.looks_history.load')}
                    </Typography>
                  </PressableScale>
                  <PressableScale
                    onPress={() => handleDelete(item)}
                    style={[styles.actionBtn, { borderColor: theme.colors.border, borderWidth: 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('atelier.looks_history.delete_action')}
                  >
                    <Typography variant="caption" tone="secondary">
                      {t('atelier.looks_history.delete_action')}
                    </Typography>
                  </PressableScale>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    list: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
    },
    thumb: {
      width: 88,
      height: 88,
      alignItems: 'center',
      justifyContent: 'center',
    },
    meta: {
      flex: 1,
      gap: 4,
    },
    actions: {
      flexDirection: 'column',
      gap: 6,
    },
    actionBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
    },
  });
}
