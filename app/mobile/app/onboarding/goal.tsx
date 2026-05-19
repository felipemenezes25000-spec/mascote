import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import { stepLabel } from '@/lib/onboarding-flow';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

const GOALS: { id: string; label: string; icon: IconName }[] = [
  { id: 'sono', label: 'Melhorar meu sono', icon: 'moon' },
  { id: 'agua', label: 'Beber mais água', icon: 'droplet' },
  { id: 'movimento', label: 'Me movimentar mais', icon: 'dumbbell' },
  { id: 'ansiedade', label: 'Lidar com ansiedade do dia', icon: 'wind' },
  { id: 'rotina', label: 'Criar uma rotina mais leve', icon: 'tree' },
  { id: 'energia', label: 'Ter mais energia no dia', icon: 'zap' },
  { id: 'companhia', label: 'Só ter companhia leve', icon: 'heart' },
];

const MOODS = [
  { id: '1', emoji: '😞' },
  { id: '2', emoji: '😕' },
  { id: '3', emoji: '😐' },
  { id: '4', emoji: '🙂' },
  { id: '5', emoji: '😄' },
];

export default function Goal() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ display_name?: string; age_band?: string }>();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const canContinue = !!(selectedGoal && selectedMood);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <StaggeredView index={0}>
          <View>
            <View style={styles.kickerRow}>
              <Icon name="target" size={12} color={theme.colors.primary} strokeWidth={2.4} />
              <Text style={styles.kicker}>{stepLabel('goal')}</Text>
            </View>
            <Text style={styles.title}>O que tá te chamando pra cá?</Text>
            <Text style={styles.subtitle}>Pode mudar depois. Vou usar pra começar com o pé direito.</Text>
          </View>
        </StaggeredView>
        <ScrollView contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
          {GOALS.map((g, i) => (
            <StaggeredView key={g.id} index={i + 1} step={45} distance={10}>
              <PressableScale
                style={[styles.opt, selectedGoal === g.id && styles.optSelected]}
                onPress={() => setSelectedGoal(g.id)}
                accessibilityLabel={g.label}
              >
                <View style={[styles.optIconWrap, selectedGoal === g.id && styles.optIconWrapSelected]}>
                  <Icon
                    name={g.icon}
                    size={18}
                    color={selectedGoal === g.id ? '#fff' : theme.colors.primary}
                    strokeWidth={2.2}
                  />
                </View>
                <Text style={[styles.optLabel, selectedGoal === g.id && styles.optLabelSelected]}>
                  {g.label}
                </Text>
                {selectedGoal === g.id && (
                  <Icon name="check" size={18} color="#fff" strokeWidth={2.8} />
                )}
              </PressableScale>
            </StaggeredView>
          ))}
        </ScrollView>
        <View style={styles.moodSection}>
          <Text style={styles.moodKicker}>E como você tá agora?</Text>
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <Pressable
                key={m.id}
                style={[styles.moodOpt, selectedMood === m.id && styles.moodOptSelected]}
                onPress={() => setSelectedMood(m.id)}
                accessibilityLabel={`Humor ${m.id} de 5`}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Button
          label="Continuar"
          disabled={!canContinue}
          onPress={() =>
            router.push({
              pathname: '/onboarding/style',
              params: { ...params, goal: selectedGoal ?? '', mood: selectedMood ?? '' },
            })
          }
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    kicker: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontFamily: 'JetBrainsMono_500Medium',
    },
    title: {
      ...theme.text.h1,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
      fontSize: 30,
      letterSpacing: -0.6,
      lineHeight: 34,
    },
    subtitle: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 15,
      lineHeight: 21,
    },
    opt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    optSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    optIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optIconWrapSelected: { backgroundColor: 'rgba(255,255,255,0.22)' },
    optLabel: {
      ...theme.text.body,
      color: theme.colors.text,
      flex: 1,
      fontFamily: 'PlusJakartaSans_500Medium',
      fontSize: 14.5,
    },
    optLabelSelected: { color: '#fff', fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
    moodSection: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    moodKicker: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
    moodOpt: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    moodOptSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    moodEmoji: { fontSize: 26 },
  });
}
