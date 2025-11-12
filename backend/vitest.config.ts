import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/types/**',
        '**/*.types.ts', // Exclude type definition files
        'src/db/migrations/**',
        'src/db/seeds/**', // Exclude seed scripts
        'src/db/schema/**', // Exclude database schema definitions
        'src/db/client.ts', // Exclude database connection setup
        'src/db/migrate.ts', // Exclude migration CLI script (runs pre-dev, not runtime)
        'src/server.ts', // Exclude server entry point
        'src/utils/logger.ts', // Exclude logger setup
        'src/utils/dev-token-generator.ts', // Exclude dev token generator utility
        'src/modules/auth/auth.controller.ts', // Exclude OAuth controller (external API integration)
        'src/modules/auth/auth.service.ts', // Exclude OAuth service (external API integration)
        '*.config.ts', // Exclude config files
        '*.config.js', // Exclude config files
        'test-api.js', // Exclude test utilities
      ],
      all: true,
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 89, // Keep at 89 - branch coverage is harder to achieve
        statements: 100,
      },
    },
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./test/helper/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
