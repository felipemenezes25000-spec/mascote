import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const cpuCount = os.cpus().length;
const maxWorkers = process.env.VITEST_MAX_WORKERS
  ? Number(process.env.VITEST_MAX_WORKERS)
  : Math.max(2, Math.min(cpuCount - 1, 8));

export default defineConfig({
  test: {
    globals: true,
    // Só .test.tsx paga jsdom; lógica pura em node reduz ~300s de setup acumulado.
    environment: 'node',
    pool: 'threads',
    maxWorkers,
    fileParallelism: true,
    testTimeout: 15_000,
    hookTimeout: 15_000,
    teardownTimeout: 5_000,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
    // @testing-library/react-native ships com tipos Flow internos do RN —
    // precisa ser transformado pelo vitest (não usar resolução nativa de
    // node_modules) pra parsear corretamente sob rolldown/oxc.
    server: {
      deps: {
        inline: [
          '@testing-library/react-native',
          'react-test-renderer',
        ],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts',
        // Tipos e contratos não-executáveis
        'src/types.ts',
        'src/types/**',
        // Re-export defensivo de 12 linhas — alias pra themes.ts
        'src/theme.ts',
      ],
      // Cobertura REAL medida (2026-05-20, 1785 testes, 111 arquivos):
      //   - 72.32% lines / 72.91% statements / 74.89% functions / 68.91% branches
      //
      // Gaps principais (alvos pra subir thresholds):
      //   - src/lib/behavior/useBehaviorTick.ts (0%) — hook precisa de teste com jsdom
      //   - src/lib/dna/persistence.ts (0%) — wrapper AsyncStorage não testado
      //   - src/services/subscription/* (~60%) — mock/RevenueCat com lacunas
      //   - src/hooks/* (~18%) — useEvolutionState, useSubscriptionTier sem testes
      //
      // Maestro E2E em .maestro/ cobre fluxos nativos que jsdom não roda.
      //
      // Para listar arquivos com gaps remanescentes:
      //   node scripts/coverage-gaps.js
      //
      // Thresholds enforçados em CI (não aspiracionais) — descem ~2pp abaixo do
      // medido pra absorver variação de assert order. Subir ao ganhar testes.
      thresholds: {
        lines: 70,
        functions: 72,
        branches: 66,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
