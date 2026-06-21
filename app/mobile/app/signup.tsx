import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Input, Typography } from '@/components/ui';

import { clearOnboardingDraft, setOnboardingDraft } from '@/lib/onboarding-draft';
import { useTheme } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import type { Theme } from '@/lib/themes';

export default function Signup() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    clearOnboardingDraft();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={t('signup.back')}
          >
            <Typography variant="body" style={styles.backText}>←</Typography>
          </Pressable>
          <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.sm }}>
              <Typography variant="mono" tone="brand" style={styles.kicker}>{t('signup.kicker')}</Typography>
              <Typography variant="title">{t('signup.title')}</Typography>
              <Typography tone="secondary">
                {t('signup.subtitle')}
              </Typography>
            </View>
            <View style={{ gap: theme.spacing.md }}>
              <Input
                label={t('signup.name_label')}
                value={name}
                onChangeText={setName}
                placeholder={t('signup.name_placeholder')}
                autoFocus
                maxLength={40}
              />
              <Input
                label={t('signup.email_label')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('signup.email_placeholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                label={t('signup.cta_continue')}
                onPress={() => {
                  const display_name = name.trim() || t('signup.default_name');
                  setOnboardingDraft({ display_name });
                  router.push({ pathname: '/onboarding/age', params: { display_name } });
                }}
                disabled={!name.trim()}
              />
              <View style={styles.legalRow}>
                <Typography variant="mono" tone="dim" align="center">{t('signup.legal_prefix')}</Typography>
                <Pressable onPress={() => router.push('/privacy')} hitSlop={8} accessibilityRole="link" accessibilityLabel={t('signup.legal_privacy')}>
                  <Typography variant="mono" tone="brand" align="center" style={styles.legalLink}>{t('signup.legal_privacy')}</Typography>
                </Pressable>
                <Typography variant="mono" tone="dim" align="center">{t('signup.legal_and')}</Typography>
                <Pressable onPress={() => router.push('/terms')} hitSlop={8} accessibilityRole="link" accessibilityLabel={t('signup.legal_terms')}>
                  <Typography variant="mono" tone="brand" align="center" style={styles.legalLink}>{t('signup.legal_terms')}</Typography>
                </Pressable>
                <Typography variant="mono" tone="dim" align="center">{t('signup.legal_suffix')}</Typography>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.lg },
    back: { alignSelf: 'flex-start', padding: 6 },
    backText: { fontSize: 24, color: theme.colors.text },
    kicker: { fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    legalRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
    },
    legalLink: { textDecorationLine: 'underline' },
  });
}
