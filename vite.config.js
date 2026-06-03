import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const fifaProxy = {
  '/api/fifa-ranking': {
    target: 'https://inside.fifa.com/api/live-world-ranking',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/fifa-ranking/, ''),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: fifaProxy },
  preview: { proxy: fifaProxy },
})
