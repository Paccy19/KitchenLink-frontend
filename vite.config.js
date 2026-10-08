import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY || 'http://localhost:4000';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      proxy: { '/api': { target: proxyTarget, changeOrigin: true } },
    },
  };
});
