/**
 * Audit completo: navega TODAS as rotas, registra erros, faz interações simples
 * (primeiro botão/link visível), captura screenshot e dimensiona DOM.
 *
 * Uso: node scripts/audit-all-routes.mjs --base http://localhost:8081
 * Output:
 *   .validation/audit-routes.json
 *   .validation/screens/<route>.png
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildE2eMascotDna } from './seed-e2e-dna.mjs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:8081';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.validation');
const SHOTS_DIR = join(OUT_DIR, 'screens');
mkdirSync(SHOTS_DIR, { recursive: true });

const USER_ID = 'u_audit';
const NOW = new Date().toISOString();

function collectRoutes(dir, prefix = '') {
  const routes = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) {
      if (name.endsWith('.tsx') && !name.startsWith('_')) {
        const seg = name.replace(/\.tsx$/, '');
        if (seg === 'index' && prefix) routes.push(prefix || '/');
        else if (seg !== 'index') routes.push(`${prefix}/${seg}`.replace(/\/+/g, '/'));
      }
      continue;
    }
    if (name.startsWith('_') && name !== '(tabs)') continue;
    const nextPrefix =
      name.startsWith('(') && name.endsWith(')')
        ? prefix
        : `${prefix}/${name}`.replace(/\/+/g, '/');
    routes.push(...collectRoutes(full, nextPrefix));
  }
  return routes;
}

const ROUTES = [
  '/splash',
  '/(tabs)',
  '/(tabs)/chat',
  '/(tabs)/evolution',
  '/(tabs)/report',
  ...collectRoutes(APP_DIR).filter(r => r && r !== '/'),
];

function buildSeed() {
  const profile = {
    id: USER_ID,
    display_name: 'Audit',
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
    current_streak: 7,
    longest_streak: 12,
    last_active_date: NOW.slice(0, 10),
    grace_days_left: 2,
    updated_at: NOW,
  };
  const wallet = { user_id: USER_ID, coins: 320, gems: 8, updated_at: NOW };
  const mascot = {
    id: 'm_audit',
    user_id: USER_ID,
    name: 'Bipo',
    personality: 'calmo',
    phase: 'adulto',
    mood: 'feliz',
    xp: 240,
    level: 4,
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

function isNoise(text) {
  const t = (text ?? '').toLowerCase();
  return (
    t.includes('download the react devtools') ||
    t.includes('props.pointerevents is deprecated') ||
    t.includes('non-serializable values were found in the navigation state') ||
    t.includes('animated: `usenativedriver`') ||
    t.includes('expo-av') && t.includes('deprecated') ||
    t.includes('revenuecat') && t.includes('not configured') ||
    t.includes('computed radius is nan') ||
    t.includes('validatedomnesting') ||
    t.includes('attempted to navigate before mounting the root layout') ||
    t.includes('shadow* style props') ||
    t.includes('react devtools') ||
    // Dev-only warning quando o "primeiro botão" da audit é uma seta voltar
    // em rota standalone (sem stack histórico no headless). Não é crash.
    t.includes("the action 'go_back' was not handled")
  );
}

function safeFile(route) {
  return route.replace(/^\//, '').replace(/[\/\(\)]/g, '_') || 'root';
}

async function main() {
  const seed = buildSeed();
  const uniqueRoutes = [...new Set(ROUTES)].sort();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  let currentRoute = '(init)';
  const errors = [];
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    if (isNoise(msg.text())) return;
    errors.push({ route: currentRoute, kind: 'console', text: msg.text() });
  });
  page.on('pageerror', err => {
    if (isNoise(err.message)) return;
    errors.push({ route: currentRoute, kind: 'page', text: err.message });
  });

  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(s => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, seed);

  const perRoute = [];
  for (const route of uniqueRoutes) {
    currentRoute = route;
    const before = errors.length;
    const url = `${BASE}${route}`;
    const start = Date.now();
    let loaded = false;
    let crash = false;
    let interactiveCount = 0;
    let svgCount = 0;
    let bodyLen = 0;
    let firstClickOk = null;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(700);
      loaded = true;
      const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
      bodyLen = bodyText.length;
      crash =
        bodyText.includes('Algo deu errado') ||
        bodyText.includes('Maximum update depth') ||
        bodyText.includes('Build de produção inseguro');
      interactiveCount = await page.locator('button,[role="button"],a,input,textarea').count();
      svgCount = await page.locator('svg').count();
      // Tenta clicar no primeiro botão non-tab pra confirmar UI viva.
      const candidates = await page
        .locator('button:visible,[role="button"]:visible')
        .filter({ hasNotText: 'Home' })
        .filter({ hasNotText: 'Conversar' })
        .filter({ hasNotText: 'Evolução' })
        .filter({ hasNotText: 'Relatório' })
        .all();
      if (candidates.length > 0) {
        try {
          await candidates[0].click({ timeout: 2000, force: true });
          await page.waitForTimeout(400);
          firstClickOk = true;
        } catch {
          firstClickOk = false;
        }
      }
      await page.screenshot({ path: join(SHOTS_DIR, `${safeFile(route)}.png`) }).catch(() => undefined);
    } catch (e) {
      crash = true;
      errors.push({ route, kind: 'goto', text: e instanceof Error ? e.message : String(e) });
    }
    const elapsed = Date.now() - start;
    perRoute.push({
      route,
      loaded,
      crash,
      elapsedMs: elapsed,
      bodyLen,
      interactiveCount,
      svgCount,
      firstClickOk,
      newErrors: errors.length - before,
    });
    // Reset URL pra evitar arrastar estado entre rotas.
    if (route !== '/(tabs)') {
      try {
        await page.goto(`${BASE}/(tabs)`, { waitUntil: 'load', timeout: 20000 });
      } catch {}
    }
  }

  await browser.close();

  const summary = {
    base: BASE,
    routesChecked: uniqueRoutes.length,
    routesWithCrash: perRoute.filter(r => r.crash).length,
    routesWithNewErrors: perRoute.filter(r => r.newErrors > 0).length,
    totalErrors: errors.length,
    routesLowInteractivity: perRoute.filter(r => r.interactiveCount < 2 && r.loaded && !r.crash),
    perRoute,
    errors,
  };
  writeFileSync(join(OUT_DIR, 'audit-routes.json'), JSON.stringify(summary, null, 2));

  const failedRoutes = perRoute.filter(r => r.crash || r.newErrors > 0);
  console.log(
    `routes=${uniqueRoutes.length} crash=${summary.routesWithCrash} errors=${summary.totalErrors} fail_routes=${failedRoutes.length}`,
  );
  process.exit(failedRoutes.length === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
