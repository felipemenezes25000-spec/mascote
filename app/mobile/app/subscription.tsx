import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { formatBRL, getTier } from '@/content/billing';
import { useTheme } from '@/lib/useTheme';
import { makeShadow } from '@/lib/themes';
import type { Theme } from '@/lib/themes';

export default function SubscriptionActive() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const badgePulse = useSharedValue(0.6);
  const free = getTier('free');
  const monthly = getTier('plus_monthly');
  const annual = getTier('plus_annual');

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
            <Text style={styles.label}>PLANO ATUAL (DEMO)</Text>
            <Text style={styles.planName}>{free.name}</Text>
            <Text style={styles.price}>{formatBRL(free.totalCents)}/mês</Text>
            <Text style={styles.note}>Nessa versão local, não há cobrança.</Text>
            {free.benefits.map(b => <Benefit key={b} text={b} />)}
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
              <Text style={styles.recommendedText}>{annual.badge ?? 'RECOMENDADO'}</Text>
            </Animated.View>
            <Text style={styles.planName}>{annual.name}</Text>
            <Text style={styles.price}>
              {formatBRL(annual.monthlyCents)}/mês · {formatBRL(annual.totalCents)}/ano
            </Text>
            {annual.benefits.map(b => <Benefit key={b} text={b} />)}
            <Button label={`Começar trial ${annual.trialDays} dias`} onPress={() => router.push('/paywall')} />
          </View>
        </StaggeredView>

        <StaggeredView index={2}>
          <View style={styles.card}>
            <Text style={styles.planName}>{monthly.name} Mensal</Text>
            <Text style={styles.price}>{formatBRL(monthly.totalCents)}/mês</Text>
            <Text style={styles.note}>Trial {monthly.trialDays} dias.</Text>
            {monthly.benefits.map(b => <Benefit key={b} text={b} />)}
          </View>
        </StaggeredView>

        <PressableScale onPress={() => router.push('/cancel')} style={styles.cancelLink}>
          <Text style={styles.cancelText}>Pausar ou cancelar</Text>
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
      <Text style={styles.benefit}>{text}</Text>
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
    cancelLink: { paddingVertical: theme.spacing.md, alignItems: 'center' },
    cancelText: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
  });
}
