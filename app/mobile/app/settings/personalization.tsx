import { router, Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Mascot } from '@/components/Mascot';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';
import { getPersonality, personalities } from '@/content/personalities';
import { scenesCatalog } from '@/content/scenes';
import { settings as settingsDb } from '@/lib/db';
import { PALETTES, type BrandPalette } from '@/lib/themes';
import {
  applyPersonalizationToMascot,
  loadStoredPersonalization,
  savePersonalization,
  storedToPartial,
} from '@/lib/personalization-service';
import { creatureMoments } from '@/lib/moments';
import { personalityFromBond, seedFromOnboardingAnswers, type OnboardingAnswers } from '@/lib/onboarding-evolution';
import { useEvolutionState } from '@/hooks/useEvolutionState';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { BondType, CommunicationTone, UserGoal } from '@/game/evolution/EvolutionTypes';
import type { Personality } from '@/types';
import type { MascotPronoun, StoredPersonalization } from '@/repositories/personalization';

const BONDS: { id: BondType; label: string }[] = [
  { id: 'companheiro', label: 'Companheiro' },
  { id: 'guardiao', label: 'Guardião' },
  { id: 'criatura_fofa', label: 'Bichinho fofo' },
  { id: 'espirito', label: 'Espírito guia' },
  { id: 'monstrinho', label: 'Monstrinho' },
  { id: 'avatar_interior', label: 'Avatar interior' },
];

const TONES: { id: CommunicationTone; label: string }[] = [
  { id: 'carinhoso', label: 'Carinhoso' },
  { id: 'direto', label: 'Direto' },
  { id: 'poetico', label: 'Poético' },
  { id: 'engracado', label: 'Engraçado' },
];

const GOALS: { id: UserGoal; label: string }[] = [
  { id: 'saude_geral', label: 'Saúde geral' },
  { id: 'sono', label: 'Sono' },
  { id: 'foco', label: 'Foco' },
  { id: 'ansiedade', label: 'Ansiedade' },
  { id: 'disciplina', label: 'Disciplina' },
  { id: 'autoestima', label: 'Autoestima' },
  { id: 'estudos', label: 'Estudos' },
];

const STYLES = [
  { id: 'soft' as const, label: 'Suave' },
  { id: 'vivid' as const, label: 'Vívido' },
  { id: 'mystic' as const, label: 'Místico' },
  { id: 'bold' as const, label: 'Ousado' },
];

const PRONOUNS: { id: MascotPronoun; label: string }[] = [
  { id: 'ele', label: 'Ele / dele' },
  { id: 'ela', label: 'Ela / dela' },
  { id: 'elu', label: 'Elu / dele' },
];

export default function PersonalizationSettings() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);
  const settings = useStore(s => s.settings);
  const setMascot = useStore(s => s.setMascot);
  const setSettings = useStore(s => s.setSettings);
  const refreshSettings = useStore(s => s.refreshSettings);

  const [draft, setDraft] = useState<StoredPersonalization | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile || !mascot) return;
    setLoadError(null);
    try {
    const stored = await loadStoredPersonalization(profile.id);
    if (stored) {
      setDraft(stored);
      return;
    }
    const answers: OnboardingAnswers = {
      goalId: 'companhia',
      moodId: '4',
      stylePreset: 'soft',
      bondType: 'companheiro',
      communicationTone: 'carinhoso',
      pronoun: 'ele',
      primaryGoal: 'saude_geral',
    };
    setDraft({
      seed: mascot.dna_seed ?? seedFromOnboardingAnswers(answers),
      personality: mascot.personality,
      mascotName: mascot.name,
      bondType: 'companheiro',
      userGoal: 'saude_geral',
      communicationTone: 'carinhoso',
      stylePreset: 'soft',
      pronoun: 'ele',
      initialSceneId: 'room',
      updatedAt: new Date().toISOString(),
    });
    } catch {
      setLoadError('Não foi possível carregar sua personalização.');
    }
  }, [profile?.id, mascot?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const evolutionPartial = useMemo(
    () => (draft ? storedToPartial(draft) : undefined),
    [draft],
  );
  const { visuals, loading: evolutionLoading, error: evolutionError, refresh: refreshEvolution } =
    useEvolutionState(evolutionPartial);

  if (!profile || !mascot || !settings) return <Redirect href="/splash" />;
  if (!draft && !loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 48 }} accessibilityLabel="Carregando personalização" />
      </SafeAreaView>
    );
  }
  if (loadError) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          title="Algo deu errado"
          body={loadError}
          ctaLabel="Tentar de novo"
          onCta={() => void load()}
        />
      </SafeAreaView>
    );
  }
  if (!draft) return null;

  async function save() {
    if (!profile || !mascot || !draft) return;
    setSaving(true);
    try {
      const nextPersonality =
        personalities.find(p => p.id === draft.personality)?.id
        ?? personalityFromBond(draft.bondType);
      const input = {
        seed: draft.seed,
        personality: nextPersonality,
        mascotName: draft.mascotName.trim() || mascot.name,
        bondType: draft.bondType,
        userGoal: draft.userGoal,
        communicationTone: draft.communicationTone,
        stylePreset: draft.stylePreset,
        initialAccessoryIds: draft.initialAccessoryIds,
      };
      const prevSceneId = mascot?.dna ? (mascot as unknown as { initial_scene_id?: string }).initial_scene_id : undefined;
      await savePersonalization(profile.id, input, {
        pronoun: draft.pronoun,
        initialSceneId: draft.initialSceneId,
      });
      const updated = await applyPersonalizationToMascot(mascot, input);
      setMascot(updated);
      await refreshSettings();
      // Emite moments — bus reage em paralelo (preview live, analytics,
      // memória "criatura mudou de cara"). Aditivo, não substitui handlers.
      creatureMoments.emit('customization.changed', {
        field: 'personalization_bundle',
        from: prevSceneId ?? null,
        to: draft.initialSceneId,
      });
      if (draft.initialSceneId && draft.initialSceneId !== prevSceneId) {
        creatureMoments.emit('scene.changed', { sceneId: draft.initialSceneId });
      }
      for (const accId of draft.initialAccessoryIds ?? []) {
        creatureMoments.emit('accessory.equipped', { accessoryId: accId });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function setPalette(p: BrandPalette) {
    const prev = settings?.brand_palette;
    const next = await settingsDb.update(profile!.id, { brand_palette: p });
    setSettings(next);
    creatureMoments.emit('customization.changed', {
      field: 'brand_palette',
      from: prev,
      to: p,
    });
  }

  const pmeta = getPersonality(draft.personality);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Fechar personalização"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          Personalização
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lead}>
          Estilo Sims: você molda a base dela. Os hábitos continuam guiando a evolução.
        </Text>

        <View style={styles.previewWrap}>
          <SceneBackground sceneId={draft.initialSceneId ?? 'room'} height={180}>
            {evolutionError ? (
              <EmptyState
                emoji="🧬"
                title="Prévia indisponível"
                body={evolutionError}
                ctaLabel="Recarregar prévia"
                onCta={() => void refreshEvolution()}
              />
            ) : evolutionLoading ? (
              <ActivityIndicator style={{ marginVertical: 48 }} accessibilityLabel="Carregando prévia do mascote" />
            ) : (
              <Mascot
                personality={draft.personality}
                phase={mascot.phase}
                mood={mascot.mood}
                size={140}
                evolutionVisuals={visuals}
              />
            )}
          </SceneBackground>
        </View>

        <Section title="Nome">
          <TextInput
            value={draft.mascotName}
            onChangeText={t => setDraft(d => d && { ...d, mascotName: t })}
            style={styles.input}
            maxLength={30}
          />
        </Section>

        <Section title="Pronome">
          <ChipRow>
            {PRONOUNS.map(p => (
              <Chip key={p.id} label={p.label} selected={draft.pronoun === p.id} onPress={() => setDraft(d => d && { ...d, pronoun: p.id })} />
            ))}
          </ChipRow>
        </Section>

        <Section title="Vínculo">
          <ChipRow>
            {BONDS.map(b => (
              <Chip
                key={b.id}
                label={b.label}
                selected={draft.bondType === b.id}
                onPress={() =>
                  setDraft(d =>
                    d && {
                      ...d,
                      bondType: b.id,
                      personality: personalityFromBond(b.id),
                    },
                  )
                }
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Tom de conversa">
          <ChipRow>
            {TONES.map(t => (
              <Chip key={t.id} label={t.label} selected={draft.communicationTone === t.id} onPress={() => setDraft(d => d && { ...d, communicationTone: t.id })} />
            ))}
          </ChipRow>
        </Section>

        <Section title="Meta principal">
          <ChipRow>
            {GOALS.map(g => (
              <Chip key={g.id} label={g.label} selected={draft.userGoal === g.id} onPress={() => setDraft(d => d && { ...d, userGoal: g.id })} />
            ))}
          </ChipRow>
        </Section>

        <Section title="Estilo visual">
          <ChipRow>
            {STYLES.map(s => (
              <Chip key={s.id} label={s.label} selected={draft.stylePreset === s.id} onPress={() => setDraft(d => d && { ...d, stylePreset: s.id })} />
            ))}
          </ChipRow>
        </Section>

        <Section title="Paleta do app">
          <View style={styles.paletteRow}>
            {Object.values(PALETTES).map(p => (
              <PressableScale
                key={p.id}
                onPress={() => void setPalette(p.id)}
                style={[styles.swatch, { backgroundColor: p.brand }, settings.brand_palette === p.id && styles.swatchOn]}
              >
                <Text style={styles.swatchText}>{p.name}</Text>
              </PressableScale>
            ))}
          </View>
        </Section>

        <Section title="Cenário inicial">
          <ChipRow>
            {scenesCatalog.filter(s => s.isDefault || !s.premium).slice(0, 4).map(sc => (
              <Chip
                key={sc.id}
                label={sc.name}
                selected={(draft.initialSceneId ?? 'room') === sc.id}
                onPress={() => setDraft(d => d && { ...d, initialSceneId: sc.id })}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Personalidade (tom da IA)">
          <Text style={styles.hint}>{pmeta.label} · {pmeta.tagline}</Text>
          <ChipRow>
            {personalities.map(p => (
              <Chip
                key={p.id}
                label={p.label}
                selected={draft.personality === p.id}
                onPress={() => setDraft(d => d && { ...d, personality: p.id as Personality })}
              />
            ))}
          </ChipRow>
        </Section>

        <Button label={saving ? 'Salvando...' : 'Salvar e atualizar DNA base'} onPress={() => void save()} disabled={saving} />
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.chipRow}>{children}</View>;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
    >
      <Text style={[styles.chipText, selected && { color: theme.tokens.semantic.inkOnBrand }]}>{label}</Text>
    </Pressable>
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
    scroll: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    lead: { ...theme.text.sm, color: theme.colors.textSecondary, lineHeight: 20 },
    previewWrap: { borderRadius: theme.radius.lg, overflow: 'hidden' },
    section: { gap: theme.spacing.sm },
    sectionTitle: {
      ...theme.text.xs,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      fontSize: 16,
      color: theme.colors.text,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    chip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipText: { ...theme.text.sm, color: theme.colors.text, fontWeight: '600' },
    hint: { ...theme.text.xs, color: theme.colors.textDim },
    paletteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    swatch: {
      width: 72,
      height: 72,
      borderRadius: 12,
      alignItems: 'flex-end',
      justifyContent: 'flex-end',
      padding: 6,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchOn: { borderColor: theme.colors.text },
    swatchText: { fontSize: 9, fontWeight: '700', color: theme.tokens.semantic.inkOnBrand, opacity: 0.9 },
  });
}
