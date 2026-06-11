import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { formatBRL, formatPerMonth, getTier } from '@/content/billing';
import { useTheme } from '@/lib/useTheme';
import { makeShadow } from '@/lib/themes';
import { useStore } from '@/store';
import { restorePurchasesService } from '@/services/subscription/RestorePurchasesService';
import { isDemoBilling } from '@/services/subscription';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
export default function SubscriptionActive() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const badgePulse = useSharedValue(0.6);
  const demoBilling = isDemoBilling();
  const monthly = getTier('plus_monthly');
  const annual = getTier('plus_annual');
  // Tier REAL do usuário (reativo no foco). Antes o card "PLANO ATUAL" hardcodava
  // `free`, então um assinante Plus via "Grátis" como plano atual.
  const { tier: currentTierId, isPremium } = useSubscriptionTier();
  const currentTier = getTier(currentTierId);
  const profile = useStore(s => s.profile);
  const enqueueToast = useStore(s => s.enqueueToast);
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    if (!profile || restoring) return;
    setRestoring(true);
    try {
      // O service persiste o tier em localSubscriptionRepo internamente.
      // Aqui só precisamos refletir o resultado via toast/Alert — telas que
      // dependem do tier o re-leem ao montar (getCurrentTier).
      const result = await restorePurchasesService.restore(profile.id);
      if (result.success) {
        enqueueToast({
          kind: 'info',
          emoji: '✨',
          title: 'Compras restauradas',
          subtitle: result.message,
        });
      } else {
        Alert.alert('Restaurar compras', result.message);
      }
    } finally {
      setRestoring(false);
    }
  }

  useEffect(() => {
    badgePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.6, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(badgePulse);
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({ opacity: badgePulse.value }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="modal" title="Assinatura" subtitle="planos do Mascote" />
      <ScrollView contentContainerStyle={styles.container}>
        <StaggeredView index={0}>
          <View style={styles.card}>
            <Typography variant="body" style={styles.label}>
              {demoBilling ? 'PLANO ATUAL (DEMO)' : 'PLANO ATUAL'}
            </Typography>
            <Typography variant="body" style={styles.planName}>{currentTier.name}</Typography>
            <Typography variant="body" style={styles.price}>{formatPerMonth(currentTier)}</Typography>
            {demoBilling && (
              <Typography variant="body" style={styles.note}>
                Esta build usa billing demo — nenhuma cobrança real ocorre.
              </Typography>
            )}
            {isPremium && (
              <Typography variant="body" style={styles.note}>
                Você é Plus 💛 — obrigado por cuidar de você (e de mim) por aqui.
              </Typography>
            )}
            {currentTier.benefits.map(b => <Benefit key={b} text={b} />)}
          </View>
        </StaggeredView>

        <StaggeredView index={1}>
          <View style={[styles.card, styles.cardHighlight]}>
            <LinearGradient
              colors={[theme.colors.primary + '14', theme.colors.surface, theme.colors.surface]}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.recommendedBadge, badgeStyle]}>
              <Icon name="crown" size={11} color="#fff" strokeWidth={2.2} fill="#fff" />
              <Typography variant="body" style={styles.recommendedText}>{annual.badge ?? 'RECOMENDADO'}</Typography>
            </Animated.View>
            <Typography variant="body" style={styles.planName}>{annual.name}</Typography>
            <Typography variant="body" style={styles.price}>
              {formatBRL(annual.monthlyCents)}/mês · {formatBRL(annual.totalCents)}/ano
            </Typography>
            {annual.benefits.map(b => <Benefit key={b} text={b} />)}
            <Button label={`Começar trial ${annual.trialDays} dias`} onPress={() => router.push('/paywall')} />
          </View>
        </StaggeredView>

        <StaggeredView index={2}>
          <View style={styles.card}>
            <Typography variant="body" style={styles.planName}>{monthly.name} Mensal</Typography>
            <Typography variant="body" style={styles.price}>{formatBRL(monthly.totalCents)}/mês</Typography>
            <Typography variant="body" style={styles.note}>Trial {monthly.trialDays} dias.</Typography>
            {monthly.benefits.map(b => <Benefit key={b} text={b} />)}
          </View>
        </StaggeredView>

        {/* Restaurar compras — exigência Apple Store Guideline 3.1.1. Service
            existe (restorePurchasesService) e cobre demo + production; faltava
            só o ponto de entrada na UI. Auditoria 2026-05-27. */}
        <PressableScale
          onPress={handleRestore}
          style={styles.restoreLink}
          disabled={restoring || !profile}
          accessibilityRole="button"
          accessibilityLabel="Restaurar compras anteriores"
        >
          <Typography variant="body" style={styles.restoreText}>
            {restoring ? 'Restaurando…' : 'Restaurar compras'}
          </Typography>
        </PressableScale>

        <PressableScale
          onPress={() => router.push('/cancel')}
          style={styles.cancelLink}
          accessibilityRole="button"
          accessibilityLabel="Pausar ou cancelar assinatura"
        >
          <Typography variant="body" style={styles.cancelText}>Pausar ou cancelar</Typography>
        </PressableScale>
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ text }: { text: string }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitCheck}>
        <Icon name="check" size={11} color={theme.colors.success} strokeWidth={3} />
      </View>
      <Typography variant="body" style={styles.benefit}>{text}</Typography>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    card: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
      ...theme.shadow.sm,
    },
    cardHighlight: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      position: 'relative',
      ...makeShadow(theme.colors.primary, 0, 8, 32, 0.18, 6),
    },
    recommendedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radius.pill,
      marginBottom: 4,
    },
    recommendedText: {
      color: '#fff',
      fontWeight: '800',
      letterSpacing: 1,
      fontSize: 10,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    label: {
      fontSize: 10,
      color: theme.colors.textDim,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    planName: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.5,
    },
    price: {
      color: theme.colors.primary,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.3,
    },
    note: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
    },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
    benefitCheck: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.success + '18',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.success + '40',
    },
    benefit: {
      ...theme.text.sm,
      color: theme.colors.text,
      flex: 1,
    },
    restoreLink: { paddingVertical: theme.spacing.sm, alignItems: 'center' },
    restoreText: {
      ...theme.text.body,
      color: theme.colors.text,
      fontWeight: '700',
    },
    cancelLink: { paddingVertical: theme.spacing.md, alignItems: 'center' },
    cancelText: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });
}
