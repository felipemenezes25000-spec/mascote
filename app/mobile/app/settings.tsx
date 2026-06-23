import { router, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { personalities, getPersonality } from '@/content/personalities';
import { addDays, exportAll, importAll, mascots as mascotsDb, profiles, resetAll, settings as settingsDb, todayLocal } from '@/lib/db';
import { clearApiKey, getApiKey, setApiKey } from '@/lib/ai/credentials';
import { sanitizeDisplayName } from '@/lib/identity/displayName';
import { setSfxEnabled } from '@/lib/sfx';
import { t } from '@/lib/i18n';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { Personality, Settings, ThemeMode } from '@/types';

import { Typography } from '@/components/ui';
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
  const [exportingData, setExportingData] = useState(false);
  // keyConfigured replica em estado UI uma checagem direta no SecureStore.
  // Permite mostrar o status correto mesmo se o store ainda não hidratou
  // o apiKey (cold start). Atualizado também depois de salvar/remover.
  const [keyConfigured, setKeyConfigured] = useState<boolean>(Boolean(apiKey));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const k = await getApiKey();
      if (!cancelled) setKeyConfigured(Boolean(k));
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Sincroniza o gate global de SFX com a preferência persistida ao abrir a
  // tela (best-effort: sem hydration no boot — call-sites com settings em
  // mãos passam override por chamada; vê src/lib/sfx/player.ts).
  useEffect(() => {
    if (settings) setSfxEnabled(settings.sfx_enabled !== false);
  }, [settings]);

  if (!profile || !mascot || !settings) return <Redirect href="/splash" />;

  async function saveUserName() {
    // Sanitiza antes de persistir: rejeita lixo tipo "hm,mjh" ou ",,," que
    // depois vaza em copy poética do mascote/diário/header. Helper já é
    // shared com diary (mascotDiary.ts) e HomeHeader.
    const sanitized = sanitizeDisplayName(userNameDraft);
    if (!sanitized) {
      Alert.alert(
        t('onboarding.name.invalid_alert_title'),
        t('onboarding.name.invalid_alert_body'),
      );
      return;
    }
    const updated = await profiles.upsert({ display_name: sanitized });
    setProfile(updated);
    setEditingName(false);
  }

  async function saveMascotName() {
    if (!mascot) return;
    const trimmed = mascotNameDraft.trim();
    // Espelha saveUserName: dá feedback em vez de no-op silencioso quando o
    // campo está vazio/só espaços (auditoria 2026-05-29).
    if (!trimmed) {
      Alert.alert(t('onboarding.name.invalid_alert_title'), t('settings.alert_mascot_name_body'));
      return;
    }
    const updated = await mascotsDb.upsert({ user_id: mascot.user_id, name: trimmed });
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
        t('settings.save_fail_title'),
        t('settings.save_fail_body'),
      );
    }
  }

  async function pause30Days() {
    if (!profile) return;
    const until = addDays(todayLocal(), 30);
    await settingsDb.update(profile.id, { paused_until: until });
    await refreshSettings();
    Alert.alert(t('settings.pause_on_title'), t('settings.pause_on_body', until));
  }

  async function resumeNow() {
    if (!profile) return;
    await settingsDb.update(profile.id, { paused_until: null });
    await refreshSettings();
  }

  async function exportData() {
    if (!profile || exportingData) return;
    setExportingData(true);
    try {
      const data = await exportAll(profile.id);
      const json = JSON.stringify(data, null, 2);
      // Copia pro clipboard. NUNCA usar console.log: vaza no Logcat/Flipper.
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(json);
      Alert.alert(
        t('settings.export_ok_title'),
        t('settings.export_ok_body', Object.keys(data).length, json.length),
        [{ text: t('common.ok') }]
      );
    } catch {
      Alert.alert(
        t('settings.export_fail_title'),
        t('settings.export_fail_body'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setExportingData(false);
    }
  }

  async function doImport() {
    try {
      const parsed = JSON.parse(importDraft);
      if (typeof parsed !== 'object' || !parsed) throw new Error('JSON inválido');
      // Schema-shape guard: importAll aceita Record<string, unknown[]>.
      // Sem validar, qualquer JSON estranho (com numbers/strings nas
      // chaves) era passado pro importer, que processava silenciosamente
      // (ou crashava num lugar feio). Verifica top-level keys serem
      // arrays antes de prosseguir.
      const obj = parsed as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (!Array.isArray(v)) {
          throw new Error(`Tabela "${k}" precisa ser array.`);
        }
      }
      Alert.alert(
        t('settings.import_confirm_title'),
        t('settings.import_confirm_body'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.restore'),
            style: 'destructive',
            onPress: async () => {
              await importAll(parsed as Record<string, unknown[]>);
              if (profile) {
                const { clearMemoryCaches } = await import('@/lib/memory');
                clearMemoryCaches(profile.id);
              }
              await hydrate();
              setShowImport(false);
              setImportDraft('');
              Alert.alert(t('settings.import_ok_title'), t('settings.import_ok_body'), [
                { text: t('common.ok'), onPress: () => router.replace('/(tabs)') },
              ]);
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert(t('settings.import_invalid_title'), t('settings.import_invalid_body'));
    }
  }

  function confirmDelete() {
    Alert.alert(
      t('settings.delete_account'),
      t('settings.delete_confirm_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_confirm_yes'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.delete_final_title'),
              t('settings.delete_final_body'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.delete_final_yes'),
                  style: 'destructive',
                  onPress: async () => {
                    // resetAll() limpa o DB local (AsyncStorage). Mas a chave
                    // OpenAI vive no SecureStore (keychain/keystore), que NÃO
                    // é tocado por resetAll. Sem clearApiKey aqui, "Excluir
                    // conta" deixava a chave persistida — usuário criava
                    // novo perfil e a chave anterior ressurgia em hydrate().
                    // Gap de LGPD (right-to-erasure): exclusão precisa ser
                    // total. Auditoria 2026-05-27.
                    await clearApiKey();
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
          accessibilityLabel={t('settings.close_a11y')}
        >
          <Typography variant="body" style={styles.closeText}>✕</Typography>
        </Pressable>
        <Typography variant="body" style={styles.headerTitle}>{t('settings.title')}</Typography>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Perfil */}
        <Section title={t('settings.sec_profile')}>
          <Row label={t('settings.your_name')} right={profile.display_name} onPress={() => setEditingName(true)} />
          {editingName && (
            <View style={styles.editBox}>
              <TextInput value={userNameDraft} onChangeText={setUserNameDraft} style={styles.input} maxLength={40} />
              <View style={styles.rowBtns}>
                <Button variant="secondary" label={t('common.cancel')} style={{ flex: 1 }} onPress={() => setEditingName(false)} />
                <Button label={t('common.save')} style={{ flex: 1 }} onPress={saveUserName} />
              </View>
            </View>
          )}
        </Section>

        {/* Mascote */}
        <Section title={`${mascot.name} · ${pmeta.label}`}>
          <Row
            label={t('settings.mascot_name')}
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
                <Button variant="secondary" label={t('common.cancel')} style={{ flex: 1 }} onPress={() => setEditingMascotName(false)} />
                <Button label={t('common.save')} style={{ flex: 1 }} onPress={saveMascotName} />
              </View>
            </View>
          )}
          <Row label={t('settings.personality')} right={pmeta.label} onPress={() => setEditingPersonality(v => !v)} />
          {editingPersonality && (
            <View style={styles.editBox}>
              <Typography variant="body" style={styles.hint}>{t('settings.personality_warn')}</Typography>
              <View style={styles.personalityGrid}>
                {personalities.map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => changePersonality(p.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: mascot.personality === p.id }}
                    accessibilityLabel={p.label}
                    style={[
                      styles.personalityPill,
                      mascot.personality === p.id && { backgroundColor: p.primaryColor, borderColor: p.primaryColor },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: p.primaryColor }]} />
                    <Typography variant="body" style={[
                      styles.personalityText,
                      mascot.personality === p.id && { color: theme.tokens.semantic.inkOnBrand, fontWeight: '700' },
                    ]}>
                      {p.label}
                    </Typography>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <Pressable onPress={() => router.push('/settings/personalization')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_personalization')}</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/closet')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_closet')}</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/achievements')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_achievements')}</Typography>
          </Pressable>
        </Section>

        {/* Aparência */}
        <Section title={t('settings.sec_appearance')}>
          <View style={styles.row}>
            <Typography variant="body" style={styles.rowLabel}>{t('settings.theme')}</Typography>
            <View style={styles.segment}>
              {themeOptions.map(opt => (
                <Pressable
                  key={opt}
                  onPress={() => updateSetting('theme_mode', opt)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: settings.theme_mode === opt }}
                  accessibilityLabel={opt === 'system' ? t('settings.theme_system') : opt === 'light' ? t('settings.theme_light') : t('settings.theme_dark')}
                  style={[styles.segmentItem, settings.theme_mode === opt && styles.segmentItemActive]}
                >
                  <Typography variant="body"
                    style={[styles.segmentText, settings.theme_mode === opt && styles.segmentTextActive]}
                  >
                    {opt === 'system' ? t('settings.theme_system') : opt === 'light' ? t('settings.theme_light') : t('settings.theme_dark')}
                  </Typography>
                </Pressable>
              ))}
            </View>
          </View>
          <ToggleRow
            label={t('settings.reduce_motion')}
            value={settings.reduce_motion}
            onChange={v => updateSetting('reduce_motion', v)}
          />
          <ToggleRow
            label={t('settings.dynamic_text')}
            value={settings.dynamic_text}
            onChange={v => updateSetting('dynamic_text', v)}
          />
          <ToggleRow
            label={t('settings.high_contrast')}
            value={settings.high_contrast}
            onChange={v => updateSetting('high_contrast', v)}
          />
          <ToggleRow
            label={t('settings.sfx')}
            value={settings.sfx_enabled !== false}
            onChange={v => {
              // Gate global imediato (sem esperar persistência) + persiste.
              setSfxEnabled(v);
              void updateSetting('sfx_enabled', v);
            }}
          />
        </Section>

        {/* Notificações */}
        <Section title={t('settings.sec_notifications')}>
          <ToggleRow
            label={t('settings.allow_push')}
            value={settings.push_enabled}
            onChange={v => updateSetting('push_enabled', v)}
          />
          <View style={styles.row}>
            <Typography variant="body" style={styles.rowLabel}>{t('settings.dnd')}</Typography>
            <Typography variant="body" style={styles.rowRight}>{settings.quiet_start} – {settings.quiet_end}</Typography>
          </View>
          <Typography variant="body" style={styles.hintSmall}>
            {t('settings.push_local_hint')}
          </Typography>
        </Section>

        {/* Plano */}
        <Section title={t('settings.sec_plan')}>
          <Pressable onPress={() => router.push('/subscription')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_subscription')}</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/cancel')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_cancel')}</Typography>
          </Pressable>
        </Section>

        {/* Pausa */}
        <Section title={t('settings.sec_pause')}>
          {paused ? (
            <View style={styles.editBox}>
              <Typography variant="body" style={styles.hint}>{t('settings.paused_until', settings.paused_until)}</Typography>
              <Button label={t('settings.resume_now')} onPress={resumeNow} />
            </View>
          ) : (
            <View style={styles.editBox}>
              <Typography variant="body" style={styles.hint}>
                {t('settings.pause_body')}
              </Typography>
              <Button variant="secondary" label={t('settings.pause_cta')} onPress={pause30Days} />
            </View>
          )}
        </Section>

        {/* IA na nuvem (Plus) — wire to credentials helpers (validating wrapper)
            que também atualiza o store via setOpenAiKey. setApiKey valida prefixo
            e tamanho mínimo; em caso de erro, exibe Alert com a mensagem do throw. */}
        <Section title={t('settings.sec_ai')}>
          <Typography variant="body" style={styles.hint}>
            {keyConfigured ? t('settings.ai_status_on') : t('settings.ai_status_off')}
          </Typography>
          <Typography variant="body" style={styles.hintSmall}>
            {t('settings.ai_byok_hint')}
          </Typography>
          {!showKey ? (
            <Button
              variant="ghost"
              label={keyConfigured ? t('settings.key_change') : t('settings.key_connect')}
              onPress={() => setShowKey(true)}
              accessibilityLabel={keyConfigured ? t('settings.key_change') : t('settings.key_connect_a11y')}
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
                accessibilityLabel={t('settings.key_input_a11y')}
              />
              <View style={styles.rowBtns}>
                <Button variant="secondary" label={t('common.cancel')} style={{ flex: 1 }} onPress={() => { setShowKey(false); setKeyDraft(''); }} />
                <Button label={t('common.save')} style={{ flex: 1 }} onPress={async () => {
                  const trimmed = keyDraft.trim();
                  if (!trimmed) {
                    // Vazio = remover (mantém compat com fluxo anterior).
                    await clearApiKey();
                    setOpenAiKey(null);
                    setKeyConfigured(false);
                    setShowKey(false);
                    setKeyDraft('');
                    return;
                  }
                  // setApiKey valida prefixo e tamanho — lança Error pra UI mostrar.
                  try {
                    await setApiKey(trimmed);
                    setOpenAiKey(trimmed);
                    setKeyConfigured(true);
                    setShowKey(false);
                    setKeyDraft('');
                  } catch (err) {
                    Alert.alert(
                      t('settings.invalid_key_title'),
                      err instanceof Error ? err.message : t('settings.invalid_key_body'),
                    );
                  }
                }} />
              </View>
              <Typography variant="body" style={styles.hintSmall}>
                {t('settings.key_direct_hint')}
              </Typography>
            </View>
          )}
          {keyConfigured && !showKey && (
            <Button
              variant="ghost"
              label={t('settings.key_remove')}
              onPress={async () => {
                await clearApiKey();
                setOpenAiKey(null);
                setKeyConfigured(false);
              }}
              accessibilityLabel={t('settings.key_remove_a11y')}
            />
          )}
        </Section>

        {/* Privacidade */}
        <Section title={t('settings.sec_privacy')}>
          <Typography variant="body" style={styles.hintSmall}>
            {t('settings.privacy_hint')}
          </Typography>
          <ToggleRow
            label={t('settings.allow_analytics')}
            value={settings.consent_analytics}
            onChange={v => updateSetting('consent_analytics', v)}
          />
          <Pressable onPress={() => router.push('/feedback')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_feedback')}</Typography>
          </Pressable>
          <Pressable
            onPress={exportData}
            style={styles.linkRow}
            accessibilityRole="button"
            accessibilityLabel={t('settings.export_a11y')}
          >
            <Typography variant="body" style={styles.linkText}>{exportingData ? t('settings.export_doing') : t('settings.export')}</Typography>
          </Pressable>
          <Pressable onPress={() => setShowImport(s => !s)} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{showImport ? t('settings.import_cancel') : t('settings.import')}</Typography>
          </Pressable>
          {showImport && (
            <View style={styles.editBox}>
              <Typography variant="body" style={styles.hint}>
                {t('settings.import_hint')}
              </Typography>
              <TextInput
                value={importDraft}
                onChangeText={setImportDraft}
                placeholder='{"profiles": [...], ...}'
                placeholderTextColor={theme.colors.textDim}
                style={styles.inputMono}
                multiline
                maxLength={100000}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button label={t('settings.restore')} onPress={doImport} disabled={!importDraft.trim()} />
            </View>
          )}
          <Pressable onPress={() => router.push('/privacy')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_privacy')}</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/terms')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_terms')}</Typography>
          </Pressable>
        </Section>

        {/* Ajuda */}
        <Section title={t('settings.sec_help')}>
          <Pressable onPress={() => router.push('/help')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_help_crisis')}</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/weekly-report')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_weekly')}</Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/monthly-report')} style={styles.linkRow} accessibilityRole="button">
            <Typography variant="body" style={styles.linkText}>{t('settings.link_monthly')}</Typography>
          </Pressable>
        </Section>

        {/* Conta */}
        <Section title={t('settings.sec_danger')}>
          <Typography variant="body" style={styles.hintSmall}>
            {t('settings.danger_hint')}
          </Typography>
          <Button variant="ghost" label={t('settings.delete_account')} onPress={confirmDelete} />
        </Section>

        <Typography variant="body" style={styles.disclaimer}>
          {t('settings.disclaimer')}
        </Typography>
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
      <Typography variant="body" style={styles.sectionTitle}>{title}</Typography>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ label, right, onPress }: { label: string; right?: string; onPress?: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? (right ? `${label}, ${right}` : label) : undefined}
    >
      <Typography variant="body" style={styles.rowLabel}>{label}</Typography>
      {right && <Typography variant="body" style={styles.rowRight}>{right}</Typography>}
      {onPress && <Typography variant="body" style={styles.chev}>›</Typography>}
    </Pressable>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Typography variant="body" style={styles.rowLabel}>{label}</Typography>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        accessibilityLabel={label}
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
