import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';

import { Typography } from '@/components/ui';
export default function Privacy() {
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <Typography variant="body" style={styles.closeText}>✕</Typography>
        </Pressable>
        <Typography variant="body" style={styles.headerTitle}>Privacidade</Typography>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Typography variant="body" style={styles.h1}>Política de privacidade</Typography>
        <Typography variant="body" style={styles.meta}>Atualizada em 2026-05-27</Typography>

        <Typography variant="body" style={styles.h2}>O resumo de 30 segundos</Typography>
        <Typography variant="body" style={styles.p}>
          Esse app roda 100% no seu dispositivo. Você é a única pessoa que tem acesso aos seus dados. Não enviamos nada
          pra nenhum servidor — exceto se você optar por conectar uma chave da OpenAI, caso em que suas mensagens
          vão diretamente pra OpenAI (e voltam) sem passar por nós.
        </Typography>

        <Typography variant="body" style={styles.h2}>O que coletamos localmente</Typography>
        <Bullet>Seu nome e o nome do mascote.</Bullet>
        <Bullet>Idade aproximada (faixa), só se você informar.</Bullet>
        <Bullet>Hábitos registrados (água, sono, exercício, etc.) e quantidades.</Bullet>
        <Bullet>XP, nível, fase do mascote, streak.</Bullet>
        <Bullet>Mensagens trocadas no chat.</Bullet>
        <Bullet>Conquistas, acessórios e cenários desbloqueados.</Bullet>
        <Bullet>Configurações (tema, idioma, notificações, etc.).</Bullet>

        <Typography variant="body" style={styles.h2}>O que NÃO coletamos</Typography>
        <Bullet>Localização, contatos, fotos, microfone, biometria.</Bullet>
        <Bullet>Dados financeiros.</Bullet>
        <Bullet>Informação clínica ou diagnóstica.</Bullet>

        <Typography variant="body" style={styles.h2}>Onde os dados ficam</Typography>
        <Typography variant="body" style={styles.p}>
          Em armazenamento local do dispositivo (AsyncStorage no celular, localStorage no navegador). Nada sai daí.
          Quando você ativar a chave da OpenAI, as mensagens vão direto da sua máquina pra OpenAI.
        </Typography>

        <Typography variant="body" style={styles.h2}>Seus direitos</Typography>
        <Bullet>Ver seus dados: "Exportar meus dados" nas configurações exibe tudo em JSON.</Bullet>
        <Bullet>Corrigir: edita perfil e nome do mascote em "Configurações".</Bullet>
        <Bullet>Apagar: "Excluir conta" remove tudo localmente, sem volta.</Bullet>
        <Bullet>Revogar consentimentos: toggles em "Configurações".</Bullet>

        <Typography variant="body" style={styles.h2}>Base legal (LGPD)</Typography>
        <Typography variant="body" style={styles.p}>
          Coleta com base em consentimento (newsletter, opt-ins) e execução de contrato (uso do app). Você pode pedir
          exclusão a qualquer momento — &quot;Excluir conta&quot; em Configurações apaga tudo localmente; para suporte, escreva
          pra <Typography variant="body" style={styles.code}>oi@meumascote.app</Typography> e respondemos em 7 dias úteis.
        </Typography>

        <Typography variant="body" style={styles.h2}>Idade</Typography>
        <Typography variant="body" style={styles.p}>
          App pensado para 16+. Menores de 16: peço pra você não usar. 16–18: idealmente com consentimento parental.
        </Typography>

        <Typography variant="body" style={styles.h2}>Contato</Typography>
        <Typography variant="body" style={styles.p}>
          Dúvida, pedido de exclusão, reclamação: <Typography variant="body" style={styles.code}>oi@meumascote.app</Typography>.
          Encarregado de proteção de dados: o mesmo e-mail (somos pequenos, sem rodeio).
        </Typography>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.bullet}>
      <Typography variant="body" style={styles.bulletDot}>•</Typography>
      <Typography variant="body" style={[styles.p, { flex: 1 }]}>{children}</Typography>
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
