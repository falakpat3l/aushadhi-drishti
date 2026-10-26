import { defineConfig } from 'vite';

// GitHub Pages serves the site from /aushadhi-drishti/.
export default defineConfig({
  base: process.env.BASE_PATH || '/aushadhi-drishti/',
  build: { chunkSizeWarningLimit: 6000 },
});
