import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail loudly instead of silently jumping to 5174/5175. The backend CORS
    // allowlist (CLIENT_URL) only covers 5173, so a stray port would break
    // every /api call with a confusing "internal server error".
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
