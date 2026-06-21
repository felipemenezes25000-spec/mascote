import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { setOnboardingDraft } from '@/lib/onboarding-draft';
import { stepLabel } from '@/lib/onboarding-flow';
import { useStyles } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';
import type { Profile } from '@/types';

import { Typography } from '@/components/ui';
type AgeBand = NonNullable<Profile['age_band']> | 'under16';

// Por render (não módulo-level): t() tem que pegar o locale atual. Labels
// numéricos seguem literais (unidades neutras); só palavras traduzem.
function buildOptions(): { id: AgeBand; label: string; allowed: boolean }[] {
  return [
    { id: 'under16', label: t('onboarding.age.opt_under16'), allowed: false },
    { id: '16-24', label: '16–24', allowed: true },
    { id: '25-34', label: '25–34', allowed: true },
    { id: '35-44', label: '35–44', allowed: true },
    { id: '45+', label: t('onboarding.age.opt_45plus'), allowed: true },
  ];
}

export default function Age() {
  const styles = useStyles(makeStyles);
  const params = useLocalSearchParams<{ display_name?: string; express?: string }>();
  const [selected, setSelected] = useState<AgeBand | null>(null);
  const options = buildOptions();

  function next() {
    if (!selected) return;
    if (selected === 'under16') {
      Alert.alert(
        t('onboarding.age.under16_alert_title'),
        t('onboarding.age.under16_alert_body'),
        [{ text: t('common.ok') }]
      );
      return;
    }
    // Propaga display_name capturado em /signup pra ser pré-preenchido em /name.
    // Sem isso, o usuário re-digita o nome duas vezes ao longo do onboarding.
    const display_name = params.display_name ?? undefined;
    if (display_name) setOnboardingDraft({ display_name });
    setOnboardingDraft({ age_band: selected });
    const base = {
      age_band: selected,
      ...(display_name ? { display_name } : {}),
    };
    router.push({
      pathname: params.express === '1' ? '/onboarding/identity' : '/onboarding/goal',
      params: base,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View>
          <Typography variant="body" style={styles.kicker}>{stepLabel('age')}</Typography>
          <Typography variant="body" style={styles.title}>{t('onboarding.age.title')}</Typography>
          <Typography variant="body" style={styles.subtitle}>
            {t('onboarding.age.subtitle')}
          </Typography>
        </View>
        <View style={styles.options} accessibilityRole="radiogroup">
          {options.map(o => (
            <Pressable
              key={o.id}
              onPress={() => setSelected(o.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === o.id }}
              accessibilityLabel={o.label}
              style={[styles.opt, selected === o.id && styles.optSelected]}
            >
              <Typography variant="body" style={[styles.optLabel, selected === o.id && styles.optLabelSelected]}>
                {o.label}
              </Typography>
            </Pressable>
          ))}
        </View>
        <Button label={t('common.continue')} onPress={next} disabled={!selected} />
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
    gap: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { ...theme.text.h1, color: theme.colors.text, marginTop: theme.spacing.sm },
  subtitle: { ...theme.text.body, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  options: { gap: theme.spacing.sm },
  opt: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  optLabel: { ...theme.text.bodyBold, color: theme.colors.text },
  optLabelSelected: { color: theme.tokens.semantic.inkOnBrand },
});
}
