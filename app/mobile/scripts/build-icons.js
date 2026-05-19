/**
 * Gera assets/icon.png (1024x1024, fundo bege da marca) e
 * assets/adaptive-icon.png (1024x1024, fundo transparente) a partir do
 * logo retangular existente (assets/logo-mascote.png). Necessário porque
 * Expo exige ícones quadrados.
 *
 * Rodar quando o logo mudar:
 *   node scripts/build-icons.js
 */
const Jimp = require('jimp-compact');
const path = require('path');

const SRC = path.join(__dirname, '..', 'assets', 'logo-mascote.png');
const ICON_OUT = path.join(__dirname, '..', 'assets', 'icon.png');
const ADAPTIVE_OUT = path.join(__dirname, '..', 'assets', 'adaptive-icon.png');

// Cor de fundo da marca (mesmo bege usado em splash backgroundColor).
const BG = 0xfaf7f2ff;
const SIZE = 1024;
// Safe zone do adaptive icon Android: conteúdo deve caber no círculo central
// de ~66% do canvas. Mantemos margem generosa pra evitar corte.
const ADAPTIVE_FOREGROUND_FRACTION = 0.66;
// Ícone normal pode usar área um pouco maior (~78%) — não há mask circular.
const ICON_FOREGROUND_FRACTION = 0.78;

async function build() {
  const logo = await Jimp.read(SRC);
  const lw = logo.bitmap.width;
  const lh = logo.bitmap.height;

  // icon.png: fundo bege + logo escalado pra caber em 78% da largura
  const targetW1 = Math.round(SIZE * ICON_FOREGROUND_FRACTION);
  const scale1 = Math.min(targetW1 / lw, targetW1 / lh);
  const sw1 = Math.round(lw * scale1);
  const sh1 = Math.round(lh * scale1);
  const scaled1 = logo.clone().resize(sw1, sh1, Jimp.RESIZE_BICUBIC);
  const icon = new Jimp(SIZE, SIZE, BG);
  icon.composite(scaled1, Math.round((SIZE - sw1) / 2), Math.round((SIZE - sh1) / 2));
  await icon.writeAsync(ICON_OUT);
  console.log(`wrote ${ICON_OUT} (${SIZE}x${SIZE}, logo ${sw1}x${sh1})`);

  // adaptive-icon.png: fundo TRANSPARENTE (Android compõe com backgroundColor
  // do app.json), logo escalado pra caber em 66% (safe zone do círculo).
  const targetW2 = Math.round(SIZE * ADAPTIVE_FOREGROUND_FRACTION);
  const scale2 = Math.min(targetW2 / lw, targetW2 / lh);
  const sw2 = Math.round(lw * scale2);
  const sh2 = Math.round(lh * scale2);
  const scaled2 = logo.clone().resize(sw2, sh2, Jimp.RESIZE_BICUBIC);
  const adaptive = new Jimp(SIZE, SIZE, 0x00000000);
  adaptive.composite(scaled2, Math.round((SIZE - sw2) / 2), Math.round((SIZE - sh2) / 2));
  await adaptive.writeAsync(ADAPTIVE_OUT);
  console.log(`wrote ${ADAPTIVE_OUT} (${SIZE}x${SIZE}, logo ${sw2}x${sh2}, transparent bg)`);
}

build().catch(err => {
  console.error('icon build failed:', err);
  process.exit(1);
});
