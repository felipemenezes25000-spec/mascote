/**
 * WorldAdornments — camada visual da Jornada no Mascot2D.
 *
 * Renderiza, ATRÁS do mascote (dentro do mesmo Svg, então respira junto):
 *  - anel pontilhado na cor do mundo, intensidade crescente;
 *  - adorno temático do mundo (gotas, pétalas, brasas, faíscas, corações,
 *    estrelas-guia, louros, runas, constelação), com 1→3 elementos conforme
 *    a fase avança dentro do mundo.
 *
 * Tudo determinístico a partir de JourneyVisuals (puro do XP) — sem estado,
 * sem animação própria. Mundo 1 = 'none' (nascimento limpo).
 */
import { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import type { JourneyVisuals } from '@/game/journey/visuals';

interface Props {
  journey: JourneyVisuals;
}

/** Slots orbitais (viewBox 200x220, mascote centrado em ~100,110). */
const SLOTS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 34, y: 64 },
  { x: 166, y: 78 },
  { x: 44, y: 156 },
];

function teardrop(x: number, y: number): string {
  return `M ${x} ${y - 6} Q ${x + 4.5} ${y - 1} ${x + 4.5} ${y + 2} A 4.5 4.5 0 1 1 ${x - 4.5} ${y + 2} Q ${x - 4.5} ${y - 1} ${x} ${y - 6} Z`;
}

function spark(x: number, y: number, s: number = 6): string {
  const i = s * 0.27;
  return `M ${x} ${y - s} L ${x + i} ${y - i} L ${x + s} ${y} L ${x + i} ${y + i} L ${x} ${y + s} L ${x - i} ${y + i} L ${x - s} ${y} L ${x - i} ${y - i} Z`;
}

function heart(x: number, y: number): string {
  return `M ${x} ${y + 4} C ${x - 7} ${y - 2} ${x - 3} ${y - 8} ${x} ${y - 3.5} C ${x + 3} ${y - 8} ${x + 7} ${y - 2} ${x} ${y + 4} Z`;
}

export function WorldAdornments({ journey }: Props) {
  const { adornment, adornmentCount, hue, intensity, worldId } = journey;
  if (worldId <= 1 || adornment === 'none') return null;

  const ringOpacity = 0.12 + intensity * 0.3;
  const itemOpacity = 0.35 + intensity * 0.45;
  const slots = SLOTS.slice(0, adornmentCount);

  return (
    <G pointerEvents="none">
      {/* Anel de identidade do mundo — pontilhado, cresce com a intensidade. */}
      <Circle
        cx="100"
        cy="112"
        r={90}
        fill="none"
        stroke={hue}
        strokeWidth={2 + intensity * 1.5}
        strokeDasharray="1 7"
        strokeLinecap="round"
        opacity={ringOpacity}
      />

      {adornment === 'droplets' &&
        slots.map((s, i) => (
          <Path key={i} d={teardrop(s.x, s.y)} fill={hue} opacity={itemOpacity} />
        ))}

      {adornment === 'petals' &&
        slots.map((s, i) => (
          <G key={i} transform={`rotate(${i * 40 - 30} ${s.x} ${s.y})`}>
            <Ellipse cx={s.x} cy={s.y} rx="4" ry="7" fill={hue} opacity={itemOpacity} />
            <Circle cx={s.x} cy={s.y + 5} r="1.4" fill="#FFFFFF" opacity={itemOpacity * 0.8} />
          </G>
        ))}

      {adornment === 'embers' && (
        <G>
          {/* Brasas sobem da base — quantidade cresce com a fase. */}
          <Circle cx="56" cy="184" r="3.2" fill={hue} opacity={itemOpacity} />
          {adornmentCount >= 2 && <Circle cx="148" cy="178" r="2.6" fill={hue} opacity={itemOpacity * 0.9} />}
          {adornmentCount >= 3 && <Circle cx="68" cy="166" r="2" fill={hue} opacity={itemOpacity * 0.75} />}
          <Circle cx="56" cy="184" r="5.5" fill={hue} opacity={itemOpacity * 0.25} />
        </G>
      )}

      {adornment === 'sparks' &&
        slots.map((s, i) => (
          <Path key={i} d={spark(s.x, s.y, 6 - i)} fill={hue} opacity={itemOpacity} />
        ))}

      {adornment === 'hearts' &&
        slots.map((s, i) => (
          <Path key={i} d={heart(s.x, s.y)} fill={hue} opacity={itemOpacity * (1 - i * 0.15)} />
        ))}

      {adornment === 'compass' && (
        <G opacity={itemOpacity}>
          {/* Estrela-guia no topo + pontos cardeais conforme a fase avança. */}
          <Path d={spark(100, 26, 7)} fill={hue} />
          {adornmentCount >= 2 && (
            <>
              <Circle cx="22" cy="112" r="2.2" fill={hue} />
              <Circle cx="178" cy="112" r="2.2" fill={hue} />
            </>
          )}
          {adornmentCount >= 3 && <Circle cx="100" cy="206" r="2.2" fill={hue} />}
        </G>
      )}

      {adornment === 'laurels' && (
        <G opacity={itemOpacity}>
          {/* Ramos de louro flanqueando a base — símbolo de maestria. */}
          <Path d="M 52 180 Q 38 162 50 142" fill="none" stroke={hue} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 148 180 Q 162 162 150 142" fill="none" stroke={hue} strokeWidth="2.5" strokeLinecap="round" />
          <Ellipse cx="46" cy="158" rx="4" ry="2.2" fill={hue} transform="rotate(-40 46 158)" />
          <Ellipse cx="154" cy="158" rx="4" ry="2.2" fill={hue} transform="rotate(40 154 158)" />
          {adornmentCount >= 2 && (
            <>
              <Ellipse cx="50" cy="146" rx="4" ry="2.2" fill={hue} transform="rotate(-65 50 146)" />
              <Ellipse cx="150" cy="146" rx="4" ry="2.2" fill={hue} transform="rotate(65 150 146)" />
            </>
          )}
          {adornmentCount >= 3 && (
            <>
              <Ellipse cx="44" cy="170" rx="4" ry="2.2" fill={hue} transform="rotate(-20 44 170)" />
              <Ellipse cx="156" cy="170" rx="4" ry="2.2" fill={hue} transform="rotate(20 156 170)" />
            </>
          )}
        </G>
      )}

      {adornment === 'runes' &&
        slots.map((s, i) => (
          <G key={i} opacity={itemOpacity} >
            {/* Glifos angulares — cada slot um traço diferente. */}
            {i === 0 && (
              <>
                <Line x1={s.x - 3} y1={s.y - 6} x2={s.x - 3} y2={s.y + 6} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
                <Line x1={s.x - 3} y1={s.y - 4} x2={s.x + 4} y2={s.y - 7} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
                <Line x1={s.x - 3} y1={s.y} x2={s.x + 4} y2={s.y - 3} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
            {i === 1 && (
              <>
                <Line x1={s.x} y1={s.y - 6} x2={s.x} y2={s.y + 6} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
                <Line x1={s.x - 4} y1={s.y - 3} x2={s.x + 4} y2={s.y + 3} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
            {i === 2 && (
              <>
                <Line x1={s.x - 4} y1={s.y + 6} x2={s.x} y2={s.y - 6} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
                <Line x1={s.x} y1={s.y - 6} x2={s.x + 4} y2={s.y + 6} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
                <Line x1={s.x - 2.5} y1={s.y + 1.5} x2={s.x + 2.5} y2={s.y + 1.5} stroke={hue} strokeWidth="1.8" strokeLinecap="round" />
              </>
            )}
          </G>
        ))}

      {adornment === 'constellation' && (
        <G opacity={itemOpacity}>
          {/* Constelação coroada — arco de estrelas ligadas acima do mascote. */}
          <Line x1="48" y1="48" x2="76" y2="32" stroke={hue} strokeWidth="1" opacity="0.6" />
          <Line x1="76" y1="32" x2="100" y2="24" stroke={hue} strokeWidth="1" opacity="0.6" />
          <Circle cx="48" cy="48" r="2.4" fill={hue} />
          <Circle cx="76" cy="32" r="1.8" fill={hue} />
          <Path d={spark(100, 24, 6)} fill={hue} />
          {adornmentCount >= 2 && (
            <>
              <Line x1="100" y1="24" x2="124" y2="32" stroke={hue} strokeWidth="1" opacity="0.6" />
              <Circle cx="124" cy="32" r="1.8" fill={hue} />
            </>
          )}
          {adornmentCount >= 3 && (
            <>
              <Line x1="124" y1="32" x2="152" y2="48" stroke={hue} strokeWidth="1" opacity="0.6" />
              <Circle cx="152" cy="48" r="2.4" fill={hue} />
              <Path d={spark(170, 96, 4)} fill={hue} opacity="0.8" />
            </>
          )}
        </G>
      )}
    </G>
  );
}
