# Skill: World Cup 2026 SLIP-PICK Bracket Balancer

## What This Project Is

A client-side React SPA for running a World Cup lottery game with 8 players. Players are randomly assigned one of 8 pre-balanced pools, each containing 6 real 2026 World Cup teams. The app simulates the full tournament bracket and awards prizes to whoever holds the top 3 finishing teams.

## Tech Stack

- **React 19** + **Vite 8** (ES modules, HMR)
- **Tailwind CSS v4** (no config file — uses CSS-first approach)
- **lucide-react** for icons
- **No router, no backend, no database** — fully client-side with localStorage

## File Map

| File | Purpose |
|------|---------|
| `src/App.jsx` | All UI and game logic — state, shuffle engine, tournament sim call, FIFA rankings fetch, export |
| `src/BracketSimulator.jsx` | Stateless bracket simulation: group stage → knockout → Final |
| `src/fifaRankings.js` | `FIFA_NAME_MAP` (48 team IDs → FIFA API names) + `fetchFifaRankings()` async function |
| `src/teams.js` | 48 teams: `{ id, name, group, half, tier, flag }` |
| `src/pools.js` | 8 balanced pools: 6 teams each, 3 from Left half (groups A–F) + 3 from Right (G–L) |
| `src/main.jsx` | React entry; mounts `<SlipPickApp />` |
| `index.html` | Vite entry point |
| `vite.config.js` | Vite config with proxy for FIFA ranking API (CORS workaround) |

## Key State (App.jsx)

```js
players          // [{ id, name, poolId, points }] × 8 — names editable, poolId set after draw
isShuffling      // bool — true during 2s animation; blocks name edits + localStorage writes
hasAssigned      // bool — true once draw is complete
tournamentResults // { champion, runnerUp, third, r32 } | null
fifaRankings     // { [teamId]: number } | null — FIFA points per team
rankingsStatus   // 'idle' | 'loading' | 'error'
activeTab        // 'pools' | 'dashboard' | 'scoring'
exportFeedback   // UI string for share/copy/download feedback
```

## localStorage Persistence

Three keys are persisted automatically via `useEffect`:

| Key | Content |
|-----|---------|
| `wc26_players` | Array of 8 player objects (names + poolIds) |
| `wc26_hasAssigned` | Boolean |
| `wc26_tournamentResults` | Full results object or null |
| `wc26_fifaRankings` | `{ fetchedAt: ISO string, rankings: { [teamId]: number } }` |

**Important:** `wc26_players` is only written when `isShuffling === false` to prevent saving transient animation frames.

On mount, stored values are validated:
- `wc26_players` must parse to an array of length 8; otherwise falls back to `INITIAL_PLAYERS`
- Others fall back to their default values on parse error

## FIFA Rankings (`fifaRankings.js`)

### Why a proxy?
The FIFA API (`inside.fifa.com`) has no CORS headers. Direct browser `fetch()` is blocked. `vite.config.js` adds a proxy: `/api/fifa-ranking/*` → `https://inside.fifa.com/api/live-world-ranking/*`. Works in `npm run dev` and `npm run preview` but **not** with a static CDN deploy.

### Data source
`GET /api/fifa-ranking/get-match-window-matches?locale=en&gender=1&rankingType=0`

Each match entry has `TeamAPointsBefore` / `TeamBPointsBefore` — the team's FIFA points before that match. We collect these and build `{ [teamId]: points }`.

### Name mapping
`FIFA_NAME_MAP` in `fifaRankings.js` maps our team IDs to the FIFA API's exact English name strings. Non-obvious mappings:

| Our ID | FIFA Name |
|--------|-----------|
| `south-korea` | `Korea Republic` |
| `united-states` | `USA` |
| `iran` | `IR Iran` |
| `ivory-coast` | `Côte d'Ivoire` |
| `cape-verde` | `Cabo Verde` |
| `bosnia-and-herzegovina` | `Bosnia and Herzegovina` |
| `turkiye` | `Türkiye` |

### Auto-fetch on mount
```js
useEffect(() => {
  if (!fifaRankings) handleFetchRankings();
}, []);
```
Only fires when no cached data found in localStorage.

### UI display
- **Pools tab:** each pool card header shows `Avg N,NNN` (mean of 6 teams' points); each team row has an indigo points badge
- **Dashboard cards:** avg shown under pool name; each team mini-card shows a points badge

## Vite Proxy (`vite.config.js`)
```js
const fifaProxy = {
  '/api/fifa-ranking': {
    target: 'https://inside.fifa.com/api/live-world-ranking',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/fifa-ranking/, ''),
  },
};
// Applied to both server and preview
```



### Shuffle / Draw (`handleSlipPick`)
1. Starts a 2-second visual animation (random `poolId`s every 100ms — not persisted)
2. On settle: Fisher-Yates shuffles the 8 pool IDs, then assigns one per player using a **functional state update** (`setPlayers(prev => ...)`) to capture any name edits made before shuffle started
3. Immediately calls `simulateTournament(POOLS_DATA)` and stores results

### Bracket Simulation (`BracketSimulator.jsx`)
- **Group stage**: randomly picks 1st and 2nd place from each of 12 groups (A–L) → 24 qualifiers
- **Fixed bracket** follows the official 2026 World Cup structure:
  - **Round of 32 (M73–M88)**: 8 active matches + 8 byes for group winners (1A,1B,1D,1E,1G,1I,1K,1L)
  - **Round of 16 (M89–M96)**: fixed pairings from R32 slots
  - **Quarter-finals**: Q1+Q2 → SF1; Q3+Q4 → SF2
  - **Semis, Final, 3rd place**: straightforward coin-flip progression
- **Only randomised**: which team finishes 1st vs 2nd per group, and which team wins each knockout match (50/50)
- **Not randomised**: match pairings — these follow the real World Cup bracket exactly
- See `skill-world-cup-bracket-logic.md` for the full bracket reference and quarter map

### Reset / Redraw
`resetDraft()` preserves player names — only clears `poolId`, `tournamentResults`, and `hasAssigned`. Players don't need to re-enter names for a second draw.

## UI Tabs

| Tab | Route | Shows |
|-----|-------|-------|
| Pre-Configured Pools | `pools` | All 8 pools with team cards (always visible) |
| Player Dashboards & Standings | `dashboard` | Prize winners + individual player pool cards |
| Scoring Rules | `scoring` | Static prize rules |

## Extending This Project

### Change the number of players
Update `INITIAL_PLAYERS` array in `App.jsx` and ensure `pools.js` has a matching number of pools.

### Change prize amounts
Edit `PRIZES` constant inside `SlipPickApp`:
```js
const PRIZES = { first: 25, second: 10, third: 5 };
```

### Add/change teams
Edit `src/teams.js`. Each team needs: `id` (kebab-case), `name`, `group` (A–L), `half` (`"Left"` or `"Right"`), `tier` (`"Top Tier"`, `"Mid Tier"`, or `"Underdog"`), `flag` (emoji).

### Add/change pool composition
Edit `src/pools.js`. Each pool must satisfy four rules:
1. **6 unique groups** — no two teams from the same group
2. **3 Left + 3 Right** — exactly 3 teams from groups A–F and 3 from G–L
3. **Bracket-safe pairings preferred** — pair groups from `{A,C,E,F,I}` (quarter-set {Q1,Q3}) with groups from `{D,G,H,J,K}` (quarter-set {Q2,Q4}) to reduce the chance same-pool teams meet before the Semi-finals. See `skill-world-cup-bracket-logic.md` for the full quarter map.
4. **FIFA points balance** — target each pool's average within ±150 pts of the overall mean (~1,572 pts)

### Clear all saved data
```js
localStorage.removeItem('wc26_players');
localStorage.removeItem('wc26_hasAssigned');
localStorage.removeItem('wc26_tournamentResults');
```

## Development Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Serve the production build locally
npm run lint     # ESLint
```
