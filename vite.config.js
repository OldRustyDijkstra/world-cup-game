import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const fifaProxy = {
  '/api/fifa-ranking': {
    target: 'https://inside.fifa.com/api/live-world-ranking',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/fifa-ranking/, ''),
  },
};

// Middleware that handles POST /api/save-rankings-cache and writes
// the payload to src/fifaRankingsCache.json so it persists across sessions.
function rankingsCachePlugin() {
  const CACHE_FILE = resolve(process.cwd(), 'src/fifaRankingsCache.json');

  function handleRequest(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405).end();
      return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      } catch (e) {
        res.writeHead(500).end(JSON.stringify({ error: e.message }));
      }
    });
  }

  return {
    name: 'rankings-cache-writer',
    configureServer(server) {
      server.middlewares.use('/api/save-rankings-cache', handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/save-rankings-cache', handleRequest);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), rankingsCachePlugin()],
  server: { proxy: fifaProxy },
  preview: { proxy: fifaProxy },
})
