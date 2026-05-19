import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function Terms() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Termos</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Termos de uso</Text>
        <Text style={styles.meta}>Versão local · 2026-05-16</Text>

        <Text style={styles.h2}>O que o Mascote é</Text>
        <Text style={styles.p}>
          Um app de wellness, autocuidado e gamificação leve. Não é app médico, não é terapia, não dá diagnóstico,
          não substitui acompanhamento profissional. Em momentos de crise: <Text style={styles.bold}>CVV 188</Text>.
        </Text>

        <Text style={styles.h2}>O que o Mascote NÃO faz</Text>
        <Text style={styles.p}>
          Não promete cura, não diagnostica transtornos, não prescreve nada, não substitui psicólogo, psiquiatra ou
          médico. A IA pode errar — não tome o que ela diz como verdade absoluta nem como conselho profissional.
        </Text>

        <Text style={styles.h2}>Idade mínima</Text>
        <Text style={styles.p}>16 anos. Entre 16 e 18, idealmente com aprovação dos pais ou responsável.</Text>

        <Text style={styles.h2}>Seu mascote</Text>
        <Text style={styles.p}>
          O mascote pertence a você enquanto a conta existir. Deletou a conta, apagou o mascote. Não há servidor.
        </Text>

        <Text style={styles.h2}>Uso saudável</Text>
        <Text style={styles.p}>
          Esse app não foi feito pra ser viciante. Se você sentir que está usando demais ou que ele virou um substituto
          para vínculos humanos, pause por 30 dias nas configurações ou converse com um profissional.
        </Text>

        <Text style={styles.h2}>Pagamento</Text>
        <Text style={styles.p}>
          Nessa versão local, não há cobrança. O paywall existente é demo. Quando virar produto real, será R$ 19,90/mês
          ou R$ 149/ano com 7 dias de teste, cobrança via Apple/Google.
        </Text>

        <Text style={styles.h2}>Encerramento</Text>
        <Text style={styles.p}>
          Você pode encerrar a qualquer momento em "Excluir conta". Reservamos o direito de encerrar contas em caso de
          uso abusivo (spam, conteúdo ilegal, fraude).
        </Text>

        <Text style={styles.h2}>Foro</Text>
        <Text style={styles.p}>
          Comarca do domicílio do consumidor (CDC).
        </Text>

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
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontSize: 16, color: theme.colors.text },
  headerTitle: { ...theme.text.h3, color: theme.colors.text },
  scroll: { padding: theme.spacing.lg, gap: theme.spacing.sm },
  h1: { ...theme.text.h1, color: theme.colors.text },
  h2: { ...theme.text.bodyBold, color: theme.colors.text, marginTop: theme.spacing.lg },
  meta: { ...theme.text.xs, color: theme.colors.textDim, marginBottom: theme.spacing.md },
  p: { ...theme.text.body, color: theme.colors.textSecondary, lineHeight: 22 },
  bold: { fontWeight: '700', color: theme.colors.text },
});
}
