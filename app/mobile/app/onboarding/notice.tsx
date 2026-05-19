import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { inventory, mascots as mascotsDb, settings as settingsDb, wallet as walletDb } from '@/lib/db';
import { stepLabel } from '@/lib/onboarding-flow';
import { useStore } from '@/store';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

/**
 * Tela combinada (push + notice) — toggle de avisos + disclaimer wellness
 * + entrega idempotente do Welcome Pack (50 XP, 25 moedas, boné azul).
 *
 * Antes: push.tsx ('posso te avisar?') → notice.tsx (disclaimer).
 * Agora: tela única; consent + push toggle + finish().
 */
export default function Notice() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const params = useLocalSearchParams<{ push?: string }>();
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const setSettings = useStore(s => s.setSettings);
  const setMascot = useStore(s => s.setMascot);
  const setWallet = useStore(s => s.setWallet);

  // default: push ON (opt-out). Se vem com ?push=no de uma rota legacy, respeita.
  const [pushEnabled, setPushEnabled] = useState<boolean>(params.push !== 'no');

  async function finish() {
    if (profile) {
      const updated = await settingsDb.update(profile.id, { push_enabled: pushEnabled });
      setSettings(updated);
    }
    // === Pacote Bem-Vindo ===
    // QA flagrou: primeira sessão sem dopamina mata D1. Aqui damos 50 XP
    // (sobe pra nível 2, desbloqueia Boné azul), 25 moedas, equipa o boné e
    // marca a flag pro home toast aparecer. Tudo idempotente — settings.welcome_pack
    // garante que rodar 2x não duplica.
    try {
      if (profile && mascot) {
        const flag = await settingsDb.get(profile.id);
        const alreadyDelivered = (flag as unknown as { welcome_pack_delivered?: boolean })?.welcome_pack_delivered;
        if (!alreadyDelivered) {
          const nextXp = (mascot.xp ?? 0) + 50;
          const updatedMascot = await mascotsDb.upsert({
            user_id: profile.id,
            xp: nextXp,
            level: Math.max(2, mascot.level ?? 1),
          });
          setMascot(updatedMascot);
          const w = await walletDb.add(profile.id, 25, 0);
          setWallet(w);
          await inventory.unlock(profile.id, 'cap');
          await inventory.equip(profile.id, 'cap');
          // marca como entregue (campo livre dentro do settings json)
          await settingsDb.update(profile.id, ({ welcome_pack_delivered: true } as unknown) as Partial<typeof flag>);
        }
      }
    } catch (e) {
      // Pacote é nice-to-have — nunca bloqueia entrada na home.
    }
    router.replace('/(tabs)?welcome=1');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={{ gap: theme.spacing.md, flexGrow: 1 }}>
          <Text style={styles.kicker}>{stepLabel('notice')}</Text>
          <Text style={styles.title}>Última coisa antes de começar</Text>

          {/* Push toggle (antes era tela separada push.tsx) */}
          <Pressable
            onPress={() => setPushEnabled(v => !v)}
            style={styles.pushRow}
            accessibilityLabel="Permitir lembretes"
            accessibilityRole="switch"
            accessibilityState={{ checked: pushEnabled }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.pushTitle}>Posso te avisar?</Text>
              <Text style={styles.pushBody}>
                No máximo 2 vezes por dia. Nunca com culpa. Desliga quando quiser.
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
              accessibilityLabel="Toggle lembretes"
            />
          </Pressable>

          {/* Disclaimer wellness */}
          <Text style={styles.body}>
            Esse app é pra <Text style={styles.bold}>autocuidado e bem-estar</Text>. Ele NÃO é
            terapia, não dá diagnóstico, não prescreve remédio e não substitui psicólogo,
            psiquiatra ou médico.
          </Text>
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Em momentos de crise emocional</Text>
            <Text style={styles.alertBody}>
              CVV — <Text style={styles.bold}>188</Text> (24h, gratuito) ou cvv.org.br
            </Text>
            <Text style={styles.alertBody}>
              Emergência médica: <Text style={styles.bold}>192</Text> (SAMU)
            </Text>
          </View>
          <Text style={styles.body}>
            A IA pode errar. Não tome o que ela diz como conselho profissional. Se você precisa de
            ajuda real, busque um profissional.
          </Text>
          <Text style={styles.body}>
            Ao continuar, você confirma que entendeu esses limites e tem 16 anos ou mais.
          </Text>
        </ScrollView>
        <Button
          label="Entendi e quero começar"
          onPress={finish}
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: theme.spacing.lg },
    kicker: { ...theme.text.xs, color: theme.colors.primary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    title: { ...theme.text.h1, color: theme.colors.text },
    body: { ...theme.text.body, color: theme.colors.textSecondary, lineHeight: 22 },
    bold: { fontWeight: '700', color: theme.colors.text },
    pushRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pushTitle: { ...theme.text.bodyBold, color: theme.colors.text },
    pushBody: { ...theme.text.sm, color: theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
    alertBox: {
      backgroundColor: theme.colors.error + '15',
      borderColor: theme.colors.error,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: 4,
    },
    alertTitle: { ...theme.text.bodyBold, color: theme.colors.error },
    alertBody: { ...theme.text.sm, color: theme.colors.text },
  });
}
