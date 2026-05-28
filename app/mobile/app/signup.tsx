import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Input, Typography } from '@/components/ui';

import { clearOnboardingDraft, setOnboardingDraft } from '@/lib/onboarding-draft';
import { useTheme } from '@/lib/useTheme';
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
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Typography variant="body" style={styles.backText}>←</Typography>
          </Pressable>
          <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.sm }}>
              <Typography variant="mono" tone="brand" style={styles.kicker}>BEM-VINDO</Typography>
              <Typography variant="title">Criar conta</Typography>
              <Typography tone="secondary">
                Tudo fica no seu dispositivo. O e-mail é opcional — só pedimos pra te avisar de novidades.
              </Typography>
            </View>
            <View style={{ gap: theme.spacing.md }}>
              <Input
                label="Como você quer ser chamado(a)?"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                autoFocus
                maxLength={40}
              />
              <Input
                label="Email (opcional)"
                value={email}
                onChangeText={setEmail}
                placeholder="voce@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={100}
              />
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                label="Continuar"
                onPress={() => {
                  const display_name = name.trim() || 'Você';
                  setOnboardingDraft({ display_name });
                  router.push({ pathname: '/onboarding/age', params: { display_name } });
                }}
                disabled={!name.trim()}
              />
              <View style={styles.legalRow}>
                <Typography variant="mono" tone="dim" align="center">Ao continuar, você concorda com a </Typography>
                <Pressable onPress={() => router.push('/privacy')} hitSlop={8}>
                  <Typography variant="mono" tone="brand" align="center" style={styles.legalLink}>Privacidade</Typography>
                </Pressable>
                <Typography variant="mono" tone="dim" align="center"> e </Typography>
                <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
                  <Typography variant="mono" tone="brand" align="center" style={styles.legalLink}>Termos</Typography>
                </Pressable>
                <Typography variant="mono" tone="dim" align="center">.</Typography>
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
