/**
 * /atelier — Ateliê do Mascote.
 *
 * Tela de customização visual: sliders, padrões, esconder apêndices.
 * Draft local + persiste só no save. Preview ao vivo reflete cada mudança.
 *
 * Princípio: customização é uma camada SOBRE o DNA — nunca muta o genome.
 * "Reset" volta pros defaults (eye_size=1, etc) — DNA original sempre intacto.
 */

import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { MascotRenderer } from '@/components/MascotRenderer';
import { MorphSlider } from '@/components/MorphSlider';
import { PressableScale } from '@/components/PressableScale';
import { RangeSlider } from '@/components/RangeSlider';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader, Typography } from '@/components/ui';
import { AtelierDebugMenu } from '@/components/atelier/AtelierDebugMenu';
import { AtelierOnboarding, useAtelierOnboarding } from '@/components/atelier/AtelierOnboarding';
import { AutoSaveIndicator } from '@/components/atelier/AutoSaveIndicator';
import { BlendPanel } from '@/components/atelier/BlendPanel';
import { FpsCounter } from '@/components/atelier/FpsCounter';
import { CompareModal } from '@/components/atelier/CompareModal';
import { HideToggleRow } from '@/components/atelier/HideToggleRow';
import { LookManager } from '@/components/atelier/LookManager';
import { MorphAttributionModal } from '@/components/atelier/MorphAttributionModal';
import { MutationsActiveStrip } from '@/components/atelier/MutationsActiveStrip';
import { PatternChips } from '@/components/atelier/PatternChips';
import { PersonalityPreviewSwatch } from '@/components/atelier/PersonalityPreviewSwatch';
import { ThemePresetChips } from '@/components/atelier/ThemePresetChips';
import {
  atelierLooks,
  customization as customizationDb,
  dnaMutations,
  type AtelierLook,
} from '@/lib/db';
import type { UnlockedMutation } from '@/lib/dna/mutations';
import { MAX_POSTURE, MIN_POSTURE, sanitizeCustomization } from '@/lib/dna/customization';
import { randomizeCustomization } from '@/lib/dna/randomizeCustomization';
import { applyPreset, matchPreset, type ThemePreset } from '@/lib/dna/themePresets';
import { useDraftAutoSave } from '@/hooks/useDraftAutoSave';
import { useDraftHistory } from '@/hooks/useDraftHistory';
import { maybeCreateWeeklySnapshot } from '@/lib/atelier/weeklySnapshot';
import { useStore } from '@/store';
import { useStyles, useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { MascotCustomization } from '@/types';

// Campos que o usuário edita no Ateliê (sem user_id/updated_at gerenciados).
type DraftFields = Omit<MascotCustomization, 'user_id' | 'updated_at'>;

/** Subset de fields que aceitam lock (apenas os MorphSlider mostram cadeado). */
type LockableField = 'eye_size' | 'eye_spread' | 'body_height' | 'body_width' | 'aura_intensity' | 'pattern_density';

/** Mescla draft + base preservando os fields travados em `locks`. */
function applyWithLocks(prev: DraftFields, next: DraftFields, locks: Set<LockableField>): DraftFields {
  if (locks.size === 0) return next;
  const merged: DraftFields = { ...next };
  locks.forEach(field => {
    merged[field] = prev[field];
  });
  return merged;
}

function pickDraftFields(c: MascotCustomization): DraftFields {
  const { user_id: _u, updated_at: _t, ...rest } = c;
  return rest;
}

function isSameDraft(a: DraftFields, b: DraftFields): boolean {
  return (
    a.eye_size === b.eye_size &&
    a.eye_spread === b.eye_spread &&
    a.body_height === b.body_height &&
    a.body_width === b.body_width &&
    a.aura_intensity === b.aura_intensity &&
    a.pattern_density === b.pattern_density &&
    a.preferred_pattern === b.preferred_pattern &&
    a.posture_lean === b.posture_lean &&
    a.force_hide_tail === b.force_hide_tail &&
    a.force_hide_antennae === b.force_hide_antennae &&
    a.force_hide_spikes === b.force_hide_spikes
  );
}

export default function AtelierScreen() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const profile = useStore(s => s.profile);
  const mascot = useStore(s => s.mascot);

  const [initial, setInitial] = useState<DraftFields | null>(null);
  const draftHistory = useDraftHistory<DraftFields | null>(null);
  const draft = draftHistory.current;
  const setDraft = (next: DraftFields | null | ((prev: DraftFields | null) => DraftFields | null)): void => {
    if (typeof next === 'function') {
      draftHistory.set(next(draftHistory.current));
    } else {
      draftHistory.set(next);
    }
  };
  const [saving, setSaving] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [attributionOpen, setAttributionOpen] = useState(false);
  const [looks, setLooks] = useState<AtelierLook[]>([]);
  const [unlockedMutations, setUnlockedMutations] = useState<UnlockedMutation[]>([]);
  const [locks, setLocks] = useState<Set<LockableField>>(new Set());
  const [restoredFromAutoSave, setRestoredFromAutoSave] = useState(false);
  const onboarding = useAtelierOnboarding();

  // Auto-save: persiste draft com debounce + restaura no mount.
  // Se houver draft recuperado, sobrescreve o initial carregado da DB.
  const autoSave = useDraftAutoSave<DraftFields>({
    userId: profile?.id ?? null,
    draft,
    onRestore: restored => {
      if (restored !== null) {
        setRestoredFromAutoSave(true);
        draftHistory.reset(sanitizeCustomization({ ...restored, user_id: profile?.id ?? '' }));
      }
    },
  });

  const toggleLock = (field: LockableField): void => {
    setLocks(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  // Carrega customization + looks salvos na entrada.
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void (async () => {
      const [current, savedLooks, muts] = await Promise.all([
        customizationDb.get(profile.id),
        atelierLooks.list(profile.id),
        dnaMutations.listForUser(profile.id),
      ]);
      if (cancelled) return;
      const fields = pickDraftFields(sanitizeCustomization(current));
      setInitial(fields);
      // reset() limpa o history e usa o snapshot carregado como entry [0].
      // Sem isso, undo poderia voltar pro null inicial e crashar o render.
      draftHistory.reset(fields);
      setLooks(savedLooks);
      setUnlockedMutations(muts);

      // Weekly snapshot: idempotente, NO-OP se < 7 dias do último auto.
      // Fire-and-forget — não bloqueia o mount nem mostra erro ao user.
      const userSettings = await import('@/lib/db').then(m => m.settings.get(profile.id));
      const snapResult = await maybeCreateWeeklySnapshot(profile, current, Date.now(), {
        disabled: userSettings?.atelier_disable_weekly_snapshot ?? false,
      });
      if (cancelled) return;
      if (snapResult.created) {
        // Re-fetch looks pra mostrar o novo snapshot na lista.
        const refreshed = await atelierLooks.list(profile.id);
        if (!cancelled) setLooks(refreshed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const handleApplyLook = (look: AtelierLook): void => {
    setDraft({ ...look.snapshot });
  };

  const handleSaveLook = async (name: string): Promise<void> => {
    if (!profile || !draft) return;
    const fullCustom: MascotCustomization = {
      ...draft,
      user_id: profile.id,
      updated_at: new Date().toISOString(),
    };
    await atelierLooks.save(profile.id, name, fullCustom);
    const refreshed = await atelierLooks.list(profile.id);
    setLooks(refreshed);
  };

  const handleDeleteLook = async (lookId: string): Promise<void> => {
    if (!profile) return;
    await atelierLooks.delete(profile.id, lookId);
    const refreshed = await atelierLooks.list(profile.id);
    setLooks(refreshed);
  };

  const handleImportLook = async (
    name: string,
    snapshot: AtelierLook['snapshot'],
  ): Promise<void> => {
    if (!profile) return;
    const fullCustom: MascotCustomization = {
      ...snapshot,
      user_id: profile.id,
      updated_at: new Date().toISOString(),
    };
    await atelierLooks.save(profile.id, name, fullCustom);
    const refreshed = await atelierLooks.list(profile.id);
    setLooks(refreshed);
  };

  const isDirty = useMemo(() => {
    if (!initial || !draft) return false;
    return !isSameDraft(initial, draft);
  }, [initial, draft]);

  // Customization montada pra passar pro MascotRenderer (precisa user_id/updated_at).
  const previewCustomization = useMemo<MascotCustomization | null>(() => {
    if (!draft || !profile) return null;
    return { ...draft, user_id: profile.id, updated_at: new Date().toISOString() };
  }, [draft, profile?.id]);

  // Initial customization montada (pra compare antes/depois).
  const initialCustomization = useMemo<MascotCustomization | null>(() => {
    if (!initial || !profile) return null;
    return { ...initial, user_id: profile.id, updated_at: new Date().toISOString() };
  }, [initial, profile?.id]);

  // Preset atualmente "match" (highlight no chip).
  const activePresetId = useMemo(() => {
    if (!draft) return undefined;
    return matchPreset(draft)?.id;
  }, [draft]);

  const updateDraft = (patch: Partial<DraftFields>): void => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const handleClose = (): void => {
    if (!isDirty) {
      // Sem mudanças — limpa auto-save mesmo assim, evita restore vestigial.
      void autoSave.clear();
      router.back();
      return;
    }
    Alert.alert(
      'Sair sem salvar?',
      'Suas mudanças no Ateliê serão descartadas.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            void autoSave.clear();
            router.back();
          },
        },
      ],
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!profile || !draft || saving) return;
    setSaving(true);
    try {
      await customizationDb.update(profile.id, draft);
      // Persistiu pra DB real — limpa auto-save pra não restaurar de novo na próxima.
      await autoSave.clear();
      router.back();
    } catch (e) {
      Alert.alert('Erro ao salvar', String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  };

  const handleRandomize = (): void => {
    if (!profile) return;
    const next = pickDraftFields(randomizeCustomization(profile.id));
    setDraft(prev => (prev ? applyWithLocks(prev, next, locks) : next));
  };

  const handleApplyPreset = (preset: ThemePreset): void => {
    setDraft(prev => {
      if (!prev) return prev;
      const applied = applyPreset(prev, preset);
      return applyWithLocks(prev, applied, locks);
    });
  };

  const handleApplyBlend = (blended: DraftFields): void => {
    setDraft(prev => (prev ? applyWithLocks(prev, blended, locks) : blended));
  };

  const handleReset = (): void => {
    Alert.alert(
      'Voltar ao DNA puro?',
      locks.size > 0
        ? `Vai resetar todos os sliders e padrões — exceto ${locks.size} field${locks.size === 1 ? '' : 's'} travado${locks.size === 1 ? '' : 's'}. Você poderá salvar depois.`
        : 'Vai resetar todos os sliders e padrões. Você poderá salvar depois.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar',
          onPress: () => {
            const defaults: DraftFields = {
              eye_size: 1,
              eye_spread: 1,
              body_height: 1,
              body_width: 1,
              aura_intensity: 1,
              pattern_density: 1,
              preferred_pattern: 'plain',
              posture_lean: 0,
              force_hide_tail: false,
              force_hide_antennae: false,
              force_hide_spikes: false,
            };
            setDraft(prev => (prev ? applyWithLocks(prev, defaults, locks) : defaults));
          },
        },
      ],
    );
  };

  if (!mascot || !profile || !draft) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenHeader title="Ateliê" variant="modal" />
        <View style={styles.loading}>
          <Typography variant="body" tone="secondary">
            Carregando…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title="Ateliê"
        subtitle="esculpe o seu mascote"
        variant="modal"
        onClose={handleClose}
        rightSlot={<AutoSaveIndicator lastSavedAt={autoSave.lastSavedAt} />}
        rightActions={
          isDirty
            ? [
                {
                  icon: 'check',
                  onPress: () => void handleSave(),
                  label: 'Salvar',
                },
              ]
            : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview */}
        <View style={styles.previewWrap}>
          <View style={styles.previewSurface}>
            <MascotRenderer
              personality={mascot.personality}
              phase={mascot.phase}
              mood={mascot.mood}
              size={200}
              customization={previewCustomization}
              mutationIds={unlockedMutations.map(m => m.mutation_id)}
            />
          </View>
          <Typography variant="caption" tone="secondary" style={styles.previewLabel}>
            {restoredFromAutoSave ? '↻ rascunho restaurado · preview ao vivo' : 'preview ao vivo'}
          </Typography>
          <FpsCounter />
        </View>

        {/* Presets — atalhos de aparência */}
        <SectionHeader title="Presets" subtitle="toque pra aplicar uma vibe" />
        <ThemePresetChips activePresetId={activePresetId} onSelect={handleApplyPreset} />

        {/* Blend de presets — combinação A + B em proporção variável */}
        <SectionHeader
          title="Misturar presets"
          subtitle="combine 2 vibes em proporção variável"
          compact
        />
        <BlendPanel onApply={handleApplyBlend} />

        {/* Forma */}
        <SectionHeader title="Forma" subtitle="proporções do corpo e dos olhos" />
        <View style={styles.section}>
          <MorphSlider
            label="Tamanho dos olhos"
            hint="grandes parecem mais fofos; pequenos mais maduros"
            value={draft.eye_size}
            onChange={v => updateDraft({ eye_size: v })}
            locked={locks.has('eye_size')}
            onToggleLock={() => toggleLock('eye_size')}
          />
          <MorphSlider
            label="Separação dos olhos"
            hint="afasta ou aproxima os olhos"
            value={draft.eye_spread}
            onChange={v => updateDraft({ eye_spread: v })}
            locked={locks.has('eye_spread')}
            onToggleLock={() => toggleLock('eye_spread')}
          />
          <MorphSlider
            label="Altura do corpo"
            hint="alonga ou achata vertical"
            value={draft.body_height}
            onChange={v => updateDraft({ body_height: v })}
            locked={locks.has('body_height')}
            onToggleLock={() => toggleLock('body_height')}
          />
          <MorphSlider
            label="Largura do corpo"
            hint="alarga ou afina horizontal"
            value={draft.body_width}
            onChange={v => updateDraft({ body_width: v })}
            locked={locks.has('body_width')}
            onToggleLock={() => toggleLock('body_width')}
          />
          <RangeSlider
            label="Inclinação"
            hint="postura do corpo (negativo = pra trás, positivo = pra frente)"
            value={draft.posture_lean}
            min={MIN_POSTURE}
            max={MAX_POSTURE}
            defaultValue={0}
            format={v => `${(v * 57.3).toFixed(0)}°`}
            onChange={v => updateDraft({ posture_lean: v })}
          />
        </View>

        {/* Aura & Padrão */}
        <SectionHeader title="Aura & Padrão" subtitle="brilho e textura da pele" />
        <View style={styles.section}>
          <MorphSlider
            label="Intensidade da aura"
            hint="partículas e brilho ao redor"
            value={draft.aura_intensity}
            onChange={v => updateDraft({ aura_intensity: v })}
            locked={locks.has('aura_intensity')}
            onToggleLock={() => toggleLock('aura_intensity')}
          />
          <MorphSlider
            label="Densidade do padrão"
            hint="mais ou menos marcas no corpo"
            value={draft.pattern_density}
            onChange={v => updateDraft({ pattern_density: v })}
            locked={locks.has('pattern_density')}
            onToggleLock={() => toggleLock('pattern_density')}
          />
        </View>
        <PatternChips
          value={draft.preferred_pattern}
          onChange={v => updateDraft({ preferred_pattern: v })}
        />

        {/* Apêndices */}
        <SectionHeader
          title="Apêndices"
          subtitle="esconde partes que o DNA mostra (não inventa o que não tem)"
        />
        <View style={styles.section}>
          <HideToggleRow
            label="Esconder cauda"
            description="apenas se o DNA tiver cauda"
            hidden={draft.force_hide_tail}
            onChange={v => updateDraft({ force_hide_tail: v })}
          />
          <HideToggleRow
            label="Esconder antenas"
            description="apenas se o DNA tiver antenas"
            hidden={draft.force_hide_antennae}
            onChange={v => updateDraft({ force_hide_antennae: v })}
          />
          <HideToggleRow
            label="Esconder espinhos"
            description="apenas se o DNA tiver espinhos"
            hidden={draft.force_hide_spikes}
            onChange={v => updateDraft({ force_hide_spikes: v })}
          />
        </View>

        {/* Ações */}
        <SectionHeader title="Ações" />
        <View style={styles.actionsRow}>
          <PressableScale
            onPress={draftHistory.undo}
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surface,
                opacity: draftHistory.canUndo ? 1 : 0.4,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Desfazer última mudança"
            disabled={!draftHistory.canUndo}
          >
            <Icon name="arrow-left" size={16} color={theme.colors.text} strokeWidth={2} />
            <Typography variant="bodyBold" style={styles.actionLabel}>
              Desfazer
            </Typography>
          </PressableScale>
          <PressableScale
            onPress={draftHistory.redo}
            style={[
              styles.actionBtn,
              {
                backgroundColor: theme.colors.surface,
                opacity: draftHistory.canRedo ? 1 : 0.4,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refazer mudança desfeita"
            disabled={!draftHistory.canRedo}
          >
            <Icon name="arrow-right" size={16} color={theme.colors.text} strokeWidth={2} />
            <Typography variant="bodyBold" style={styles.actionLabel}>
              Refazer
            </Typography>
          </PressableScale>
        </View>
        <View style={styles.actionsRow}>
          <PressableScale
            onPress={handleRandomize}
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Gerar aparência aleatória"
          >
            <Icon name="sparkles" size={16} color={theme.colors.text} strokeWidth={2} />
            <Typography variant="bodyBold" style={styles.actionLabel}>
              Aleatório
            </Typography>
          </PressableScale>
          <PressableScale
            onPress={handleReset}
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao DNA puro"
          >
            <Icon name="arrow-left" size={16} color={theme.colors.text} strokeWidth={2} />
            <Typography variant="bodyBold" style={styles.actionLabel}>
              DNA puro
            </Typography>
          </PressableScale>
        </View>
        {isDirty ? (
          <View style={styles.actionsRow}>
            <PressableScale
              onPress={() => setCompareOpen(true)}
              style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel="Comparar antes e depois"
            >
              <Icon name="sparkle" size={16} color={theme.colors.text} strokeWidth={2} />
              <Typography variant="bodyBold" style={styles.actionLabel}>
                Comparar antes/depois
              </Typography>
            </PressableScale>
          </View>
        ) : null}
        <View style={styles.actionsRow}>
          <PressableScale
            onPress={() => setAttributionOpen(true)}
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Ver composição dos blend shapes"
          >
            <Icon name="info" size={16} color={theme.colors.text} strokeWidth={2} />
            <Typography variant="bodyBold" style={styles.actionLabel}>
              Composição visual
            </Typography>
          </PressableScale>
        </View>

        {/* Mutações ativas */}
        <SectionHeader
          title="Mutações ativas"
          subtitle={
            unlockedMutations.length > 0
              ? `${unlockedMutations.length} desbloqueada${unlockedMutations.length === 1 ? '' : 's'} — afetando o preview`
              : 'marcos biológicos que ainda virão'
          }
        />
        <MutationsActiveStrip unlocked={unlockedMutations} />

        {/* Personalidades — explorar como ficaria com outra personality */}
        <SectionHeader
          title="Outras personalidades"
          subtitle="o mesmo DNA com vibes diferentes (read-only)"
          compact
        />
        <PersonalityPreviewSwatch
          currentPersonality={mascot.personality}
          phase={mascot.phase}
          mood={mascot.mood}
          customization={previewCustomization}
          mutationIds={unlockedMutations.map(m => m.mutation_id)}
        />

        {/* Looks salvos */}
        <SectionHeader
          title="Looks salvos"
          subtitle="customizações nomeadas pra trocar rapidamente"
        />
        <LookManager
          looks={looks}
          onApply={handleApplyLook}
          onSave={handleSaveLook}
          onDelete={handleDeleteLook}
          onImport={handleImportLook}
        />

        {/* Footer info */}
        <View style={styles.footer}>
          <Typography variant="caption" tone="secondary" align="center">
            🔒 Acessórios e cenas ficam no <Typography variant="caption" style={{ fontWeight: '700' }}>Closet</Typography>.
          </Typography>
          <Typography variant="caption" tone="secondary" align="center">
            Customização nunca altera o DNA — só esculpe a aparência.
          </Typography>
          <PressableScale
            onPress={() => router.push('/atelier-settings')}
            style={styles.preferencesLink}
            accessibilityRole="link"
            accessibilityLabel="Preferências do Ateliê"
          >
            <Typography variant="caption" tone="brand" style={{ fontWeight: '700' }}>
              ⚙ Preferências do Ateliê
            </Typography>
          </PressableScale>
        </View>
      </ScrollView>

      <CompareModal
        visible={compareOpen}
        onClose={() => setCompareOpen(false)}
        mascot={mascot}
        beforeCustomization={initialCustomization}
        afterCustomization={previewCustomization}
      />

      <MorphAttributionModal
        visible={attributionOpen}
        onClose={() => setAttributionOpen(false)}
        dna={mascot.dna}
        customization={previewCustomization}
        personality={mascot.personality}
        unlocked={unlockedMutations}
      />

      <AtelierOnboarding
        visible={onboarding.visible}
        onFinish={() => void onboarding.finish()}
      />

      <AtelierDebugMenu
        userId={profile.id}
        onAfterAction={() => {
          // Re-mount-ish: força reload de customization + looks + mutations.
          // Mais simples: navigate back e reabre. Aqui só forço re-fetch
          // dos looks/mutations e reset do draft.
          void (async () => {
            const [current, savedLooks, muts] = await Promise.all([
              customizationDb.get(profile.id),
              atelierLooks.list(profile.id),
              dnaMutations.listForUser(profile.id),
            ]);
            const fields = pickDraftFields(sanitizeCustomization(current));
            setInitial(fields);
            draftHistory.reset(fields);
            setLooks(savedLooks);
            setUnlockedMutations(muts);
          })();
        }}
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      paddingBottom: theme.spacing.xxl,
    },
    previewWrap: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    previewSurface: {
      width: 240,
      height: 240,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadow.sm,
    },
    previewLabel: {
      fontStyle: 'italic',
    },
    section: {
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionLabel: {},
    footer: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.xs,
      alignItems: 'center',
    },
    preferencesLink: {
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
  });
}
