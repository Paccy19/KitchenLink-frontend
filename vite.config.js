import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API proxy is opt-in: set VITE_USE_MOCK=auto and VITE_API_PROXY to
// forward /api/* requests to a local backend during integration work.
const proxyTarget = process.env.VITE_API_PROXY;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: proxyTarget
      ? { '/api': { target: proxyTarget, changeOrigin: true } }
      : undefined,
  },
});
