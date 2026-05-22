/**
 * BrandLogo — marca oficial do Mascote.
 *
 * Refeita em 2026-05-22 — substituiu o SVG "gota luminescente" (que nunca foi
 * adotado oficialmente) pelo PNG canônico em assets/logo-mascote.png: o
 * robozinho laranja com elmo branco, antena e sorriso. Mesma arte usada em
 * splash, app icon (via build-icons.js) e favicon web.
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
