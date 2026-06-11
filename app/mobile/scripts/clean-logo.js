/**
 * clean-logo.js — remove o fundo xadrez CHAPADO do logo da ChatGPT.
 *
 * A arte exportada veio 100% opaca (alpha 255 em tudo): o "transparente" era
 * um xadrez de pixels reais (branco ~254 + cinza ~241). Este script faz
 * flood-fill a partir do fundo (cantos + frestas do ovo) removendo SÓ o
 * xadrez conectado e deixando alpha=0 — preserva o focinho/olhos brancos da
 * raposa porque estão cercados de laranja (ilha desconectada do fundo).
 *
 * Depois faz autocrop pra logo ficar justa (sem moldura quadrada → some a
 * "borda esquisita"). Rodar uma vez ao trocar a arte:
 *   node scripts/clean-logo.js "<caminho da arte>"
 * Default lê a arte da ChatGPT em D:\.
 */
const Jimp = require('jimp-compact');
const path = require('path');

const SRC = process.argv[2] || 'D:/ChatGPT Image 11 de jun. de 2026, 17_06_51.png';
const OUT = path.join(__dirname, '..', 'assets', 'logo-mascote.png');

// "Fundo": pixel neutro (R≈G≈B) E claro. Pega o xadrez branco(254)/cinza(241)
// mas NÃO o creme da barriga (254,226,174 — não-neutro), nem laranja, nem traço.
function isBg(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  return (mx - mn) <= 18 && mn >= 214;
}

Jimp.read(SRC).then(img => {
  const W = img.bitmap.width, H = img.bitmap.height, d = img.bitmap.data;
  const visited = new Uint8Array(W * H);
  const stack = [];
  function seed(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x;
    if (visited[p]) return;
    const i = p * 4;
    if (isBg(d[i], d[i + 1], d[i + 2])) { visited[p] = 1; stack.push(p); }
  }
  // Sementes: 4 cantos (fundo externo) + frestas internas do ovo (acima e dos
  // lados da raposa). Nunca semeamos o centro/rosto → focinho preservado.
  const seeds = [
    [2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3],
    [Math.floor(W / 2), Math.floor(H * 0.24)],
    [Math.floor(W * 0.33), Math.floor(H * 0.30)],
    [Math.floor(W * 0.67), Math.floor(H * 0.30)],
    [Math.floor(W * 0.27), Math.floor(H * 0.46)],
    [Math.floor(W * 0.73), Math.floor(H * 0.46)],
  ];
  for (const [x, y] of seeds) seed(x, y);
  while (stack.length) {
    const p = stack.pop();
    const x = p % W, y = (p - x) / W;
    d[p * 4 + 3] = 0; // transparente
    seed(x + 1, y); seed(x - 1, y); seed(x, y + 1); seed(x, y - 1);
  }
  // Erode 2px: tira o halo claro anti-aliased na borda do que virou transparente.
  for (let pass = 0; pass < 2; pass++) {
    const clear = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x, i = p * 4;
      if (d[i + 3] === 0) continue;
      if (!isBg(d[i], d[i + 1], d[i + 2])) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (d[(ny * W + nx) * 4 + 3] === 0) { clear.push(i); break; }
      }
    }
    for (const i of clear) d[i + 3] = 0;
  }
  // Autocrop: bbox dos pixels visíveis + margem pequena.
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 12) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const pad = 14;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  img.crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
  return img.writeAsync(OUT).then(() =>
    console.log(`wrote ${OUT} (${maxX - minX + 1}x${maxY - minY + 1}, fundo xadrez removido)`));
}).catch(e => { console.error(e); process.exit(1); });
