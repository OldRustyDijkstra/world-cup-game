import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, readFileSync } from 'fs'
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

// Middleware that handles POST /api/save-results and writes the payload
// to src/actualResults.json so match results persist across sessions.
// Also handles GET /api/save-results to fetch the current results file content.
function resultsCachePlugin() {
  const RESULTS_FILE = resolve(process.cwd(), 'src/actualResults.json');

  function handleRequest(req, res) {
    if (req.method === 'GET') {
      try {
        const data = readFileSync(RESULTS_FILE, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(data);
      } catch (e) {
        res.writeHead(404).end(JSON.stringify({ error: 'not found' }));
      }
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405).end();
      return;
    }
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
      } catch (e) {
        res.writeHead(500).end(JSON.stringify({ error: e.message }));
      }
    });
  }

  return {
    name: 'results-cache-writer',
    configureServer(server) {
      server.middlewares.use('/api/save-results', handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/save-results', handleRequest);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), rankingsCachePlugin(), resultsCachePlugin()],
  server: { proxy: fifaProxy },
  preview: { proxy: fifaProxy },
})
