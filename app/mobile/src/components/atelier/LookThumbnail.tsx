/**
 * LookThumbnail — mini swatch SVG (24×24) representando paleta + pattern
 * de um look salvo. Mostrado no chip do LookManager.
 *
 * Visual: círculo body color + arco accent + ponto glow + indicator de pattern.
 *
 * Não usa <MascotRenderer> pra evitar render pesado (chip horizontal scroll
 * com 5+ entries renderizando mascote completo seria desastre de perf).
 *
 * Implementação leve: SVG react-native-svg, mesma técnica do Mascot2D.
 */

import Svg, { Circle, G, Rect } from 'react-native-svg';
import type { AtelierLook } from '@/lib/db';

const PATTERN_INDICATORS: Record<string, { fill: string; rect?: boolean }> = {
  plain: { fill: 'transparent' },
  stripes: { fill: '#00000022', rect: true },
  spots: { fill: '#00000033' },
  fractal: { fill: '#00000044' },
  cells: { fill: '#00000033', rect: true },
};

/**
 * Deriva cores do snapshot via heurística simples (não chama paletteFromGenome
 * porque snapshot não tem DNA — só multiplicadores). Usa eye_size + aura como
 * hint de cor pra dar variação visual entre looks.
 *
 * Por ora cores são placeholder semânticas — futuro: snapshot.colorOverride se
 * usuário definir cor manual (hoje paleta vem do DNA).
 */
function placeholderColors(snapshot: AtelierLook['snapshot']): {
  body: string;
  accent: string;
  glow: string;
} {
  // Hash determinístico-ish dos multipliers pra ter cores estáveis por look.
  const sum =
    snapshot.eye_size +
    snapshot.body_height +
    snapshot.body_width +
    snapshot.aura_intensity;
  const hue = Math.floor((sum * 100) % 360);
  return {
    body: `hsl(${hue}, 65%, 60%)`,
    accent: `hsl(${(hue + 40) % 360}, 70%, 50%)`,
    glow: `hsl(${(hue + 180) % 360}, 60%, 70%)`,
  };
}

export interface LookThumbnailProps {
  look: AtelierLook;
  size?: number;
}

export function LookThumbnail({ look, size = 24 }: LookThumbnailProps) {
  const colors = placeholderColors(look.snapshot);
  const patternInfo = PATTERN_INDICATORS[look.snapshot.preferred_pattern] ?? PATTERN_INDICATORS.plain;
  const cx = size / 2;
  const cy = size / 2;
  const bodyR = size * 0.42;
  const accentR = size * 0.18;
  const glowR = size * 0.06;

  // Auto looks ganham borda dashed sutil — visual distintivo
  const isAuto = look.is_auto === true;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Body principal */}
      <Circle
        cx={cx}
        cy={cy}
        r={bodyR}
        fill={colors.body}
        stroke={isAuto ? '#FFFFFF66' : 'transparent'}
        strokeWidth={isAuto ? 1 : 0}
        strokeDasharray={isAuto ? '2 2' : undefined}
      />
      {/* Accent arc */}
      <Circle
        cx={cx + bodyR * 0.25}
        cy={cy - bodyR * 0.25}
        r={accentR}
        fill={colors.accent}
        opacity={0.85}
      />
      {/* Glow dot */}
      <Circle
        cx={cx - bodyR * 0.3}
        cy={cy + bodyR * 0.3}
        r={glowR}
        fill={colors.glow}
        opacity={0.9}
      />
      {/* Pattern indicator overlay */}
      {patternInfo.fill !== 'transparent' ? (
        patternInfo.rect ? (
          <G>
            <Rect x={cx - 4} y={cy + 2} width={8} height={1} fill={patternInfo.fill} />
            <Rect x={cx - 4} y={cy + 5} width={8} height={1} fill={patternInfo.fill} />
          </G>
        ) : (
          <G>
            <Circle cx={cx + 4} cy={cy + 3} r={1.2} fill={patternInfo.fill} />
            <Circle cx={cx - 3} cy={cy + 5} r={1} fill={patternInfo.fill} />
          </G>
        )
      ) : null}
    </Svg>
  );
}
