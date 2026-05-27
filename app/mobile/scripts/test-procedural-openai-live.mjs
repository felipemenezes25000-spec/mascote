/**
 * Test de integração ao vivo: chama OpenAI real via openaiDirect e valida
 * que o LLM retorna ProceduralGenome que passa pelo schema validator.
 *
 * Roda 4 triggers diferentes (1 personalidade × 4 triggers) e relata sucesso.
 * Usa EXPO_PUBLIC_OPENAI_API_KEY do .env.
 *
 * NÃO commitar resultados (podem conter genome data).
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';

// Carrega .env manual (dotenv falha sem prefix EXPO)
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8');
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
if (!KEY) {
  console.error('Sem EXPO_PUBLIC_OPENAI_API_KEY no .env — abortando');
  process.exit(1);
}

const MODEL = 'gpt-4o-mini';

const SYSTEM_PROMPT = `Você gera "ProceduralGenome" — um JSON descrevendo a forma visual única de um mascote 2D.

REGRAS DURAS:
- Retorne APENAS um objeto JSON válido, sem comentário ou texto fora.
- "version": 1 sempre.
- "generatedAt": ISO 8601 atual.
- "trigger": exatamente o trigger que recebeu no contexto.
- "palette" tem body/accent/deep/eye — cada um tuple [hue 0-360, sat 0-100, lit 0-100].
- "silhouette.headShape" ∈ ["round","oval","square","teardrop","crystal","cloud"].
- "silhouette.bodyShape" ∈ ["pebble","capsule","orb","leaf","stone"].
- "silhouette.headRx" e "headRy" ∈ [20, 70].
- "silhouette.proportions.headBody" e "eyeSize" ∈ [0.5, 2.0].
- "marks" array, máx 5. Cada mark: {kind, placement, color, seed}.
  - kind ∈ ["spot","stripe","scar","star","crescent","leaf","rune"]
  - placement ∈ ["cheek","forehead","body","tail"]
  - color ∈ ["accent","deep","gold"]
  - seed número inteiro positivo
- "accessories" array (pode ser vazio). Sem "customSvg" — só {id, origin}.
- "expression": {mouthCurve: [-1..1], eyeTilt: [-20..20], cheekAlways: boolean}.
- "story": 1-2 frases (máx 280 chars) em português brasileiro, narrativa emocional sobre a forma que o mascote ganhou.

NUNCA invente campos extras.`;

function userPrompt({ personality, trigger, mascotName, streak, phase }) {
  return `Personalidade base: ${personality}
Nome do mascote: ${mascotName}
Trigger atual: ${trigger}
Fase: ${phase}
Streak (dias seguidos): ${streak}
Hábitos recentes do usuário: reading, exercise, meditation
Temas recentes de conversa: gratidão, ansiedade controlada, descanso

Gere o ProceduralGenome que reflete essa jornada. O número de marks deve crescer com streak (0-5).`;
}

// Validador inline (espelha src/lib/procedural/schema.ts essencial)
function validateMinimal(g, ctx) {
  const errs = [];
  if (g.version !== 1) errs.push('version != 1');
  if (typeof g.generatedAt !== 'string' || isNaN(Date.parse(g.generatedAt))) errs.push('generatedAt inválido');
  if (typeof g.trigger !== 'string') errs.push('trigger não-string');
  for (const slot of ['body', 'accent', 'deep', 'eye']) {
    const hsl = g.palette?.[slot];
    if (!Array.isArray(hsl) || hsl.length !== 3) {
      errs.push(`palette.${slot} não é tuple`);
      continue;
    }
    const [h, s, l] = hsl;
    if (h < 0 || h > 360) errs.push(`palette.${slot}.h fora de range`);
    if (s < 0 || s > 100) errs.push(`palette.${slot}.s fora de range`);
    if (l < 0 || l > 100) errs.push(`palette.${slot}.l fora de range`);
  }
  const VALID_HEAD = ['round', 'oval', 'square', 'teardrop', 'crystal', 'cloud'];
  const VALID_BODY = ['pebble', 'capsule', 'orb', 'leaf', 'stone'];
  if (!VALID_HEAD.includes(g.silhouette?.headShape)) errs.push('headShape inválido');
  if (!VALID_BODY.includes(g.silhouette?.bodyShape)) errs.push('bodyShape inválido');
  if (!(g.silhouette?.headRx >= 20 && g.silhouette?.headRx <= 70)) errs.push('headRx fora de range');
  if (!(g.silhouette?.headRy >= 20 && g.silhouette?.headRy <= 70)) errs.push('headRy fora de range');
  if (!Array.isArray(g.marks) || g.marks.length > 5) errs.push('marks inválido');
  if (!Array.isArray(g.accessories)) errs.push('accessories não-array');
  if (typeof g.story !== 'string' || g.story.length > 280) errs.push('story inválido');
  return errs;
}

const TESTS = [
  { personality: 'calmo', trigger: 'evolution:bebe', mascotName: 'Bipo', streak: 3, phase: 'bebe' },
  { personality: 'motivador', trigger: 'streak:30d', mascotName: 'Vento', streak: 30, phase: 'adulto' },
  { personality: 'fofo', trigger: 'evolution:adolescente', mascotName: 'Pip', streak: 15, phase: 'adolescente' },
  { personality: 'sabio', trigger: 'messages:100', mascotName: 'Luna', streak: 7, phase: 'crianca' },
];

const results = [];
for (const t of TESTS) {
  const t0 = Date.now();
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.85,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt(t) },
        ],
      }),
    });
    const dt = Date.now() - t0;
    if (!res.ok) {
      results.push({ ...t, ok: false, status: res.status, dt });
      continue;
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    const usage = json.usage;
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      results.push({ ...t, ok: false, reason: 'JSON parse falhou', dt, usage });
      continue;
    }
    const errs = validateMinimal(parsed, t);
    results.push({
      ...t,
      ok: errs.length === 0,
      errs,
      dt,
      usage,
      sample: {
        story: parsed.story,
        marks: parsed.marks?.length,
        headShape: parsed.silhouette?.headShape,
        bodyHue: parsed.palette?.body?.[0],
      },
    });
  } catch (e) {
    results.push({ ...t, ok: false, reason: String(e), dt: Date.now() - t0 });
  }
}

const passed = results.filter(r => r.ok).length;
const failed = results.length - passed;
console.log(JSON.stringify({ passed, failed, total: results.length, results }, null, 2));
process.exit(failed === 0 ? 0 : 1);
