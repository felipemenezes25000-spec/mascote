import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function Signup() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.sm }}>
              <Text style={styles.kicker}>BEM-VINDO</Text>
              <Text style={styles.title}>Criar conta</Text>
              <Text style={styles.subtitle}>
                Tudo fica no seu dispositivo. Não exigimos email real nessa demo local.
              </Text>
            </View>
            <View style={{ gap: theme.spacing.md }}>
              <View>
                <Text style={styles.label}>Como você quer ser chamado(a)?</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Seu nome"
                  placeholderTextColor={theme.colors.textDim}
                  autoFocus
                  maxLength={40}
                />
              </View>
              <View>
                <Text style={styles.label}>Email (opcional)</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholder="voce@exemplo.com"
                  placeholderTextColor={theme.colors.textDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  maxLength={100}
                />
              </View>
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              <Button
                label="Continuar"
                onPress={() =>
                  router.push({ pathname: '/onboarding/age', params: { display_name: name.trim() || 'Você' } })
                }
                disabled={!name.trim()}
              />
              <Text style={styles.legal}>
                Ao continuar, você concorda com a Política de Privacidade e Termos.
              </Text>
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
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary },
    label: { ...theme.text.sm, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 8 },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    legal: { ...theme.text.xs, color: theme.colors.textDim, textAlign: 'center' },
  });
}
