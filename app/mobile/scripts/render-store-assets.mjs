// Renderiza os assets da Play Store (feature graphic + screenshots emoldurados)
// em alta qualidade via Playwright. Lê legendas de docs/play-store/assets/captions.json.
// Rodar de app/mobile:  node scripts/render-store-assets.mjs
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ROOT = 'C:/Users/Felipe/Documents/mascote';
const SCREENS = `${ROOT}/app/mobile/.validation/screens`;
const ASSETS = `${ROOT}/app/mobile/assets`;
const OUT = `${ROOT}/docs/play-store/assets`;
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const MASCOT = b64(`${ASSETS}/logo-mascote.png`);
const captions = JSON.parse(fs.readFileSync(`${OUT}/captions.json`, 'utf8'));

const SHOTS = ['onboarding_welcome', 'dna', 'checkin', 'mission-done', 'evolution', 'mutations', 'chat', 'subscription'];

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@500;700;800&family=Quicksand:wght@600;700&display=swap" rel="stylesheet">`;

const SPARKLE = (x, y, s, o) => `<svg class="spk" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;opacity:${o}" viewBox="0 0 24 24"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="#F2C14E"/></svg>`;

function featureHTML(c) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1024px;height:500px;overflow:hidden}
  .fg{width:1024px;height:500px;position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;
      background:radial-gradient(120% 130% at 78% 50%, #FFF1E6 0%, #FBF6F1 60%);}
  .left{position:absolute;left:64px;top:50%;transform:translateY(-50%);width:540px}
  .tag{display:inline-flex;align-items:center;gap:9px;background:#FF8030;color:#fff;font-family:'Quicksand',sans-serif;font-weight:700;font-size:13px;letter-spacing:1.6px;padding:7px 16px 7px 14px;border-radius:999px;margin-bottom:16px;box-shadow:0 6px 16px rgba(255,128,48,.32)}
  .tag::before{content:"";width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.45)}
  .logo{font-family:'Quicksand',sans-serif;font-weight:700;font-size:26px;color:#1F1A14;margin-bottom:18px;letter-spacing:.2px}
  .logo b{color:#FF8030}
  h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:66px;line-height:1.02;color:#1F1A14;letter-spacing:.2px}
  h1 .hl{color:#E5651A;font-style:italic}
  .sub{font-size:21px;font-weight:500;color:#5E5448;margin-top:18px;line-height:1.35;max-width:500px}
  .cta{display:inline-block;margin-top:24px;background:#FF8030;color:#fff;font-weight:700;font-size:18px;
       padding:13px 28px;border-radius:999px;box-shadow:0 8px 20px rgba(255,128,48,.35)}
  .right{position:absolute;right:40px;top:0;bottom:0;width:380px;display:flex;align-items:center;justify-content:center}
  .glow{position:absolute;width:360px;height:360px;border-radius:50%;
        background:radial-gradient(circle, rgba(242,193,78,.55) 0%, rgba(242,193,78,0) 68%);filter:blur(6px)}
  .mascot{position:relative;height:380px;filter:drop-shadow(0 18px 26px rgba(140,80,30,.28))}
  .spk{position:absolute}
  .arc{position:absolute;right:120px;bottom:46px;display:flex;align-items:flex-end;gap:14px;opacity:.42}
  .arc .e{border-radius:50%;background:#A89578}
  .arc .e1{width:18px;height:22px;background:#CDB79A}
  .arc .e2{width:26px;height:30px;background:#FFB347}
  .arc .e3{width:34px;height:40px;background:#FF8030}
  .arrow{color:#C9A24B;font-size:22px;align-self:center;margin:0 2px}
  </style></head><body>
  <div class="fg">
    <div class="left">
      ${c.fg.tag ? `<div class="tag">${c.fg.tag}</div>` : ''}
      <div class="logo">Meu Mascote <b>•</b></div>
      <h1>${c.fg.line1}<br>${c.fg.line2pre}<span class="hl">${c.fg.line2hl}</span>${c.fg.line2pos}</h1>
      <div class="sub">${c.fg.sub}</div>
      <div class="cta">${c.fg.cta}</div>
    </div>
    <div class="right">
      <div class="glow"></div>
      ${SPARKLE(40, 70, 34, .9)}${SPARKLE(300, 120, 22, .8)}${SPARKLE(70, 300, 26, .85)}${SPARKLE(330, 290, 18, .7)}
      <img class="mascot" src="${MASCOT}"/>
    </div>
    <div class="arc"><div class="e e1"></div><span class="arrow">›</span><div class="e e2"></div><span class="arrow">›</span><div class="e e3"></div></div>
  </div></body></html>`;
}

function shotHTML(caption, shotSrc) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1080px;height:1920px;overflow:hidden}
  .stage{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;
         background:linear-gradient(165deg,#FBF6F1 0%,#FFEFE2 100%)}
  .blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5}
  .b1{width:520px;height:520px;background:#FFD9BE;left:-160px;top:-120px}
  .b2{width:460px;height:460px;background:#E7D9F2;right:-150px;bottom:60px;opacity:.45}
  .cap{position:absolute;top:128px;left:0;right:0;text-align:center;padding:0 90px;
       font-weight:800;font-size:62px;line-height:1.14;color:#1F1A14;white-space:pre-line;letter-spacing:-.3px}
  .phone{position:absolute;left:50%;top:430px;transform:translateX(-50%);
         width:632px;background:#1F1A14;border-radius:60px;padding:16px;
         box-shadow:0 40px 80px rgba(90,60,30,.28)}
  .notch{position:absolute;left:50%;top:30px;transform:translateX(-50%);width:150px;height:26px;background:#1F1A14;border-radius:0 0 18px 18px;z-index:2}
  .screen{width:600px;height:1244px;border-radius:46px;overflow:hidden;background:#FAF7F2;display:block}
  .screen img{width:600px;height:1298px;display:block;margin-top:-8px}
  .spk{position:absolute}
  </style></head><body>
  <div class="stage">
    <div class="blob b1"></div><div class="blob b2"></div>
    ${SPARKLE(150, 360, 30, .85)}${SPARKLE(900, 300, 24, .8)}${SPARKLE(120, 1500, 26, .7)}${SPARKLE(940, 1560, 30, .8)}
    <div class="cap">${caption}</div>
    <div class="phone"><div class="notch"></div><div class="screen"><img src="${shotSrc}"/></div></div>
  </div></body></html>`;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });

let count = 0;
for (const lang of Object.keys(captions)) {
  const c = captions[lang];
  // Feature graphic 1024x500
  {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1024, height: 500 });
    await page.setContent(featureHTML(c), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/feature-${lang}.png`, clip: { x: 0, y: 0, width: 1024, height: 500 } });
    await page.close(); count++;
  }
  // 8 framed screenshots 1080x1920
  for (let i = 0; i < SHOTS.length; i++) {
    const shot = `${SCREENS}/${SHOTS[i]}.png`;
    if (!fs.existsSync(shot)) { console.log('MISSING', shot); continue; }
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.setContent(shotHTML(c.features[i], b64(shot)), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/${lang}-${String(i + 1).padStart(2, '0')}-${SHOTS[i]}.png`, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    await page.close(); count++;
  }
  console.log('done lang', lang);
}
await browser.close();
console.log('TOTAL IMAGES:', count);
