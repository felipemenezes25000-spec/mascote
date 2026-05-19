import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { getTier } from '@/content/billing';
import { modifiersToVisuals } from '@/game/evolution/PhenotypeRenderer';
import { buildEvolutionState } from '@/game/evolution/EvolutionEngine';
import { checkins as checkinsDb } from '@/lib/db';
import { copyFor, type PaywallTrigger } from '@/lib/paywall-triggers';
import { subscriptionService } from '@/services/subscription';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { BillingTierId } from '@/content/billing';

export default function Paywall() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const { trigger: triggerParam } = useLocalSearchParams<{ trigger?: string }>();
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const [tier, setTier] = useState<BillingTierId>('free');
  const [loading, setLoading] = useState(false);
  const [beforeVisuals, setBeforeVisuals] = useState<ReturnType<typeof modifiersToVisuals> | null>(null);
  const [afterVisuals, setAfterVisuals] = useState<ReturnType<typeof modifiersToVisuals> | null>(null);

  const annual = getTier('plus_annual');
  const monthly = getTier('plus_monthly');

  useEffect(() => {
    if (!profile) return;
    void subscriptionService.getCurrentTier(profile.id).then(setTier);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile || !mascot) return;
    void (async () => {
      const all = await checkinsDb.listAll(profile.id);
      const state = buildEvolutionState({ mascot, checkins: all, streak });
      setBeforeVisuals(modifiersToVisuals(state.phenotype.displayModifiers));
      setAfterVisuals(modifiersToVisuals({
        ...state.phenotype.displayModifiers,
        glowMultiplier: state.phenotype.displayModifiers.glowMultiplier + 0.15,
        auraParticleBoost: state.phenotype.displayModifiers.auraParticleBoost + 0.12,
        activeEnergy: true,
      }));
    })();
  }, [profile?.id, mascot, streak]);

  async function handleSubscribe(selected: BillingTierId) {
    if (!profile) return;
    setLoading(true);
    try {
      const result = await subscriptionService.subscribe(profile.id, selected);
      if (result.success) {
        const next = await subscriptionService.getCurrentTier(profile.id);
        setTier(next);
        router.back();
        return;
      }
      Alert.alert(
        'Assinatura indisponível',
        result.error ?? 'Não foi possível concluir a compra. Tente de novo ou use o modo demo.',
      );
    } finally {
      setLoading(false);
    }
  }

  const isPremium = subscriptionService.isPremium(tier);

  const triggerCopy = useMemo(() => {
    const valid: PaywallTrigger[] = [
      'first_evolution', 'streak_7', 'level_5', 'checkin_30',
      'first_box_opened', 'premium_feature', 'rare_evolution',
    ];
    const id = valid.includes(triggerParam as PaywallTrigger)
      ? (triggerParam as PaywallTrigger)
      : 'premium_feature';
    return copyFor(id, mascot?.name ?? 'Seu mascote');
  }, [triggerParam, mascot?.name]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={10} accessibilityLabel="Fechar">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <View style={styles.previewRow}>
          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>Agora</Text>
            <Mascot
              personality={mascot?.personality ?? 'fofo'}
              phase={mascot?.phase ?? 'bebe'}
              mood="ok"
              size={120}
              evolutionVisuals={beforeVisuals}
              reduceMotion
            />
          </View>
          <Text style={styles.previewArrow}>→</Text>
          <View style={styles.previewCol}>
            <Text style={styles.previewLabel}>Com Plus</Text>
            <Mascot
              personality={mascot?.personality ?? 'fofo'}
              phase={mascot?.phase ?? 'adulto'}
              mood="empolgado"
              size={120}
              evolutionVisuals={afterVisuals}
              reduceMotion
            />
          </View>
        </View>

        <Text style={styles.kicker}>BIPO PLUS</Text>
        <Text style={styles.title}>{triggerCopy.title}</Text>
        <Text style={styles.sub}>{triggerCopy.body}</Text>

        <View style={styles.featureList}>
          {monthly.benefits.map(f => (
            <Text key={f} style={styles.feature}>✓  {f}</Text>
          ))}
        </View>

        <View style={styles.plansWrap}>
          <Pressable
            style={[styles.plan, styles.planHighlight]}
            onPress={() => void handleSubscribe('plus_annual')}
            disabled={loading || isPremium}
          >
            {annual.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{annual.badge}</Text>
              </View>
            )}
            <Text style={styles.planTitle}>Anual</Text>
            <Text style={styles.planPrice}>R$ {(annual.totalCents / 100).toFixed(0)}/ano</Text>
            <Text style={styles.planSub}>
              R$ {(annual.monthlyCents / 100).toFixed(2).replace('.', ',')}/mês · {annual.savingsPct}% off
            </Text>
          </Pressable>
          <Pressable
            style={styles.plan}
            onPress={() => void handleSubscribe('plus_monthly')}
            disabled={loading || isPremium}
          >
            <Text style={styles.planTitle}>Mensal</Text>
            <Text style={styles.planPrice}>R$ {(monthly.totalCents / 100).toFixed(2).replace('.', ',')}/mês</Text>
            <Text style={styles.planSub}>Trial {monthly.trialDays} dias grátis</Text>
          </Pressable>
        </View>

        {isPremium ? (
          <Text style={styles.premiumActive}>Você já é Plus ✨</Text>
        ) : (
          <Button
            label={loading ? 'Processando...' : `Começar ${annual.trialDays} dias grátis`}
            onPress={() => void handleSubscribe('plus_annual')}
            disabled={loading}
          />
        )}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Continuar com versão grátis"
        >
          <Text style={styles.ghost}>Fico com a versão grátis por enquanto</Text>
        </Pressable>

        <Text style={styles.legal}>
          Demo local — pagamento simulado. Cancele quando quiser.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  close: {
    alignSelf: 'flex-end',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.border,
  },
  closeText: { fontSize: 16, color: theme.colors.text },
  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  previewCol: { alignItems: 'center', gap: 4 },
  previewLabel: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '700' },
  previewArrow: { fontSize: 20, color: theme.colors.primary },
  title: { ...theme.text.h1, color: theme.colors.text, textAlign: 'center' },
  sub: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center' },
  featureList: { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md },
  feature: { ...theme.text.body, color: theme.colors.text },
  plansWrap: { flexDirection: 'row', gap: theme.spacing.md },
  plan: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  planHighlight: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primary + '0A',
  },
  badge: {
    position: 'absolute', top: -10, left: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm, paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planTitle: { ...theme.text.bodyBold, color: theme.colors.text },
  planPrice: { ...theme.text.h3, color: theme.colors.primary, marginTop: 4 },
  planSub: { ...theme.text.xs, color: theme.colors.textSecondary },
  premiumActive: { textAlign: 'center', ...theme.text.bodyBold, color: theme.colors.primary },
  ghost: { textAlign: 'center', ...theme.text.body, color: theme.colors.textSecondary, paddingVertical: theme.spacing.md },
  legal: { ...theme.text.xs, color: theme.colors.textDim, textAlign: 'center', lineHeight: 16 },
  kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' },
});
}
