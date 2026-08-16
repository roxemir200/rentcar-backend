import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Configuration Vitest — séparée de vite.config.ts pour garder la config de
 * build propre (pas de plugin Tailwind / Figma inutile pendant les tests).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
    mockReset: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 15000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      // Périmètre mesuré : tout le code applicatif écrit par l'équipe.
      include: [
        'src/app/api/**/*.{js,ts}',
        'src/app/components/common/**/*.{ts,tsx}',
        'src/app/components/figma/**/*.{ts,tsx}',
        'src/app/components/layout/**/*.{ts,tsx}',
        'src/app/context/**/*.{ts,tsx}',
        'src/app/hooks/**/*.{ts,tsx}',
        'src/app/lib/**/*.{ts,tsx}',
        'src/app/pages/**/*.{ts,tsx}',
      ],
      exclude: [
        // Primitives shadcn/ui vendorisées (code tiers non maintenu ici)
        'src/app/components/ui/**',
        // Dictionnaires statiques / types purs / points d'entrée
        'src/app/i18n/**',
        'src/app/locales/**',
        'src/app/data/**',
        'src/main.tsx',
        'src/App.js',
        'src/app/App.tsx',
        '**/*.d.ts',
        'src/test/**',
      ],
      all: true,
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 75,
        branches: 70,
      },
    },
  },
})
