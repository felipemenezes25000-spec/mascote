/**
 * Logo oficial do Mascote — convertida do SVG do handoff (gemini-svg).
 * Robô-branco dentro de círculo laranja gradient, com face plate laranja escura,
 * antena e dois "parafusos" laterais.
 */

import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { makeShadow } from '@/lib/themes';

interface Props {
  size?: number;
  shadow?: boolean;
}

export function BrandLogo({ size = 96, shadow = true }: Props) {
  return (
    <View style={shadow ? makeShadow('#000', 0, 8, 8, 0.25, 6) : undefined}>
      <Svg width={size} height={size} viewBox="0 0 500 500">
        <Defs>
          <LinearGradient id="orangeCircleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E85D04" />
            <Stop offset="40%" stopColor="#D04E02" />
            <Stop offset="100%" stopColor="#801000" />
          </LinearGradient>
          <LinearGradient id="orangeFaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#D95407" />
            <Stop offset="100%" stopColor="#941C02" />
          </LinearGradient>
          <LinearGradient id="whiteRobotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="80%" stopColor="#F6F6F6" />
            <Stop offset="100%" stopColor="#E0E0E0" />
          </LinearGradient>
          <LinearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#333333" />
            <Stop offset="100%" stopColor="#0A0A0A" />
          </LinearGradient>
          <ClipPath id="circleClip">
            <Circle cx="250" cy="250" r="210" />
          </ClipPath>
        </Defs>

        <Circle cx="250" cy="250" r="210" fill="url(#orangeCircleGrad)" />
        <Circle cx="250" cy="250" r="208" fill="none" stroke="#FFA366" strokeWidth="1.5" opacity="0.3" />

        <G clipPath="url(#circleClip)">
          {/* corpo + pescoço + braços + antena + cabeça (robô branco) */}
          <Path
            d="M 115 490 C 115 375, 385 375, 385 490 Z"
            fill="url(#whiteRobotGrad)"
          />
          <Path
            d="M 225 320 Q 250 315, 275 320 L 270 390 L 230 390 Z"
            fill="url(#whiteRobotGrad)"
          />
          <Rect x="93" y="212" width="30" height="60" rx="15" fill="url(#whiteRobotGrad)" />
          <Rect x="377" y="212" width="30" height="60" rx="15" fill="url(#whiteRobotGrad)" />
          <Rect x="243" y="100" width="14" height="60" rx="7" fill="url(#whiteRobotGrad)" />
          <Circle cx="250" cy="92" r="18" fill="url(#whiteRobotGrad)" />
          <Rect x="110" y="145" width="280" height="195" rx="97" fill="url(#whiteRobotGrad)" />

          {/* face plate laranja */}
          <Rect x="146" y="177" width="208" height="130" rx="65" fill="url(#orangeFaceGrad)" />
          <Rect
            x="146"
            y="177"
            width="208"
            height="130"
            rx="65"
            fill="none"
            stroke="#400A00"
            strokeWidth="2.5"
            opacity="0.35"
          />

          {/* olhos */}
          <Circle cx="202" cy="235" r="17" fill="url(#eyeGrad)" />
          <Circle cx="197" cy="229" r="3.5" fill="#FFFFFF" opacity="0.9" />
          <Circle cx="298" cy="235" r="17" fill="url(#eyeGrad)" />
          <Circle cx="293" cy="229" r="3.5" fill="#FFFFFF" opacity="0.9" />

          {/* sorriso */}
          <Path
            d="M 218 260 Q 250 292, 282 260"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="9.5"
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
}
