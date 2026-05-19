import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function Safety() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="modal" title="Segurança & limites" subtitle="o que esperar deste app" />
      <ScrollView contentContainerStyle={styles.container}>
        <StaggeredView index={0}>
          <Text style={styles.title}>O que esperar — e o que não esperar</Text>
        </StaggeredView>

        <StaggeredView index={1}>
          <View style={styles.cardWellness}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primary + '20' }]}>
                <Icon name="heart" size={16} color={theme.colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardTitle}>É wellness, não terapia.</Text>
            </View>
            <Text style={styles.cardBody}>
              O Mascote é pra autocuidado e bem-estar — companhia leve, lembretes, missões pequenas.
              Não é serviço de saúde mental. Não diagnostica, não prescreve, não trata.
            </Text>
          </View>
        </StaggeredView>

        <StaggeredView index={2}>
          <View style={styles.cardCrisis}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.error + '20' }]}>
                <Icon name="alert-triangle" size={16} color={theme.colors.error} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardTitleCrisis}>Em crise emocional</Text>
            </View>
            <CrisisBtn
              icon="message-circle"
              title="CVV — 188"
              body="24h, gratuito, sigiloso"
              cta="Ligar"
              onPress={() => Linking.openURL('tel:188').catch(() => {})}
            />
            <CrisisBtn
              icon="message-circle"
              title="cvv.org.br"
              body="Chat anônimo"
              cta="Abrir"
              onPress={() => Linking.openURL('https://www.cvv.org.br').catch(() => {})}
            />
            <CrisisBtn
              icon="alert-triangle"
              title="SAMU — 192"
              body="Emergência médica"
              cta="Ligar"
              onPress={() => Linking.openURL('tel:192').catch(() => {})}
            />
          </View>
        </StaggeredView>

        <StaggeredView index={3}>
          <Card icon="alert-triangle" title="Sinais pra procurar profissional">
            <Text style={styles.cardBody}>
              · Tristeza ou ansiedade intensa há mais de 2 semanas{'\n'}
              · Pensamentos de se machucar ou não querer estar aqui{'\n'}
              · Sono ou alimentação muito desregulada por dias seguidos{'\n'}
              · Sensação de que nada melhora{'\n'}
              · Uso de álcool ou substâncias pra aguentar
            </Text>
          </Card>
        </StaggeredView>

        <StaggeredView index={4}>
          <Card icon="info" title="O que a IA não faz">
            <Text style={styles.cardBody}>
              A IA pode errar. Ela é treinada pra não dar conselho clínico, mas pode falhar.
              Se algo soar como conselho médico, ignore — busque profissional.
            </Text>
          </Card>
        </StaggeredView>

        <StaggeredView index={5}>
          <Card icon="user" title="Onde encontrar ajuda profissional">
            <Text style={styles.cardBody}>
              · CAPS (Centro de Atenção Psicossocial) — gratuito pelo SUS{'\n'}
              · Clínicas-escola de universidades — gratuito ou baixo custo{'\n'}
              · Convênio ou particular — indicação confiável
            </Text>
          </Card>
        </StaggeredView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Icon name={icon} size={16} color={theme.colors.primary} strokeWidth={2.2} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function CrisisBtn({
  icon,
  title,
  body,
  cta,
  onPress,
}: {
  icon: IconName;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <PressableScale style={styles.crisisBtn} onPress={onPress} accessibilityLabel={`${title} — ${cta}`}>
      <View style={styles.crisisIconWrap}>
        <Icon name={icon} size={16} color={theme.colors.error} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.crisisTitle}>{title}</Text>
        <Text style={styles.crisisBody}>{body}</Text>
      </View>
      <View style={styles.crisisCtaBtn}>
        <Text style={styles.crisisCta}>{cta}</Text>
        <Icon name="arrow-right" size={11} color={theme.colors.error} strokeWidth={2.6} />
      </View>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    container: { padding: theme.spacing.lg, gap: theme.spacing.md },
    title: {
      ...theme.text.h1,
      color: theme.colors.text,
      marginTop: theme.spacing.sm,
      fontSize: 28,
      letterSpacing: -0.5,
      lineHeight: 32,
    },
    card: {
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    cardWellness: {
      backgroundColor: theme.colors.primary + '0F',
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary + '55',
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    cardCrisis: {
      backgroundColor: theme.colors.error + '0F',
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.error + '55',
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    cardIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      color: theme.colors.text,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.2,
      flex: 1,
    },
    cardTitleCrisis: {
      color: theme.colors.error,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 18,
      lineHeight: 22,
      letterSpacing: -0.2,
      flex: 1,
    },
    cardBody: { ...theme.text.body, color: theme.colors.textSecondary, lineHeight: 22 },
    crisisBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    crisisIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.error + '15',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    },
    crisisTitle: {
      color: theme.colors.text,
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 14,
      letterSpacing: 0.1,
    },
    crisisBody: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2 },
    crisisCtaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.error + '15',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    },
    crisisCta: {
      color: theme.colors.error,
      fontWeight: '700',
      fontSize: 12,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.2,
    },
  });
}
