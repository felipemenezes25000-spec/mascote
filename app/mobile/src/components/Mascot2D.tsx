/**
 * Mascot2D — fallback SVG do mascote (carregado em devices sem suporte 3D).
 *
 * Mantém API idêntica ao Mascot3D pra ser drop-in. O wrapper em
 * `Mascot.tsx` escolhe automaticamente entre os dois via deviceCapabilities.
 *
 * Visual: robô laranja paramétrico alinhado ao Design Handoff:
 *  - Cabeça rounded-rectangle (rx 34)
 *  - Face plate branca interna
 *  - Antena com bolinha no topo
 *  - 2 parafusos laterais
 *  - Corpo aparece em stage 2+
 *  - Braços aparecem em stage 4+
 *  - Halo em stage 5
 *  - Acessórios: cap, bow, glasses, scarf, crown, flower, headphones
 */

import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/useTheme';
import type { MascotCustomization, MascotDNA, MascotMood, MascotPhase, Personality } from '@/types';
import { getPersonality } from '@/content/personalities';
import { paletteFromGenome, type Genome } from '@/lib/dna';
import { applyCustomization } from '@/lib/dna/customization';
import { morphologyFromGenome } from '@/lib/dna/morphology';
import {
  mergeMorphInfluences,
  morphInfluencesFromMorphology,
  type MorphInfluences,
} from '@/lib/dna/morphInfluences';
import { aggregateVisualImpact } from '@/lib/dna/mutations';
import { personalityMorphBias } from '@/lib/dna/personalityMorphBias';
import {
  DEFAULT_IDENTITY,
  identityFromHSL,
  tintIdentity,
  type MascotIdentity,
} from '@/lib/color/tint';

const AnimatedG = Animated.createAnimatedComponent(G);

export type AccessoryId =
  | 'none'
  | 'cap'
  | 'bow'
  | 'glasses'
  | 'scarf'
  | 'crown'
  | 'flower'
  | 'headphones'
  | 'mask'
  | 'star'
  | 'monocle'
  | 'cape'
  | 'cookie'
  | 'leaf'
  | 'horn';

interface Props {
  personality: Personality;
  phase: MascotPhase;
  mood: MascotMood;
  size?: number;
  reactTrigger?: number;
  /**
   * Aceita o tipo legado `{ emoji, slot }` (componentes antigos) ou direto um id de acessório.
   * Quando o id é conhecido, usa render SVG nativo do handoff; quando vem só emoji, usa overlay.
   */
  accessory?: AccessoryId | { emoji?: string; slot?: string; id?: AccessoryId } | null;
  reduceMotion?: boolean;
  /**
   * DNA opcional — quando passado, sobrescreve paleta baseada em personality
   * com paleta derivada do genoma. Garante que o fallback 2D seja a MESMA
   * criatura cromática que o 3D — não um "robô laranja genérico".
   *
   * Se ausente, mantém comportamento legado (personality.primaryColor).
   */
  dna?: MascotDNA;
  /** Customização opcional — afeta scaleX/scaleY do wrapper via morphInfluences. */
  customization?: MascotCustomization | null;
  /** Mutations desbloqueadas — contribuem boosts de morphInfluences. */
  mutationIds?: readonly string[];
}

/**
 * Converte morphInfluences em scaleX/scaleY pra wrapper SVG.
 *
 * SVG não tem blend shapes nativos como mesh 3D, então aproximamos:
 * - body_tall/body_short → scaleY (1.0 ± 0.15 * weight)
 * - body_wide/body_narrow → scaleX (1.0 ± 0.15 * weight)
 *
 * Eye/posture/aura são proporcionais ao scale global — não distorcem mais
 * que isso. É um fallback fiel cromaticamente, aproximado morfologicamente.
 */
function morphInfluencesToScale(inf: MorphInfluences): { scaleX: number; scaleY: number } {
  const MAX_DELTA = 0.15;
  const tall = inf.body_tall ?? 0;
  const short = inf.body_short ?? 0;
  const wide = inf.body_wide ?? 0;
  const narrow = inf.body_narrow ?? 0;
  return {
    scaleX: 1 + (wide - narrow) * MAX_DELTA,
    scaleY: 1 + (tall - short) * MAX_DELTA,
  };
}

// Cada fase tem stage ÚNICO (1..6) — antes ovo e bebe compartilhavam stage 1
// (visualmente idênticos) e adolescente = criança visualmente. QA flagrou
// 2026-05 que a "evolução" não aparecia. Agora cada fase muda morfologia real.
const phaseToStage: Record<MascotPhase, number> = {
  ovo: 1,
  bebe: 2,
  crianca: 3,
  adolescente: 4,
  adulto: 5,
  evoluido: 6,
};

// Personalidade afeta a forma da cabeça (não só cor). 4 silhuetas distintas:
//  - calmo:   arredondado, neutro
//  - motivador: alongado vertical (postura aberta)
//  - fofo:    super redondo, bochechas sempre marcadas
//  - sabio:   estreito + alto (silhueta contemplativa)
interface PersonalityShape {
  headRx: number;       // raio horizontal da cabeça
  headRy: number;       // raio vertical
  headTopOffset: number; // deslocamento Y do topo da cabeça
  cheekAlways: boolean;
}
const personalityShapes: Record<Personality, PersonalityShape> = {
  calmo:     { headRx: 52, headRy: 46, headTopOffset: 0,  cheekAlways: false },
  motivador: { headRx: 48, headRy: 52, headTopOffset: -3, cheekAlways: false },
  fofo:      { headRx: 56, headRy: 50, headTopOffset: 2,  cheekAlways: true },
  sabio:     { headRx: 44, headRy: 56, headTopOffset: -4, cheekAlways: false },
};

// my mood -> handoff mood
const moodMap = {
  triste: 'sad' as const,
  ok: 'calm' as const,
  feliz: 'happy' as const,
  empolgado: 'proud' as const,
  exausto: 'sleepy' as const,
};

function resolveAccessoryId(acc: Props['accessory']): AccessoryId {
  if (!acc) return 'none';
  if (typeof acc === 'string') return acc as AccessoryId;
  if (acc.id) return acc.id;
  return 'none';
}

function MascotImpl({
  personality,
  phase,
  mood,
  size = 220,
  reactTrigger = 0,
  accessory,
  reduceMotion,
  dna,
  customization,
  mutationIds = [],
}: Props) {
  const theme = useTheme();
  const meta = getPersonality(personality);
  const stage = phaseToStage[phase];
  const hMood = moodMap[mood];
  const accessoryId = resolveAccessoryId(accessory);

  const breath = useSharedValue(1);
  const hop = useSharedValue(0);
  const blink = useSharedValue(1);
  // Phase transition cinematics: quando phase muda, dispara wobble + flash + scale-pop
  const phaseScale = useSharedValue(1);
  const phaseFlash = useSharedValue(0);
  const phaseRotate = useSharedValue(0);
  // Mood-aware tilt: triste cabeça pra baixo, empolgado pra cima
  const moodTilt = useSharedValue(0);
  // Track previous phase pra detectar transição real (não primeira render)
  const prevPhaseRef = useRef<MascotPhase | null>(null);

  useEffect(() => {
    // cancela qualquer animação ativa antes de re-iniciar ou parar
    cancelAnimation(breath);
    cancelAnimation(blink);
    if (reduceMotion) {
      breath.value = 1;
      blink.value = 1;
      return;
    }
    breath.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    blink.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3500 }),
        withTiming(0.08, { duration: 90 }),
        withTiming(1, { duration: 90 })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(blink);
    };
  }, [reduceMotion]);

  // Mood-aware idle tilt: muda postura conforme humor (sutil, ~3deg)
  useEffect(() => {
    cancelAnimation(moodTilt);
    if (reduceMotion) {
      moodTilt.value = 0;
      return;
    }
    const target =
      hMood === 'proud' ? -2 :
      hMood === 'happy' ? -1 :
      hMood === 'sad' ? 3 :
      hMood === 'sleepy' ? 2 : 0;
    moodTilt.value = withSpring(target, { damping: 18, stiffness: 80 });
  }, [hMood, reduceMotion]);

  // Phase transition: ovo→bebê e demais — wobble + scale-pop + flash radial
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    // Primeira render: não dispara animação de evolução
    if (prev === null || prev === phase || reduceMotion) return;

    cancelAnimation(phaseScale);
    cancelAnimation(phaseFlash);
    cancelAnimation(phaseRotate);

    // Scale pop: encolhe, infla, normaliza
    phaseScale.value = withSequence(
      withTiming(0.82, { duration: 180, easing: Easing.in(Easing.cubic) }),
      withSpring(1.18, { damping: 8, stiffness: 160 }),
      withSpring(1, { damping: 12, stiffness: 140 }),
    );
    // Wobble: pequenas oscilações de rotação
    phaseRotate.value = withSequence(
      withTiming(-6, { duration: 90 }),
      withTiming(6, { duration: 120 }),
      withTiming(-4, { duration: 110 }),
      withTiming(0, { duration: 140 }),
    );
    // Flash radial: opacidade do glow vai a 1 e desce
    phaseFlash.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withDelay(180, withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })),
    );
  }, [phase, reduceMotion]);

  useEffect(() => {
    if (reactTrigger > 0) {
      hop.value = withSequence(
        withSpring(-14, { damping: 6, stiffness: 200 }),
        withSpring(0, { damping: 8, stiffness: 180 })
      );
    }
  }, [reactTrigger]);

  // Cleanup global: cancela todas as animações em curso no unmount.
  // Sem isso, animações de phase-transition / hop continuam rodando worklets
  // no UI thread após o componente sair da árvore.
  useEffect(() => {
    return () => {
      cancelAnimation(hop);
      cancelAnimation(breath);
      cancelAnimation(blink);
      cancelAnimation(phaseScale);
      cancelAnimation(phaseFlash);
      cancelAnimation(phaseRotate);
      cancelAnimation(moodTilt);
    };
  }, []);

  // Computa morphInfluences pra aproximar via scaleX/scaleY no wrapper.
  // NO-OP quando dna ausente — preserva comportamento legado pra callers
  // que ainda não passam DNA (testes antigos, etc).
  // useMemo: pipeline morph→customization→mutations→personality é caro;
  // sem memo, rodava a cada render (causa: SVG é children de tudo, qualquer
  // re-render do parent triggava recálculo + quebrava memoização de filhos).
  const morphScale = useMemo(() => {
    if (!dna) return { scaleX: 1, scaleY: 1 };
    try {
      const baseMorph = morphologyFromGenome(dna as Genome);
      const withCustom = applyCustomization(baseMorph, customization ?? null);
      const base = morphInfluencesFromMorphology(withCustom);
      const withMut = mergeMorphInfluences(
        base,
        aggregateVisualImpact(mutationIds).morphInfluenceBoosts,
      );
      const final = mergeMorphInfluences(withMut, personalityMorphBias(personality));
      return morphInfluencesToScale(final);
    } catch {
      return { scaleX: 1, scaleY: 1 };
    }
  }, [dna, customization, mutationIds, personality]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: hop.value },
      { scale: breath.value * phaseScale.value },
      { scaleX: morphScale.scaleX },
      { scaleY: morphScale.scaleY },
      { rotate: `${phaseRotate.value + moodTilt.value}deg` },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: phaseFlash.value * 0.85,
    transform: [{ scale: 1 + phaseFlash.value * 0.4 }],
  }));

  // PALETA: prioridade DNA → personality preset → tema (último recurso).
  //
  // **Por que DNA primeiro:** o Mascot2D é fallback do 3D. Se o 3D usa cor
  // derivada do genome via paletteFromGenome(), o 2D PRECISA usar a mesma cor
  // pra não quebrar a fantasia ("é a mesma criatura, só renderizada diferente").
  //
  // Sem DNA, cai pra preset por personality (Calmo=sage, Motivador=brand,
  // Fofo=coral, Sábio=lilac) — comportamento legado preservado.
  //
  // **Identidade cromática (Task 3.4):** o CORPO usa `tintIdentity(identity, mood)`
  // — mantém cor base do genome dominante, mood é tint sutil (±20° hue máximo).
  // Acentos (parafusos laterais, bochechas, etc.) usam `tintIdentity(identity,
  // 'ok')` pra ficarem FIXOS independentes do humor — Pip "é o mesmo Pip"
  // em todas as telas mesmo que esteja triste numa e empolgado em outra.
  const dnaPalette = dna ? paletteFromGenome(dna as Genome) : null;
  const identity: MascotIdentity = dnaPalette
    ? identityFromHSL(dnaPalette.bodyHSL)
    : DEFAULT_IDENTITY;
  // Corpo: identidade + tint de mood (sutil).
  const brand = tintIdentity(identity, mood);
  // Identidade pura (sem mood) — usada em acentos pra ficarem estáveis.
  const identityFixed = tintIdentity(identity, 'ok');
  // Fallback de "deep"/accent: paleta DNA tem accent próprio (matiz +22°),
  // se ausente cai no preset por personality (legado).
  const brandDeep = dnaPalette?.accent ?? meta.accentColor;
  const accent = dnaPalette?.accent ?? meta.accentColor;
  const accentDeep = dnaPalette?.body ? identityFixed : meta.primaryColor;

  // Morfologia por fase — cada fase adiciona elementos NOVOS visíveis.
  //  ovo (1):       só casca, sem cabeça
  //  bebe (2):      cabeça pequena, sem antena, sem corpo
  //  crianca (3):   + antena + corpo
  //  adolescente (4): + cauda segmentada (traço DLI primeira aparição)
  //  adulto (5):    + braços + antena dupla
  //  evoluido (6):  + halo + asas + aura
  const isEgg = phase === 'ovo';
  const showHead = !isEgg;
  const showAntenna = stage >= 3;
  const showBody = stage >= 3;
  const showTail = stage >= 4;
  const showArms = stage >= 5;
  const showDoubleAntenna = stage >= 5;
  const showHalo = stage >= 6;
  const showWings = stage >= 6;
  const showAura = stage >= 6;
  const shape = personalityShapes[personality] ?? personalityShapes.calmo;
  const scaleFactor = isEgg ? 0.7 : (0.74 + stage * 0.04);
  const eyeWide = hMood === 'proud' || hMood === 'happy';
  const smileSign = hMood === 'sad' ? -1 : hMood === 'sleepy' ? 0 : 1;

  return (
    <View style={[styles.wrap, { width: size, height: size + 20 }]}>
      {/* aura halo */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.04,
          left: size * 0.04,
          right: size * 0.04,
          bottom: size * 0.04,
          borderRadius: size / 2,
          backgroundColor: brand,
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />
      {/* phase-transition flash — só aparece durante evolução (opacity 0 idle) */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -size * 0.1,
            left: -size * 0.1,
            right: -size * 0.1,
            bottom: -size * 0.1,
            borderRadius: size,
            backgroundColor: brand,
            pointerEvents: 'none',
          },
          flashStyle,
        ]}
      />
      <Animated.View style={[styles.inner, wrapStyle]}>
        <Svg width={size} height={size + 20} viewBox="0 0 200 220">
          <Defs>
            <RadialGradient id="mRad" cx="36%" cy="30%" rx="78%" ry="78%" fx="36%" fy="30%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <Stop offset="55%" stopColor={brand} stopOpacity="1" />
              <Stop offset="100%" stopColor={brand} stopOpacity="0.88" />
            </RadialGradient>
            <LinearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F4ECE2" />
            </LinearGradient>
          </Defs>

          {/* shadow */}
          <Ellipse cx="100" cy="200" rx={45 * scaleFactor} ry="5" fill="rgba(30,20,10,0.14)" />

          {/* AURA — stage 6 (evoluido). 3 anéis concêntricos sutis. */}
          {showAura && (
            <G>
              <Circle cx="100" cy="110" r={92 * scaleFactor} fill={brand} opacity="0.06" />
              <Circle cx="100" cy="110" r={80 * scaleFactor} fill={accent} opacity="0.05" />
              <Circle cx="100" cy="110" r={68 * scaleFactor} fill={brand} opacity="0.07" />
            </G>
          )}

          {/* ASAS — stage 6. Duas pétalas laterais cobrindo bordas do corpo. */}
          {showWings && (
            <G transform={`translate(100 130) scale(${scaleFactor}) translate(-100 -130)`}>
              <Path
                d="M 60 120 Q 18 100 26 145 Q 40 165 62 150 Z"
                fill={accent}
                opacity="0.55"
              />
              <Path
                d="M 140 120 Q 182 100 174 145 Q 160 165 138 150 Z"
                fill={accent}
                opacity="0.55"
              />
            </G>
          )}

          {/* halo (stage 6 evoluido) */}
          {showHalo && (
            <Ellipse
              cx="100"
              cy="42"
              rx={50 * scaleFactor}
              ry="6"
              fill="none"
              stroke={brand}
              strokeWidth="2.5"
              opacity={0.7}
            />
          )}

          {/* CAUDA SEGMENTADA — stage 4+ (adolescente). Traço DLI visível. */}
          {showTail && (
            <G transform={`translate(100 180) scale(${scaleFactor}) translate(-100 -180)`}>
              <Circle cx="155" cy="190" r="7" fill={brand} opacity="0.92" />
              <Circle cx="167" cy="186" r="5.5" fill={brand} opacity="0.85" />
              <Circle cx="176" cy="180" r="4" fill={accent} opacity="0.9" />
            </G>
          )}

          {/* body (stage 3+ crianca) */}
          {showBody && (
            <G transform={`translate(100 180) scale(${scaleFactor}) translate(-100 -180)`}>
              <Rect x="60" y="125" width="80" height="60" rx="22" fill={brand} />
              <Rect x="60" y="125" width="80" height="60" rx="22" fill="url(#faceGrad)" opacity="0.06" />
              <Rect x="78" y="142" width="44" height="28" rx="10" fill="#FFFFFF" />
              <Circle cx="100" cy="156" r="3" fill={accent} />
              <Rect x="86" y="166" width="28" height="2" rx="1" fill="#F4ECE2" />
            </G>
          )}

          {/* arms (stage 4+) */}
          {showArms && (
            <G transform={`translate(100 160) scale(${scaleFactor}) translate(-100 -160)`}>
              <Rect x="46" y="138" width="14" height="34" rx="7" fill={brand} />
              <Rect x="140" y="138" width="14" height="34" rx="7" fill={brand} />
              <Circle cx="53" cy="174" r="8" fill={brand} />
              <Circle cx="147" cy="174" r="8" fill={brand} />
            </G>
          )}

          {/* head wrapper — escondido quando phase === 'ovo' (mostra apenas casca) */}
          {showHead && (
          <G transform={`translate(100 100) scale(${scaleFactor}) translate(-100 -100)`}>
            {/* ANTENA CENTRAL — stage 3+ (criança). Bebê não tem antena. */}
            {showAntenna && (
              <>
                <Line x1="100" y1="36" x2="100" y2="52" stroke={brand} strokeWidth="4" strokeLinecap="round" />
                <Circle cx="100" cy="32" r="6" fill={brand} />
                <Circle cx="98" cy="30" r="1.6" fill="#FFFFFF" opacity="0.6" />
              </>
            )}
            {/* ANTENAS LATERAIS — stage 5+ (adulto). Visual de "evoluído" antes do halo. */}
            {showDoubleAntenna && (
              <>
                <Line x1="78" y1="44" x2="68" y2="32" stroke={brand} strokeWidth="3" strokeLinecap="round" />
                <Circle cx="66" cy="30" r="4" fill={accent} />
                <Line x1="122" y1="44" x2="132" y2="32" stroke={brand} strokeWidth="3" strokeLinecap="round" />
                <Circle cx="134" cy="30" r="4" fill={accent} />
              </>
            )}

            {/* head — proporção por personalidade (calmo arredondado, motivador alongado, fofo redondo, sabio estreito) */}
            <Ellipse
              cx="100"
              cy={96 + shape.headTopOffset}
              rx={shape.headRx}
              ry={shape.headRy}
              fill="url(#mRad)"
            />

            {/* face plate */}
            <Ellipse cx="100" cy={100 + shape.headTopOffset} rx={shape.headRx - 14} ry={shape.headRy - 14} fill="#FFFFFF" />

            {/* eyes (com blink animado por opacidade controlada — simplificado) */}
            {hMood === 'sleepy' ? (
              <>
                <Ellipse cx="84" cy="102" rx={5} ry={1.5} fill="#1F1A14" />
                <Ellipse cx="116" cy="102" rx={5} ry={1.5} fill="#1F1A14" />
              </>
            ) : (
              <AnimatedEyes blink={blink} eyeWide={eyeWide} />
            )}

            {/* cheeks — fofo sempre tem, outros só em happy/proud */}
            {(shape.cheekAlways || hMood === 'happy' || hMood === 'proud') && (
              <>
                <Ellipse cx="72" cy="112" rx="6" ry="3" fill={accent} opacity={shape.cheekAlways ? 0.55 : 0.45} />
                <Ellipse cx="128" cy="112" rx="6" ry="3" fill={accent} opacity={shape.cheekAlways ? 0.55 : 0.45} />
              </>
            )}

            {/* mouth */}
            {hMood === 'sleepy' ? (
              <Ellipse cx="100" cy="118" rx="3.5" ry="2" fill="#1F1A14" />
            ) : (
              <Path
                d={`M 88 ${116 - smileSign * 0.5} Q 100 ${118 + smileSign * 5} 112 ${116 - smileSign * 0.5}`}
                stroke="#1F1A14"
                strokeWidth="2.6"
                fill="none"
                strokeLinecap="round"
              />
            )}

            {/* side bolts (parafusos) */}
            <Circle cx="50" cy="96" r="3" fill={accentDeep} opacity="0.55" />
            <Circle cx="150" cy="96" r="3" fill={accentDeep} opacity="0.55" />

            {/* accessories */}
            <AccessoryRender
              id={accessoryId}
              accent={accent}
              accentDeep={accentDeep}
              gold={theme.colors.gold}
              primaryDeep={theme.colors.primaryDeep}
              coral={theme.colors.coral}
              sage={theme.colors.sage}
              sageDeep={theme.colors.sageDeep}
            />

            {/* proud sparkles */}
            {hMood === 'proud' && (
              <G fill={theme.colors.gold}>
                <Path d="M 158 64 l 1.5 -4 l 1.5 4 l 4 1.5 l -4 1.5 l -1.5 4 l -1.5 -4 l -4 -1.5 z" />
                <Circle cx="44" cy="74" r="1.6" />
                <Circle cx="170" cy="110" r="1.2" />
              </G>
            )}
          </G>
          )}

          {/* casca de ovo — só aparece quando phase === 'ovo' */}
          {isEgg && (
            <G transform={`translate(100 130) scale(${scaleFactor}) translate(-100 -130)`}>
              <Ellipse cx="100" cy="130" rx="62" ry="76" fill={brand} />
              <Ellipse cx="100" cy="130" rx="62" ry="76" fill="url(#mRad)" opacity="0.55" />
              <Circle cx="80" cy="100" r="3" fill="#FFFFFF" opacity="0.55" />
              <Circle cx="120" cy="110" r="2" fill="#FFFFFF" opacity="0.4" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * memoizado: props são primitivos + objetos pequenos. Como a Home faz
 * setReactBeat/setFlash várias vezes por interação (sem mudar mascot/phase/mood),
 * memo evita re-render do SVG denso + animação Reanimated.
 */
export const Mascot = memo(MascotImpl);
export const Mascot2D = Mascot;

function AnimatedEyes({ blink, eyeWide }: { blink: Animated.SharedValue<number>; eyeWide: boolean }) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: blink.value < 0.5 ? 0.15 : 1,
  }));
  const rx = eyeWide ? 6 : 5;
  const ry = 6;
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Ellipse cx="84" cy="98" rx={rx} ry={ry} fill="#1F1A14" />
      <Ellipse cx="116" cy="98" rx={rx} ry={ry} fill="#1F1A14" />
      <Circle cx="86" cy="96" r="1.6" fill="#FFFFFF" />
      <Circle cx="118" cy="96" r="1.6" fill="#FFFFFF" />
    </AnimatedG>
  );
}

function AccessoryRender({
  id,
  accent,
  accentDeep,
  gold,
  primaryDeep,
  coral,
  sage,
  sageDeep,
}: {
  id: AccessoryId;
  accent: string;
  accentDeep: string;
  gold: string;
  primaryDeep: string;
  coral: string;
  sage: string;
  sageDeep: string;
}) {
  switch (id) {
    case 'cap':
      return (
        <G>
          <Rect x="56" y="46" width="80" height="14" rx="6" fill="#2B6FB5" />
          <Rect x="98" y="56" width="42" height="6" rx="3" fill="#2B6FB5" />
          <Rect x="56" y="56" width="80" height="4" rx="2" fill="#1E5896" />
        </G>
      );
    case 'bow':
      return (
        <G>
          <Path d="M 88 50 L 76 42 L 76 58 Z" fill={accent} />
          <Path d="M 112 50 L 124 42 L 124 58 Z" fill={accent} />
          <Circle cx="100" cy="50" r="5" fill={accentDeep} />
        </G>
      );
    case 'glasses':
      return (
        <G>
          <Circle cx="84" cy="98" r="11" fill="none" stroke="#1F1A14" strokeWidth="2.5" />
          <Circle cx="116" cy="98" r="11" fill="none" stroke="#1F1A14" strokeWidth="2.5" />
          <Line x1="95" y1="98" x2="105" y2="98" stroke="#1F1A14" strokeWidth="2.5" />
        </G>
      );
    case 'crown':
      return (
        <G fill={gold} stroke="#C99A1F" strokeWidth="1">
          <Path d="M 64 48 L 70 36 L 78 46 L 90 32 L 100 46 L 110 32 L 122 46 L 130 36 L 136 48 L 136 56 L 64 56 Z" />
          <Circle cx="100" cy="40" r="2" fill={primaryDeep} stroke="none" />
        </G>
      );
    case 'flower':
      return (
        <G>
          <Circle cx="68" cy="48" r="5" fill={gold} />
          {[0, 72, 144, 216, 288].map(a => {
            const r = (a * Math.PI) / 180;
            return (
              <Ellipse
                key={a}
                cx={68 + Math.cos(r) * 7}
                cy={48 + Math.sin(r) * 7}
                rx="4"
                ry="4"
                fill={coral}
              />
            );
          })}
          <Circle cx="68" cy="48" r="3" fill="#FFFFFF" />
        </G>
      );
    case 'headphones':
      return (
        <G>
          <Path
            d="M 50 92 Q 50 50 100 50 Q 150 50 150 92"
            stroke="#1F1A14"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <Rect x="42" y="86" width="16" height="22" rx="6" fill="#1F1A14" />
          <Rect x="142" y="86" width="16" height="22" rx="6" fill="#1F1A14" />
          <Circle cx="50" cy="97" r="3" fill={accent} />
          <Circle cx="150" cy="97" r="3" fill={accent} />
        </G>
      );
    case 'scarf':
      return (
        <G>
          <Rect x="50" y="140" width="100" height="14" rx="5" fill={sage} />
          <Path d="M 130 154 L 150 174 L 138 174 L 124 162 Z" fill={sageDeep} />
        </G>
      );
    case 'star':
      return (
        <G fill={gold} stroke="#C99A1F" strokeWidth="1">
          <Path d="M 100 46 l 3 -10 l 3 10 l 10 3 l -10 3 l -3 10 l -3 -10 l -10 -3 z" />
        </G>
      );
    case 'monocle':
      return (
        <G>
          <Circle cx="116" cy="98" r="13" fill="none" stroke="#1F1A14" strokeWidth="2.5" />
          <Path d="M 116 111 L 116 134" stroke="#1F1A14" strokeWidth="1.5" />
        </G>
      );
    case 'mask':
      return (
        <G>
          <Path
            d="M 64 92 Q 84 80 100 92 Q 116 80 136 92 L 136 108 Q 100 122 64 108 Z"
            fill={accent}
            stroke={accentDeep}
            strokeWidth="1.5"
          />
          <Circle cx="84" cy="100" r="3" fill="#1F1A14" />
          <Circle cx="116" cy="100" r="3" fill="#1F1A14" />
        </G>
      );
    case 'cape':
      return (
        <G>
          <Path
            d="M 60 130 Q 100 144 140 130 L 144 200 Q 100 214 56 200 Z"
            fill={accent}
            stroke={accentDeep}
            strokeWidth="1.5"
          />
        </G>
      );
    case 'leaf':
      return (
        <G>
          <Path
            d="M 64 50 Q 78 36 92 50 Q 84 64 70 60 Z"
            fill="#C26A2A"
            stroke="#8C4F1F"
            strokeWidth="1"
          />
          <Path d="M 70 60 L 80 50" stroke="#8C4F1F" strokeWidth="1" />
        </G>
      );
    case 'cookie':
      return (
        <G>
          <Circle cx="100" cy="148" r="10" fill="#D9A04A" stroke="#8C6532" strokeWidth="1.5" />
          <Circle cx="97" cy="146" r="1.5" fill="#5E3A1B" />
          <Circle cx="103" cy="150" r="1.5" fill="#5E3A1B" />
          <Circle cx="100" cy="148" r="1.5" fill="#5E3A1B" />
        </G>
      );
    case 'horn':
      return (
        <G>
          <Path
            d="M 100 48 L 96 24 Q 100 22 104 24 Z"
            fill={gold}
            stroke="#C99A1F"
            strokeWidth="1"
          />
          <Path d="M 96 30 L 104 30" stroke="#C99A1F" strokeWidth="1" />
          <Path d="M 96 38 L 104 38" stroke="#C99A1F" strokeWidth="1" />
        </G>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
});
