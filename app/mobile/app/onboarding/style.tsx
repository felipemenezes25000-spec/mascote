import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import type { StylePreset } from '@/lib/onboarding-evolution';
import { stepLabel } from '@/lib/onboarding-flow';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
const STYLES: { id: StylePreset; label: string; desc: string; icon: IconName }[] = [
  { id: 'soft', label: 'Suave', desc: 'Tons pastéis, presença acolhedora', icon: 'heart' },
  { id: 'vivid', label: 'Vívido', desc: 'Cores vivas, energia radiante', icon: 'zap' },
  { id: 'mystic', label: 'Místico', desc: 'Brilhos etéreos, aura onírica', icon: 'sparkle' },
  { id: 'bold', label: 'Ousado', desc: 'Contornos fortes, presença marcante', icon: 'flame' },
];

export default function StyleStep() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<StylePreset | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <StaggeredView index={0}>
          <Typography variant="body" style={styles.kicker}>{stepLabel('style')}</Typography>
          <Typography variant="body" style={styles.title}>Como você imagina seu mascote?</Typography>
          <Typography variant="body" style={styles.subtitle}>Isso define a paleta e a vibe inicial — hábitos ainda moldam a evolução.</Typography>
        </StaggeredView>
        <ScrollView contentContainerStyle={{ gap: theme.spacing.sm }}>
          {STYLES.map((s, i) => (
            <StaggeredView key={s.id} index={i + 1} step={40}>
              <PressableScale
                style={[styles.opt, selected === s.id && styles.optSelected]}
                onPress={() => setSelected(s.id)}
                accessibilityLabel={s.label}
              >
                <View style={[styles.iconWrap, selected === s.id && styles.iconWrapSelected]}>
                  <Icon name={s.icon} size={18} color={selected === s.id ? '#fff' : theme.colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Typography variant="body" style={[styles.optLabel, selected === s.id && styles.optLabelSelected]}>{s.label}</Typography>
                  <Typography variant="body" style={[styles.optDesc, selected === s.id && styles.optDescSelected]}>{s.desc}</Typography>
                </View>
              </PressableScale>
            </StaggeredView>
          ))}
        </ScrollView>
        <Button
          label="Continuar"
          disabled={!selected}
          onPress={() =>
            router.push({
              pathname: '/onboarding/quick',
              params: { ...params, style: selected ?? '' },
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
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text, marginTop: theme.spacing.sm },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary, marginTop: theme.spacing.sm, fontStyle: 'italic' },
    opt: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    optSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    iconWrap: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center', justifyContent: 'center',
    },
    iconWrapSelected: { backgroundColor: 'rgba(255,255,255,0.22)' },
    optLabel: { ...theme.text.bodyBold, color: theme.colors.text },
    optLabelSelected: { color: '#fff' },
    optDesc: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2 },
    optDescSelected: { color: 'rgba(255,255,255,0.85)' },
  });
}
