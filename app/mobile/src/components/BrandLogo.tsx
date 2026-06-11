/**
 * BrandLogo — marca oficial do Mascote.
 *
 * Arte oficial (2026-06-11): a raposinha/gatinho laranja fofo dentro do
 * contorno de ovo, com coração no peito — PNG canônico em
 * assets/logo-mascote.png. Mesma arte em splash, app icon e favicon web
 * (icon.png/adaptive-icon.png gerados via `node scripts/build-icons.js`).
 *
 * Props preservadas pra back-compat:
 *  - `size`: lado do quadrado em px (default 96).
 *  - `shadow`: drop shadow sob o logo (default true).
 *  - `shapeOnly` e `tint`: no-op visual — a logo PNG é colorida fixa. Mantidos
 *    pra não quebrar call-sites antigos. Se quisermos versão monocromática
 *    ou sem círculo no futuro, é arte nova, não prop.
 */

import { Image, View } from 'react-native';
import { makeShadow } from '@/lib/themes';
import { LOGO_SOURCE } from './brandLogoAsset';

interface Props {
  size?: number;
  shadow?: boolean;
  shapeOnly?: boolean;
  tint?: string;
}

export function BrandLogo({ size = 96, shadow = true }: Props) {
  return (
    <View style={shadow ? makeShadow('#000', 0, 8, 12, 0.22, 6) : undefined}>
      <Image
        source={LOGO_SOURCE}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Mascote"
      />
    </View>
  );
}

export { BrandLogo as default };
