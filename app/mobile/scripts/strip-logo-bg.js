/**
 * Remove o fundo branco/checkerboard de logo gerado por Gemini/Midjourney.
 *
 * Estratégia:
 *  - Flood-fill BFS a partir das 4 bordas da imagem.
 *  - Pixel é "fundo" se r,g,b >= 200 E sem saturação (max-min <= 35).
 *    Isso casa branco puro, cinza claro do checkerboard, e variações de
 *    anti-aliasing — mas rejeita o laranja do mascote.
 *  - Como o elmo branco do mascote está DENTRO do círculo laranja, ele fica
 *    desconectado das bordas e é preservado.
 *  - Depois faz autocrop ao bounding box do conteúdo (com padding pequeno).
 *
 * Uso:
 *   node scripts/strip-logo-bg.js <input.png> <output.png>
 */
const Jimp = require('jimp-compact');
const path = require('path');

const SRC = process.argv[2];
const OUT = process.argv[3];

if (!SRC || !OUT) {
  console.error('Uso: node strip-logo-bg.js <input.png> <output.png>');
  process.exit(1);
}

function isBackground(r, g, b) {
  if (r < 200 || g < 200 || b < 200) return false;
  return Math.max(r, g, b) - Math.min(r, g, b) <= 35;
}

(async () => {
  const img = await Jimp.read(SRC);
  const { width, height, data } = img.bitmap;
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = [];

  function tryPush(x, y) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const p = idx * 4;
    if (!isBackground(data[p], data[p + 1], data[p + 2])) return;
    visited[idx] = 1;
    queue.push(x, y);
  }

  // seed das 4 bordas
  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  // BFS — flat queue [x0, y0, x1, y1, ...]
  let i = 0;
  while (i < queue.length) {
    const x = queue[i++];
    const y = queue[i++];
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  // marca visitados como alpha=0
  let cleared = 0;
  for (let j = 0; j < total; j++) {
    if (visited[j]) {
      data[j * 4 + 3] = 0;
      cleared++;
    }
  }

  // 2ª passada — encontra a MAIOR componente conexa dos pixels que sobraram.
  // Tudo que não for parte dela = restos de "nuvens" decorativas; descarta.
  const compId = new Int32Array(total).fill(-1);
  let bestId = -1, bestSize = 0, bestBox = null;
  let nextId = 0;
  const stack = [];
  for (let sy = 0; sy < height; sy++) {
    for (let sx = 0; sx < width; sx++) {
      const sIdx = sy * width + sx;
      if (compId[sIdx] !== -1) continue;
      if (data[sIdx * 4 + 3] === 0) continue; // já transparente
      const id = nextId++;
      let size = 0;
      let bMinX = sx, bMinY = sy, bMaxX = sx, bMaxY = sy;
      stack.length = 0;
      stack.push(sx, sy);
      while (stack.length) {
        const y = stack.pop();
        const x = stack.pop();
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const idx = y * width + x;
        if (compId[idx] !== -1) continue;
        if (data[idx * 4 + 3] === 0) continue;
        compId[idx] = id;
        size++;
        if (x < bMinX) bMinX = x;
        if (x > bMaxX) bMaxX = x;
        if (y < bMinY) bMinY = y;
        if (y > bMaxY) bMaxY = y;
        stack.push(x - 1, y);
        stack.push(x + 1, y);
        stack.push(x, y - 1);
        stack.push(x, y + 1);
      }
      if (size > bestSize) {
        bestSize = size;
        bestId = id;
        bestBox = { minX: bMinX, minY: bMinY, maxX: bMaxX, maxY: bMaxY };
      }
    }
  }

  // descarta componentes != bestId
  let extraCleared = 0;
  for (let j = 0; j < total; j++) {
    if (compId[j] !== bestId && data[j * 4 + 3] > 0) {
      data[j * 4 + 3] = 0;
      extraCleared++;
    }
  }
  console.log(`maior componente: ${bestSize} px; descartou ${extraCleared} px de restos`);

  let { minX, minY, maxX, maxY } = bestBox;

  if (maxX < 0) {
    console.error('Nada sobrou após flood-fill — tolerância muito agressiva?');
    process.exit(2);
  }

  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const out = img.crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
  await out.writeAsync(OUT);

  console.log(`removido: ${cleared}/${total} px (${((cleared / total) * 100).toFixed(1)}%)`);
  console.log(`crop: ${out.bitmap.width}x${out.bitmap.height} (de ${width}x${height})`);
  console.log(`salvou: ${path.resolve(OUT)}`);
})().catch(err => {
  console.error('strip-logo-bg failed:', err);
  process.exit(1);
});
