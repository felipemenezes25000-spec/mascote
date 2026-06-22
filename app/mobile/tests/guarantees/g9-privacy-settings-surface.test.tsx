import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('G9 — privacy surface em settings', () => {
  it('mantém ações de exportar dados e excluir conta visíveis', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/settings.tsx'), 'utf8');
    // Pós-i18n (Fase 3): os rótulos viraram t('settings.*'). A garantia continua:
    // as AÇÕES seguem na tela (chaves referenciadas) e o texto pt segue no bundle.
    expect(source).toContain("t('settings.export')");
    expect(source).toContain("t('settings.delete_account')");
    const ptBundle = readFileSync(resolve(process.cwd(), 'src/lib/i18n/atelier-strings.ts'), 'utf8');
    expect(ptBundle).toContain('Exportar meus dados (JSON)');
    expect(ptBundle).toContain('Excluir conta');
  });
});
