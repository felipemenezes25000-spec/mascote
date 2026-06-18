/**
 * CreatureRenderer — desenha QUALQUER criatura procedural em SVG.
 *
 * Recebe um CreatureGenome (derivado puro do DNA) e compõe corpo + orelhas +
 * focinho + cauda + asas + chifres + padrão + olhos, tudo paramétrico. Como a
 * espécie restringe os traços coerentes (archetypes.ts), todo render é um bicho
 * plausível — gato, ave, dragão, peixe, planta, espírito… milhões deles.
 *
 * ViewBox 200×220 (mesma do Mascot2D) → a camada da Jornada (anel/adorno de
 * mundo) compõe por cima sem reposicionar.
 */
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle, ClipPath, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop,
} from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';
import { creatureGenomeFromDNA } from '@/game/creatures';
import type { CreatureGenome } from '@/game/creatures';
import { WorldAdornments } from '@/components/mascot/WorldAdornments';
import { actionGesture } from '@/components/mascot/creatureAnimation';
import { creatureEvolution, type EvolutionVisuals } from '@/components/mascot/creatureEvolution';
import type { JourneyVisuals } from '@/game/journey/visuals';
import type { MascotAnimationKind } from '@/lib/animation-triggers';
import type { MascotDNA, MascotMood, MascotPhase } from '@/types';

const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  dna?: MascotDNA | null;
  /** Override direto (preview/bestiário) — ignora o dna. */
  creature?: CreatureGenome | null;
  mood?: MascotMood;
  size?: number;
  reactTrigger?: number;
  /**
   * Ação de animação one-shot (Behavior Engine / hábito): toca um gesto distinto
   * por `kind` sempre que `key` muda. Antes era dead-wiring (chegava até aqui mas
   * o renderer descartava) — ligado na auditoria 2026-06-18.
   */
  action?: { kind: MascotAnimationKind; key: number };
  /**
   * Fase de vida (ovo→evoluido). Dirige a REVELAÇÃO progressiva dos traços
   * (cauda→padrão→asas→coroa→aura) — a criatura "cresce pra dentro" da forma do
   * genoma conforme evolui. Sem isto, evoluir só mudava o tamanho.
   */
  phase?: MascotPhase;
  /**
   * Mutações desbloqueadas (ids). Tornadas VISÍVEIS aqui (antes só o Mascot2D
   * legado consumia): brilho/pulso, padrão, olhos, faíscas — ver creatureEvolution.
   */
  mutationIds?: readonly string[];
  reduceMotion?: boolean;
  journey?: JourneyVisuals | null;
}

const SIZE_SCALE: Record<string, number> = { small: 0.86, medium: 0.96, large: 1.08 };

// Âncoras base (viewBox 200×220). Head/eyes derivam daqui.
const CX = 100;

function CreatureImpl({ dna, creature, mood = 'ok', size = 220, reactTrigger = 0, action, phase, mutationIds, reduceMotion, journey }: Props) {
  const theme = useTheme();
  const c = useMemo<CreatureGenome>(
    () => creature ?? creatureGenomeFromDNA(dna),
    [creature, dna],
  );
  const s = SIZE_SCALE[c.size] ?? 0.96;
  const pal = c.palette;

  // Geometria do corpo por plano corporal.
  const geo = useMemo(() => bodyGeometry(c.bodyPlan, s), [c.bodyPlan, s]);

  // Camada de evolução: fase + mutações → revelação progressiva + efeitos.
  const mutKey = (mutationIds ?? []).join(',');
  const evo = useMemo<EvolutionVisuals>(
    () => creatureEvolution({ phase, mutationIds }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, mutKey],
  );

  const breath = useSharedValue(1);
  const blink = useSharedValue(1);
  const hop = useSharedValue(0);
  const tilt = useSharedValue(0);
  // Canais dedicados da AÇÃO (deltas que não interferem em breath/blink/mood):
  // actY soma a hop, actScale multiplica breath, actX desloca, actRot soma a tilt.
  const actY = useSharedValue(0);
  const actScale = useSharedValue(1);
  const actX = useSharedValue(0);
  const actRot = useSharedValue(0);
  // Pulso do brilho da aura (mutação bioluminescente / forma plena).
  const glowPulse = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(blink);
    if (reduceMotion) { breath.value = 1; blink.value = 1; return; }
    breath.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: 2100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2100, easing: Easing.inOut(Easing.ease) }),
      ), -1, false);
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3400 }),
        withTiming(0.08, { duration: 90 }),
        withTiming(1, { duration: 90 }),
      ), -1, false);
    return () => { cancelAnimation(breath); cancelAnimation(blink); };
  }, [reduceMotion]);

  useEffect(() => {
    cancelAnimation(tilt);
    if (reduceMotion) { tilt.value = 0; return; }
    const t = mood === 'empolgado' ? -2 : mood === 'feliz' ? -1 : mood === 'triste' ? 3 : mood === 'exausto' ? 2 : 0;
    tilt.value = withSpring(t, { damping: 18, stiffness: 80 });
  }, [mood, reduceMotion]);

  useEffect(() => {
    if (reactTrigger > 0 && !reduceMotion) {
      hop.value = withSequence(
        withSpring(-12, { damping: 6, stiffness: 200 }),
        withSpring(0, { damping: 8, stiffness: 180 }),
      );
    }
  }, [reactTrigger]);

  // Ação one-shot: gesto distinto por kind, disparado a cada mudança de action.key.
  // Cada canal vai do repouso ao pico e volta; canais não tocados ficam parados.
  useEffect(() => {
    if (!action?.key || reduceMotion) return;
    const g = actionGesture(action.kind);
    if (g.y !== 0) {
      actY.value = withSequence(
        withSpring(g.y, { damping: 6, stiffness: 200 }),
        withSpring(0, { damping: 8, stiffness: 180 }),
      );
    }
    if (g.scale !== 1) {
      actScale.value = withSequence(
        withTiming(g.scale, { duration: 180, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 240, easing: Easing.inOut(Easing.ease) }),
      );
    }
    if (g.x !== 0) {
      actX.value = withSequence(
        withTiming(-g.x, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(g.x, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
      );
    }
    if (g.rot !== 0) {
      actRot.value = withSequence(
        withTiming(g.rot, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.ease) }),
      );
    }
  }, [action?.key]);

  // Pulso lento da aura quando a evolução pede (bioluminescente / forma plena).
  useEffect(() => {
    cancelAnimation(glowPulse);
    if (!evo.pulse || reduceMotion) { glowPulse.value = 1; return; }
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ), -1, false);
    return () => cancelAnimation(glowPulse);
  }, [evo.pulse, reduceMotion]);

  useEffect(() => () => {
    cancelAnimation(breath); cancelAnimation(blink); cancelAnimation(hop); cancelAnimation(tilt);
    cancelAnimation(actY); cancelAnimation(actScale); cancelAnimation(actX); cancelAnimation(actRot);
    cancelAnimation(glowPulse);
  }, []);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: actX.value },
      { translateY: hop.value + actY.value },
      // sizeScale: crescimento controlado por estágio de evolução (ovo→evoluido).
      { scale: breath.value * actScale.value * evo.sizeScale },
      { rotate: `${tilt.value + actRot.value}deg` },
    ],
  }));

  // Opacidade da aura: base cresce com o estágio/mutações (evo.glow), modulada
  // pelo pulso. Faixa [0.10, 0.40] pra ficar de sutil (ovo) a marcante (evoluido).
  const glowStyle = useAnimatedStyle(() => ({
    opacity: (0.10 + evo.glow * 0.30) * glowPulse.value,
  }));

  const sleepy = mood === 'exausto';
  const sad = mood === 'triste';
  const happy = mood === 'feliz' || mood === 'empolgado';
  const proud = mood === 'empolgado';

  return (
    <View style={[styles.wrap, { width: size, height: size + 20 }]}>
      {/* aura/glow — intensidade dirigida pela evolução (estágio + mutações) */}
      <Animated.View style={[{
        position: 'absolute', top: size * 0.08, left: size * 0.08,
        right: size * 0.08, bottom: size * 0.08, borderRadius: size / 2,
        backgroundColor: pal.body, pointerEvents: 'none',
      }, glowStyle]} />
      <Animated.View style={[styles.inner, wrapStyle]}>
        <Svg width={size} height={size + 20} viewBox="0 0 200 220">
          <Defs>
            <RadialGradient id={`cbody-${c.paletteId}`} cx="38%" cy="32%" rx="75%" ry="75%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
              <Stop offset="55%" stopColor={pal.body} stopOpacity="1" />
              <Stop offset="100%" stopColor={pal.deep} stopOpacity="0.92" />
            </RadialGradient>
            <ClipPath id={`cclip-${c.paletteId}`}>
              <Ellipse cx={CX} cy={geo.bodyCy} rx={geo.bodyRx} ry={geo.bodyRy} />
            </ClipPath>
          </Defs>

          {/* sombra */}
          <Ellipse cx={CX} cy="202" rx={geo.bodyRx * 0.9} ry="5" fill="rgba(30,20,10,0.14)" />

          {/* camada da Jornada (anel + adorno do mundo) atrás do corpo */}
          {journey && <WorldAdornments journey={journey} />}

          {/* asas e cauda atrás do corpo — reveladas conforme a evolução */}
          {evo.revealWings && drawWings(c, geo)}
          {evo.revealTail && drawTail(c, geo)}

          {/* membros atrás/sob o corpo */}
          {drawLimbs(c, geo)}

          {/* corpo */}
          <Ellipse cx={CX} cy={geo.bodyCy} rx={geo.bodyRx} ry={geo.bodyRy} fill={`url(#cbody-${c.paletteId})`} />

          {/* barriga (clareado) — toque chibi de fofura em toda criatura */}
          <Ellipse cx={CX} cy={geo.bodyCy + geo.bodyRy * 0.34} rx={geo.bodyRx * 0.6} ry={geo.bodyRy * 0.5} fill={pal.belly} opacity="0.55" />


          {/* padrão clipado ao corpo — revelado pela evolução; mutação pode sobrescrever */}
          {evo.revealPattern && (
            <G clipPath={`url(#cclip-${c.paletteId})`}>
              {drawPattern(c, geo, evo.patternOverride)}
            </G>
          )}

          {/* orelhas (atrás da cabeça) */}
          {drawEars(c, geo, 'back')}

          {/* chifres/crista/halo acima da cabeça — revelados na fase adulta+ */}
          {evo.revealCrown && drawCrown(c, geo)}

          {/* cabeça (merge no corpo nos planos blob/serpentine) */}
          {geo.separateHead && (
            <Ellipse cx={CX} cy={geo.headCy} rx={geo.headRx} ry={geo.headRy} fill={`url(#cbody-${c.paletteId})`} />
          )}

          {/* orelhas frontais (tuft/feather sobre a cabeça) */}
          {drawEars(c, geo, 'front')}

          {/* rosto */}
          {drawSnout(c, geo, pal, sleepy)}
          {drawEyes(c, geo, pal, { sleepy, sad, happy, proud, blink }, evo.eyeScale)}
          {drawMouth(c, geo, { sleepy, sad, happy })}
          {(evo.revealCheeks && c.cheeks) || happy ? (
            <>
              <Ellipse cx={geo.eyeX0 - 6} cy={geo.eyeY + 10} rx="6" ry="3.4" fill={pal.accent} opacity={c.cheeks ? 0.5 : 0.4} />
              <Ellipse cx={geo.eyeX1 + 6} cy={geo.eyeY + 10} rx="6" ry="3.4" fill={pal.accent} opacity={c.cheeks ? 0.5 : 0.4} />
            </>
          ) : null}

          {/* brilho de orgulho */}
          {proud && (
            <G fill={theme.colors.gold}>
              <Path d="M 158 60 l 1.5 -4 l 1.5 4 l 4 1.5 l -4 1.5 l -1.5 4 l -1.5 -4 l -4 -1.5 z" />
              <Circle cx="42" cy="70" r="1.6" />
            </G>
          )}

          {/* faíscas da evolução (forma plena / mutação de aura) */}
          {drawSparkles(evo.sparkleCount, theme.colors.gold)}
        </Svg>
      </Animated.View>
    </View>
  );
}

export const CreatureRenderer = memo(CreatureImpl);
export default CreatureRenderer;

// ---------------------------------------------------------------------------
// Geometria + desenho dos traços. Tudo função pura de (genome, geo).
// ---------------------------------------------------------------------------

interface Geo {
  bodyCx: number; bodyCy: number; bodyRx: number; bodyRy: number;
  headCx: number; headCy: number; headRx: number; headRy: number;
  separateHead: boolean;
  eyeX0: number; eyeX1: number; eyeY: number;
  faceCy: number;
}

function bodyGeometry(plan: CreatureGenome['bodyPlan'], s: number): Geo {
  // Corpo base, ajustado por plano. Chibi: cabeça grande sobre corpo menor.
  let bodyRx = 46 * s, bodyRy = 44 * s, bodyCy = 132;
  let headRx = 40 * s, headRy = 38 * s, headCy = 90;
  let separateHead = true;
  switch (plan) {
    case 'round': bodyRx = 46 * s; bodyRy = 44 * s; break;
    case 'oval': bodyRx = 42 * s; bodyRy = 50 * s; bodyCy = 134; break;
    case 'tall': bodyRx = 38 * s; bodyRy = 56 * s; bodyCy = 138; headCy = 84; break;
    case 'long': bodyRx = 56 * s; bodyRy = 38 * s; bodyCy = 138; break;
    case 'squat': bodyRx = 54 * s; bodyRy = 40 * s; bodyCy = 140; headRx = 44 * s; headRy = 40 * s; break;
    case 'teardrop': bodyRx = 44 * s; bodyRy = 48 * s; bodyCy = 134; break;
    case 'serpentine': bodyRx = 34 * s; bodyRy = 58 * s; bodyCy = 142; headCy = 82; headRx = 38 * s; headRy = 36 * s; break;
    case 'blob': bodyRx = 50 * s; bodyRy = 46 * s; bodyCy = 134; separateHead = false; headCy = 110; headRx = 50 * s; headRy = 46 * s; break;
  }
  if (!separateHead) { headCy = bodyCy - bodyRy * 0.2; }
  const faceCy = separateHead ? headCy + headRy * 0.18 : bodyCy - bodyRy * 0.28;
  const eyeY = faceCy;
  const eyeSpread = (separateHead ? headRx : bodyRx) * 0.4;
  return {
    bodyCx: CX, bodyCy, bodyRx, bodyRy,
    headCx: CX, headCy, headRx, headRy, separateHead,
    eyeX0: CX - eyeSpread, eyeX1: CX + eyeSpread, eyeY, faceCy,
  };
}

function headTopY(geo: Geo): number {
  return geo.separateHead ? geo.headCy - geo.headRy : geo.bodyCy - geo.bodyRy;
}

function drawEars(c: CreatureGenome, geo: Geo, layer: 'back' | 'front') {
  const { headCx: cx, headRx: rx } = geo;
  const topY = headTopY(geo);
  const col = c.palette.body, inner = c.palette.accent, deep = c.palette.deep;
  const back = layer === 'back';
  switch (c.ears) {
    case 'cat':
      if (!back) return null;
      return (
        <G>
          <Path d={`M ${cx - rx * 0.62} ${topY + 8} L ${cx - rx * 0.9} ${topY - 22} L ${cx - rx * 0.18} ${topY + 4} Z`} fill={col} />
          <Path d={`M ${cx + rx * 0.62} ${topY + 8} L ${cx + rx * 0.9} ${topY - 22} L ${cx + rx * 0.18} ${topY + 4} Z`} fill={col} />
          <Path d={`M ${cx - rx * 0.58} ${topY + 5} L ${cx - rx * 0.74} ${topY - 12} L ${cx - rx * 0.34} ${topY + 2} Z`} fill={inner} opacity="0.6" />
          <Path d={`M ${cx + rx * 0.58} ${topY + 5} L ${cx + rx * 0.74} ${topY - 12} L ${cx + rx * 0.34} ${topY + 2} Z`} fill={inner} opacity="0.6" />
        </G>
      );
    case 'fox':
      if (!back) return null;
      return (
        <G>
          <Path d={`M ${cx - rx * 0.66} ${topY + 6} L ${cx - rx * 1.0} ${topY - 30} L ${cx - rx * 0.1} ${topY + 2} Z`} fill={col} />
          <Path d={`M ${cx + rx * 0.66} ${topY + 6} L ${cx + rx * 1.0} ${topY - 30} L ${cx + rx * 0.1} ${topY + 2} Z`} fill={col} />
          <Path d={`M ${cx - rx * 0.55} ${topY - 2} L ${cx - rx * 0.78} ${topY - 18} L ${cx - rx * 0.3} ${topY - 2} Z`} fill={deep} opacity="0.55" />
          <Path d={`M ${cx + rx * 0.55} ${topY - 2} L ${cx + rx * 0.78} ${topY - 18} L ${cx + rx * 0.3} ${topY - 2} Z`} fill={deep} opacity="0.55" />
        </G>
      );
    case 'rabbit':
      if (!back) return null;
      return (
        <G>
          <Ellipse cx={cx - rx * 0.4} cy={topY - 18} rx={rx * 0.16} ry="24" fill={col} transform={`rotate(-10 ${cx - rx * 0.4} ${topY - 18})`} />
          <Ellipse cx={cx + rx * 0.4} cy={topY - 18} rx={rx * 0.16} ry="24" fill={col} transform={`rotate(10 ${cx + rx * 0.4} ${topY - 18})`} />
          <Ellipse cx={cx - rx * 0.4} cy={topY - 16} rx={rx * 0.08} ry="16" fill={inner} opacity="0.6" transform={`rotate(-10 ${cx - rx * 0.4} ${topY - 16})`} />
          <Ellipse cx={cx + rx * 0.4} cy={topY - 16} rx={rx * 0.08} ry="16" fill={inner} opacity="0.6" transform={`rotate(10 ${cx + rx * 0.4} ${topY - 16})`} />
        </G>
      );
    case 'round':
      if (!back) return null;
      return (
        <G>
          <Circle cx={cx - rx * 0.78} cy={topY + 6} r={rx * 0.28} fill={col} />
          <Circle cx={cx + rx * 0.78} cy={topY + 6} r={rx * 0.28} fill={col} />
          <Circle cx={cx - rx * 0.78} cy={topY + 8} r={rx * 0.14} fill={inner} opacity="0.55" />
          <Circle cx={cx + rx * 0.78} cy={topY + 8} r={rx * 0.14} fill={inner} opacity="0.55" />
        </G>
      );
    case 'fin':
      if (!back) return null;
      return (
        <G>
          <Path d={`M ${cx - rx * 0.6} ${topY + 12} Q ${cx - rx * 1.1} ${topY - 6} ${cx - rx * 0.5} ${topY - 14} Q ${cx - rx * 0.3} ${topY - 2} ${cx - rx * 0.2} ${topY + 8} Z`} fill={inner} opacity="0.85" />
          <Path d={`M ${cx + rx * 0.6} ${topY + 12} Q ${cx + rx * 1.1} ${topY - 6} ${cx + rx * 0.5} ${topY - 14} Q ${cx + rx * 0.3} ${topY - 2} ${cx + rx * 0.2} ${topY + 8} Z`} fill={inner} opacity="0.85" />
        </G>
      );
    case 'tuft':
      if (back) return null;
      return (
        <G fill={c.palette.accent}>
          <Path d={`M ${cx - 8} ${topY + 4} q -3 -14 4 -20 q 3 8 0 18 Z`} />
          <Path d={`M ${cx + 8} ${topY + 4} q 3 -14 -4 -20 q -3 8 0 18 Z`} />
          <Path d={`M ${cx} ${topY} q 0 -16 0 -22 q 4 10 0 20 Z`} />
        </G>
      );
    case 'feather':
      if (back) return null;
      return (
        <G fill={c.palette.accent}>
          <Ellipse cx={cx - 7} cy={topY - 8} rx="3.5" ry="12" transform={`rotate(-18 ${cx - 7} ${topY - 8})`} />
          <Ellipse cx={cx + 7} cy={topY - 8} rx="3.5" ry="12" transform={`rotate(18 ${cx + 7} ${topY - 8})`} />
          <Ellipse cx={cx} cy={topY - 12} rx="3.5" ry="13" />
        </G>
      );
    default:
      return null;
  }
}

function drawCrown(c: CreatureGenome, geo: Geo) {
  const cx = geo.headCx;
  const topY = headTopY(geo);
  const gold = '#E7B84B';
  switch (c.crown) {
    case 'antenna':
      return (
        <G>
          <Line x1={cx} y1={topY + 2} x2={cx - 6} y2={topY - 18} stroke={c.palette.deep} strokeWidth="3" strokeLinecap="round" />
          <Circle cx={cx - 6} cy={topY - 20} r="4.5" fill={c.palette.accent} />
          <Line x1={cx} y1={topY + 2} x2={cx + 6} y2={topY - 16} stroke={c.palette.deep} strokeWidth="3" strokeLinecap="round" />
          <Circle cx={cx + 6} cy={topY - 18} r="3.6" fill={c.palette.accent} />
        </G>
      );
    case 'singleHorn':
      return <Path d={`M ${cx} ${topY + 4} L ${cx - 5} ${topY - 26} Q ${cx} ${topY - 30} ${cx + 5} ${topY - 26} Z`} fill={gold} stroke="#C9982F" strokeWidth="1" />;
    case 'twinHorn':
      return (
        <G fill={c.palette.deep}>
          <Path d={`M ${cx - 14} ${topY + 6} Q ${cx - 26} ${topY - 14} ${cx - 16} ${topY - 24} Q ${cx - 12} ${topY - 8} ${cx - 8} ${topY + 4} Z`} />
          <Path d={`M ${cx + 14} ${topY + 6} Q ${cx + 26} ${topY - 14} ${cx + 16} ${topY - 24} Q ${cx + 12} ${topY - 8} ${cx + 8} ${topY + 4} Z`} />
        </G>
      );
    case 'crest':
      return (
        <G fill={c.palette.accent}>
          <Path d={`M ${cx - 12} ${topY + 6} Q ${cx} ${topY - 26} ${cx + 12} ${topY + 6} Z`} />
          <Path d={`M ${cx - 6} ${topY + 4} Q ${cx} ${topY - 30} ${cx + 6} ${topY + 4} Z`} opacity="0.85" />
        </G>
      );
    case 'flame':
      return (
        <G>
          <Path d={`M ${cx} ${topY + 6} Q ${cx - 10} ${topY - 12} ${cx} ${topY - 30} Q ${cx + 10} ${topY - 12} ${cx} ${topY + 6} Z`} fill="#F2913C" />
          <Path d={`M ${cx} ${topY + 2} Q ${cx - 5} ${topY - 10} ${cx} ${topY - 22} Q ${cx + 5} ${topY - 10} ${cx} ${topY + 2} Z`} fill={gold} />
        </G>
      );
    case 'halo':
      return <Ellipse cx={cx} cy={topY - 16} rx="22" ry="6" fill="none" stroke={gold} strokeWidth="3" opacity="0.8" />;
    case 'leafSprout':
      return (
        <G fill="#7FB36A">
          <Path d={`M ${cx} ${topY + 4} Q ${cx - 14} ${topY - 6} ${cx - 8} ${topY - 20} Q ${cx} ${topY - 10} ${cx} ${topY + 4} Z`} />
          <Path d={`M ${cx} ${topY + 4} Q ${cx + 14} ${topY - 6} ${cx + 8} ${topY - 20} Q ${cx} ${topY - 10} ${cx} ${topY + 4} Z`} />
          <Line x1={cx} y1={topY + 6} x2={cx} y2={topY - 6} stroke="#5C8A4A" strokeWidth="2" />
        </G>
      );
    default:
      return null;
  }
}

function drawTail(c: CreatureGenome, geo: Geo) {
  const baseX = CX + geo.bodyRx * 0.78;
  const baseY = geo.bodyCy + geo.bodyRy * 0.3;
  const col = c.palette.body, accent = c.palette.accent, deep = c.palette.deep;
  switch (c.tail) {
    case 'cat':
      return <Path d={`M ${baseX} ${baseY} Q ${baseX + 30} ${baseY - 6} ${baseX + 26} ${baseY - 36} Q ${baseX + 22} ${baseY - 20} ${baseX + 10} ${baseY - 6} Z`} fill={col} />;
    case 'foxFluffy':
      return (
        <G>
          <Path d={`M ${baseX - 6} ${baseY} Q ${baseX + 34} ${baseY + 6} ${baseX + 30} ${baseY - 34} Q ${baseX + 14} ${baseY - 8} ${baseX - 2} ${baseY - 2} Z`} fill={col} />
          <Path d={`M ${baseX + 22} ${baseY - 30} Q ${baseX + 32} ${baseY - 28} ${baseX + 28} ${baseY - 36} Z`} fill={c.palette.belly} />
        </G>
      );
    case 'lizard':
      return <Path d={`M ${baseX} ${baseY} Q ${baseX + 36} ${baseY + 4} ${baseX + 46} ${baseY + 24} Q ${baseX + 30} ${baseY + 8} ${baseX} ${baseY + 8} Z`} fill={deep} />;
    case 'fish':
      return (
        <G fill={accent} opacity="0.92">
          <Path d={`M ${baseX} ${baseY} L ${baseX + 30} ${baseY - 18} L ${baseX + 26} ${baseY} L ${baseX + 30} ${baseY + 18} Z`} />
        </G>
      );
    case 'feather':
      return (
        <G fill={accent}>
          <Ellipse cx={baseX + 16} cy={baseY + 6} rx="6" ry="20" transform={`rotate(28 ${baseX + 16} ${baseY + 6})`} />
          <Ellipse cx={baseX + 24} cy={baseY + 2} rx="6" ry="22" transform={`rotate(40 ${baseX + 24} ${baseY + 2})`} />
          <Ellipse cx={baseX + 30} cy={baseY - 4} rx="5" ry="20" transform={`rotate(52 ${baseX + 30} ${baseY - 4})`} />
        </G>
      );
    case 'wisp':
      return <Path d={`M ${baseX - 4} ${baseY} Q ${baseX + 24} ${baseY + 10} ${baseX + 16} ${baseY + 34} Q ${baseX + 10} ${baseY + 18} ${baseX - 6} ${baseY + 6} Z`} fill={accent} opacity="0.7" />;
    case 'curl':
      return <Path d={`M ${baseX} ${baseY} q 20 0 20 16 q 0 12 -12 12 q -8 0 -8 -8`} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" />;
    case 'leaf':
      return (
        <G>
          <Path d={`M ${baseX} ${baseY} Q ${baseX + 26} ${baseY - 4} ${baseX + 30} ${baseY - 28} Q ${baseX + 12} ${baseY - 12} ${baseX} ${baseY} Z`} fill="#7FB36A" />
          <Line x1={baseX + 6} y1={baseY - 4} x2={baseX + 26} y2={baseY - 22} stroke="#5C8A4A" strokeWidth="1.5" />
        </G>
      );
    default:
      return null;
  }
}

function drawWings(c: CreatureGenome, geo: Geo) {
  const lx = CX - geo.bodyRx * 0.7, rx = CX + geo.bodyRx * 0.7;
  const y = geo.bodyCy - geo.bodyRy * 0.1;
  const accent = c.palette.accent, deep = c.palette.deep;
  switch (c.wings) {
    case 'feather':
      return (
        <G fill={accent} opacity="0.92">
          <Path d={`M ${lx} ${y} Q ${lx - 40} ${y - 24} ${lx - 30} ${y + 18} Q ${lx - 14} ${y + 14} ${lx} ${y + 6} Z`} />
          <Path d={`M ${rx} ${y} Q ${rx + 40} ${y - 24} ${rx + 30} ${y + 18} Q ${rx + 14} ${y + 14} ${rx} ${y + 6} Z`} />
        </G>
      );
    case 'bat':
      return (
        <G fill={deep} opacity="0.85">
          <Path d={`M ${lx} ${y} Q ${lx - 34} ${y - 18} ${lx - 40} ${y + 8} L ${lx - 28} ${y + 4} L ${lx - 30} ${y + 18} L ${lx - 16} ${y + 8} L ${lx - 18} ${y + 20} L ${lx} ${y + 8} Z`} />
          <Path d={`M ${rx} ${y} Q ${rx + 34} ${y - 18} ${rx + 40} ${y + 8} L ${rx + 28} ${y + 4} L ${rx + 30} ${y + 18} L ${rx + 16} ${y + 8} L ${rx + 18} ${y + 20} L ${rx} ${y + 8} Z`} />
        </G>
      );
    case 'butterfly':
      return (
        <G opacity="0.85">
          <Ellipse cx={lx - 22} cy={y - 8} rx="20" ry="16" fill={accent} />
          <Ellipse cx={lx - 18} cy={y + 16} rx="14" ry="12" fill={c.palette.body} />
          <Ellipse cx={rx + 22} cy={y - 8} rx="20" ry="16" fill={accent} />
          <Ellipse cx={rx + 18} cy={y + 16} rx="14" ry="12" fill={c.palette.body} />
          <Circle cx={lx - 22} cy={y - 8} r="4" fill={c.palette.belly} />
          <Circle cx={rx + 22} cy={y - 8} r="4" fill={c.palette.belly} />
        </G>
      );
    case 'energy':
      return (
        <G fill={accent} opacity="0.5">
          <Path d={`M ${lx} ${y} Q ${lx - 36} ${y - 16} ${lx - 26} ${y + 16} Z`} />
          <Path d={`M ${rx} ${y} Q ${rx + 36} ${y - 16} ${rx + 26} ${y + 16} Z`} />
        </G>
      );
    case 'fin':
      return (
        <G fill={accent} opacity="0.7">
          <Path d={`M ${lx} ${y + 4} Q ${lx - 28} ${y} ${lx - 24} ${y + 24} Q ${lx - 12} ${y + 14} ${lx} ${y + 12} Z`} />
          <Path d={`M ${rx} ${y + 4} Q ${rx + 28} ${y} ${rx + 24} ${y + 24} Q ${rx + 12} ${y + 14} ${rx} ${y + 12} Z`} />
        </G>
      );
    default:
      return null;
  }
}

function drawLimbs(c: CreatureGenome, geo: Geo) {
  const baseY = geo.bodyCy + geo.bodyRy * 0.78;
  const dx = geo.bodyRx * 0.42;
  const col = c.palette.deep;
  switch (c.limbs) {
    case 'twoLegs':
      return (
        <G fill={col}>
          <Ellipse cx={CX - dx} cy={baseY} rx="9" ry="7" />
          <Ellipse cx={CX + dx} cy={baseY} rx="9" ry="7" />
        </G>
      );
    case 'fourLegs':
      return (
        <G fill={col}>
          <Ellipse cx={CX - dx} cy={baseY} rx="9" ry="7" />
          <Ellipse cx={CX + dx} cy={baseY} rx="9" ry="7" />
          <Ellipse cx={CX - dx * 0.4} cy={baseY + 2} rx="8" ry="6" opacity="0.85" />
          <Ellipse cx={CX + dx * 0.4} cy={baseY + 2} rx="8" ry="6" opacity="0.85" />
        </G>
      );
    case 'fins':
      return (
        <G fill={c.palette.accent} opacity="0.85">
          <Path d={`M ${CX - geo.bodyRx * 0.9} ${geo.bodyCy + 6} q -16 4 -14 18 q 10 -2 16 -8 Z`} />
          <Path d={`M ${CX + geo.bodyRx * 0.9} ${geo.bodyCy + 6} q 16 4 14 18 q -10 -2 -16 -8 Z`} />
        </G>
      );
    case 'roots':
      return (
        <G stroke={col} strokeWidth="4" strokeLinecap="round">
          <Line x1={CX - dx} y1={baseY - 4} x2={CX - dx - 6} y2={baseY + 8} />
          <Line x1={CX} y1={baseY - 2} x2={CX} y2={baseY + 10} />
          <Line x1={CX + dx} y1={baseY - 4} x2={CX + dx + 6} y2={baseY + 8} />
        </G>
      );
    default:
      return null;
  }
}

function drawSnout(c: CreatureGenome, geo: Geo, pal: CreatureGenome['palette'], _sleepy: boolean) {
  const cx = CX, y = geo.faceCy + 16;
  switch (c.snout) {
    case 'cat':
      return (
        <G>
          <Path d={`M ${cx - 3} ${y} L ${cx + 3} ${y} L ${cx} ${y + 3} Z`} fill={pal.deep} />
          <Path d={`M ${cx} ${y + 3} q -4 4 -8 2 M ${cx} ${y + 3} q 4 4 8 2`} stroke={pal.deep} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </G>
      );
    case 'dog':
      return (
        <G>
          <Ellipse cx={cx} cy={y + 2} rx="8" ry="6" fill={pal.belly} />
          <Ellipse cx={cx} cy={y} rx="4" ry="3" fill={pal.deep} />
        </G>
      );
    case 'muzzle':
      return (
        <G>
          <Ellipse cx={cx} cy={y + 3} rx="12" ry="9" fill={pal.belly} opacity="0.9" />
          <Ellipse cx={cx} cy={y} rx="4.5" ry="3.4" fill={pal.deep} />
        </G>
      );
    case 'beakShort':
      return <Path d={`M ${cx - 7} ${y - 2} Q ${cx} ${y + 8} ${cx + 7} ${y - 2} Q ${cx} ${y + 1} ${cx - 7} ${y - 2} Z`} fill="#E7A23C" />;
    case 'beakLong':
      return (
        <G fill="#E7A23C">
          <Path d={`M ${cx - 6} ${y - 4} L ${cx} ${y + 14} L ${cx + 6} ${y - 4} Q ${cx} ${y} ${cx - 6} ${y - 4} Z`} />
        </G>
      );
    case 'frog':
      return <Path d={`M ${cx - 12} ${y + 2} Q ${cx} ${y + 10} ${cx + 12} ${y + 2}`} stroke={pal.deep} strokeWidth="2" fill="none" strokeLinecap="round" />;
    default:
      return null;
  }
}

function drawEyes(
  c: CreatureGenome, geo: Geo, pal: CreatureGenome['palette'],
  st: { sleepy: boolean; sad: boolean; happy: boolean; proud: boolean; blink: Animated.SharedValue<number> },
  eyeScale: number = 1,
) {
  const { eyeX0: x0, eyeX1: x1, eyeY: y } = geo;
  if (st.sleepy) {
    return (
      <G stroke={pal.eye} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <Path d={`M ${x0 - 6} ${y} q 6 5 12 0`} />
        <Path d={`M ${x1 - 6} ${y} q 6 5 12 0`} />
      </G>
    );
  }
  // tamanho do olho por tipo
  let rx = 6.5, ry = 7.5;
  if (c.eyes === 'big') { rx = 8.5; ry = 9.5; }
  else if (c.eyes === 'sparkle') { rx = 7.5; ry = 8.5; }
  else if (c.eyes === 'sharp') { rx = 7; ry = 5.5; }
  else if (c.eyes === 'droopy') { rx = 7; ry = 7; }
  // eyeScale (mutação "olhar profundo") amplia o olho.
  rx *= eyeScale; ry *= eyeScale;
  return (
    <AnimatedEyes x0={x0} x1={x1} y={y} rx={rx} ry={ry} eye={pal.eye} sparkle={c.eyes === 'sparkle'} sharp={c.eyes === 'sharp'} blink={st.blink} />
  );
}

function AnimatedEyes({ x0, x1, y, rx, ry, eye, sparkle, sharp, blink }: {
  x0: number; x1: number; y: number; rx: number; ry: number; eye: string; sparkle: boolean; sharp: boolean; blink: Animated.SharedValue<number>;
}) {
  const props = useAnimatedProps(() => ({ opacity: blink.value < 0.5 ? 0.12 : 1 }));
  return (
    <AnimatedG animatedProps={props}>
      <Ellipse cx={x0} cy={y} rx={rx} ry={sharp ? ry : ry} fill={eye} />
      <Ellipse cx={x1} cy={y} rx={rx} ry={sharp ? ry : ry} fill={eye} />
      <Circle cx={x0 + 2} cy={y - 2} r={sparkle ? 2.2 : 1.6} fill="#FFFFFF" />
      <Circle cx={x1 + 2} cy={y - 2} r={sparkle ? 2.2 : 1.6} fill="#FFFFFF" />
      {sparkle && (
        <>
          <Circle cx={x0 - 2.4} cy={y + 2.4} r="1" fill="#FFFFFF" opacity="0.8" />
          <Circle cx={x1 - 2.4} cy={y + 2.4} r="1" fill="#FFFFFF" opacity="0.8" />
        </>
      )}
    </AnimatedG>
  );
}

function drawMouth(c: CreatureGenome, geo: Geo, st: { sleepy: boolean; sad: boolean; happy: boolean }) {
  if (c.snout === 'beakShort' || c.snout === 'beakLong') return null;
  const cx = CX, y = geo.faceCy + 24;
  if (st.sleepy) return <Ellipse cx={cx} cy={y} rx="3" ry="2" fill="#3A2E22" />;
  const sign = st.sad ? -1 : st.happy ? 1.4 : 1;
  return (
    <Path
      d={`M ${cx - 8} ${y - sign * 0.5} Q ${cx} ${y + sign * 5} ${cx + 8} ${y - sign * 0.5}`}
      stroke="#3A2E22" strokeWidth="2.4" fill="none" strokeLinecap="round"
    />
  );
}

function drawPattern(c: CreatureGenome, geo: Geo, override?: CreatureGenome['pattern'] | null) {
  const accent = c.palette.accent, deep = c.palette.deep;
  const { bodyCx: cx, bodyCy: cy, bodyRx: rx, bodyRy: ry } = geo;
  // Mutação pode sobrescrever o padrão do genoma (marco visível).
  const pattern = override ?? c.pattern;
  switch (pattern) {
    case 'spots':
      return (
        <G fill={deep} opacity="0.32">
          <Circle cx={cx - rx * 0.4} cy={cy - ry * 0.1} r="6" />
          <Circle cx={cx + rx * 0.3} cy={cy + ry * 0.2} r="5" />
          <Circle cx={cx + rx * 0.1} cy={cy - ry * 0.35} r="4" />
          <Circle cx={cx - rx * 0.15} cy={cy + ry * 0.4} r="4.5" />
        </G>
      );
    case 'stripes':
      return (
        <G stroke={deep} strokeWidth="5" opacity="0.28" strokeLinecap="round">
          <Line x1={cx - rx} y1={cy - ry * 0.3} x2={cx + rx} y2={cy - ry * 0.5} />
          <Line x1={cx - rx} y1={cy} x2={cx + rx} y2={cy - ry * 0.2} />
          <Line x1={cx - rx} y1={cy + ry * 0.3} x2={cx + rx} y2={cy + ry * 0.1} />
        </G>
      );
    case 'scales':
      return (
        <G fill="none" stroke={deep} strokeWidth="1.6" opacity="0.3">
          {[0, 1, 2].map(row => [0, 1, 2, 3].map(col => (
            <Path key={`${row}-${col}`} d={`M ${cx - rx * 0.6 + col * rx * 0.4} ${cy - ry * 0.3 + row * ry * 0.3} q 8 8 16 0`} />
          )))}
        </G>
      );
    case 'petals':
      return (
        <G fill={accent} opacity="0.4">
          {[0, 72, 144, 216, 288].map(a => {
            const r = (a * Math.PI) / 180;
            return <Ellipse key={a} cx={cx + Math.cos(r) * rx * 0.4} cy={cy + Math.sin(r) * ry * 0.4} rx="6" ry="3.5" transform={`rotate(${a} ${cx + Math.cos(r) * rx * 0.4} ${cy + Math.sin(r) * ry * 0.4})`} />;
          })}
        </G>
      );
    case 'freckles':
      return (
        <G fill={deep} opacity="0.3">
          {[-1, 0, 1].map(i => <Circle key={i} cx={cx + i * 7} cy={geo.faceCy + 14} r="1.4" />)}
        </G>
      );
    case 'swirl':
      return <Path d={`M ${cx} ${cy} q ${rx * 0.4} -${ry * 0.2} ${rx * 0.2} ${ry * 0.3} q -${rx * 0.2} ${ry * 0.3} -${rx * 0.4} 0`} fill="none" stroke={accent} strokeWidth="3" opacity="0.5" strokeLinecap="round" />;
    case 'belly':
    case 'plain':
    default:
      return null;
  }
}

/**
 * Faíscas da evolução ao redor da criatura (forma plena / mutação de aura).
 * Posições fixas no viewBox 200×220 pra ficar estável (sem Math.random, que é
 * proibido no runtime determinístico e causaria flicker a cada render).
 */
function drawSparkles(count: number, color: string) {
  if (count <= 0) return null;
  const spots: [number, number, number][] = [
    [40, 70, 1.0], [162, 74, 0.9], [150, 150, 0.8], [48, 152, 0.85],
    [100, 34, 1.0], [176, 116, 0.7], [26, 116, 0.7], [100, 188, 0.8],
  ];
  return (
    <G fill={color}>
      {spots.slice(0, Math.min(count, spots.length)).map(([x, y, sc], i) => (
        <Path
          key={i}
          d={`M ${x} ${y - 4 * sc} l ${1.4 * sc} ${3 * sc} l ${3 * sc} ${1.4 * sc} l ${-3 * sc} ${1.4 * sc} l ${-1.4 * sc} ${3 * sc} l ${-1.4 * sc} ${-3 * sc} l ${-3 * sc} ${-1.4 * sc} l ${3 * sc} ${-1.4 * sc} z`}
          opacity="0.85"
        />
      ))}
    </G>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
});
