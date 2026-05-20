import { router, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { MorphSlider } from '@/components/MorphSlider';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';
import {
  accessoryCatalog,
  checkUnlock as checkAccUnlock,
  getAccessory,
} from '@/content/accessories';
import { missionCatalog } from '@/content/missions';
import { getPersonality, personalities } from '@/content/personalities';
import { checkSceneUnlock, scenesCatalog } from '@/content/scenes';
import {
  customization as customizationDb,
  dnaMutations,
  inventory,
  mascots as mascotsDb,
  missions as missionsDb,
  settings as settingsDb,
  todayLocal,
  userScenes,
} from '@/lib/db';
import { PALETTES, type BrandPalette } from '@/lib/themes';
import { useTheme } from '@/lib/useTheme';
import { useStore } from '@/store';
import type { AccessoryId } from '@/components/Mascot';
import type { MascotCustomization, MascotMood, Personality } from '@/types';

type Tab = 'mascote' | 'aparencia' | 'acessorio' | 'cenario' | 'humor' | 'paleta' | 'nome';

const MOODS: { id: MascotMood; label: string; emoji: string }[] = [
  { id: 'triste', label: 'Triste', emoji: '😢' },
  { id: 'ok', label: 'OK', emoji: '🙂' },
  { id: 'feliz', label: 'Feliz', emoji: '😊' },
  { id: 'empolgado', label: 'Empolgado', emoji: '🤩' },
  { id: 'exausto', label: 'Exausto', emoji: '😴' },
];

export default function Customize() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const streak = useStore(s => s.streak);
  const settings = useStore(s => s.settings);
  const setMascot = useStore(s => s.setMascot);
  const setSettings = useStore(s => s.setSettings);
  const [tab, setTab] = useState<Tab>('mascote');
  const [preview, setPreview] = useState({
    mood: (mascot?.mood ?? 'feliz') as MascotMood,
    accessoryId: 'none' as AccessoryId,
    sceneId: 'room',
    nameDraft: mascot?.name ?? '',
  });
  // Customization + mutationIds carregados pro preview do Mascot — live update
  // quando user mexe num slider.
  const [customState, setCustomState] = useState<MascotCustomization | null>(null);
  const [mutationIds, setMutationIds] = useState<readonly string[]>([]);

  useEffect(() => {
    if (!profile) return;
    void load();
  }, [profile?.id]);

  async function load() {
    if (!profile) return;
    const [owned, activeScene, custom, mutations] = await Promise.all([
      inventory.listOwned(profile.id),
      userScenes.getActive(profile.id),
      customizationDb.get(profile.id),
      dnaMutations.listForUser(profile.id),
    ]);
    const eq = owned.find(o => o.equipped);
    const accId = (eq?.accessory_id as AccessoryId) ?? 'none';
    setPreview(p => ({ ...p, accessoryId: accId, sceneId: activeScene }));
    setCustomState(custom);
    setMutationIds(mutations.map(m => m.mutation_id));
  }

  // Patch single field — optimistic local update + persist async.
  async function patchCustomization(patch: Partial<Omit<MascotCustomization, 'user_id' | 'updated_at'>>) {
    if (!profile || !customState) return;
    // Otimista: atualiza local primeiro pro slider responder imediatamente
    setCustomState({ ...customState, ...patch });
    try {
      const next = await customizationDb.update(profile.id, patch);
      setCustomState(next);
    } catch {
      // rollback silencioso seria mais robusto; pra MVP, deixa o otimista de pé
    }
  }

  async function resetCustomization() {
    if (!profile) return;
    const next = await customizationDb.reset(profile.id);
    setCustomState(next);
  }

  if (!profile || !mascot || !settings) return <Redirect href="/splash" />;

  async function changePersonality(p: Personality) {
    const updated = await mascotsDb.upsert({ user_id: mascot!.user_id, personality: p });
    setMascot(updated);
    // resetar missão do dia (vai gerar nova alinhada com a personalidade nova)
    const today = todayLocal();
    const todays = await missionsDb.forDate(profile!.id, today);
    for (const m of todays) {
      if (m.status === 'pending') await missionsDb.update(m.id, { status: 'expired' });
    }
  }

  async function setActiveAccessory(id: AccessoryId) {
    if (!profile) return;
    if (id === 'none') {
      await inventory.unequipAll(profile.id);
    } else {
      // unlock first
      const owned = await inventory.listOwned(profile.id);
      if (!owned.some(o => o.accessory_id === id)) {
        await inventory.unlock(profile.id, id);
      }
      await inventory.equip(profile.id, id);
    }
    setPreview(p => ({ ...p, accessoryId: id }));
  }

  async function setActiveScene(id: string) {
    if (!profile) return;
    const sc = scenesCatalog.find(s => s.id === id)!;
    if (
      !checkSceneUnlock(sc, {
        level: mascot!.level,
        longestStreak: streak?.longest_streak ?? 0,
        currentStreak: streak?.current_streak ?? 0,
      })
    ) {
      return;
    }
    await userScenes.unlock(profile.id, id);
    await userScenes.setActive(profile.id, id);
    setPreview(p => ({ ...p, sceneId: id }));
  }

  async function changePalette(p: BrandPalette) {
    if (!profile) return;
    const next = await settingsDb.update(profile.id, { brand_palette: p });
    setSettings(next);
  }

  async function setMood(m: MascotMood) {
    setPreview(p => ({ ...p, mood: m }));
    // só pré-visualização; mood real vem do estado do mascote
  }

  async function saveName() {
    if (!profile || !preview.nameDraft.trim()) return;
    const updated = await mascotsDb.upsert({ user_id: mascot!.user_id, name: preview.nameDraft.trim() });
    setMascot(updated);
  }

  const ctx = {
    level: mascot.level,
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.close}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Fechar personalização"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Personalizar</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Preview — agora consome customization + mutationIds pra live update
          quando user mexe nos sliders da aba Aparência. */}
      <View style={styles.previewWrap}>
        <SceneBackground sceneId={preview.sceneId} height={200}>
          <Mascot
            personality={mascot.personality}
            phase={mascot.phase}
            mood={preview.mood}
            size={150}
            accessory={preview.accessoryId}
            customization={customState}
            mutationIds={mutationIds}
          />
        </SceneBackground>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(['mascote', 'aparencia', 'acessorio', 'cenario', 'humor', 'paleta', 'nome'] as Tab[]).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {
                t === 'mascote' ? 'Mascote'
                : t === 'aparencia' ? 'Aparência'
                : t === 'acessorio' ? 'Acessório'
                : t === 'cenario' ? 'Cenário'
                : t === 'humor' ? 'Humor'
                : t === 'paleta' ? 'Paleta'
                : 'Nome'
              }
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        {tab === 'aparencia' && customState && (
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ marginBottom: theme.spacing.sm }}>
              <Text style={styles.sectionTitle}>Ajustes físicos</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 }}>
                Você influencia o corpo, mas ele preserva a identidade dela. Cada slider varia em ±30%.
              </Text>
            </View>
            <MorphSlider
              label="Tamanho dos olhos"
              hint="afeta proporção e expressividade"
              value={customState.eye_size}
              onChange={v => patchCustomization({ eye_size: v })}
            />
            <MorphSlider
              label="Distância dos olhos"
              hint="estreita ou afasta os olhos"
              value={customState.eye_spread}
              onChange={v => patchCustomization({ eye_spread: v })}
            />
            <MorphSlider
              label="Altura"
              hint="alonga ou encolhe o corpo"
              value={customState.body_height}
              onChange={v => patchCustomization({ body_height: v })}
            />
            <MorphSlider
              label="Largura"
              hint="espalha ou estreita o corpo"
              value={customState.body_width}
              onChange={v => patchCustomization({ body_width: v })}
            />
            <MorphSlider
              label="Intensidade da aura"
              hint="quantas partículas pairam ao redor"
              value={customState.aura_intensity}
              onChange={v => patchCustomization({ aura_intensity: v })}
            />
            <MorphSlider
              label="Densidade de padrões"
              hint="bumps, sulcos e detalhes no corpo"
              value={customState.pattern_density}
              onChange={v => patchCustomization({ pattern_density: v })}
            />

            {/* POSTURA — slider próprio com range em radianos [-0.2, 0.2].
                Negativo = inclinada pra frente (pensativa); positivo = pra
                trás (orgulhosa/empolgada). Não usa MorphSlider porque o
                range é diferente; UI simplificada com 3 botões discretos. */}
            <View style={{ paddingVertical: theme.spacing.sm }}>
              <Text style={{ ...theme.text.bodyBold, color: theme.colors.text, fontFamily: 'InstrumentSerif_400Regular', fontSize: 17, letterSpacing: -0.2 }}>
                Postura
              </Text>
              <Text style={{ ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2, marginBottom: 8 }}>
                como ela se posiciona
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { value: -0.15, label: 'pra frente', icon: 'arrow-left' as const },
                  { value: 0,     label: 'neutra',    icon: 'minus' as const },
                  { value: 0.15,  label: 'pra trás',  icon: 'arrow-right' as const },
                ] as const).map(opt => {
                  const isActive = Math.abs(customState.posture_lean - opt.value) < 0.05;
                  return (
                    <PressableScale
                      key={opt.label}
                      onPress={() => patchCustomization({ posture_lean: opt.value })}
                      accessibilityRole="button"
                      accessibilityLabel={`Postura ${opt.label}`}
                      style={{
                        flex: 1,
                        paddingVertical: theme.spacing.sm,
                        borderRadius: theme.radius.md,
                        backgroundColor: isActive ? theme.colors.primaryTint : theme.colors.surface,
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ ...theme.text.xs, color: isActive ? theme.colors.primary : theme.colors.textSecondary, fontWeight: '700', fontFamily: 'JetBrainsMono_500Medium' }}>
                        {opt.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* PARTES DO CORPO — toggles pra esconder parts que DNA habilita.
                Não permite MOSTRAR parts que DNA desabilita (preserva
                identidade genética). */}
            <View style={{ paddingVertical: theme.spacing.sm }}>
              <Text style={{ ...theme.text.bodyBold, color: theme.colors.text, fontFamily: 'InstrumentSerif_400Regular', fontSize: 17, letterSpacing: -0.2 }}>
                Partes do corpo
              </Text>
              <Text style={{ ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2, marginBottom: 8 }}>
                esconder partes que o DNA dela habilita
              </Text>
              {([
                { key: 'force_hide_tail' as const,     label: 'esconder cauda' },
                { key: 'force_hide_antennae' as const, label: 'esconder antenas' },
                { key: 'force_hide_spikes' as const,   label: 'esconder espinhos' },
              ]).map(({ key, label }) => {
                const isHidden = customState[key];
                return (
                  <PressableScale
                    key={key}
                    onPress={() => patchCustomization({ [key]: !isHidden } as Partial<MascotCustomization>)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isHidden }}
                    accessibilityLabel={label}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.md,
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontSize: 14 }}>{label}</Text>
                    <View
                      style={{
                        width: 36,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: isHidden ? theme.colors.primary : theme.colors.border,
                        padding: 2,
                        alignItems: isHidden ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: '#fff',
                        }}
                      />
                    </View>
                  </PressableScale>
                );
              })}
            </View>

            <View style={{ marginTop: theme.spacing.md, alignItems: 'flex-end' }}>
              <Pressable
                onPress={resetCustomization}
                accessibilityRole="button"
                accessibilityLabel="Resetar todos os ajustes"
                style={{
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
                  resetar tudo
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {tab === 'mascote' && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={styles.sectionTitle}>Personalidade</Text>
            {personalities.map(p => (
              <Pressable
                key={p.id}
                style={[
                  styles.card,
                  mascot.personality === p.id && { borderColor: p.primaryColor, borderWidth: 2 },
                ]}
                onPress={() => changePersonality(p.id)}
              >
                <View style={[styles.dot, { backgroundColor: p.primaryColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {p.mascotName} · {p.label}
                  </Text>
                  <Text style={styles.cardSub}>{p.tagline}</Text>
                </View>
                {mascot.personality === p.id && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        )}

        {tab === 'acessorio' && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={styles.sectionTitle}>Acessórios</Text>
            <Pressable
              style={[styles.card, preview.accessoryId === 'none' && { borderColor: theme.colors.primary, borderWidth: 2 }]}
              onPress={() => setActiveAccessory('none')}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.colors.bg2 }]}><Text style={{ fontSize: 24 }}>—</Text></View>
              <Text style={styles.cardTitle}>Nenhum</Text>
              {preview.accessoryId === 'none' && <Text style={styles.check}>✓</Text>}
            </Pressable>
            {accessoryCatalog.map(acc => {
              const unlocked = checkAccUnlock(acc, ctx);
              return (
                <Pressable
                  key={acc.id}
                  disabled={!unlocked}
                  style={[
                    styles.card,
                    !unlocked && { opacity: 0.55 },
                    preview.accessoryId === acc.id && { borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setActiveAccessory(acc.id)}
                >
                  <View style={[styles.iconBox, { backgroundColor: theme.colors.bg2 }]}>
                    <Text style={{ fontSize: 24 }}>{unlocked ? acc.emoji : '🔒'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{acc.name}</Text>
                    <Text style={styles.cardSub}>{unlocked ? acc.description : acc.unlock.label}</Text>
                  </View>
                  {preview.accessoryId === acc.id && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {tab === 'cenario' && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={styles.sectionTitle}>Cenários</Text>
            {scenesCatalog.map(sc => {
              const unlocked =
                sc.isDefault ||
                checkSceneUnlock(sc, {
                  level: mascot.level,
                  longestStreak: streak?.longest_streak ?? 0,
                  currentStreak: streak?.current_streak ?? 0,
                });
              return (
                <Pressable
                  key={sc.id}
                  disabled={!unlocked}
                  style={[
                    styles.card,
                    !unlocked && { opacity: 0.55 },
                    preview.sceneId === sc.id && { borderColor: theme.colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setActiveScene(sc.id)}
                >
                  <View style={[styles.iconBox, { backgroundColor: theme.colors.bg2 }]}>
                    <Text style={{ fontSize: 24 }}>{unlocked ? sc.emoji : '🔒'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {sc.name} {sc.premium ? '· Plus' : ''}
                    </Text>
                    <Text style={styles.cardSub}>{unlocked ? sc.description : sc.unlock.label}</Text>
                  </View>
                  {preview.sceneId === sc.id && <Text style={styles.check}>✓</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {tab === 'humor' && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={styles.sectionTitle}>Preview de humor</Text>
            <Text style={styles.cardSub}>(só visual; o humor real depende do que você tem feito)</Text>
            <View style={styles.moodRow}>
              {MOODS.map(m => (
                <Pressable
                  key={m.id}
                  style={[styles.moodPill, preview.mood === m.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  onPress={() => setMood(m.id)}
                >
                  <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                  <Text style={[styles.moodText, preview.mood === m.id && { color: '#fff', fontWeight: '700' }]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {tab === 'paleta' && (
          <View style={{ gap: theme.spacing.sm }}>
            <Text style={styles.sectionTitle}>Paleta de cor</Text>
            <Text style={styles.cardSub}>Troque o tom de laranja. Aplica em tempo real.</Text>
            <View style={styles.paletteGrid}>
              {Object.values(PALETTES).map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => changePalette(p.id)}
                  style={[
                    styles.swatch,
                    { backgroundColor: p.brand },
                    settings.brand_palette === p.id && styles.swatchActive,
                  ]}
                >
                  <Text style={styles.swatchText}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Tema</Text>
            <View style={styles.themeRow}>
              {(['light', 'sepia', 'dark'] as const).map(m => (
                <Pressable
                  key={m}
                  style={[
                    styles.themeBtn,
                    settings.theme_mode === m && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                  ]}
                  onPress={async () => {
                    const next = await settingsDb.update(profile!.id, { theme_mode: m });
                    setSettings(next);
                  }}
                >
                  <Text
                    style={[
                      styles.themeText,
                      settings.theme_mode === m && { color: '#fff', fontWeight: '700' },
                    ]}
                  >
                    {m === 'light' ? 'Claro' : m === 'sepia' ? 'Sépia' : 'Escuro'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {tab === 'nome' && (
          <View style={{ gap: theme.spacing.md }}>
            <Text style={styles.sectionTitle}>Nome do mascote</Text>
            <TextInput
              value={preview.nameDraft}
              onChangeText={t => setPreview(p => ({ ...p, nameDraft: t }))}
              placeholder={mascot.name}
              placeholderTextColor={theme.colors.textDim}
              style={styles.input}
              maxLength={30}
            />
            <Button label="Salvar nome" onPress={saveName} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
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
    previewWrap: { paddingHorizontal: theme.spacing.lg },
    tabs: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md, gap: theme.spacing.sm },
    tab: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: theme.spacing.sm,
    },
    tabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    tabText: { ...theme.text.sm, color: theme.colors.text, fontWeight: '600' },
    tabTextActive: { color: '#fff', fontWeight: '700' },
    body: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dot: { width: 14, height: 14, borderRadius: 7 },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { ...theme.text.bodyBold, color: theme.colors.text },
    cardSub: { ...theme.text.xs, color: theme.colors.textSecondary, marginTop: 2 },
    check: { color: theme.colors.primary, fontSize: 22, fontWeight: '800' },
    moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    moodPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    moodText: { ...theme.text.sm, color: theme.colors.text, fontWeight: '600' },
    paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    swatch: {
      width: 88,
      height: 88,
      borderRadius: 16,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchActive: { borderColor: theme.colors.text },
    swatchText: {
      fontSize: 10,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.3,
    },
    themeRow: { flexDirection: 'row', gap: theme.spacing.sm },
    themeBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    themeText: { ...theme.text.bodyBold, color: theme.colors.text },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
      fontSize: 16,
      color: theme.colors.text,
    },
  });
}
