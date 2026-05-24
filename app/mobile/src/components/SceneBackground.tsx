/**
 * Cenários ilustrados em SVG, alinhados ao Design Handoff.
 * 6 cenários: room, forest, beach, library, lunar, cafe.
 *
 * Profundidade visual (camadas, de baixo pra cima):
 *  1. SVG art (cenário ilustrado)
 *  2. Vignette gradient (escurece bordas) — dá foco no mascote
 *  3. Inner highlight (1px branco translúcido topo) — "lift" tridimensional
 *  4. Content layer (mascote + badges)
 *
 * Em produção, substituir SVGs por ilustrações profissionais.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { makeShadow } from '@/lib/themes';
import { useTheme } from '@/lib/useTheme';
import type { Theme } from '@/lib/themes';
import type { MascotMood } from '@/types';
import { sceneAmbientTint } from '@/content/scenes';

interface Props {
  sceneId: string;
  height?: number;
  children?: React.ReactNode;
  /** Hora local 0–23 para tint de time-of-day. */
  hour?: number;
  /** Mood do mascote para hue shift. */
  mood?: MascotMood;
  /** Celebração de retorno (simulação). */
  celebrationActive?: boolean;
}

function SceneBackgroundImpl({
  sceneId,
  height = 240,
  children,
  hour = new Date().getHours(),
  mood = 'ok',
  celebrationActive = false,
}: Props) {
  const theme = useTheme();
  const isDark = theme.mode === 'dark';
  const ambient = sceneAmbientTint(hour, mood, celebrationActive);
  const moodOpacity = ambient.moodShift < 1 ? 0.12 : ambient.moodShift > 1 ? 0.08 : 0;
  const moodColor =
    mood === 'triste' || mood === 'exausto'
      ? 'rgba(80,90,120,'
      : mood === 'feliz' || mood === 'empolgado'
        ? 'rgba(255,200,100,'
        : 'rgba(255,255,255,';
  return (
    <View
      style={[
        styles.wrap,
        { height, borderRadius: theme.radius.xl },
        makeShadow(isDark ? '#000' : '#28200F', 0, 14, 32, isDark ? 0.45 : 0.12, 6),
      ]}
    >
      {/* Layer 1: SVG art */}
      <Svg
        viewBox="0 0 400 240"
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="xMidYMid slice"
      >
        {renderScene(sceneId, theme)}
      </Svg>

      {/* Layer 2: Time-of-day + mood tint */}
      <LinearGradient
        colors={[ambient.timeOverlay, ambient.timeOverlay, `${moodColor}${moodOpacity})`]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />

      {/* Layer 3: Vignette — escurece bordas pra dar foco central */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />

      {/* Layer 4: Inner highlight — top, simula key light */}
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        locations={[0, 0.35]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />

      {/* Layer 5: Border luminosa (hairline) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
            borderRadius: theme.radius.xl,
            pointerEvents: 'none',
          },
        ]}
      />

      {/* Layer 6: Conteúdo (mascote + UI) */}
      <View style={styles.contentLayer}>{children}</View>
    </View>
  );
}

function renderScene(id: string, theme: Theme) {
  switch (id) {
    case 'forest':
      return (
        <>
          <Defs>
            <SvgLinearGradient id="bg-forest" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#D9E9C3" />
              <Stop offset="100%" stopColor="#A6CC8C" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="400" height="240" fill="url(#bg-forest)" />
          <Circle cx="320" cy="60" r="34" fill="#F8E2A2" opacity="0.75" />
          {[40, 90, 350, 380].map((x, i) => (
            <G key={i} opacity={i < 2 ? 1 : 0.7}>
              <Rect x={x - 3} y="170" width="6" height="40" fill="#6E4A2C" />
              <Circle cx={x} cy="170" r="22" fill="#4F8A4A" />
              <Circle cx={x - 12} cy="160" r="14" fill="#3F7A3A" />
              <Circle cx={x + 12} cy="160" r="14" fill="#5B9456" />
            </G>
          ))}
          <Rect y="210" width="400" height="30" fill="#7BAE7A" />
          <Ellipse cx="150" cy="216" rx="20" ry="3" fill="#5E8E5C" opacity="0.6" />
        </>
      );

    case 'beach':
      return (
        <>
          <Defs>
            <SvgLinearGradient id="bg-beach" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFE2B5" />
              <Stop offset="50%" stopColor="#FFB57E" />
              <Stop offset="100%" stopColor="#6FA9CA" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="400" height="240" fill="url(#bg-beach)" />
          <Circle cx="320" cy="80" r="30" fill="#FFE9A1" opacity="0.9" />
          <Path d="M 0 200 Q 100 195 200 200 T 400 200 L 400 240 L 0 240 Z" fill="#F2D49B" />
          {/* palm */}
          <Rect x="60" y="120" width="4" height="90" fill="#6E4A2C" />
          <Ellipse cx="62" cy="120" rx="22" ry="6" fill="#4F8A4A" transform="rotate(-25 62 120)" />
          <Ellipse cx="62" cy="120" rx="22" ry="6" fill="#5B9456" transform="rotate(25 62 120)" />
          <Ellipse cx="62" cy="120" rx="22" ry="6" fill="#3F7A3A" transform="rotate(75 62 120)" />
        </>
      );

    case 'library':
      return (
        <>
          <Defs>
            <SvgLinearGradient id="bg-lib" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#3D2E1F" />
              <Stop offset="100%" stopColor="#5B4530" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="400" height="240" fill="url(#bg-lib)" />
          {[40, 100, 160].map(y => (
            <G key={y}>
              <Rect x="20" y={y} width="360" height="40" fill="#8B6940" />
              {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(x => (
                <Rect
                  key={x}
                  x={x}
                  y={y + 4}
                  width={18}
                  height="32"
                  fill={['#C44747', '#D9A04A', '#5E8E5C', '#3E6FAB', '#A66BCB', '#FF8030'][(((x + y) / 30) | 0) % 6]}
                />
              ))}
              <Rect x="20" y={y + 38} width="360" height="4" fill="#3D2E1F" />
            </G>
          ))}
          <Ellipse cx="320" cy="210" rx="40" ry="4" fill="#000" opacity="0.3" />
        </>
      );

    case 'lunar':
      return (
        <>
          <Defs>
            <SvgLinearGradient id="bg-lun" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#0F1E3A" />
              <Stop offset="100%" stopColor="#2A3A6A" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="400" height="240" fill="url(#bg-lun)" />
          {[[40, 30], [80, 55], [140, 20], [210, 45], [280, 25], [340, 60], [60, 90], [180, 90], [330, 110], [100, 140], [250, 130]].map(
            ([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={i % 3 ? 1.4 : 2.2} fill="white" opacity={i % 2 ? 0.9 : 0.6} />
            )
          )}
          <Circle cx="80" cy="50" r="22" fill="#E8E4D8" />
          <Circle cx="74" cy="46" r="4" fill="#C0B9A4" opacity="0.6" />
          <Circle cx="86" cy="56" r="3" fill="#C0B9A4" opacity="0.6" />
          <Path d="M 0 200 Q 200 160 400 200 L 400 240 L 0 240 Z" fill="#1E2D52" />
          <Circle cx="220" cy="195" r="6" fill="#34457A" />
          <Circle cx="270" cy="200" r="4" fill="#34457A" />
        </>
      );

    case 'cafe':
      return (
        <>
          <Defs>
            <SvgLinearGradient id="bg-cafe" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#F7E2C5" />
              <Stop offset="100%" stopColor="#D9B383" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="400" height="240" fill="url(#bg-cafe)" />
          {/* window */}
          <Rect x="40" y="30" width="120" height="120" rx="8" fill="#FFEFD3" stroke="#8C6532" strokeWidth="3" />
          <Path d="M 100 30 L 100 150" stroke="#8C6532" strokeWidth="2" />
          <Path d="M 40 90 L 160 90" stroke="#8C6532" strokeWidth="2" />
          {/* cup */}
          <Ellipse cx="300" cy="160" rx="36" ry="10" fill="#fff" />
          <Path d="M 264 160 L 268 195 Q 300 205 332 195 L 336 160 Z" fill="#FFFEF8" stroke="#8C6532" strokeWidth="2" />
          <Path d="M 336 170 q 16 0 16 12 q 0 12 -16 12" fill="none" stroke="#8C6532" strokeWidth="2.5" />
          <Ellipse cx="300" cy="160" rx="32" ry="6" fill="#6E4A2C" />
          {/* steam */}
          <Path d="M 286 145 q -4 -10 4 -16 q 8 -8 0 -16" stroke="#fff" strokeWidth="2" fill="none" opacity="0.7" />
          <Path d="M 302 145 q -4 -10 4 -16 q 8 -8 0 -16" stroke="#fff" strokeWidth="2" fill="none" opacity="0.5" />
          {/* table */}
          <Rect y="190" width="400" height="50" fill="#8C6532" />
        </>
      );

    case 'room':
    default:
      return (
        <>
          <Defs>
            <SvgLinearGradient id="bg-room" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.colors.primaryTint} />
              <Stop offset="100%" stopColor={theme.colors.bg} />
            </SvgLinearGradient>
          </Defs>
          <Rect width="400" height="240" fill="url(#bg-room)" />
          {/* quadro discreto à direita — evita “retângulo bege” competindo com o mascote */}
          <Rect x="300" y="52" width="72" height="44" rx="4" fill="none" stroke={theme.colors.border2} strokeWidth="1.5" opacity="0.7" />
          <Rect x="308" y="60" width="56" height="28" rx="2" fill={theme.colors.primarySoft} opacity="0.35" />
          {/* plant */}
          <Rect x="300" y="160" width="40" height="50" rx="4" fill="#8C6532" />
          <Circle cx="320" cy="160" r="16" fill="#4F8A4A" />
          <Circle cx="310" cy="155" r="10" fill="#5B9456" />
          <Circle cx="328" cy="155" r="10" fill="#3F7A3A" />
          {/* floor */}
          <Rect y="210" width="400" height="30" fill={theme.colors.bg2} />
        </>
      );
  }
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
});

/**
 * memoizado: scene change é raro, mas Home re-renderiza várias vezes por
 * interação. Sem memo, todo o SVG denso era reconstruído.
 */
export const SceneBackground = memo(SceneBackgroundImpl);
