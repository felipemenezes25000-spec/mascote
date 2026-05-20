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
import { View, StyleSheet } from 'react-native';
import { useTheme, useStyles } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import { HeroSwipeable } from '@/components/HeroSwipeable';
import { Mascot, type AccessoryId } from '@/components/Mascot';
import { MascotAmbient } from '@/components/MascotAmbient';
import { MascotInteractive, type MascotGestureKind } from '@/components/MascotInteractive';
import { PressableScale } from '@/components/PressableScale';
import { SceneBackground } from '@/components/SceneBackground';
import { Typography, MascotStatusBubble } from '@/components/ui';
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
  evolutionVisuals: import('@/hooks/useEvolutionState').EvolutionVisuals | null;
  behaviorAction?: { kind: import('@/lib/animation-triggers').MascotAnimationKind; key: number };
  unlockedSceneCount: number;
  onPrev: () => void;
  onNext: () => void;
  onGesture: (kind: MascotGestureKind) => void;
  onSceneBadge: () => void;
  flash: string | null;
  /** Frase emocional curta exibida acima do mascote. */
  statusLine: string;
  /** Mood dominante para o tone do bubble. */
  emotionKey: import('@/lib/themes').EmotionKey;
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
  evolutionVisuals,
  behaviorAction,
  unlockedSceneCount,
  onPrev,
  onNext,
  onGesture,
  onSceneBadge,
  flash,
  statusLine,
  emotionKey,
}: Props) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.sceneWrap}>
      <HeroSwipeable onPrev={onPrev} onNext={onNext}>
        <SceneBackground sceneId={(scene as { id?: string }).id ?? 'room'} height={sceneHeight}>
          {statusLine ? (
            <View style={styles.bubbleWrap} pointerEvents="none">
              <MascotStatusBubble text={statusLine} emotion={emotionKey} />
            </View>
          ) : null}
          <MascotInteractive
            style={styles.mascotInScene}
            onGesture={onGesture}
            reduceMotion={reduceMotion}
            accessibilityLabel={`Carinho no ${mascot.name}`}
          >
            <MascotAmbient size={mascotSize} reduceMotion={reduceMotion}>
              <Mascot
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
                evolutionVisuals={evolutionVisuals}
              />
            </MascotAmbient>
          </MascotInteractive>
          {unlockedSceneCount > 1 && (
            <PressableScale
              style={styles.sceneBadge}
              onPress={onSceneBadge}
              accessibilityRole="button"
              accessibilityLabel={`Trocar cenário, atual ${scene.name}`}
            >
              <Typography style={styles.sceneEmoji}>{scene.emoji}</Typography>
              <Typography variant="mono" style={styles.sceneName}>{scene.name}</Typography>
            </PressableScale>
          )}
          <View style={[styles.mascotNameBox, { pointerEvents: 'none' }]}>
            <Typography style={styles.mascotNameStrong}>{mascot.name}</Typography>
            <Typography variant="mono" tone="secondary">
              {(() => {
                const arch = mascot.dna ? dominantArchetype(sanitizeGenome(mascot.dna)) : null;
                return arch
                  ? `nv ${mascot.level} · ${arch.label} ${Math.round(arch.percent * 100)}%`
                  : `nv ${mascot.level} · ${emergentPhaseLabels[mascot.phase]}`;
              })()}
            </Typography>
          </View>
          {flash && (
            <View style={[styles.flash, { pointerEvents: 'none' }]}>
              <Typography variant="bodyBold" style={{ color: theme.tokens.semantic.inkOnBrand }}>
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
      borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
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
      left: 14,
      backgroundColor: theme.colors.glass,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)',
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
