// Gera vídeos promo localizados (pt-BR, en-US, es-419) pra ficha da Play Store.
// Remonta um slideshow 1080x1920 / 30s a partir dos 8 screenshots emoldurados
// JÁ localizados (docs/play-store/assets/{lang}-01..08-*.png) + reusa a trilha
// sonora embutida no promo-en.mp4 (instrumental, sem vocal — serve às 3 línguas).
// Requer ffmpeg no PATH.  Rodar:  node scripts/render-promo-videos.mjs
import { execSync } from 'child_process';
import fs from 'fs';

const ROOT = 'C:/Users/Felipe/Documents/mascote';
const A = `${ROOT}/docs/play-store/assets`;
const MUSIC_SRC = `${A}/promo-en.mp4`; // fonte da trilha (áudio)

// Arco de promo (NÃO termina no paywall): abre no gancho, constrói, fecha no
// clímax de evolução. Cena 08-subscription (paywall) sai de propósito — fechar
// um promo em "pague" derruba conversão, principalmente pra ads.
const SHOTS = ['01-onboarding_welcome', '02-dna', '03-checkin', '04-mission-done', '06-mutations', '07-chat', '05-evolution'];
const LANGS = ['ptBR', 'enUS', 'es419'];
const DUR = 4.3; // s por cena -> 7 * 4.3 ≈ 30s (trim em -t 30; casa com a trilha)

if (!fs.existsSync(MUSIC_SRC)) throw new Error('faltou ' + MUSIC_SRC);

for (const lang of LANGS) {
  const frames = SHOTS.map((s) => `${A}/${lang}-${s}.png`);
  for (const f of frames) if (!fs.existsSync(f)) throw new Error('faltou frame ' + f);

  // lista do concat demuxer (cada cena por DUR; repete a última pro tempo final valer)
  const lines = [];
  for (const f of frames) { lines.push(`file '${f}'`); lines.push(`duration ${DUR}`); }
  lines.push(`file '${frames[frames.length - 1]}'`);
  const listPath = `${A}/_concat_${lang}.txt`;
  fs.writeFileSync(listPath, lines.join('\n'));

  const out = `${A}/promo-${lang}.mp4`;
  const vf = [
    'scale=1080:1920:force_original_aspect_ratio=decrease',
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
    'fps=30', 'format=yuv420p',
    'fade=t=in:st=0:d=0.5', 'fade=t=out:st=29.5:d=0.5',
  ].join(',');
  const cmd = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -i "${MUSIC_SRC}" -map 0:v -map 1:a -vf "${vf}" -af "afade=t=out:st=29.5:d=0.5" -c:v libx264 -preset medium -crf 20 -c:a aac -b:a 192k -t 30 -movflags +faststart "${out}"`;
  console.log('Renderizando', lang, '...');
  execSync(cmd, { stdio: 'inherit' });
  fs.unlinkSync(listPath);
  console.log('OK ->', out);
}
console.log('TODOS OS VÍDEOS PRONTOS');
