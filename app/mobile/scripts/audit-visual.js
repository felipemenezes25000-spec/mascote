/* eslint-disable */
/**
 * audit-visual.js
 *
 * Audita débito visual:
 *   - Hex hardcoded em src/components (não-ui, não-Mascot2D/BrandLogo)
 *     e em app/ — devem usar theme.colors.* ou theme.tokens.*
 *   - `<Text>` cru (sem ser via @/components/ui/Typography) em telas (app/)
 *     e em src/features
 *
 * Saída: imprime relatório markdown em stdout. Pode redirecionar pra
 *   docs/VISUAL_DEBT.md via `npm run audit:visual > ../../docs/VISUAL_DEBT.md`.
 *
 * Falsos positivos esperados (não auto-fix):
 *  - Arquivos que ainda renderizam o "robô laranja" são alvos legítimos do
 *    refactor de marca — eles aparecem no relatório como itens 🔴.
 *  - Comentários com hex são contados (estimativa otimista).
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HEX_RE = /#[0-9A-Fa-f]{6}\b/g;
const TEXT_TAG_RE = /<Text(\s|>|\/)/g;
const TEXT_IMPORT_RE = /import\s+{[^}]*\bText\b[^}]*}\s+from\s+['"]react-native['"]/;
const TYPOGRAPHY_IMPORT_RE = /from\s+['"]@\/components\/ui['"][^;]*\bTypography\b|from\s+['"]@\/components\/ui\/Typography['"]/;

/** Recursivamente lista arquivos .ts/.tsx (não-test) sob `dir`. */
function listFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'android' || entry.name === 'ios' || entry.name === '__snapshots__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function relativeTo(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

/** Excluir arquivos onde hex é OK (tokens/temas, renderers procedurais, scene art). */
function isHexAllowed(file) {
  const rel = relativeTo(file);
  // Tokens canônicos — alvo de migração, não fonte
  if (rel.startsWith('src/lib/themes.ts')) return true;
  // DNA: paletteFromGenome computa hex a partir de HSL — função pura
  if (rel.startsWith('src/lib/dna/')) return true;
  if (rel === 'src/components/Mascot2D.tsx') return true;
  if (rel === 'src/components/BrandLogo.tsx') return true;
  // PhenotypeRenderer: scene fog atmospherics derivadas de environment_id (12 hex)
  if (rel === 'src/game/evolution/PhenotypeRenderer.ts') return true;
  // SceneBackground: cada scene_id tem palette própria por design — não tokens
  if (rel === 'src/components/SceneBackground.tsx') return true;
  // UI primitives definem palette interna (sombras, opacity overlays)
  if (rel.startsWith('src/components/ui/')) return true;
  // Scripts próprios de build/audit
  if (rel.startsWith('scripts/')) return true;
  return false;
}

function auditHex(files) {
  const hits = [];
  for (const file of files) {
    if (isHexAllowed(file)) continue;
    const src = fs.readFileSync(file, 'utf8');
    const matches = src.match(HEX_RE);
    if (!matches) continue;
    // Filtra hex em comentários — rough mas útil
    const lines = src.split('\n');
    let count = 0;
    for (const line of lines) {
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
      const m = line.match(HEX_RE);
      if (m) count += m.length;
    }
    if (count > 0) hits.push({ file: relativeTo(file), count });
  }
  return hits.sort((a, b) => b.count - a.count);
}

function auditTextCru(files) {
  const hits = [];
  for (const file of files) {
    const rel = relativeTo(file);
    // Foca em telas (app/) + features
    if (!rel.startsWith('app/') && !rel.startsWith('src/features/')) continue;
    const src = fs.readFileSync(file, 'utf8');
    // Pula arquivos que NÃO importam Text de react-native
    if (!TEXT_IMPORT_RE.test(src)) continue;
    // Conta usos de <Text como JSX (não dentro de TextInput)
    const lines = src.split('\n');
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/<Text(\s|>|\/)/.test(line) && !/TextInput/.test(line)) {
        count++;
      }
    }
    if (count > 0) {
      const usesTypography = TYPOGRAPHY_IMPORT_RE.test(src);
      hits.push({ file: rel, count, hasTypography: usesTypography });
    }
  }
  return hits.sort((a, b) => b.count - a.count);
}

function fmtTable(rows, headers) {
  if (rows.length === 0) return '_(nenhum hit)_\n';
  let out = '| ' + headers.join(' | ') + ' |\n';
  out += '|' + headers.map(() => '---').join('|') + '|\n';
  for (const r of rows) {
    out += '| ' + r.map((c) => String(c)).join(' | ') + ' |\n';
  }
  return out;
}

function main() {
  const files = [
    ...listFiles(path.join(ROOT, 'src')),
    ...listFiles(path.join(ROOT, 'app')),
  ];
  const hex = auditHex(files);
  const text = auditTextCru(files);

  let md = '';
  md += '# Visual debt audit — Mascote\n\n';
  md += `> Gerado por \`scripts/audit-visual.js\` em ${new Date().toISOString()}.\n\n`;
  md += 'Este relatório destaca onde o app **NÃO** está usando o design system\n';
  md += 'consistentemente. Cada item é um candidato a migrar pra tokens.\n\n';

  md += '## Hex hardcoded fora de tokens/renderers\n\n';
  md += `Total arquivos com hex: **${hex.length}**\n`;
  md += `Total ocorrências: **${hex.reduce((sum, r) => sum + r.count, 0)}**\n\n`;
  md += 'Top 20 ofensores:\n\n';
  md += fmtTable(
    hex.slice(0, 20).map((h) => [`\`${h.file}\``, h.count]),
    ['arquivo', 'hex hardcoded'],
  );
  md += '\n**Como migrar:** trocar `"#FF8030"` por `theme.colors.primary`, ';
  md += '`"#7BAE7A"` por `theme.colors.sage`, etc.\n\n';

  md += '## `<Text>` cru em telas (sem `Typography`)\n\n';
  md += `Total arquivos: **${text.length}**\n`;
  md += `Total ocorrências: **${text.reduce((sum, r) => sum + r.count, 0)}**\n\n`;
  md += 'Top 20 ofensores:\n\n';
  md += fmtTable(
    text.slice(0, 20).map((t) => [
      `\`${t.file}\``,
      t.count,
      t.hasTypography ? '✅ mista' : '🔴 puro RN',
    ]),
    ['arquivo', '<Text>', 'já importa Typography?'],
  );
  md += '\n**Como migrar:** substituir `<Text>foo</Text>` por ';
  md += '`<Typography variant="body">foo</Typography>` ou variant apropriada.\n\n';

  md += '## Como rodar\n\n';
  md += '```powershell\n';
  md += 'npm --prefix app/mobile run audit:visual > docs/VISUAL_DEBT.md\n';
  md += '```\n';

  process.stdout.write(md);
}

main();
