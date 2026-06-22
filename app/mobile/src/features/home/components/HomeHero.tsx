import { MascotStatusBubble, Typography } from '@/components/ui';
/**
 * HomeHero — área principal mascote-centrada (Etapa 6).
 *
 * Layout:
 *  - SceneBackground full-bleed
 *  - Mascote em destaque no centro/baixo (>50% above-the-fold)
 *  - Status bubble (frase contextual) sobre a cena, perto do mascote
 *  - Scene badge no canto se houver 2+ cenas (troca rápida)
 *  - Nome + nível em pill discreto no canto inferior
 *  - Flash text (XP/coins ganhos) quando relevante
 *
 * Toda lógica de estado vive em `index.tsx` — esse componente é puro.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import { t } from '@/lib/i18n';
import { journeyVisuals } from '@/game/journey/visuals';
import { color } from '@/design-system/tokens';
import type { Theme } from '@/lib/themes';
import { HeroSwipeable } from '@/components/HeroSwipeable';
import { MascotRenderer, type AccessoryId } from '@/components/MascotRenderer';
import { MascotAmbient } from '@/components/MascotAmbient';
import { MascotInteractive, type MascotGestureKind } from '@/components/MascotInteractive';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';

import { emergentPhaseLabels } from '@/lib/phaseLabels';
import { sanitizeGenome } from '@/lib/dna';
import { dominantArchetype } from '@/game/evolution/archetypeAffinity';
import type { Mascot as MascotType, MascotMood, MascotCustomization } from '@/types';

interface SceneData {
  emoji: string;
  name: string;
}

interface Props {
  mascot: MascotType;
  scene: SceneData;
  sceneHeight: number;
  mascotSize: number;
  reduceMotion?: boolean;
  reactBeat: number;
  reflectiveMood: MascotMood | null;
  equippedAccId: AccessoryId;
  customState: MascotCustomization | null;
  mutationIds: readonly string[];
  behaviorAction?: { kind: import('@/lib/animation-triggers').MascotAnimationKind; key: number };
  unlockedSceneCount: number;
  onPrev: () => void;
  onNext: () => void;
  onGesture: (kind: MascotGestureKind) => void;
  onSceneBadge: () => void;
  /** Tap no pill de identidade abre /mascot (afinidades + roadmap). */
  onIdentityPress?: () => void;
  flash: string | null;
  /** Frase emocional curta exibida acima do mascote. */
  statusLine: string;
  /** Mood dominante para o tone do bubble. */
  emotionKey: import('@/lib/themes').EmotionKey;
  /** Hora local para tint do cenário. */
  sceneHour?: number;
  /** Celebração de retorno (simulação). */
  celebrationActive?: boolean;
}

export function HomeHero({
  mascot,
  scene,
  sceneHeight,
  mascotSize,
  reduceMotion,
  reactBeat,
  reflectiveMood,
  equippedAccId,
  customState,
  mutationIds,
  behaviorAction,
  unlockedSceneCount,
  onPrev,
  onNext,
  onGesture,
  onSceneBadge,
  onIdentityPress,
  flash,
  statusLine,
  emotionKey,
  sceneHour,
  celebrationActive,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const displayMood = reflectiveMood ?? mascot.mood;
  const hour = sceneHour ?? new Date().getHours();
  // Camada visual da Jornada — derivada pura do XP, memoizada por valor.
  const journey = useMemo(() => journeyVisuals(mascot.xp), [mascot.xp]);
  return (
    <View style={styles.sceneWrap}>
      <HeroSwipeable onPrev={onPrev} onNext={onNext}>
        <SceneBackground
          sceneId={(scene as { id?: string }).id ?? 'room'}
          height={sceneHeight}
          hour={hour}
          mood={displayMood}
          celebrationActive={celebrationActive}
        >
          {statusLine ? (
            <View style={[styles.bubbleWrap, { pointerEvents: 'none' }]}>
              <MascotStatusBubble text={statusLine} emotion={emotionKey} />
            </View>
          ) : null}
          <MascotInteractive
            style={styles.mascotInScene}
            onGesture={onGesture}
            reduceMotion={reduceMotion}
            accessibilityLabel={t('home.hero.pet_a11y', mascot.name)}
          >
            <MascotAmbient
              size={mascotSize}
              reduceMotion={reduceMotion}
              celebrationActive={celebrationActive}
              mood={displayMood}
            >
              <MascotRenderer
                personality={mascot.personality}
                phase={mascot.phase}
                mood={reflectiveMood ?? mascot.mood}
                size={mascotSize}
                reactTrigger={reactBeat}
                accessory={equippedAccId}
                reduceMotion={reduceMotion}
                action={behaviorAction}
                customization={customState}
                mutationIds={mutationIds}
                journey={journey}
              />
            </MascotAmbient>
          </MascotInteractive>
          {unlockedSceneCount > 1 && (
            <PressableScale
              style={styles.sceneBadge}
              onPress={onSceneBadge}
              accessibilityRole="button"
              accessibilityLabel={t('home.hero.scene_badge_a11y', scene.name)}
            >
              <Typography style={styles.sceneEmoji}>{scene.emoji}</Typography>
              <Typography variant="mono" style={styles.sceneName}>{scene.name}</Typography>
            </PressableScale>
          )}
          {/* Pill clicável → /mascot (identidade completa: afinidades, genes, roadmap).
              Antes era View pura — exposição do archétipo só visível, sem ação. */}
          <PressableScale
            style={styles.mascotNameBox}
            onPress={onIdentityPress}
            disabled={!onIdentityPress}
            accessibilityRole="button"
            accessibilityLabel={t('home.hero.identity_a11y', mascot.name)}
            accessibilityHint={t('home.hero.identity_hint')}
          >
            <Typography style={styles.mascotNameStrong}>{mascot.name}</Typography>
            <Typography variant="mono" tone="secondary">
              {(() => {
                const arch = mascot.dna ? dominantArchetype(sanitizeGenome(mascot.dna)) : null;
                return arch
                  ? t('home.hero.level_arch', mascot.level, arch.label, Math.round(arch.percent * 100))
                  : t('home.hero.level_phase', mascot.level, emergentPhaseLabels[mascot.phase]);
              })()}
            </Typography>
          </PressableScale>
          {flash && (
            <View style={[styles.flash, { pointerEvents: 'none' }]}>
              {/* Bg do flash é `theme.colors.text` (inverte light↔dark): no dark
                  vira creme (#FCF3E7), então `inkOnBrand` (#FFF fixo) ficava
                  branco-sobre-creme (~1.1:1, ilegível). `inkInverse` acompanha
                  a inversão: branco em light, quase-preto em dark. Ver
                  MysteryBoxCard/DailyRewardStrip (mesmo padrão). */}
              <Typography variant="bodyBold" style={{ color: theme.colors.inkInverse }}>
                {flash}
              </Typography>
            </View>
          )}
        </SceneBackground>
      </HeroSwipeable>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    sceneWrap: { paddingHorizontal: theme.spacing.lg, position: 'relative' },
    mascotInScene: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
    bubbleWrap: {
      position: 'absolute',
      top: 12,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 2,
    },
    sceneBadge: {
      position: 'absolute',
      top: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.glass,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? color.glassBorderDark : color.glassBorderLight,
      ...theme.shadow.sm,
    },
    sceneEmoji: { fontSize: 13 },
    sceneName: {
      fontWeight: '700',
      fontSize: 11,
      letterSpacing: 0.3,
    },
    mascotNameBox: {
      position: 'absolute',
      bottom: 14,
      alignSelf: 'center',
      maxWidth: '88%',
      backgroundColor: theme.colors.glass,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? color.glassBorderDark : color.glassBorderLight,
      ...theme.shadow.sm,
    },
    mascotNameStrong: {
      lineHeight: 18,
      fontSize: 15,
      fontFamily: 'InstrumentSerif_400Regular',
      letterSpacing: -0.2,
    },
    flash: {
      position: 'absolute',
      top: 12,
      alignSelf: 'center',
      backgroundColor: theme.colors.text,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
    },
  });
}
