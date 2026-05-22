import { router, Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { personalities, getPersonality } from '@/content/personalities';
import { addDays, exportAll, importAll, mascots as mascotsDb, profiles, resetAll, settings as settingsDb, todayLocal } from '@/lib/db';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality, Settings, ThemeMode } from '@/types';

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const settings = useStore(s => s.settings);
  const apiKey = useStore(s => s.openAiKey);
  const setMascot = useStore(s => s.setMascot);
  const setProfile = useStore(s => s.setProfile);
  const setSettings = useStore(s => s.setSettings);
  const setOpenAiKey = useStore(s => s.setOpenAiKey);
  const refreshSettings = useStore(s => s.refreshSettings);
  const resetStore = useStore(s => s.reset);
  const hydrate = useStore(s => s.hydrate);

  const [editingName, setEditingName] = useState(false);
  const [userNameDraft, setUserNameDraft] = useState(profile?.display_name ?? '');
  const [editingMascotName, setEditingMascotName] = useState(false);
  const [mascotNameDraft, setMascotNameDraft] = useState(mascot?.name ?? '');
  const [editingPersonality, setEditingPersonality] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importDraft, setImportDraft] = useState('');

  if (!profile || !mascot || !settings) return <Redirect href="/splash" />;

  async function saveUserName() {
    if (!userNameDraft.trim()) return;
    const updated = await profiles.upsert({ display_name: userNameDraft.trim() });
    setProfile(updated);
    setEditingName(false);
  }

  async function saveMascotName() {
    if (!mascotNameDraft.trim() || !mascot) return;
    const updated = await mascotsDb.upsert({ user_id: mascot.user_id, name: mascotNameDraft.trim() });
    setMascot(updated);
    setEditingMascotName(false);
  }

  async function changePersonality(p: Personality) {
    if (!mascot || p === mascot.personality) return;
    const updated = await mascotsDb.upsert({ user_id: mascot.user_id, personality: p });
    setMascot(updated);
    setEditingPersonality(false);
  }

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!profile || !settings) return;
    // Persist primeiro, depois aplica no store — se DB falhar, store fica intacto.
    // Antes: `setSettings(next)` rodava só após sucesso, mas sem catch o erro
    // subia silenciosamente em onPress (Switch trocava visualmente via state
    // controlado pelo `settings.X`, mas update falhava e UI ficava mentindo).
    try {
      const next = await settingsDb.update(profile.id, { [key]: value } as Partial<Settings>);
      setSettings(next);
    } catch (err) {
      Alert.alert(
        'Não consegui salvar',
        'Tenta de novo em alguns segundos. Se persistir, reinicia o app.',
      );
    }
  }

  async function pause30Days() {
    if (!profile) return;
    const until = addDays(todayLocal(), 30);
    await settingsDb.update(profile.id, { paused_until: until });
    await refreshSettings();
    Alert.alert('Pausa ativada', `Mascote pausado até ${until}. Volta quando quiser.`);
  }

  async function resumeNow() {
    if (!profile) return;
    await settingsDb.update(profile.id, { paused_until: null });
    await refreshSettings();
  }

  async function exportData() {
    if (!profile) return;
    const data = await exportAll(profile.id);
    const json = JSON.stringify(data, null, 2);
    // Copia pro clipboard. NUNCA usar console.log: vaza no Logcat/Flipper.
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(json);
      Alert.alert(
        'Dados copiados',
        `${Object.keys(data).length} tabelas (${json.length} caracteres) copiadas pro clipboard. Cola num bloco de notas ou e-mail seguro.`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert(
        'Falha ao copiar',
        'Não consegui acessar o clipboard. Use a opção de importar/exportar via JSON manualmente.',
        [{ text: 'OK' }]
      );
    }
  }

  async function doImport() {
    try {
      const parsed = JSON.parse(importDraft);
      if (typeof parsed !== 'object' || !parsed) throw new Error('JSON inválido');
      Alert.alert(
        'Restaurar dados',
        'Isso vai SOBRESCREVER tudo que você tem agora. Vai precisar reiniciar o app pra ver as mudanças. Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              await importAll(parsed);
              if (profile) {
                const { clearMemoryCaches } = await import('@/lib/memory');
                clearMemoryCaches(profile.id);
              }
              await hydrate();
              setShowImport(false);
              setImportDraft('');
              Alert.alert('Restaurado', 'Dados importados com sucesso.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)') },
              ]);
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('JSON inválido', 'Não consegui ler. Verifica o formato.');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Excluir conta',
      'Vai apagar TUDO: perfil, mascote, check-ins, conversas, acessórios. Sem volta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Tenho certeza',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Tem certeza mesmo?',
              'Última chance. Vou apagar tudo localmente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Apagar',
                  style: 'destructive',
                  onPress: async () => {
                    await resetAll();
                    resetStore();
                    await hydrate();
                    router.replace('/onboarding/welcome');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  const themeOptions: ThemeMode[] = ['system', 'light', 'dark'];
  const pmeta = getPersonality(mascot.personality);
  const paused = settings.paused_until && settings.paused_until > todayLocal();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar configurações"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Perfil */}
        <Section title="Perfil">
          <Row label="Seu nome" right={profile.display_name} onPress={() => setEditingName(true)} />
          {editingName && (
            <View style={styles.editBox}>
              <TextInput value={userNameDraft} onChangeText={setUserNameDraft} style={styles.input} maxLength={40} />
              <View style={styles.rowBtns}>
                <Button variant="secondary" label="Cancelar" style={{ flex: 1 }} onPress={() => setEditingName(false)} />
                <Button label="Salvar" style={{ flex: 1 }} onPress={saveUserName} />
              </View>
            </View>
          )}
        </Section>

        {/* Mascote */}
        <Section title={`${mascot.name} · ${pmeta.label}`}>
          <Row
            label="Nome do mascote"
            right={mascot.name}
            onPress={() => {
              setMascotNameDraft(mascot.name);
              setEditingMascotName(true);
            }}
          />
          {editingMascotName && (
            <View style={styles.editBox}>
              <TextInput value={mascotNameDraft} onChangeText={setMascotNameDraft} style={styles.input} maxLength={30} />
              <View style={styles.rowBtns}>
                <Button variant="secondary" label="Cancelar" style={{ flex: 1 }} onPress={() => setEditingMascotName(false)} />
                <Button label="Salvar" style={{ flex: 1 }} onPress={saveMascotName} />
              </View>
            </View>
          )}
          <Row label="Personalidade" right={pmeta.label} onPress={() => setEditingPersonality(v => !v)} />
          {editingPersonality && (
            <View style={styles.editBox}>
              <Text style={styles.hint}>Atenção: o tom da IA muda. Conversas anteriores ficam.</Text>
              <View style={styles.personalityGrid}>
                {personalities.map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => changePersonality(p.id)}
                    style={[
                      styles.personalityPill,
                      mascot.personality === p.id && { backgroundColor: p.primaryColor, borderColor: p.primaryColor },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: p.primaryColor }]} />
                    <Text style={[
                      styles.personalityText,
                      mascot.personality === p.id && { color: theme.tokens.semantic.inkOnBrand, fontWeight: '700' },
                    ]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <Pressable onPress={() => router.push('/settings/personalization')} style={styles.linkRow}>
            <Text style={styles.linkText}>Personalização completa (estilo Sims)</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/closet')} style={styles.linkRow}>
            <Text style={styles.linkText}>Guarda-roupa · acessórios e cenários</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/achievements')} style={styles.linkRow}>
            <Text style={styles.linkText}>Conquistas</Text>
          </Pressable>
        </Section>

        {/* Aparência */}
        <Section title="Aparência">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Tema</Text>
            <View style={styles.segment}>
              {themeOptions.map(opt => (
                <Pressable
                  key={opt}
                  onPress={() => updateSetting('theme_mode', opt)}
                  style={[styles.segmentItem, settings.theme_mode === opt && styles.segmentItemActive]}
                >
                  <Text
                    style={[styles.segmentText, settings.theme_mode === opt && styles.segmentTextActive]}
                  >
                    {opt === 'system' ? 'Sistema' : opt === 'light' ? 'Claro' : 'Escuro'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <ToggleRow
            label="Reduzir animações"
            value={settings.reduce_motion}
            onChange={v => updateSetting('reduce_motion', v)}
          />
          <ToggleRow
            label="Texto dinâmico do sistema"
            value={settings.dynamic_text}
            onChange={v => updateSetting('dynamic_text', v)}
          />
          <ToggleRow
            label="Alto contraste"
            value={settings.high_contrast}
            onChange={v => updateSetting('high_contrast', v)}
          />
        </Section>

        {/* Notificações */}
        <Section title="Notificações">
          <ToggleRow
            label="Permitir notificações"
            value={settings.push_enabled}
            onChange={v => updateSetting('push_enabled', v)}
          />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Não perturbar</Text>
            <Text style={styles.rowRight}>{settings.quiet_start} – {settings.quiet_end}</Text>
          </View>
          <Text style={styles.hintSmall}>
            (No app local não enviamos push real, mas o horário fica salvo pra quando ligar o servidor.)
          </Text>
        </Section>

        {/* Plano */}
        <Section title="Plano">
          <Pressable onPress={() => router.push('/subscription')} style={styles.linkRow}>
            <Text style={styles.linkText}>Assinatura e planos</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/cancel')} style={styles.linkRow}>
            <Text style={styles.linkText}>Pausar ou cancelar assinatura</Text>
          </Pressable>
        </Section>

        {/* Pausa */}
        <Section title="Pausa">
          {paused ? (
            <View style={styles.editBox}>
              <Text style={styles.hint}>Pausado até {settings.paused_until}</Text>
              <Button label="Voltar agora" onPress={resumeNow} />
            </View>
          ) : (
            <View style={styles.editBox}>
              <Text style={styles.hint}>
                Pausa por 30 dias sem perder dados. Mascote fica esperando.
              </Text>
              <Button variant="secondary" label="Pausar por 30 dias" onPress={pause30Days} />
            </View>
          )}
        </Section>

        {/* IA */}
        <Section title="Inteligência artificial">
          <Text style={styles.hint}>
            {apiKey
              ? '✓ Conversas usando sua chave OpenAI (gpt-4o-mini, BYOK).'
              : 'Modo offline. Respostas pré-escritas seguras por personalidade.'}
          </Text>
          <Text style={styles.hintSmall}>
            Por padrão o app funciona offline. Se você optar por conectar uma
            chave (BYOK = "bring your own key"), suas mensagens passam pela
            OpenAI — só você paga, só você decide.
          </Text>
          {!showKey ? (
            <Button
              variant="ghost"
              label={apiKey ? 'Trocar chave OpenAI' : 'Conectar chave (BYOK)'}
              onPress={() => setShowKey(true)}
            />
          ) : (
            <View style={styles.editBox}>
              <TextInput
                value={keyDraft}
                onChangeText={setKeyDraft}
                placeholder="sk-..."
                placeholderTextColor={theme.colors.textDim}
                style={styles.inputMono}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                maxLength={200}
              />
              <View style={styles.rowBtns}>
                <Button variant="secondary" label="Cancelar" style={{ flex: 1 }} onPress={() => { setShowKey(false); setKeyDraft(''); }} />
                <Button label="Salvar" style={{ flex: 1 }} onPress={() => {
                  setOpenAiKey(keyDraft.trim() || null);
                  setShowKey(false);
                  setKeyDraft('');
                }} />
              </View>
              <Text style={styles.hintSmall}>
                A chave fica criptografada no Keychain/Keystore do aparelho.
                Mensagens viajam direto pra OpenAI — sem nosso servidor.
                Quando o proxy oficial estiver no ar, ele será preferido
                automaticamente e você pode remover a chave sem perder o
                modo IA.
              </Text>
            </View>
          )}
          {apiKey && (
            <Button variant="ghost" label="Remover chave" onPress={() => setOpenAiKey(null)} />
          )}
        </Section>

        {/* Privacidade */}
        <Section title="Privacidade e dados">
          <ToggleRow
            label="Permitir analytics anônimo"
            value={settings.consent_analytics}
            onChange={v => updateSetting('consent_analytics', v)}
          />
          <Pressable onPress={() => router.push('/feedback')} style={styles.linkRow}>
            <Text style={styles.linkText}>Enviar feedback</Text>
          </Pressable>
          <Pressable onPress={exportData} style={styles.linkRow}>
            <Text style={styles.linkText}>Exportar meus dados (JSON)</Text>
          </Pressable>
          <Pressable onPress={() => setShowImport(s => !s)} style={styles.linkRow}>
            <Text style={styles.linkText}>{showImport ? 'Cancelar importação' : 'Importar dados (JSON)'}</Text>
          </Pressable>
          {showImport && (
            <View style={styles.editBox}>
              <Text style={styles.hint}>
                Cole o JSON exportado anteriormente. Isso vai sobrescrever tudo.
              </Text>
              <TextInput
                value={importDraft}
                onChangeText={setImportDraft}
                placeholder='{"profiles": [...], ...}'
                placeholderTextColor={theme.colors.textDim}
                style={styles.inputMono}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button label="Restaurar" onPress={doImport} disabled={!importDraft.trim()} />
            </View>
          )}
          <Pressable onPress={() => router.push('/privacy')} style={styles.linkRow}>
            <Text style={styles.linkText}>Política de privacidade</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/terms')} style={styles.linkRow}>
            <Text style={styles.linkText}>Termos de uso</Text>
          </Pressable>
        </Section>

        {/* Ajuda */}
        <Section title="Ajuda e suporte">
          <Pressable onPress={() => router.push('/help')} style={styles.linkRow}>
            <Text style={styles.linkText}>Recursos de bem-estar e crise</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/weekly-report')} style={styles.linkRow}>
            <Text style={styles.linkText}>Ver relatório da semana</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/monthly-report')} style={styles.linkRow}>
            <Text style={styles.linkText}>Retrospectiva do mês</Text>
          </Pressable>
        </Section>

        {/* Conta */}
        <Section title="Zona de perigo">
          <Button variant="ghost" label="Excluir conta" onPress={confirmDelete} />
        </Section>

        <Text style={styles.disclaimer}>
          Mascote é wellness e autocuidado. Não substitui acompanhamento profissional. Em crise: CVV 188.
        </Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ label, right, onPress }: { label: string; right?: string; onPress?: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right && <Text style={styles.rowRight}>{right}</Text>}
      {onPress && <Text style={styles.chev}>›</Text>}
    </Pressable>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
      />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeText: { fontSize: 16, color: theme.colors.text },
  headerTitle: { ...theme.text.h3, color: theme.colors.text },
  scroll: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg },
  sectionTitle: {
    ...theme.text.xs,
    color: theme.colors.textSecondary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '80',
  },
  rowLabel: { ...theme.text.body, color: theme.colors.text, flex: 1 },
  rowRight: { ...theme.text.sm, color: theme.colors.textSecondary },
  chev: { color: theme.colors.textDim, fontSize: 22, marginLeft: 6 },
  linkRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '80',
  },
  linkText: { ...theme.text.body, color: theme.colors.primary },
  editBox: { padding: theme.spacing.md, gap: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    fontSize: 16,
    color: theme.colors.text,
  },
  inputMono: {
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    fontSize: 14,
    color: theme.colors.text,
  },
  rowBtns: { flexDirection: 'row', gap: theme.spacing.sm },
  hint: { ...theme.text.sm, color: theme.colors.textSecondary, lineHeight: 18 },
  hintSmall: { ...theme.text.xs, color: theme.colors.textDim, lineHeight: 14, paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm },
  personalityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  personalityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  personalityText: { ...theme.text.sm, color: theme.colors.text, fontWeight: '600' },
  segment: { flexDirection: 'row', backgroundColor: theme.colors.bg, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, padding: 2 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.pill },
  segmentItemActive: { backgroundColor: theme.colors.primary },
  segmentText: { ...theme.text.xs, color: theme.colors.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: theme.tokens.semantic.inkOnBrand },
  disclaimer: {
    ...theme.text.xs,
    color: theme.colors.textDim,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    lineHeight: 16,
  },
});
}
