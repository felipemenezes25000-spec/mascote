/**
 * Valida chat web: IA conectada + resposta OpenAI 200.
 * Uso: node scripts/validate-chat-ai.mjs [--base http://localhost:8081]
 */
import { chromium } from 'playwright';
import { buildE2eMascotDna } from './seed-e2e-dna.mjs';

const BASE = process.argv.includes('--base')
  ? process.argv[process.argv.indexOf('--base') + 1]
  : 'http://localhost:8081';

const USER_ID = 'u_e2e_openai';
const NOW = new Date().toISOString();

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

async function main() {
  const seed = buildSeed();
  let openaiStatus = null;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  page.on('response', res => {
    const url = res.url();
    if (url.includes('api.openai.com/v1/chat/completions')) {
      openaiStatus = res.status();
    }
  });

  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate(storage => {
    for (const [k, v] of Object.entries(storage)) {
      localStorage.setItem(k, v);
    }
  }, seed);

  await page.goto(`${BASE}/chat`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);

  const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
  const iaConectada = bodyText.includes('IA conectada');
  const offline = bodyText.includes('modo offline');

  const input = page.getByTestId('chat_input');
  await input.fill('Oi, responda com uma palavra: ok');
  await input.press('Enter');

  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (openaiStatus === 200) break;
    await page.waitForTimeout(500);
  }

  const bodyAfter = await page.evaluate(() => document.body?.innerText ?? '');
  const gotReply = bodyAfter.includes('ok') || bodyAfter.length > bodyText.length + 20;

  await browser.close();

  const result = {
    ok: iaConectada && !offline && openaiStatus === 200 && gotReply,
    iaConectada,
    offline,
    openai200: openaiStatus === 200,
    openaiStatus,
    gotReply,
  };
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 1);
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, reason: err instanceof Error ? err.message : String(err) }));
  process.exit(2);
});
