import { router, Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { addDays, settings as settingsDb, todayLocal } from '@/lib/db';
import { subscriptionService } from '@/services/subscription/SubscriptionService';
import { t } from '@/lib/i18n';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
export default function Cancel() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshSettings = useStore(s => s.refreshSettings);
  const [step, setStep] = useState<'main' | 'pause' | 'confirm'>('main');

  async function pause30() {
    if (!profile) return;
    const until = addDays(todayLocal(), 30);
    await settingsDb.update(profile.id, { paused_until: until });
    await refreshSettings();
    setStep('pause');
  }

  async function switchToFree() {
    if (!profile) return;
    // Confirma antes de cancelar — sem isso, um tap acidental no card já
    // baixava o plano sem segunda chance e o usuário descobria só quando
    // tentava usar feature Plus. Padrão consistente com confirmDelete em
    // settings.tsx (dialog destrutivo sempre exige confirmação explícita).
    Alert.alert(
      t('cancel.switch_confirm_title'),
      t('cancel.switch_confirm_body'),
      [
        { text: t('cancel.switch_keep_plus'), style: 'cancel' },
        {
          text: t('cancel.free_cta'),
          style: 'destructive',
          onPress: async () => {
            if (!profile) return;
            try {
              // ANTES: chamava `mockBillingProvider.cancel` direto, ignorando
              // qual provider (RevenueCat em prod) esta ativo — risco "cancelei
              // mas continuo cobrando". subscriptionService delega pro provider
              // correto + dispara analytics + serializa via withLock.
              await subscriptionService.cancel(profile.id);
              // Em produção (RevenueCat ligado) NÃO existe cancelamento
              // programático: cancel() reconcilia com o entitlement real e o
              // acesso pago PERMANECE até a loja expirar. Dizer "voltou pro Free"
              // aqui seria mentira — e exatamente o footgun "cancelei mas continuo
              // sendo cobrado". Se o tier seguiu premium, manda pro gerenciador da
              // loja (step 'confirm'). Só mostra "voltou pro Free" quando o
              // downgrade local de fato ocorreu (stub/demo sem loja real).
              const tier = await subscriptionService.getCurrentTier(profile.id);
              if (tier !== 'free') {
                setStep('confirm');
                return;
              }
              await refreshSettings();
              Alert.alert(t('cancel.free_done_title'), t('cancel.free_done_body'));
              router.back();
            } catch {
              Alert.alert(t('cancel.err_title'), t('cancel.err_body'));
            }
          },
        },
      ],
    );
  }

  if (!profile || !mascot) return <Redirect href="/splash" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Typography variant="body" style={styles.closeText}>✕</Typography>
          </Pressable>
          <Typography variant="body" style={styles.kicker}>{t('cancel.kicker')}</Typography>
          <View style={{ width: 36 }} />
        </View>

        {step === 'main' && (
          <>
            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <Mascot personality={mascot.personality} phase={mascot.phase} mood="triste" size={140} />
              <Typography variant="body" style={styles.title}>{t('cancel.main_title')}</Typography>
              <Typography variant="body" style={styles.subtitle}>
                {t('cancel.main_sub', mascot.name)}
              </Typography>
            </View>

            <View style={styles.card}>
              <Typography variant="body" style={styles.cardTitle}>{t('cancel.pause_card_title')}</Typography>
              <Typography variant="body" style={styles.cardBody}>
                {t('cancel.pause_card_body')}
              </Typography>
              <Button label={t('cancel.pause_cta')} onPress={pause30} />
            </View>

            <View style={styles.card}>
              <Typography variant="body" style={styles.cardTitle}>{t('cancel.free_card_title')}</Typography>
              <Typography variant="body" style={styles.cardBody}>
                {t('cancel.free_card_body')}
              </Typography>
              <Button variant="secondary" label={t('cancel.free_cta')} onPress={() => void switchToFree()} />
            </View>

            <Pressable
              onPress={() => setStep('confirm')}
              accessibilityRole="button"
              accessibilityLabel={t('cancel.cancel_anyway')}
            >
              <Typography variant="body" style={styles.cancelDestructive}>{t('cancel.cancel_anyway')}</Typography>
            </Pressable>
          </>
        )}

        {step === 'pause' && (
          <View style={{ alignItems: 'center', gap: theme.spacing.lg, paddingVertical: theme.spacing.xl }}>
            <Mascot personality={mascot.personality} phase={mascot.phase} mood="exausto" size={150} />
            <Typography variant="body" style={styles.title}>{t('cancel.pause_done_title', mascot.name)}</Typography>
            <Typography variant="body" style={styles.subtitle}>{t('cancel.pause_done_body')}</Typography>
            <Button label={t('common.ok')} onPress={() => router.replace('/(tabs)')} />
          </View>
        )}

        {step === 'confirm' && (
          <View style={{ gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
            <Typography variant="body" style={styles.title}>{t('cancel.confirm_title')}</Typography>
            <Typography variant="body" style={styles.subtitle}>
              {t('cancel.confirm_body', Platform.OS === 'ios' ? 'App Store' : 'Google Play')}
            </Typography>
            <Button
              label={Platform.OS === 'ios' ? t('cancel.open_ios') : t('cancel.open_android')}
              onPress={async () => {
                // iOS: https://apps.apple.com/account/subscriptions abre direto
                // o gerenciador no aplicativo da App Store (deep link oficial
                // Apple). Android: account/subscriptions tem comportamento
                // equivalente no Play Store.
                const url =
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com/account/subscriptions'
                    : 'https://play.google.com/store/account/subscriptions';
                try {
                  const can = await Linking.canOpenURL(url);
                  if (can) await Linking.openURL(url);
                  else throw new Error('cannot open');
                } catch {
                  Alert.alert(
                    t('cancel.open_fail_title'),
                    Platform.OS === 'ios'
                      ? t('cancel.open_fail_ios')
                      : t('cancel.open_fail_android'),
                  );
                }
              }}
            />
            <Button variant="secondary" label={t('common.back')} onPress={() => router.back()} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 16, color: theme.colors.text },
    kicker: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '800', letterSpacing: 1 },
    title: { ...theme.text.h2, color: theme.colors.text, textAlign: 'center' },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center' },
    card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.sm },
    cardTitle: { ...theme.text.h3, color: theme.colors.text },
    cardBody: { ...theme.text.sm, color: theme.colors.textSecondary, lineHeight: 20 },
    cancelDestructive: { textAlign: 'center', ...theme.text.body, color: theme.colors.error, paddingVertical: theme.spacing.md, fontWeight: '600' },
  });
}
