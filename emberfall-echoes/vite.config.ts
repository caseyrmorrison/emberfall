import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: {
    port: 5180,
    strictPort: true,
    watch: { ignored: ['**/test-results/**', '**/playwright-report/**', '**/dist/**'] },
  },
});
