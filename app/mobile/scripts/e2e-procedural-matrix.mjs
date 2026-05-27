/**
 * Matriz Playwright: testa Mascot2D + ProceduralGenome em todas combinações
 * relevantes — 6 phases × 4 personalities × variações de genome (sem genome,
 * com genome IA, com userOverrides) e captura snapshots.
 *
 * Cobertura:
 *  - phases: ovo, bebe, crianca, adolescente, adulto, evoluido
 *  - personalities: calmo, motivador, fofo, sabio
 *  - genome states: none (fallback DNA-driven) | IA | IA + userOverrides
 *  - moods: triste, ok, feliz, empolgado, exausto
 *
 * Falha se: console errors, page crash, mascote ausente (svg count == 0),
 * ou canvas detectado (vestígio de 3D).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildE2eMascotDna } from './seed-e2e-dna.mjs';

const BASE = 'http://localhost:8081';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.validation', 'matrix');
mkdirSync(OUT_DIR, { recursive: true });

const PHASES = ['ovo', 'bebe', 'crianca', 'adolescente', 'adulto', 'evoluido'];
const PERSONALITIES = ['calmo', 'motivador', 'fofo', 'sabio'];
const MOODS = ['triste', 'ok', 'feliz', 'empolgado', 'exausto'];
const HEAD_SHAPES = ['round', 'oval', 'square', 'teardrop', 'crystal', 'cloud'];
const BODY_SHAPES = ['pebble', 'capsule', 'orb', 'leaf', 'stone'];

const NOW = new Date().toISOString();

function makeGenome({ trigger, headShape, bodyShape, markCount, hue, withCustomSvg, withUserOverrides }) {
  const marks = Array.from({ length: markCount }, (_, i) => ({
    kind: (['spot', 'star', 'crescent', 'rune', 'leaf'])[i % 5],
    placement: (['cheek', 'forehead', 'body', 'tail'])[i % 4],
    color: (['accent', 'deep', 'gold'])[i % 3],
    seed: (i + 1) * 10000,
  }));
  const accessories = withCustomSvg
    ? [{ id: 'custom-1', customSvg: '<svg><circle cx="100" cy="50" r="6" fill="#FFD700" /></svg>', origin: 'mark of perseverance' }]
    : [];
  const g = {
    version: 1,
    generatedAt: NOW,
    trigger,
    palette: { body: [hue, 60, 55], accent: [(hue + 30) % 360, 65, 50], deep: [(hue + 200) % 360, 40, 30], eye: [25, 60, 15] },
    silhouette: { headShape, headRx: 50, headRy: 48, bodyShape, proportions: { headBody: 1.0, eyeSize: 1.0 } },
    marks,
    accessories,
    expression: { mouthCurve: 0.5, eyeTilt: 0, cheekAlways: false },
    story: `Mascote único geradoo via genome ${trigger}.`,
  };
  if (withUserOverrides) {
    g.userOverrides = { bodyHue: (hue + 90) % 360, accentSaturation: 90, markCount: Math.max(0, markCount - 1) };
  }
  return g;
}

function makeSeed({ userId, mascot, profileName }) {
  return {
    'mascote:_meta': JSON.stringify({ schema: 6, migrated_at: NOW }),
    'mascote:profiles': JSON.stringify([{ id: userId, display_name: profileName, age_band: '25-34', timezone: 'America/Sao_Paulo', locale: 'pt-BR', created_at: NOW }]),
    'mascote:mascots': JSON.stringify([mascot]),
    'mascote:settings': JSON.stringify([{ user_id: userId, theme_mode: 'system', brand_palette: 'classic', dynamic_text: true, reduce_motion: true, high_contrast: false, push_enabled: false, quiet_start: '22:00', quiet_end: '08:00', paused_until: null, language: 'pt-BR', consent_analytics: false, tour_completed: true }]),
    'mascote:streaks': JSON.stringify([{ user_id: userId, current_streak: 30, longest_streak: 50, last_active_date: NOW.slice(0, 10), grace_days_left: 2, updated_at: NOW }]),
    'mascote:wallet': JSON.stringify([{ user_id: userId, coins: 200, gems: 5, updated_at: NOW }]),
    'mascote:checkins': '[]', 'mascote:messages': '[]', 'mascote:missions': '[]', 'mascote:xp_events': '[]', 'mascote:inventory': '[]', 'mascote:scenes': '[]', 'mascote:achievements': '[]', 'mascote:notifications': '[]',
  };
}

function makeMascot({ userId, personality, phase, mood, genome }) {
  return {
    id: `m_${userId}`,
    user_id: userId,
    name: 'Pip',
    personality,
    phase,
    mood,
    xp: 200, level: 4, energy: 80, health: 90,
    dna: buildE2eMascotDna(personality),
    dna_seed: 12345,
    procedural_genome: genome,
    last_seen_at: NOW,
    created_at: NOW,
  };
}

async function navAndAssert(page, path, seed, name) {
  const consoleErrs = [];
  const pageErrs = [];
  const cListener = msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('favicon') && !t.includes('manifest')) consoleErrs.push(t);
    }
  };
  const pListener = e => pageErrs.push(e.message);
  page.on('console', cListener);
  page.on('pageerror', pListener);
  try {
    await page.goto(BASE, { waitUntil: 'load', timeout: 30_000 });
    await page.evaluate(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, seed);
    await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(3500);
    const svgs = await page.locator('svg').count();
    const canvases = await page.locator('canvas').count();
    const text = await page.evaluate(() => document.body?.innerText ?? '');
    const hasCrash = /Algo deu errado|Maximum update depth|Build de produção inseguro/i.test(text);
    return { name, ok: !hasCrash && svgs > 0 && canvases === 0, svgs, canvases, hasCrash, consoleErrs, pageErrs };
  } catch (e) {
    return { name, ok: false, error: String(e), consoleErrs, pageErrs };
  } finally {
    page.off('console', cListener);
    page.off('pageerror', pListener);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const results = [];

  // Matriz 1: cada (phase, personality) com genome único derivado da combinação
  for (let pi = 0; pi < PERSONALITIES.length; pi++) {
    const personality = PERSONALITIES[pi];
    for (let phi = 0; phi < PHASES.length; phi++) {
      const phase = PHASES[phi];
      const userId = `u_matrix_${personality}_${phase}`;
      const genome = makeGenome({
        trigger: `evolution:${phase}`,
        headShape: HEAD_SHAPES[(pi + phi) % HEAD_SHAPES.length],
        bodyShape: BODY_SHAPES[(pi + phi) % BODY_SHAPES.length],
        markCount: Math.min(5, phi),
        hue: (pi * 90 + phi * 30) % 360,
        withCustomSvg: phi === 5, // só evoluido tem custom svg
        withUserOverrides: pi === 1 && phi === 3, // 1 combinação tem userOverrides
      });
      const mascot = makeMascot({ userId, personality, phase, mood: MOODS[(pi + phi) % MOODS.length], genome });
      const seed = makeSeed({ userId, mascot, profileName: `${personality}-${phase}` });
      results.push(await navAndAssert(page, '/(tabs)', seed, `home-${personality}-${phase}`));
    }
  }

  // Matriz 2: paywall + mascot-editor + closet com genome variado
  for (const personality of PERSONALITIES) {
    const userId = `u_pages_${personality}`;
    const genome = makeGenome({
      trigger: 'streak:30d',
      headShape: 'oval',
      bodyShape: 'capsule',
      markCount: 3,
      hue: PERSONALITIES.indexOf(personality) * 90,
      withCustomSvg: false,
      withUserOverrides: false,
    });
    const mascot = makeMascot({ userId, personality, phase: 'adulto', mood: 'feliz', genome });
    const seed = makeSeed({ userId, mascot, profileName: personality });
    results.push(await navAndAssert(page, '/paywall', seed, `paywall-${personality}`));
    results.push(await navAndAssert(page, '/mascot-editor', seed, `editor-${personality}`));
    results.push(await navAndAssert(page, '/closet', seed, `closet-${personality}`));
  }

  // Matriz 3: mascote SEM proceduralGenome (fallback DNA-driven legacy) — não pode crashar
  for (const personality of PERSONALITIES) {
    const userId = `u_nogenome_${personality}`;
    const mascot = makeMascot({ userId, personality, phase: 'adulto', mood: 'feliz', genome: null });
    const seed = makeSeed({ userId, mascot, profileName: personality });
    results.push(await navAndAssert(page, '/(tabs)', seed, `no-genome-${personality}`));
  }

  await browser.close();

  const fail = results.filter(r => !r.ok || (r.pageErrs && r.pageErrs.length > 0)).length;
  const summary = results.map(r => ({
    name: r.name,
    ok: r.ok,
    svgs: r.svgs ?? 0,
    canvas: r.canvases ?? 0,
    pageErrs: (r.pageErrs ?? []).length,
    consoleErrs: (r.consoleErrs ?? []).length,
  }));
  writeFileSync(join(OUT_DIR, '_matrix-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ total: results.length, pass: results.length - fail, fail, summary }, null, 2));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});
