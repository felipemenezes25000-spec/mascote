import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Typography, Input } from '@/components/ui';
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
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.sm }}>
              <Typography variant="mono" tone="brand" style={styles.kicker}>BEM-VINDO</Typography>
              <Typography variant="title">Criar conta</Typography>
              <Typography tone="secondary">
                Tudo fica no seu dispositivo. Não exigimos email real nessa demo local.
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
              <Typography variant="mono" tone="dim" align="center">
                Ao continuar, você concorda com a Política de Privacidade e Termos.
              </Typography>
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
  });
}
