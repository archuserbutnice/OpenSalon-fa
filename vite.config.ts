import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  server: {
    proxy: {
      '/api': `http://localhost:${process.env.PORT || 8787}`,
    },
  },
});
