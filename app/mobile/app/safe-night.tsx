import { Typography } from '@/components/ui';
/**
 * Modo Noite Difícil — presença sem gamification.
 *
 * Quando o user tá em momento ruim, NÃO queremos confronto com XP/streak/missão.
 * Aqui: tela calma, recursos de crise sempre à mão, opção de respirar guiado
 * ou só ver o mascote junto. Sem moedas. Sem ranking. Sem evolução.
 *
 * Disparado por: botão na home, link no chat, link em qualquer toast crítico.
 *
 * Visual premium: paleta serene (sem vibrant orange), Instrument Serif gentle,
 * crisis box com ícones de shield/phone/heart pra acolhimento.
 */

import { router } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { PressableScale } from '@/components/PressableScale';
import { StaggeredView } from '@/components/StaggeredView';
import { useStyles, useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { Theme } from '@/lib/themes';

// Falha aberta com Alert em vez de catch silencioso. Em momento de crise
// emocional, sem feedback o user nao sabe se a chamada disparou ou nao.
async function safeOpen(url: string, fallbackTitle: string, fallbackBody: string) {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(fallbackTitle, fallbackBody);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert(fallbackTitle, fallbackBody);
  }
}

export default function SafeNight() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const mascot = useStore(s => s.mascot);
  const personality = mascot?.personality ?? 'calmo';
  const phase = mascot?.phase ?? 'crianca';

  function callCvv() {
    void safeOpen('tel:188', 'CVV — 188', 'Disque 188 do seu telefone. 24h, gratuito.');
  }
  function chatCvv() {
    void safeOpen('https://www.cvv.org.br/chat', 'cvv.org.br/chat', 'Abra cvv.org.br/chat no navegador.');
  }
  function callSamu() {
    void safeOpen('tel:192', 'SAMU — 192', 'Disque 192 do seu telefone para emergencia medica.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PressableScale
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Fechar modo noite difícil"
        >
          <Icon name="x" size={18} color={theme.colors.text} strokeWidth={2} />
        </PressableScale>

        <StaggeredView index={0}>
          <View style={styles.heroWrap}>
            <Mascot personality={personality} phase={phase} mood="triste" size={140} reduceMotion />
          </View>
        </StaggeredView>

        <StaggeredView index={1}>
          <Typography variant="body" style={styles.title}>Eu fico aqui.</Typography>
          <Typography variant="body" style={styles.subtitle}>
            Sem missão, sem cobrança, sem ranking. Só presença.
          </Typography>
        </StaggeredView>

        <StaggeredView index={2}>
          <View style={styles.actionsBox}>
            <PrimaryAction
              icon="wind"
              label="Respirar 4-7-8"
              sub="~95 segundos, devagar."
              onPress={() => router.push('/breathe')}
            />
            <PrimaryAction
              icon="message-circle"
              label="Falar comigo"
              sub="Modo escuta. Sem dicas."
              onPress={() => router.push('/(tabs)/chat')}
            />
          </View>
        </StaggeredView>

        <StaggeredView index={3}>
          <View style={styles.crisisBox}>
            <View style={styles.crisisHeader}>
              <Icon name="heart" size={14} color={theme.colors.error} strokeWidth={2.4} fill={theme.colors.error + '40'} />
              <Typography variant="body" style={styles.crisisKicker}>EM CRISE? FALA COM HUMANO.</Typography>
            </View>
            <CrisisLine
              icon="message-circle"
              label="CVV — 188"
              sub="24h, gratuito. Toque pra ligar."
              onPress={callCvv}
            />
            <CrisisLine
              icon="message-circle"
              label="cvv.org.br/chat"
              sub="Conversa por texto se preferir."
              onPress={chatCvv}
            />
            <CrisisLine
              icon="alert-triangle"
              label="SAMU — 192"
              sub="Emergência médica."
              onPress={callSamu}
            />
          </View>
        </StaggeredView>

        <Typography variant="body" style={styles.gentle}>
          Eu sou companhia digital. Não substituo ninguém — mas eu fico contigo
          enquanto você decide o próximo passo.
        </Typography>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PrimaryAction({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: IconName;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <PressableScale style={styles.primaryAction} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.primaryIconWrap}>
        <Icon name={icon} size={20} color={theme.colors.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Typography variant="body" style={styles.primaryLabel}>{label}</Typography>
        <Typography variant="body" style={styles.primarySub}>{sub}</Typography>
      </View>
      <Icon name="chevron-right" size={16} color={theme.colors.textDim} strokeWidth={2} />
    </PressableScale>
  );
}

function CrisisLine({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: IconName;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <PressableScale
      style={styles.crisisLine}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.crisisIconWrap}>
        <Icon name={icon} size={16} color={theme.colors.error} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Typography variant="body" style={styles.crisisLabel}>{label}</Typography>
        <Typography variant="body" style={styles.crisisSub}>{sub}</Typography>
      </View>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: { padding: theme.spacing.lg, gap: theme.spacing.lg },
    closeBtn: {
      alignSelf: 'flex-end',
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroWrap: { alignItems: 'center', paddingVertical: theme.spacing.md },
    title: {
      ...theme.text.h1,
      color: theme.colors.text,
      textAlign: 'center',
      fontSize: 36,
      lineHeight: 40,
      letterSpacing: -0.8,
    },
    subtitle: {
      ...theme.text.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
      alignSelf: 'center',
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 15,
      lineHeight: 22,
    },
    actionsBox: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
    primaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    primaryIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryLabel: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 18,
      lineHeight: 21,
      letterSpacing: -0.2,
    },
    primarySub: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      marginTop: 2,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 12,
    },
    crisisBox: {
      backgroundColor: theme.colors.error + '0E',
      borderColor: theme.colors.error + '60',
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      ...theme.shadow.sm,
    },
    crisisHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    crisisKicker: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: theme.colors.error,
      fontFamily: 'JetBrainsMono_500Medium',
    },
    crisisLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: 8,
    },
    crisisIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.error + '18',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    },
    crisisLabel: {
      color: theme.colors.text,
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 14,
      letterSpacing: 0.1,
    },
    crisisSub: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 14 },
    gentle: {
      ...theme.text.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.lg,
      lineHeight: 22,
      fontStyle: 'italic',
      fontFamily: 'InstrumentSerif_400Regular_Italic',
      fontSize: 14,
    },
  });
}
