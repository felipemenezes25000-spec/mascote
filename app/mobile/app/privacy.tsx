import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

export default function Privacy() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Privacidade</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Política de privacidade</Text>
        <Text style={styles.meta}>Versão local · atualizada em 2026-05-16</Text>

        <Text style={styles.h2}>O resumo de 30 segundos</Text>
        <Text style={styles.p}>
          Esse app roda 100% no seu dispositivo. Você é a única pessoa que tem acesso aos seus dados. Não enviamos nada
          pra nenhum servidor — exceto se você optar por conectar uma chave da OpenAI, caso em que suas mensagens
          vão diretamente pra OpenAI (e voltam) sem passar por nós.
        </Text>

        <Text style={styles.h2}>O que coletamos localmente</Text>
        <Bullet>Seu nome e o nome do mascote.</Bullet>
        <Bullet>Idade aproximada (faixa), só se você informar.</Bullet>
        <Bullet>Hábitos registrados (água, sono, exercício, etc.) e quantidades.</Bullet>
        <Bullet>XP, nível, fase do mascote, streak.</Bullet>
        <Bullet>Mensagens trocadas no chat.</Bullet>
        <Bullet>Conquistas, acessórios e cenários desbloqueados.</Bullet>
        <Bullet>Configurações (tema, idioma, notificações, etc.).</Bullet>

        <Text style={styles.h2}>O que NÃO coletamos</Text>
        <Bullet>Localização, contatos, fotos, microfone, biometria.</Bullet>
        <Bullet>Dados financeiros.</Bullet>
        <Bullet>Informação clínica ou diagnóstica.</Bullet>

        <Text style={styles.h2}>Onde os dados ficam</Text>
        <Text style={styles.p}>
          Em armazenamento local do dispositivo (AsyncStorage no celular, localStorage no navegador). Nada sai daí.
          Quando você ativar a chave da OpenAI, as mensagens vão direto da sua máquina pra OpenAI.
        </Text>

        <Text style={styles.h2}>Seus direitos</Text>
        <Bullet>Ver seus dados: "Exportar meus dados" nas configurações exibe tudo em JSON.</Bullet>
        <Bullet>Corrigir: edita perfil e nome do mascote em "Configurações".</Bullet>
        <Bullet>Apagar: "Excluir conta" remove tudo localmente, sem volta.</Bullet>
        <Bullet>Revogar consentimentos: toggles em "Configurações".</Bullet>

        <Text style={styles.h2}>Quando virar produto real</Text>
        <Text style={styles.p}>
          Esse texto vai ser substituído por uma política completa em conformidade com a LGPD: bases legais por dado,
          processadores (OpenAI, RevenueCat, etc.), retenção, transferência internacional, DPO, contato com
          ANPD. Por ora, app é local — então a política curta basta.
        </Text>

        <Text style={styles.h2}>Idade</Text>
        <Text style={styles.p}>
          App pensado para 16+. Menores de 16: peço pra você não usar. 16–18: idealmente com consentimento parental.
        </Text>

        <Text style={styles.h2}>Contato</Text>
        <Text style={styles.p}>
          Quando o produto for ao ar: <Text style={styles.code}>dpo@meumascote.app</Text>. Por ora, fala com o Felipe.
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={[styles.p, { flex: 1 }]}>{children}</Text>
    </View>
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
  h1: { ...theme.text.h1, color: theme.colors.text, marginBottom: 4 },
  h2: { ...theme.text.bodyBold, color: theme.colors.text, marginTop: theme.spacing.lg },
  meta: { ...theme.text.xs, color: theme.colors.textDim, marginBottom: theme.spacing.md },
  p: { ...theme.text.body, color: theme.colors.textSecondary, lineHeight: 22 },
  bullet: { flexDirection: 'row', gap: theme.spacing.sm },
  bulletDot: { color: theme.colors.primary, fontSize: 16, lineHeight: 22 },
  code: { fontFamily: 'monospace', color: theme.colors.text },
});
}
