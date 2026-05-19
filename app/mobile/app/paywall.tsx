import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { getTier } from '@/content/billing';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function Paywall() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const mascot = useStore(s => s.mascot);

  const annual = getTier('plus_annual');
  const monthly = getTier('plus_monthly');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.close} hitSlop={10} accessibilityLabel="Fechar">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <View style={styles.mascotWrap}>
          <Mascot
            personality={mascot?.personality ?? 'fofo'}
            phase="adolescente"
            mood="empolgado"
            size={180}
          />
        </View>

        <Text style={styles.kicker}>BIPO PLUS</Text>
        <Text style={styles.title}>Bipo ainda tá aprendendo.{"\n"}Quer crescer junto?</Text>
        <Text style={styles.sub}>
          Você cuida de você 30s por dia. A gente cuida do resto. Sem ranking, sem cobrança, sem culpa — só presença.
        </Text>

        <View style={styles.featureList}>
          {monthly.benefits.map(f => (
            <Text key={f} style={styles.feature}>
              ✓  {f}
            </Text>
          ))}
        </View>

        <View style={styles.plansWrap}>
          <View style={[styles.plan, styles.planHighlight]}>
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
          </View>
          <View style={styles.plan}>
            <Text style={styles.planTitle}>Mensal</Text>
            <Text style={styles.planPrice}>R$ {(monthly.totalCents / 100).toFixed(2).replace('.', ',')}/mês</Text>
            <Text style={styles.planSub}>Trial {monthly.trialDays} dias grátis</Text>
          </View>
        </View>

        <Button
          label={`Começar ${annual.trialDays} dias grátis`}
          onPress={() => router.back()}
        />
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.ghost}>Fico com a versão grátis por enquanto</Text>
        </Pressable>

        <Text style={styles.legal}>
          Sem auto-renovação enganosa. Cancele em 1 toque nas configurações da loja. Política · Termos.
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeText: { fontSize: 16, color: theme.colors.text },
  mascotWrap: { alignItems: 'center' },
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
    position: 'absolute',
    top: -10,
    left: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.radius.pill,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  planTitle: { ...theme.text.bodyBold, color: theme.colors.text },
  planPrice: { ...theme.text.h3, color: theme.colors.primary, marginTop: 4 },
  planSub: { ...theme.text.xs, color: theme.colors.textSecondary },
  ghost: { textAlign: 'center', ...theme.text.body, color: theme.colors.textSecondary, paddingVertical: theme.spacing.md },
  legal: { ...theme.text.xs, color: theme.colors.textDim, textAlign: 'center', lineHeight: 16 },
  kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' },
});
}
