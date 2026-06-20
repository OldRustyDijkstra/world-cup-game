# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server with HMR — required for the FIFA API proxy and /api/save-* endpoints
npm run build    # production build → dist/
npm run preview  # serve the production build (proxy + save endpoints still active)
npm run lint     # ESLint
npm run fetch-results   # fetch live WC results → src/actualResults.json (Node 18+)

npm run deploy:preview      # build + swa deploy to preview env
npm run deploy:production   # build + swa deploy to production env
npm run deploy:all          # build + swa deploy to both
```

There is **no test suite**. There is no router, no global state library — it is a single React component.

## Architecture

Single-page React 19 + Vite 8 + Tailwind v4 app. Fully client-side except for two Vite dev/preview middlewares (`/api/save-results`, `/api/save-rankings-cache`) that write JSON back into `src/` so changes persist across sessions.

### Data flow

1. `src/pools.js` stores the 8 pools as arrays of kebab-case team ID strings.
2. `App.jsx` resolves those IDs against `TEAMS` (`src/teams.js`) at startup into `POOLS_DATA` (full team objects).
3. `POOLS_DATA` and `actualResults.json` are passed to `buildBracket()` in `src/BracketSimulator.jsx`, which attaches `poolId` to each team object and returns `{ champion, runnerUp, third, groupStage, matchesR32, matchesR16, matchesQF, matchesSF, matchThird, matchFinal }`.
4. Prize attribution reads `.poolId` on the result team objects and looks up the owning player.

### Players file selection (runtime, not build-time)

The active players file is chosen by `window.location.hostname.includes('preview')`:

- Production / local dev → `src/players.json`
- Azure preview env → `src/players-preview.json`

Both files share `[{ id, name, poolId }]` shape. When the active file is non-empty, names are **locked** (no in-app editing, draw button disabled because `hasAssigned` is forced true). Setting the active file to `[]` reverts to fully editable mode where players draw their pools.

### Lock flags (module-level constants in `App.jsx`)

- `PLAYERS_LOCKED` — true when the active players file is non-empty. Disables name editing UI.
- `RESULTS_LOCKED` — true when `actualResults.json` contains any non-null value. Hides all "Simulate" buttons so speculative results can't appear next to real ones.

### Vite plugins (dev + preview only)

- `/api/fifa-ranking/*` proxy → `https://inside.fifa.com/api/live-world-ranking/*` (rankings fetch). Does NOT work when serving `dist/` from a static host without a proxy.
- `POST /api/save-rankings-cache` → writes `src/fifaRankingsCache.json`
- `GET/POST /api/save-results` → reads/writes `src/actualResults.json`

### localStorage keys

| Key | Contents |
|-----|----------|
| `wc26_players` | Array of 8 player objects (ignored when active players file is non-empty) |
| `wc26_hasAssigned` | Boolean — whether the draw has happened |
| `wc26_prizes` | `{ first, second, third }` — prize amounts in dollars (default 25/10/5) |
| `wc26_fifaRankings` | `{ fetchedAt, rankings: { [teamId]: points } }` |

Player state is **not** written to localStorage while `isShuffling` is true, to avoid persisting transient animation state. Match results are **not** stored in localStorage — they come from the bundled JSON.

## Bracket logic (critical — read before touching `BracketSimulator.jsx` or `pools.js`)

The 2026 FIFA bracket structure is **fixed and hardcoded**. Match pairings M73–M104 must never change. See `.github/instructions/bracket-logic.instructions.md` for the full pairing tables and quarter map.

- 48 teams, 12 groups (A–L). 24 group qualifiers + best 8 of 12 third-place finishers fill the 32-team R32.
- **No byes** — all 16 R32 matches are contested. The 8 group winners that formerly had byes (A, B, D, E, G, I, K, L) now face a third-place qualifier.
- Knockout labels: M73–M88 (R32), M89–M96 (R16), M97–M100 = QF1–QF4, M101–M102 = SF1–SF2, M103 = `3rd`, M104 = `Final`.

### What is random in the simulator

`coinFlip` 50/50 per knockout match; Fisher-Yates over group standings; random selection of 8-of-12 third-place qualifiers; random seeding of qualifiers into the 8 third-place R32 slots. **Pairings are never randomised.** FIFA points are a design-time pool-fairness signal only — they do not affect simulation outcomes.

> Known simulator bias: the group-stage shuffle uses `arr.slice().sort(() => Math.random() - 0.5)` which is not statistically fair — teams listed earlier in each group qualify more often (~56% vs ~37.5%).

### Pool composition rules (`src/pools.js`)

1. One team per group (no two teams from the same group).
2. Exactly 3 teams from Left half (groups A–F) and 3 from Right half (groups G–L).
3. Prefer bracket-safe group pairings: Type-13 {A,C,E,F,I} with Type-24 {D,G,H,J,K}; B with L. (Pool 2 currently has the best 9/15 safe pairs.)
4. Each pool's average FIFA points within ±150 of the ~1,572 overall mean.

The `half` field on team objects is **cosmetic only** — it does not determine bracket quarter. Use the quarter map in the instructions file.

## Key conventions

### Team IDs are kebab-case everywhere

E.g. `"south-korea"`, `"united-states"`, `"ivory-coast"`. When adding or renaming a team you must update three places:

- `src/teams.js` — `{ id, name, group, half, tier, flag }`
- `FIFA_NAME_MAP` in `src/fifaRankings.js` — maps team ID to the exact string the FIFA rankings API returns
- `NAME_TO_ID` in `scripts/fetch-results.mjs` — maps the FIFA matches-API display name back to the ID

### `actualResults.json` format

```jsonc
{
  "groups":     { "A": ["t1","t2","t3","t4"], ... },  // null entries OK; standings 1st–4th
  "thirdSlots": { "M74": "team-id", ... },           // which 3rd-place fills each former bye slot
  "winners":    { "M73": "team-id", ..., "Final": "team-id" }
}
```

Any null is rendered as **TBD**. After running `fetch-results.mjs`, restart the dev server or rebuild — Vite bundles the JSON at build time.

### `fetch-results.mjs` script

Hits the unofficial FIFA API `api.fifa.com/api/v3/calendar/matches?idSeason=<id>`. Competition `17` (FIFA World Cup™), Season `285023` (2026 — auto-discovered from opening-day fixtures). Falls back to ESPN's unofficial API if FIFA is unreachable. Calculates group standings (W/D/L/GD) and writes a merged result, preserving any hand-edits. If the season ID becomes stale, update `FIFA_WC_SEASON_FALLBACK` and `FIFA_WC_OPEN_DATE` at the top of the script.

### Tailwind v4

This project uses Tailwind v4 — there is **no `tailwind.config.js`**. Theme configuration lives in `@theme` directives in `src/index.css`.

### Reset all saved data

```js
['wc26_players','wc26_hasAssigned','wc26_fifaRankings','wc26_prizes']
  .forEach(k => localStorage.removeItem(k));
```
