# Copilot Instructions — World Cup 2026 Sweepstakes

## Commands

```bash
npm run dev      # dev server with HMR (required for FIFA API proxy)
npm run build    # production build → dist/
npm run preview  # preview production build (proxy still active)
npm run lint     # ESLint
node scripts/fetch-results.mjs  # fetch live WC results → src/actualResults.json (Node 18+)
```

There is no test suite.

## Architecture

**Single-page React app** — no backend, no router, no state management library.

| File | Role |
|------|------|
| `src/App.jsx` | Single large component — all UI, state, and game logic |
| `src/BracketSimulator.jsx` | Pure simulation logic; exports `buildBracket(poolsData, actual, opts)` |
| `src/teams.js` | 48 team definitions: `{ id, name, group, half, tier, flag }` |
| `src/pools.js` | 8 pre-configured pools as arrays of team ID strings |
| `src/players.json` | Fixed player roster `[{ id, name, poolId }]` — set `[]` for editable mode |
| `src/actualResults.json` | Real played match results (auto-fetched or hand-edited) |
| `src/fifaRankings.js` | FIFA rankings API fetch + kebab-case ↔ FIFA-name mapping |
| `scripts/fetch-results.mjs` | Node.js script: fetches live WC results from FIFA API → writes `actualResults.json` |

### Data flow

1. `pools.js` stores pools as arrays of kebab-case team ID strings.
2. `App.jsx` resolves those IDs against `TEAMS` at startup into `POOLS_DATA` (full team objects).
3. `POOLS_DATA` is passed to `buildBracket()`, which attaches `poolId` to each team object and returns `{ champion, runnerUp, third, groupStage, matchesR32, matchesR16, matchesQF, matchesSF, matchThird, matchFinal }`.
4. Prize attribution works by reading `.poolId` on the result team objects and looking up the owning player.

### localStorage keys

| Key | Contents |
|-----|----------|
| `wc26_prizes` | `{ first, second, third }` — prize amounts in whole dollars (defaults: 25, 10, 5) |
| `wc26_players` | Array of 8 player objects (names + poolId assignments) — ignored when `players.json` is non-empty |
| `wc26_hasAssigned` | Boolean — whether the draw has happened |
| `wc26_fifaRankings` | `{ fetchedAt, rankings: { [teamId]: points } }` |

Player state is **not** written to localStorage while `isShuffling` is true, to avoid saving transient animation state.

## App State (`App.jsx`)

```js
players          // [{ id, name, poolId, points }] × 8
isShuffling      // bool — true during 2s animation; blocks localStorage writes
hasAssigned      // bool — true once draw is complete (or always true when players.json is populated)
tournamentResults // { champion, runnerUp, third, groupStage, matchesR32, ... }
fifaRankings     // { [teamId]: number } | null — FIFA points per team
rankingsStatus   // 'idle' | 'loading' | 'error'
activeTab        // 'pools' | 'dashboard' | 'scoring' | 'bracket'
exportFeedback   // UI string for share/copy/download feedback
```

### Module-level constants

```js
PLAYERS_LOCKED   // true when src/players.json is non-empty — disables name editing UI
RESULTS_LOCKED   // true when actualResults.json has any non-null value — hides Simulate buttons
```

## UI Tabs

| Tab key | Label | Contents |
|---------|-------|----------|
| `pools` | Pre-Configured Pools | All 8 pools with team cards; always visible pre- and post-draw |
| `dashboard` | Player Dashboards & Standings | Prize winners + individual player pool cards |
| `scoring` | Scoring Rules | Static prize rules |
| `bracket` | Bracket | Full bracket view with actual/TBD results |

## Extending

**Change player roster** — edit `src/players.json`. Set `poolId` to the pool number (1–8) or `null` for a pre-draw state. Set the file to `[]` to revert to fully editable mode.

**Change prize amounts** — prize amounts are configurable via the **Prize Rules** tab in the UI (editable before the draw only). Defaults are `{ first: 25, second: 10, third: 5 }` stored in localStorage `wc26_prizes`.

**Add/change teams** — edit `src/teams.js`. Each entry needs: `id` (kebab-case), `name`, `group` (A–L), `half` (`"Left"` or `"Right"`), `tier` (`"Top Tier"` / `"Mid Tier"` / `"Underdog"`), `flag` (emoji). Add corresponding entry to `FIFA_NAME_MAP` in `fifaRankings.js` and `NAME_TO_ID` in `scripts/fetch-results.mjs`.

**Add/change pool composition** — edit `src/pools.js` following the four pool composition rules (see `Key Conventions` below and `.github/instructions/bracket-logic.instructions.md`).

**Update match results** — run `node scripts/fetch-results.mjs` (Node 18+). The script hits the unofficial FIFA API (`api.fifa.com/api/v3`), auto-discovers the season ID, fetches all 104 matches, calculates group standings, and writes `src/actualResults.json`. Falls back to ESPN unofficial API. After running, restart dev server or rebuild.

**Reset all saved data:**
```js
['wc26_players','wc26_hasAssigned','wc26_fifaRankings','wc26_prizes']
  .forEach(k => localStorage.removeItem(k));
```

## Key Conventions

### Team IDs
All team references use kebab-case IDs (e.g., `"south-korea"`, `"united-states"`, `"ivory-coast"`). The `FIFA_NAME_MAP` in `fifaRankings.js` maps these to the exact strings the FIFA rankings API returns. `NAME_TO_ID` in `scripts/fetch-results.mjs` maps display names from the FIFA matches API to our IDs.

### FIFA API proxy
The rankings fetch hits `/api/fifa-ranking/*`, which Vite proxies to `https://inside.fifa.com/api/live-world-ranking/*`. This proxy is active in `dev` and `preview` only — it does **not** work when serving `dist/` from a static host.

The results save endpoint `POST /api/save-results` (and `POST /api/save-rankings-cache`) writes directly to `src/` — also dev/preview only.

### Fetch-results script
`scripts/fetch-results.mjs` uses the **unofficial FIFA API** (`api.fifa.com/api/v3/calendar/matches?idSeason=<id>`):
- Competition: **17** (FIFA World Cup™), Season: **285023** (2026 edition, discovered automatically)
- Field names: `Home.TeamName[{Locale:'en-GB'}]`, `HomeTeamScore`, `AwayTeamScore`, `Winner` (team ID for shootout)
- Group stage: matches 1–72; knockout: M73–M88 (R32), M89–M96 (R16), M97–M100 (QF), M101–M102 (SF), M103 (3rd), M104 (Final)
- If `FIFA_WC_SEASON_FALLBACK` becomes stale, update it and `FIFA_WC_OPEN_DATE` at the top of the script

### Bracket simulator
`BracketSimulator.jsx` implements the **fixed** 2026 FIFA bracket (M73–M104). Match pairings are hardcoded and must not change. When `simulate: true`, undecided slots are randomly filled; actual results always take priority. When `RESULTS_LOCKED` is true in `App.jsx`, the simulate buttons are hidden entirely.

### `actualResults.json` format
```jsonc
{
  "groups":     { "A": ["team1","team2","team3","team4"], ... },  // null until decided
  "thirdSlots": { "M74": "team-id", ... },                       // 8 bye-slot thirds
  "winners":    { "M73": "team-id", ..., "Final": "team-id" }    // knockout winners
}
```

### Pool composition rules (for changes to `pools.js`)
- One team per group (A–L)
- Exactly 3 teams from Left half (groups A–F) and 3 from Right half (groups G–L)
- Prefer bracket-safe group pairings: Type-13 groups {A,C,E,F,I} paired with Type-24 groups {D,G,H,J,K}; B paired with L
- Pool average FIFA points within ±150 pts of the ~1,572 pt overall mean

### `half` field is cosmetic
The `half` field (`"Left"` / `"Right"`) on team objects reflects which half of the world draw the group falls in. It does **not** determine bracket quarter.

### Tailwind CSS v4
The project uses Tailwind v4, which has a different configuration model from v3 — no `tailwind.config.js`; configuration is done via CSS `@theme` directives in `index.css`.
