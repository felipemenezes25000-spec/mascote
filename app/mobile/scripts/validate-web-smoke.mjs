/**
 * Smoke validation: home mascote visível + navegação entre tabs sem crash.
 * Uso: node scripts/validate-web-smoke.mjs [--base http://localhost:8081]
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildE2eMascotDna } from './seed-e2e-dna.mjs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:8081';

const USER_ID = 'u_smoke_validate';
const NOW = new Date().toISOString();

function buildSeed() {
  const profile = {
    id: USER_ID,
    display_name: 'Smoke',
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
    current_streak: 3,
    longest_streak: 5,
    last_active_date: NOW.slice(0, 10),
    grace_days_left: 2,
    updated_at: NOW,
  };
  const wallet = { user_id: USER_ID, coins: 100, gems: 2, updated_at: NOW };
  const mascot = {
    id: 'm_smoke',
    user_id: USER_ID,
    name: 'Bipo',
    personality: 'calmo',
    phase: 'adulto',
    mood: 'feliz',
    xp: 50,
    level: 2,
    energy: 80,
    health: 90,
    dna_seed: 42,
    last_seen_at: NOW,
    created_at: NOW,
    dna: buildE2eMascotDna(),
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

async function main() {
  const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.validation');
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push({ kind: 'console', text: msg.text() });
  });
  page.on('pageerror', err => errors.push({ kind: 'page', text: err.message }));

  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(storage => {
    for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  }, buildSeed());

  await page.goto(`${BASE}/(tabs)`, { waitUntil: 'load', timeout: 45000 });
  // Aguarda fallback web 3D→2D (4s) + animação inicial.
  await page.waitForTimeout(5500);

  const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
  const hasCrash =
    bodyText.includes('Algo deu errado') ||
    bodyText.includes('Maximum update depth') ||
    bodyText.includes('Build de produção inseguro');

  const mascot3d = await page.getByLabel('mascote procedural').count();
  const mascotInteract = await page.getByLabel('Interagir com o mascote').count();
  const canvasCount = await page.locator('canvas').count();
  const svgCount = await page.locator('svg').count();
  const hasName = bodyText.includes('Bipo');

  // Mascote 2D (web fallback) renderiza ~30+ SVGs aninhados (corpo, olhos, sombras…)
  // sem accessibilityLabel="mascote procedural". Aceitamos o sinal SVG + nome.
  const mascotVisible =
    hasName &&
    bodyText.includes('Bipo') &&
    (mascot3d > 0 || mascotInteract > 0 || canvasCount > 0 || svgCount > 20);

  await page.screenshot({ path: join(outDir, 'home-mascot.png'), fullPage: true });

  const tabs = ['Conversar', 'Evolução', 'Relatório', 'Home'];
  const tabResults = [];
  for (const tab of tabs) {
    const beforeErrors = errors.length;
    try {
      const tabBtn = page.getByRole('tab', { name: tab });
      const linkBtn = page.getByRole('link', { name: tab });
      const textBtn = page.getByText(tab, { exact: true });
      const target =
        (await tabBtn.count()) > 0
          ? tabBtn.first()
          : (await linkBtn.count()) > 0
            ? linkBtn.first()
            : textBtn.first();
      await target.click({ timeout: 8000, force: true });
      await page.waitForTimeout(1500);
      const t = await page.evaluate(() => document.body?.innerText ?? '');
      tabResults.push({
        tab,
        ok: !t.includes('Algo deu errado') && !t.includes('Maximum update depth'),
      });
    } catch (e) {
      tabResults.push({ tab, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
    for (let i = beforeErrors; i < errors.length; i++) {
      if (!errors[i].route) errors[i].route = tab;
    }
  }

  await browser.close();

  const criticalErrors = errors.filter(e => {
    const t = (e.text ?? '').toLowerCase();
    if (t.includes('download the react devtools')) return false;
    if (t.includes('revenuecat')) return false;
    if (t.includes('r3f: hooks can only be used within the canvas')) return false;
    if (t.includes('computed radius is nan')) return false;
    return true;
  });

  const report = {
    base: BASE,
    mascotVisible,
    mascotSignals: { mascot3d, mascotInteract, canvasCount, svgCount, hasName },
    hasCrash,
    tabResults,
    criticalErrors,
    screenshot: join(outDir, 'home-mascot.png'),
  };

  writeFileSync(join(outDir, 'smoke-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const pass =
    mascotVisible && !hasCrash && tabResults.every(t => t.ok) && criticalErrors.length === 0;
  process.exit(pass ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
