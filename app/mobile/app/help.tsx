import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StaggeredView } from '@/components/StaggeredView';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

// Em iPad/dispositivo sem app de telefone, tel: nao abre. Catch silencioso
// deixava o usuario em crise sem feedback — fail abertamente com fallback.
import { Typography } from '@/components/ui';
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

export default function Help() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader variant="modal" title="Precisa de ajuda?" subtitle="recursos · sigiloso" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <StaggeredView index={0}>
          <View style={styles.banner}>
            <View style={styles.bannerIconWrap}>
              <Icon name="heart" size={20} color={theme.colors.primary} strokeWidth={2.2} fill={theme.colors.primary + '30'} />
            </View>
            <Typography variant="body" style={styles.bannerTitle}>Eu fico contigo agora</Typography>
            <Typography variant="body" style={styles.bannerText}>
              Se o que você tá sentindo é grande, tem gente preparada pra te ajudar. Não precisa passar por isso sozinho(a).
            </Typography>
          </View>
        </StaggeredView>

        <StaggeredView index={1}>
          <Section title="Crise emocional (24h)">
            <ResourceRow
              icon="message-circle"
              tone="error"
              title="CVV — 188"
              sub="Ligação gratuita, 24h, sigiloso"
              cta="Ligar"
              onPress={() => safeOpen('tel:188', 'CVV — 188', 'Disque 188 do seu telefone. 24h, gratuito.')}
            />
            <ResourceRow
              icon="message-circle"
              tone="error"
              title="CVV — chat"
              sub="cvv.org.br"
              cta="Abrir"
              onPress={() => safeOpen('https://www.cvv.org.br', 'cvv.org.br', 'Abra cvv.org.br no navegador para chat anonimo.')}
              isLast
            />
          </Section>
        </StaggeredView>

        <StaggeredView index={2}>
          <Section title="Emergência médica">
            <ResourceRow
              icon="alert-triangle"
              tone="error"
              title="SAMU — 192"
              sub="Risco imediato à vida"
              cta="Ligar"
              onPress={() => safeOpen('tel:192', 'SAMU — 192', 'Disque 192 do seu telefone. Atendimento médico de urgência, 24h.')}
            />
            <ResourceRow
              icon="shield"
              tone="primary"
              title="Bombeiros / Polícia — 193 / 190"
              sub="Outras emergências"
              isLast
            />
          </Section>
        </StaggeredView>

        <StaggeredView index={3}>
          <Section title="Acompanhamento profissional">
            <ResourceRow
              icon="heart"
              tone="primary"
              title="CAPS — Centro de Atenção Psicossocial"
              sub="Atendimento público pelo SUS. Busca por: 'CAPS [sua cidade]'."
            />
            <ResourceRow
              icon="book"
              tone="primary"
              title="Clínicas-escola de universidades"
              sub="Psicologia gratuita ou de baixo custo. Pesquisa: 'clínica-escola psicologia [cidade]'."
            />
            <ResourceRow
              icon="user"
              tone="primary"
              title="Convênio ou particular"
              sub="Indicação confiável vale mais que site aleatório."
              isLast
            />
          </Section>
        </StaggeredView>

        <StaggeredView index={4}>
          <Section title="O que o Mascote não é">
            <Typography variant="body" style={styles.p}>
              Esse app é wellness e autocuidado. Ele não substitui terapia, não dá diagnóstico, não prescreve nada.
              Se a IA falar algo que parece conselho clínico, ignora — ela pode errar. Pra essas coisas, profissional.
            </Typography>
          </Section>
        </StaggeredView>

        <StaggeredView index={5}>
          <Section title="Sinais de que vale procurar ajuda profissional">
            <Bullet>Tristeza ou ansiedade intensa há mais de 2 semanas.</Bullet>
            <Bullet>Pensamentos de se machucar ou de não querer estar aqui.</Bullet>
            <Bullet>Sono muito ruim ou alimentação muito desregulada por dias seguidos.</Bullet>
            <Bullet>Sensação de que nada faz sentido e nada melhora.</Bullet>
            <Bullet>Isolamento que você não consegue mais quebrar sozinho(a).</Bullet>
            <Bullet>Uso de álcool/substâncias como única forma de aguentar.</Bullet>
          </Section>
        </StaggeredView>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
      <Typography variant="body" style={styles.sectionTitle}>{title}</Typography>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function ResourceRow({
  icon,
  tone = 'primary',
  title,
  sub,
  cta,
  onPress,
  isLast,
}: {
  icon: IconName;
  tone?: 'primary' | 'error';
  title: string;
  sub: string;
  cta?: string;
  onPress?: () => void;
  isLast?: boolean;
}) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  const color = tone === 'error' ? theme.colors.error : theme.colors.primary;
  return (
    <PressableScale
      onPress={onPress ?? (() => {})}
      style={[styles.resourceRow, isLast && { borderBottomWidth: 0 }]}
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={onPress ? `${title}. ${sub}${cta ? `. ${cta}` : ''}` : undefined}
    >
      <View style={[styles.resourceIconWrap, { backgroundColor: color + '18', borderColor: color + '30' }]}>
        <Icon name={icon} size={16} color={color} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Typography variant="body" style={styles.resourceTitle}>{title}</Typography>
        <Typography variant="body" style={styles.resourceSub}>{sub}</Typography>
      </View>
      {cta && onPress && (
        <View style={[styles.ctaBtn, { backgroundColor: color }]}>
          <Typography variant="body" style={styles.ctaText}>{cta}</Typography>
          <Icon name="arrow-right" size={11} color="#fff" strokeWidth={2.6} />
        </View>
      )}
    </PressableScale>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  const theme = useTheme();
  return (
    <View style={styles.bullet}>
      <Icon name="check" size={12} color={theme.colors.primary} strokeWidth={2.6} />
      <Typography variant="body" style={[styles.p, styles.pBullet]}>{children}</Typography>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    scroll: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    banner: {
      backgroundColor: theme.colors.primary + '0F',
      borderColor: theme.colors.primary + '50',
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      ...theme.shadow.sm,
    },
    bannerIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary + '22',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    bannerTitle: {
      color: theme.colors.primary,
      fontFamily: 'InstrumentSerif_400Regular',
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.3,
    },
    bannerText: { ...theme.text.body, color: theme.colors.text, lineHeight: 22 },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'JetBrainsMono_500Medium',
      paddingHorizontal: 4,
    },
    sectionContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
      ...theme.shadow.sm,
    },
    resourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '80',
    },
    resourceIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    resourceTitle: {
      color: theme.colors.text,
      fontFamily: 'PlusJakartaSans_700Bold',
      fontSize: 14.5,
      letterSpacing: 0.1,
    },
    resourceSub: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 14 },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
    },
    ctaText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
      fontFamily: 'PlusJakartaSans_700Bold',
      letterSpacing: 0.2,
    },
    p: { ...theme.text.body, color: theme.colors.textSecondary, lineHeight: 22, padding: theme.spacing.md },
    pBullet: { flex: 1, padding: 0, paddingBottom: 0 },
    bullet: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
    },
  });
}
