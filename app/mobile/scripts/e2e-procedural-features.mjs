/**
 * Playwright E2E das features novas (post-pivot 2026-05-27):
 *  1. Home renderiza Mascot2D (SVG, sem canvas)
 *  2. /paywall renderiza UniqueMascotPaywallCard com Mascot2D + headline + story
 *  3. /mascot-editor abre sliders quando tem genome
 *  4. /closet tem botão Compartilhar
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildE2eMascotDna } from './seed-e2e-dna.mjs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:8081';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.validation');
mkdirSync(OUT_DIR, { recursive: true });

const USER_ID = 'u_procedural_e2e';
const NOW = new Date().toISOString();

const FAKE_GENOME = {
  version: 1,
  generatedAt: NOW,
  trigger: 'evolution:adolescente',
  palette: {
    body: [210, 70, 60],
    accent: [340, 70, 65],
    deep: [220, 50, 35],
    eye: [25, 65, 15],
  },
  silhouette: {
    headShape: 'oval',
    headRx: 50,
    headRy: 48,
    bodyShape: 'capsule',
    proportions: { headBody: 1.1, eyeSize: 1.05 },
  },
  marks: [
    { kind: 'star', placement: 'cheek', color: 'gold', seed: 12345 },
    { kind: 'crescent', placement: 'forehead', color: 'accent', seed: 67890 },
  ],
  accessories: [],
  expression: { mouthCurve: 0.5, eyeTilt: 0, cheekAlways: false },
  story: 'Luna ganhou marcas estelares nesta evolução — sinal de paciência cultivada.',
};

function buildSeed() {
  const profile = {
    id: USER_ID,
    display_name: 'E2E IA',
    age_band: '25-34',
    timezone: 'America/Sao_Paulo',
    locale: 'pt-BR',
    created_at: NOW,
  };
  const settings = {
    user_id: USER_ID,
    theme_mode: 'system',
    brand_palette: 'classic',
    dynamic_text: true,
    reduce_motion: true,
    high_contrast: false,
    push_enabled: false,
    quiet_start: '22:00',
    quiet_end: '08:00',
    paused_until: null,
    language: 'pt-BR',
    consent_analytics: false,
    tour_completed: true,
  };
  const streak = {
    user_id: USER_ID,
    current_streak: 30,
    longest_streak: 50,
    last_active_date: NOW.slice(0, 10),
    grace_days_left: 2,
    updated_at: NOW,
  };
  const wallet = { user_id: USER_ID, coins: 200, gems: 5, updated_at: NOW };
  const mascot = {
    id: 'm_e2e_proc',
    user_id: USER_ID,
    name: 'Luna',
    personality: 'sabio',
    phase: 'adolescente',
    mood: 'feliz',
    xp: 200,
    level: 4,
    energy: 80,
    health: 90,
    dna: buildE2eMascotDna('sabio'),
    dna_seed: 12345,
    procedural_genome: FAKE_GENOME,
    last_seen_at: NOW,
    created_at: NOW,
  };
  return {
    'mascote:_meta': JSON.stringify({ schema: 6, migrated_at: NOW }),
    'mascote:profiles': JSON.stringify([profile]),
    'mascote:mascots': JSON.stringify([mascot]),
    'mascote:settings': JSON.stringify([settings]),
    'mascote:streaks': JSON.stringify([streak]),
    'mascote:wallet': JSON.stringify([wallet]),
    'mascote:checkins': JSON.stringify([]),
    'mascote:messages': JSON.stringify([]),
    'mascote:missions': JSON.stringify([]),
    'mascote:xp_events': JSON.stringify([]),
    'mascote:inventory': JSON.stringify([]),
    'mascote:scenes': JSON.stringify([]),
    'mascote:achievements': JSON.stringify([]),
    'mascote:notifications': JSON.stringify([]),
  };
}

async function runOnce(page, path, name, asserts) {
  const consoleErrs = [];
  const pageErrs = [];
  const onConsole = msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('favicon') && !t.includes('manifest')) consoleErrs.push(t);
    }
  };
  const onPageErr = e => pageErrs.push(e.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageErr);
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(5500);
    const data = await asserts(page);
    const screenshot = join(OUT_DIR, `proc-${name}.png`);
    await page.screenshot({ path: screenshot });
    return { name, path, ok: true, ...data, screenshot, consoleErrs, pageErrs };
  } catch (e) {
    const screenshot = join(OUT_DIR, `proc-${name}-fail.png`).replace(/\\/g, '/');
    await page.screenshot({ path: screenshot }).catch(() => {});
    return { name, path, ok: false, error: String(e), screenshot, consoleErrs, pageErrs };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageErr);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // 1. Carrega base, injeta seed via evaluate, recarrega
  await page.goto(BASE, { waitUntil: 'load', timeout: 60_000 });
  await page.evaluate(storage => {
    for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  }, buildSeed());

  const results = [];

  results.push(await runOnce(page, '/(tabs)', 'home', async (p) => {
    const text = await p.evaluate(() => document.body?.innerText ?? '');
    const svgs = await p.locator('svg').count();
    const canvasCount = await p.locator('canvas').count();
    return {
      hasMascotName: text.includes('Luna'),
      svgCount: svgs,
      canvasCount,
      bodyTextSample: text.slice(0, 200),
    };
  }));

  results.push(await runOnce(page, '/paywall', 'paywall', async (p) => {
    const text = await p.evaluate(() => document.body?.innerText ?? '');
    return {
      hasHeadline: /é único no mundo/i.test(text),
      hasStory: /marcas estelares|paciência cultivada/i.test(text),
      hasCta: /Continuar evoluindo|Premium|grátis/i.test(text),
      svgCount: await p.locator('svg').count(),
      bodyTextSample: text.slice(0, 400),
    };
  }));

  results.push(await runOnce(page, '/mascot-editor', 'mascot-editor', async (p) => {
    const text = await p.evaluate(() => document.body?.innerText ?? '');
    return {
      hasSliderTitle: /Cor do corpo|Marcas vis[ií]veis/i.test(text),
      hasSaveBtn: /Salvar/i.test(text),
      svgCount: await p.locator('svg').count(),
      bodyTextSample: text.slice(0, 400),
    };
  }));

  results.push(await runOnce(page, '/closet', 'closet', async (p) => {
    const text = await p.evaluate(() => document.body?.innerText ?? '');
    return {
      hasShareBtn: /Compartilhar/i.test(text),
      bodyTextSample: text.slice(0, 400),
    };
  }));

  await browser.close();

  const fail = results.filter(r => !r.ok || (r.pageErrs && r.pageErrs.length > 0)).length;
  // Tabela compacta de assertions
  const summary = results.map(r => ({
    route: r.path,
    ok: r.ok,
    asserts: Object.entries(r)
      .filter(([k, v]) => k.startsWith('has') && typeof v === 'boolean')
      .map(([k, v]) => `${k}=${v}`)
      .join(' · '),
    pageErrs: (r.pageErrs ?? []).length,
    consoleErrs: (r.consoleErrs ?? []).length,
  }));
  console.log(JSON.stringify({ pass: results.length - fail, fail, summary, results }, null, 2));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
