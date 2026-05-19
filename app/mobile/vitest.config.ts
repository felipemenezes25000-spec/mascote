import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // jsdom permite renderHook/render do @testing-library/react-native nos
    // testes de hook (.test.tsx). Testes de lógica pura continuam funcionando —
    // só pagam um pouco de overhead de DOM stub.
    environment: 'jsdom',
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
      // Cobertura REAL atual (mai/2026, 1344 testes, 67 arquivos):
      //   - 98.89% lines / 98.59% statements / 98.00% functions / 97.42% branches
      //
      // O que falta pra 100% absoluto:
      //   - Gestos nativos do Reanimated (Gesture.Pan onUpdate/onEnd em
      //     HeroSwipeable) só rodam em runtime nativo, não no mock JS.
      //   - Animation completion callbacks (UnlockToast withTiming(..., cb),
      //     EvolutionModal, Skeleton) são chamados pelo runtime do Reanimated.
      //   - BlurView nativo (Card variant=glass branch !== 'web') — sob mock
      //     Platform.OS='web', sempre cai no caminho web.
      //   - Color scheme = 'dark' via useColorScheme — mock fixo em 'light'.
      //   - PixelRatio.getFontScale undefined fallback — mock sempre define.
      //   - Alguns branches de error-recovery defensivo são logicamente
      //     inalcançáveis (try/catch dentro de try/catch).
      //
      // Maestro E2E em .maestro/ cobre as branches nativas em runtime real.
      //
      // Para listar arquivos com gaps remanescentes:
      //   node scripts/coverage-gaps.js
      //
      // Thresholds dão margem de ~0.1 abaixo do nível real pra absorver
      // variação de assert order / flake. Se cair abaixo, é regressão real.
      thresholds: {
        lines: 98.5,
        functions: 98,
        branches: 97,
        statements: 98.5,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
