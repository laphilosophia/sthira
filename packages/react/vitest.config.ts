import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@sthirajs/persist': path.resolve(__dirname, '../persist/src'),
      '@sthirajs/cross-tab': path.resolve(__dirname, '../cross-tab/src'),
      '@sthirajs/devtools': path.resolve(__dirname, '../devtools/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
