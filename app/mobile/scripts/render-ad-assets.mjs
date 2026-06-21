// Gera as IMAGENS de anúncio do Google Ads (Demand Gen / App) pro pré-registro
// do Meu Mascote, nos formatos exigidos: paisagem 1.91:1, quadrado 1:1,
// retrato 4:5, + logo quadrado e logo paisagem. Estética da marca (mascote +
// escassez + selo PRÉ-REGISTRO ABERTO + CTA). Saída: docs/play-store/ads/.
// Rodar de app/mobile:  node scripts/render-ad-assets.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const ROOT = 'C:/Users/Felipe/Documents/mascote';
const ASSETS = `${ROOT}/app/mobile/assets`;
const OUT = `${ROOT}/docs/play-store/ads`;
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const MASCOT = b64(`${ASSETS}/logo-mascote.png`);

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@500;700;800&family=Quicksand:wght@600;700&display=swap" rel="stylesheet">`;

const SPK = (x, y, s, o) => `<svg style="position:absolute;left:${x};top:${y};width:${s}px;height:${s}px;opacity:${o}" viewBox="0 0 24 24"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="#F2C14E"/></svg>`;

// headline/sub/cta por idioma
const COPY = {
  ptBR: { tag: 'PRÉ-REGISTRO ABERTO', h1: 'Ninguém tem um', h2: 'igual ao seu.', sub: 'Um bichinho que só evolui quando você cuida de você.', cta: 'Pré-registre grátis' },
};

function adHTML(c, W, H, kind) {
  // kind: 'landscape' | 'square' | 'portrait'
  const big = Math.round(W * (kind === 'landscape' ? 0.062 : kind === 'square' ? 0.085 : 0.082));
  const subSize = Math.round(W * (kind === 'landscape' ? 0.026 : kind === 'square' ? 0.034 : 0.034));
  const tagSize = Math.round(W * (kind === 'landscape' ? 0.016 : 0.024));
  const ctaSize = Math.round(W * (kind === 'landscape' ? 0.02 : 0.028));
  const logoSize = Math.round(W * (kind === 'landscape' ? 0.022 : 0.03));

  if (kind === 'landscape') {
    // texto à esquerda, mascote à direita
    return frame(W, H, `
      <div style="position:absolute;left:5%;top:50%;transform:translateY(-50%);width:55%">
        <div class="tag" style="font-size:${tagSize}px">${c.tag}</div>
        <div class="logo" style="font-size:${logoSize}px">Meu Mascote <b>•</b></div>
        <h1 style="font-size:${big}px">${c.h1} <span class="hl">${c.h2}</span></h1>
        <div class="sub" style="font-size:${subSize}px">${c.sub}</div>
        <div class="cta" style="font-size:${ctaSize}px">${c.cta}</div>
      </div>
      <div style="position:absolute;right:2%;top:0;bottom:0;width:42%;display:flex;align-items:center;justify-content:center">
        <div class="glow" style="width:${H * 0.9}px;height:${H * 0.9}px"></div>
        <img class="mascot" src="${MASCOT}" style="height:${H * 0.86}px"/>
      </div>`);
  }
  // square / portrait: mascote em cima, texto embaixo
  const mascotH = Math.round(H * (kind === 'square' ? 0.46 : 0.44));
  return frame(W, H, `
    <div style="position:absolute;left:0;right:0;top:${kind === 'portrait' ? 7 : 6}%;text-align:center">
      <div class="tag" style="font-size:${tagSize}px;display:inline-flex">${c.tag}</div>
    </div>
    <div style="position:absolute;left:0;right:0;top:${kind === 'portrait' ? 16 : 16}%;display:flex;align-items:center;justify-content:center;height:${mascotH}px">
      <div class="glow" style="width:${mascotH * 1.05}px;height:${mascotH * 1.05}px"></div>
      <img class="mascot" src="${MASCOT}" style="height:${mascotH}px"/>
    </div>
    <div style="position:absolute;left:8%;right:8%;bottom:${kind === 'portrait' ? 9 : 8}%;text-align:center">
      <div class="logo" style="font-size:${logoSize}px;margin-bottom:${H * 0.012}px">Meu Mascote <b>•</b></div>
      <h1 style="font-size:${big}px;line-height:1.02">${c.h1} <span class="hl">${c.h2}</span></h1>
      <div class="sub" style="font-size:${subSize}px;margin:${H * 0.015}px auto 0;max-width:86%">${c.sub}</div>
      <div class="cta" style="font-size:${ctaSize}px;margin-top:${H * 0.02}px">${c.cta}</div>
    </div>`);
}

function frame(W, H, inner) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  .ad{width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;
      background:radial-gradient(120% 130% at 75% 45%, #FFF1E6 0%, #FBF6F1 62%)}
  .tag{align-items:center;gap:9px;background:#FF8030;color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;
       letter-spacing:1.4px;padding:7px 16px 7px 14px;border-radius:999px;margin-bottom:14px;box-shadow:0 6px 16px rgba(255,128,48,.32);display:inline-flex}
  .tag::before{content:"";width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.45)}
  .logo{font-family:'Quicksand',sans-serif;font-weight:700;color:#1F1A14;letter-spacing:.2px}
  .logo b{color:#FF8030}
  h1{font-family:'Instrument Serif',serif;font-weight:400;color:#1F1A14;letter-spacing:.2px;line-height:1.0}
  h1 .hl{color:#E5651A;font-style:italic}
  .sub{font-weight:500;color:#5E5448;line-height:1.32}
  .cta{display:inline-block;background:#FF8030;color:#fff;font-weight:700;padding:.7em 1.4em;border-radius:999px;
       box-shadow:0 8px 20px rgba(255,128,48,.35);margin-top:.9em}
  .glow{position:absolute;border-radius:50%;background:radial-gradient(circle, rgba(242,193,78,.55) 0%, rgba(242,193,78,0) 68%);filter:blur(6px)}
  .mascot{position:relative;filter:drop-shadow(0 18px 26px rgba(140,80,30,.28))}
  </style></head><body><div class="ad">
    ${SPK('6%', '12%', 30, .85)}${SPK('90%', '16%', 22, .8)}${SPK('10%', '82%', 24, .7)}${SPK('92%', '80%', 26, .8)}
    ${inner}
  </div></body></html>`;
}

const SIZES = [
  { kind: 'landscape', w: 1200, h: 628, name: 'ad-landscape-1.91x1' },
  { kind: 'square', w: 1200, h: 1200, name: 'ad-square-1x1' },
  { kind: 'portrait', w: 1080, h: 1350, name: 'ad-portrait-4x5' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
let n = 0;
for (const lang of Object.keys(COPY)) {
  for (const s of SIZES) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.setContent(adHTML(COPY[lang], s.w, s.h, s.kind), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${lang}-${s.name}.png`, clip: { x: 0, y: 0, width: s.w, height: s.h } });
    await page.close(); n++;
  }
}
await browser.close();
console.log('IMAGENS DE ANÚNCIO:', n, '->', OUT);
