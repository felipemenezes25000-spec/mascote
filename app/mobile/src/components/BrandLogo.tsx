/**
 * BrandLogo — marca do Mascote, identidade "Living Identity".
 *
 * Refeita em 2026-05-20 — saiu do "robô laranja com face plate" pra silhueta
 * orgânica de criatura viva (gota luminescente + olho único + aura).
 *
 * Princípios da nova marca:
 *  - **Orgânico**: contorno em curvas, sem retângulos/parafusos
 *  - **Vivo**: olho único e brilhante, aura sutil
 *  - **Quente**: paleta de gradient deriva da paleta de tema atual (default
 *    laranja Mascote), nunca cinza neutro
 *  - **Adaptável**: tamanho via prop; variante `shapeOnly` pra usar fora de círculo
 *  - **Reduzido**: sem tipografia embutida — wordmark "mascote" fica em
 *    layout (variant Wordmark se preciso, separado)
 *
 * API mantém compatibilidade — callers continuam passando `size` e `shadow`.
 */

import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { makeShadow } from '@/lib/themes';
import { useTheme } from '@/lib/useTheme';

interface Props {
  size?: number;
  /** Sombra envolvente (default true). */
  shadow?: boolean;
  /** Sem círculo de fundo — usar em superfícies coloridas (default false). */
  shapeOnly?: boolean;
  /** Override de cor primária (default puxa do tema). */
  tint?: string;
}

export function BrandLogo({ size = 96, shadow = true, shapeOnly = false, tint }: Props) {
  const theme = useTheme();
  const primary = tint ?? theme.colors.primary;
  const deep = tint ?? theme.colors.primaryDeep;
  const soft = tint ? `${tint}55` : theme.colors.primarySoft;
  const glow = `${primary}33`;

  return (
    <View style={shadow ? makeShadow('#000', 0, 8, 12, 0.22, 6) : undefined}>
      <Svg width={size} height={size} viewBox="0 0 500 500">
        <Defs>
          <RadialGradient id="bodyGrad" cx="48%" cy="35%" rx="60%" ry="60%">
            <Stop offset="0%" stopColor={soft} />
            <Stop offset="55%" stopColor={primary} />
            <Stop offset="100%" stopColor={deep} />
          </RadialGradient>
          <RadialGradient id="auraGrad" cx="50%" cy="50%" rx="60%" ry="60%">
            <Stop offset="0%" stopColor={primary} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={primary} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="eyeGrad" x1="20%" y1="20%" x2="80%" y2="80%">
            <Stop offset="0%" stopColor="#FCF3E7" />
            <Stop offset="100%" stopColor="#1F1A14" />
          </LinearGradient>
        </Defs>

        {/* Aura sutil — só quando shapeOnly=false */}
        {!shapeOnly && (
          <Circle cx="250" cy="250" r="240" fill="url(#auraGrad)" />
        )}

        {/* Corpo orgânico — gota arredondada (não círculo perfeito).
            Path desenha uma forma de "lágrima invertida" — base larga, topo
            sutilmente afilado. Contorno em curvas suaves. */}
        <Path
          d="M 250 80
             C 360 80, 410 170, 410 270
             C 410 360, 350 420, 250 420
             C 150 420, 90 360, 90 270
             C 90 170, 140 80, 250 80
             Z"
          fill="url(#bodyGrad)"
        />

        {/* Highlight superior — sensação de luz vinda de cima esquerda */}
        <Path
          d="M 170 130
             C 220 110, 280 110, 320 140
             C 290 130, 230 130, 180 160 Z"
          fill="#FFFFFF"
          fillOpacity="0.18"
        />

        {/* Olho único, grande, posicionado levemente abaixo do centro */}
        <Circle cx="250" cy="265" r="48" fill="url(#eyeGrad)" />
        {/* Iris/pupil mais escuro */}
        <Circle cx="250" cy="270" r="26" fill="#1F1A14" />
        {/* Highlight no olho (sensação de vida) */}
        <Circle cx="238" cy="258" r="10" fill="#FCF3E7" fillOpacity="0.92" />
        {/* Sub-highlight ainda menor */}
        <Circle cx="258" cy="278" r="4" fill="#FCF3E7" fillOpacity="0.6" />

        {/* Glow ring discreto ao redor do olho — sinal de "presença viva" */}
        <Circle
          cx="250"
          cy="265"
          r="54"
          fill="none"
          stroke={glow}
          strokeWidth="3"
        />
      </Svg>
    </View>
  );
}

/**
 * Wordmark — versão texto "mascote" usando token `text.brand`.
 * Separada do logo gráfico — composição flexível.
 */
export { BrandLogo as default };
