import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Optional dev proxy: set VITE_API_PROXY=http://localhost:8000 to forward
// /api/* requests to a local backend while developing.
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
