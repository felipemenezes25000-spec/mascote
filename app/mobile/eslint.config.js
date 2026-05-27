/**
 * ESLint flat config para o app mobile.
 *
 * Estratégia leve: hooks-rules (gates duros) + checagens críticas, sem prettier.
 * TS já cobre `no-undef` / `no-unused-vars`, então desligamos para não duplicar.
 *
 * Estamos em ESLint v8.57 que detectou flat config no home dir do usuário —
 * essa config é flat para garantir consistência cross-machine.
 */
const tsParser = require('@typescript-eslint/parser');
const reactPlugin = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const reactNative = require('eslint-plugin-react-native');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const js = require('@eslint/js');

const ignores = [
  'node_modules/**',
  'dist/**',
  'coverage/**',
  '.expo/**',
  'android/**',
  'ios/**',
  'scripts/**',
  'babel.config.js',
  'metro.config.js',
  'vitest.config.ts',
  'eslint.config.js',
];

module.exports = [
  { ignores },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // RN/React + Node + JS standard globals — evita o "no-undef" reclamando
        // de console, process, etc., sem depender de presets externos.
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        queueMicrotask: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        navigator: 'readonly',
        document: 'readonly',
        window: 'readonly',
        FormData: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        // Vitest/Jest no escopo de testes
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        // RN runtime
        __DEV__: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        // Web globals usados em alguns helpers
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-native': reactNative,
      '@typescript-eslint': tsPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'warn',
      'no-control-regex': 'off',
      'no-misleading-character-class': 'off',
      'no-irregular-whitespace': 'off',
      'no-async-promise-executor': 'warn',
      'no-cond-assign': ['error', 'except-parens'],
      'no-fallthrough': 'warn',
      'no-redeclare': 'off',
      'react/jsx-key': 'warn',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/no-unknown-property': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off', // animated values via useRef são estáveis; demasiado ruído
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
];
