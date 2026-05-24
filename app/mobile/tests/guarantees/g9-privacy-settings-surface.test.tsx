import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('G9 — privacy surface em settings', () => {
  it('mantém ações de exportar dados e excluir conta visíveis', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/settings.tsx'), 'utf8');
    expect(source).toContain('Exportar meus dados (JSON)');
    expect(source).toContain('Excluir conta');
  });
});
