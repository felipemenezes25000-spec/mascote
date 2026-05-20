import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { PaywallCard } from '@/components/ui';
import type { ArchetypeKey } from '@/lib/themes';
import type { Personality } from '@/types';
import { getTier } from '@/content/billing';
import { modifiersToVisuals } from '@/game/evolution/PhenotypeRenderer';
import { buildEvolutionState } from '@/game/evolution/EvolutionEngine';
import { checkins as checkinsDb } from '@/lib/db';
import { copyFor, type PaywallTrigger } from '@/lib/paywall-triggers';
import { validateBillingEnv } from '@/lib/billing-config';
import { isAiProxyConfigured } from '@/ai/ProxyMascotAI';
import { subscriptionService } from '@/services/subscription';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { BillingTierId } from '@/content/billing';

const PERSONALITY_TO_ARCHETYPE: Record<Personality, ArchetypeKey> = {
  calmo: 'contemplativo',
  motivador: 'explorador',
  fofo: 'brincalhao',
  sabio: 'sabio',
};

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
  const billingEnv = useMemo(() => validateBillingEnv(), []);
  const isPremium = subscriptionService.isPremium(tier);
  const purchaseBlocked = !billingEnv.canPurchase && !isPremium;

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    void subscriptionService.getCurrentTier(profile.id).then(t => {
      if (alive) setTier(t);
    });
    return () => {
      alive = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile || !mascot) return;
    let alive = true;
    void (async () => {
      const all = await checkinsDb.listAll(profile.id);
      if (!alive) return;
      const state = buildEvolutionState({ mascot, checkins: all, streak });
      setBeforeVisuals(modifiersToVisuals(state.phenotype.displayModifiers));
      setAfterVisuals(modifiersToVisuals({
        ...state.phenotype.displayModifiers,
        glowMultiplier: state.phenotype.displayModifiers.glowMultiplier + 0.15,
        auraParticleBoost: state.phenotype.displayModifiers.auraParticleBoost + 0.12,
        activeEnergy: true,
      }));
    })();
    return () => {
      alive = false;
    };
  }, [profile?.id, mascot, streak]);

  async function handleSubscribe(selected: BillingTierId) {
    if (!profile || purchaseBlocked) return;
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

        <View style={styles.modeBanner} accessibilityRole="text">
          <Text style={styles.modeLabel}>{billingEnv.label}</Text>
          <Text style={styles.modeDetail}>{billingEnv.detail}</Text>
        </View>

        {/* Disclosure honesto: se o proxy de IA ainda não foi configurado nessa
            build, falamos isso na cara. Promessa "IA emocional ilimitada"
            sem proxy = IA local. Honestidade > conversão suja. */}
        {!isAiProxyConfigured() ? (
          <View style={styles.disclosure} accessibilityRole="text">
            <Text style={styles.disclosureLabel}>Sobre a IA Plus nesta build</Text>
            <Text style={styles.disclosureDetail}>
              Esta versão usa IA local (sem cloud). A IA cloud com personalidade chega
              na próxima atualização — sem custo extra pra quem já é Plus.
            </Text>
          </View>
        ) : null}

        <Text style={styles.kicker}>BIPO PLUS</Text>
        <Text style={styles.title}>{triggerCopy.title}</Text>
        <Text style={styles.sub}>{triggerCopy.body}</Text>

        {/* PaywallCard emocional alinhado a arquétipo da personalidade —
            mostra "antes/depois" em duas colunas com CTA destacado. */}
        <PaywallCard
          archetype={PERSONALITY_TO_ARCHETYPE[mascot?.personality ?? 'fofo']}
          beforeTitle="Hoje"
          beforeBody="Cuidados básicos, evolução natural."
          afterTitle="Com Plus"
          afterBody="Mascote 3D completo, mutações raras, IA emocional, sem limite."
          ctaLabel={isPremium ? 'Continuar como Plus' : `Começar ${annual.trialDays} dias grátis`}
          onPress={() => void handleSubscribe('plus_annual')}
          helper={purchaseBlocked ? 'Configure RevenueCat antes de cobrar.' : undefined}
        />

        <View style={styles.featureList}>
          {monthly.benefits.map(f => (
            <Text key={f} style={styles.feature}>✓  {f}</Text>
          ))}
        </View>

        <View style={styles.plansWrap}>
          <Pressable
            style={[styles.plan, styles.planHighlight]}
            onPress={() => void handleSubscribe('plus_annual')}
            disabled={loading || isPremium || purchaseBlocked}
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
            disabled={loading || isPremium || purchaseBlocked}
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
            disabled={loading || purchaseBlocked}
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
          {billingEnv.mode === 'demo'
            ? 'Modo demo — pagamento simulado localmente. Cancele quando quiser.'
            : billingEnv.mode === 'production_misconfigured'
              ? 'Produção: configure RevenueCat e o SDK nativo antes de cobrar.'
              : 'Produção: variáveis OK; aguardando SDK nativo para cobrança real.'}
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
  badgeText: { color: theme.tokens.semantic.inkOnBrand, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planTitle: { ...theme.text.bodyBold, color: theme.colors.text },
  planPrice: { ...theme.text.h3, color: theme.colors.primary, marginTop: 4 },
  planSub: { ...theme.text.xs, color: theme.colors.textSecondary },
  premiumActive: { textAlign: 'center', ...theme.text.bodyBold, color: theme.colors.primary },
  ghost: { textAlign: 'center', ...theme.text.body, color: theme.colors.textSecondary, paddingVertical: theme.spacing.md },
  legal: { ...theme.text.xs, color: theme.colors.textDim, textAlign: 'center', lineHeight: 16 },
  kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' },
  modeBanner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 4,
  },
  modeLabel: { ...theme.text.bodyBold, color: theme.colors.text, textAlign: 'center' },
  modeDetail: { ...theme.text.xs, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 16 },
  disclosure: {
    backgroundColor: theme.colors.warning + '14',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + '40',
    padding: theme.spacing.md,
    gap: 4,
  },
  disclosureLabel: { ...theme.text.bodyBold, color: theme.colors.text, textAlign: 'center' },
  disclosureDetail: { ...theme.text.xs, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 16 },
});
}
