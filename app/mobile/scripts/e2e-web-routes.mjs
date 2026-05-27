/**
 * Navega todas as rotas do app (Expo Web) com Playwright e coleta erros de console/página.
 * Uso: node scripts/e2e-web-routes.mjs [--base http://localhost:8081]
 */
import { chromium } from 'playwright';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildE2eMascotDna } from './seed-e2e-dna.mjs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:8081';

const APP_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');

const USER_ID = 'u_e2e_playwright';
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
  ...collectRoutes(APP_DIR).filter(r => r && r !== '/'),
  '/(tabs)',
  '/(tabs)/chat',
  '/(tabs)/evolution',
  '/(tabs)/report',
];

function buildSeed() {
  const profile = {
    id: USER_ID,
    display_name: 'E2E',
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
    id: 'm_e2e',
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

function isNoise(text) {
  const t = text.toLowerCase();
  return (
    t.includes('download the react devtools') ||
    t.includes('props.pointerevents is deprecated') ||
    t.includes('non-serializable values were found in the navigation state') ||
    t.includes('animated: `useNativeDriver`') ||
    t.includes('expo-av') && t.includes('deprecated') ||
    t.includes('revenuecat') && t.includes('not configured') ||
    t.includes('r3f: hooks can only be used within the canvas') ||
    t.includes('computed radius is nan') ||
    t.includes('validateDOMNesting') ||
    t.includes('attempted to navigate before mounting the root layout')
  );
}

async function main() {
  const seed = buildSeed();
  const uniqueRoutes = [...new Set(ROUTES)].sort();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const errors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isNoise(text)) return;
    errors.push({ route: currentRoute, text });
  });
  page.on('pageerror', err => {
    pageErrors.push({ route: currentRoute, text: err.message, stack: err.stack });
  });

  let currentRoute = '(init)';

  // Expo dev mantém HMR/WebSocket aberto — `networkidle` nunca resolve e trava o audit.
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(storage => {
    for (const [k, v] of Object.entries(storage)) {
      localStorage.setItem(k, v);
    }
  }, seed);

  const results = [];

  for (const route of uniqueRoutes) {
    currentRoute = route;
    const url = `${BASE}${route}`;
    const routeErrors = [];
    const routePageErrors = [];
    const beforeLen = errors.length;
    const beforePageLen = pageErrors.length;

    try {
      await page.goto(url, { waitUntil: 'load', timeout: 25000 });
      await page.waitForTimeout(600);
      const bodyText = await page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
      const hasCrash =
        bodyText.includes('Algo deu errado') ||
        bodyText.includes('Build de produção inseguro') ||
        bodyText.includes('Maximum update depth');
      if (hasCrash) {
        routePageErrors.push({ text: 'ErrorBoundary ou crash visível na tela' });
      }
    } catch (e) {
      routePageErrors.push({ text: e instanceof Error ? e.message : String(e) });
    }

    for (let i = beforeLen; i < errors.length; i++) routeErrors.push(errors[i]);
    for (let i = beforePageLen; i < pageErrors.length; i++) routePageErrors.push(pageErrors[i]);

    if (routeErrors.length || routePageErrors.length) {
      results.push({ route, console: routeErrors, page: routePageErrors });
    }
  }

  await browser.close();

  console.log(JSON.stringify({ base: BASE, routesChecked: uniqueRoutes.length, failures: results }, null, 2));
  process.exit(results.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
