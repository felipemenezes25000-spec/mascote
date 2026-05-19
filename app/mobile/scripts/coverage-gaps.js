/**
 * Lista arquivos com gaps de cobertura, ordenado por branch%.
 * Uso: node scripts/coverage-gaps.js
 */
const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

const rows = Object.entries(s)
  .filter(([k]) => k !== 'total')
  .map(([k, v]) => {
    const idx = k.lastIndexOf('src');
    const name = idx >= 0 ? k.slice(idx).replace(/\\/g, '/') : k;
    return {
      name,
      s: v.statements.pct,
      b: v.branches.pct,
      f: v.functions.pct,
      l: v.lines.pct,
    };
  });

const gap = rows
  .filter(r => r.s < 100 || r.b < 100 || r.f < 100 || r.l < 100)
  .sort((a, b) => a.b - b.b);

console.log(`Gap files: ${gap.length} / ${rows.length} total`);
console.log('-'.repeat(75));
console.log(['file'.padEnd(40), 'stmt'.padStart(6), 'brch'.padStart(6), 'func'.padStart(6), 'line'.padStart(6)].join(' | '));
console.log('-'.repeat(75));
for (const r of gap) {
  console.log([
    r.name.padEnd(40),
    r.s.toFixed(1).padStart(6),
    r.b.toFixed(1).padStart(6),
    r.f.toFixed(1).padStart(6),
    r.l.toFixed(1).padStart(6),
  ].join(' | '));
}
console.log('-'.repeat(75));
console.log('totals:', JSON.stringify({
  s: s.total.statements.pct,
  b: s.total.branches.pct,
  f: s.total.functions.pct,
  l: s.total.lines.pct,
}));
