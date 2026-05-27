import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '@/components/ui';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function Terms() {
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityLabel="Fechar"
          accessibilityRole="button"
        >
          <Typography variant="body">✕</Typography>
        </Pressable>
        <Typography variant="heading">Termos</Typography>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography variant="title">Termos de uso</Typography>
        <Typography variant="mono" tone="dim" style={styles.meta}>
          Versão local · 2026-05-16
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          O que o Mascote é
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          Um app de wellness, autocuidado e gamificação leve. Não é app médico, não é terapia, não dá diagnóstico,
          não substitui acompanhamento profissional. Em momentos de crise:{' '}
          <Typography variant="bodyBold">CVV 188</Typography>.
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          O que o Mascote NÃO faz
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          Não promete cura, não diagnostica transtornos, não prescreve nada, não substitui psicólogo, psiquiatra ou
          médico. A IA pode errar — não tome o que ela diz como verdade absoluta nem como conselho profissional.
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          Idade mínima
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          16 anos. Entre 16 e 18, idealmente com aprovação dos pais ou responsável.
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          Seu mascote
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          O mascote pertence a você enquanto a conta existir. Deletou a conta, apagou o mascote. Não há servidor.
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          Uso saudável
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          Esse app não foi feito pra ser viciante. Se você sentir que está usando demais ou que ele virou um substituto
          para vínculos humanos, pause por 30 dias nas configurações ou converse com um profissional.
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          Pagamento
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          Nessa versão local, não há cobrança. O paywall existente é demo. Quando virar produto real, será R$ 19,90/mês
          ou R$ 149/ano com 7 dias de teste, cobrança via Apple/Google.
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          Encerramento
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          Você pode encerrar a qualquer momento em &quot;Excluir conta&quot;. Reservamos o direito de encerrar contas em caso de
          uso abusivo (spam, conteúdo ilegal, fraude).
        </Typography>

        <Typography variant="bodyBold" style={styles.section}>
          Foro
        </Typography>
        <Typography variant="body" tone="secondary" style={styles.p}>
          Comarca do domicílio do consumidor (CDC).
        </Typography>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.bg },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    close: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: { padding: theme.spacing.lg, gap: theme.spacing.sm },
    meta: { marginBottom: theme.spacing.md },
    section: { marginTop: theme.spacing.lg },
    p: { lineHeight: 22 },
  });
}
