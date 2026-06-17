import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.js'],
    // Les tests d'intégration partagent une seule base de test : un nettoyage
    // global (afterEach) en parallèle entre fichiers casserait les autres suites.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/config/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      }
    },
    // tests unitaires d'abord, puis intégration
    sequence: {
      setupFiles: 'list'
    }
  }
})
