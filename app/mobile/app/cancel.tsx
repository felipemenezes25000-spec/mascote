import { router, Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { addDays, settings as settingsDb, todayLocal } from '@/lib/db';
import { subscriptionService } from '@/services/subscription/SubscriptionService';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
export default function Cancel() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const refreshSettings = useStore(s => s.refreshSettings);
  const [step, setStep] = useState<'main' | 'pause' | 'confirm'>('main');

  async function pause30() {
    if (!profile) return;
    const until = addDays(todayLocal(), 30);
    await settingsDb.update(profile.id, { paused_until: until });
    await refreshSettings();
    setStep('pause');
  }

  async function switchToFree() {
    if (!profile) return;
    // Confirma antes de cancelar — sem isso, um tap acidental no card já
    // baixava o plano sem segunda chance e o usuário descobria só quando
    // tentava usar feature Plus. Padrão consistente com confirmDelete em
    // settings.tsx (dialog destrutivo sempre exige confirmação explícita).
    Alert.alert(
      'Mudar pra Free?',
      'Você perde os benefícios Plus imediatamente (atelier de customização completo, mutações raras, IA emocional). Os dados ficam aqui.',
      [
        { text: 'Continuo Plus', style: 'cancel' },
        {
          text: 'Mudar pra Free',
          style: 'destructive',
          onPress: async () => {
            if (!profile) return;
            try {
              // ANTES: chamava `mockBillingProvider.cancel` direto, ignorando
              // qual provider (RevenueCat em prod) esta ativo — risco "cancelei
              // mas continuo cobrando". subscriptionService delega pro provider
              // correto + dispara analytics + serializa via withLock.
              await subscriptionService.cancel(profile.id);
              Alert.alert(
                'Plano gratuito',
                'Você voltou pro plano Free. Seus dados e o mascote continuam aqui; recursos premium ficam limitados.',
              );
              router.back();
            } catch {
              Alert.alert('Ops', 'Não consegui alterar o plano agora. Tenta de novo.');
            }
          },
        },
      ],
    );
  }

  if (!profile || !mascot) return <Redirect href="/splash" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
            <Typography variant="body" style={styles.closeText}>✕</Typography>
          </Pressable>
          <Typography variant="body" style={styles.kicker}>PAUSAR / CANCELAR</Typography>
          <View style={{ width: 36 }} />
        </View>

        {step === 'main' && (
          <>
            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <Mascot personality={mascot.personality} phase={mascot.phase} mood="triste" size={140} />
              <Typography variant="body" style={styles.title}>Antes de cancelar...</Typography>
              <Typography variant="body" style={styles.subtitle}>
                {mascot.name} vai sentir saudade. Mas você decide. Sem manipulação.
              </Typography>
            </View>

            <View style={styles.card}>
              <Typography variant="body" style={styles.cardTitle}>Que tal pausar por 30 dias?</Typography>
              <Typography variant="body" style={styles.cardBody}>
                Mantém seus dados, sem cobrança, sem notificações. Quando voltar, tudo onde parou.
              </Typography>
              <Button label="Pausar 30 dias" onPress={pause30} />
            </View>

            <View style={styles.card}>
              <Typography variant="body" style={styles.cardTitle}>Trocar pro plano grátis</Typography>
              <Typography variant="body" style={styles.cardBody}>
                Você mantém o mascote e o histórico, com limites de uso.
              </Typography>
              <Button variant="secondary" label="Mudar pra Free" onPress={() => void switchToFree()} />
            </View>

            <Pressable onPress={() => setStep('confirm')}>
              <Typography variant="body" style={styles.cancelDestructive}>Quero cancelar mesmo assim</Typography>
            </Pressable>
          </>
        )}

        {step === 'pause' && (
          <View style={{ alignItems: 'center', gap: theme.spacing.lg, paddingVertical: theme.spacing.xl }}>
            <Mascot personality={mascot.personality} phase={mascot.phase} mood="exausto" size={150} />
            <Typography variant="body" style={styles.title}>{mascot.name} entrou em modo descanso.</Typography>
            <Typography variant="body" style={styles.subtitle}>Volta quando quiser. Tudo aqui esperando.</Typography>
            <Button label="OK" onPress={() => router.replace('/(tabs)')} />
          </View>
        )}

        {step === 'confirm' && (
          <View style={{ gap: theme.spacing.md, paddingVertical: theme.spacing.md }}>
            <Typography variant="body" style={styles.title}>Cancelar assinatura</Typography>
            <Typography variant="body" style={styles.subtitle}>
              A cobrança é feita pela {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}. O botão
              abaixo abre o gerenciador de assinaturas direto — lá você cancela
              quando quiser e mantém o acesso até o fim do período pago.
            </Typography>
            <Button
              label={Platform.OS === 'ios' ? 'Abrir gerenciar assinaturas' : 'Abrir Google Play'}
              onPress={async () => {
                // iOS: https://apps.apple.com/account/subscriptions abre direto
                // o gerenciador no aplicativo da App Store (deep link oficial
                // Apple). Android: account/subscriptions tem comportamento
                // equivalente no Play Store.
                const url =
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com/account/subscriptions'
                    : 'https://play.google.com/store/account/subscriptions';
                try {
                  const can = await Linking.canOpenURL(url);
                  if (can) await Linking.openURL(url);
                  else throw new Error('cannot open');
                } catch {
                  Alert.alert(
                    'Não consegui abrir',
                    Platform.OS === 'ios'
                      ? 'Vá em Ajustes > [Seu nome] > Assinaturas pra gerenciar.'
                      : 'Abra a Play Store > Conta > Pagamentos e assinaturas.',
                  );
                }
              }}
            />
            <Button variant="secondary" label="Voltar" onPress={() => router.back()} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    close: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
    closeText: { fontSize: 16, color: theme.colors.text },
    kicker: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '800', letterSpacing: 1 },
    title: { ...theme.text.h2, color: theme.colors.text, textAlign: 'center' },
    subtitle: { ...theme.text.body, color: theme.colors.textSecondary, textAlign: 'center' },
    card: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, gap: theme.spacing.sm },
    cardTitle: { ...theme.text.h3, color: theme.colors.text },
    cardBody: { ...theme.text.sm, color: theme.colors.textSecondary, lineHeight: 20 },
    cancelDestructive: { textAlign: 'center', ...theme.text.body, color: theme.colors.error, paddingVertical: theme.spacing.md, fontWeight: '600' },
  });
}
