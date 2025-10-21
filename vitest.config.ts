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
        'src/server.ts', // Exclude server entry point
        'src/utils/logger.ts', // Exclude logger setup
        'src/utils/token-generator.ts', // Exclude token generator utility
        'src/modules/auth/auth.controller.ts', // Exclude OAuth controller (external API integration)
        'src/modules/auth/auth.service.ts', // Exclude OAuth service (external API integration)
        '*.config.ts', // Exclude config files
        '*.config.js', // Exclude config files
        'test-api.js', // Exclude test utilities
      ],
      all: true,
      thresholds: {
        lines: 90,
        functions: 89,
        branches: 82,
        statements: 90,
      },
    },
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./test/helper/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
