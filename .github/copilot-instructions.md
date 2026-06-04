# Copilot Instructions — World Cup 2026 Slip-Pick

## Commands

```bash
npm run dev      # dev server with HMR (required for FIFA API proxy)
npm run build    # production build → dist/
npm run preview  # preview production build (proxy still active)
npm run lint     # ESLint
```

There is no test suite.

## Architecture

**Single-page React app** — no backend, no router, no state management library.

| File | Role |
|------|------|
| `src/App.jsx` | Single large component — all UI, state, and game logic |
| `src/BracketSimulator.jsx` | Pure simulation logic; exports `simulateTournament(poolsData)` |
| `src/teams.js` | 48 team definitions: `{ id, name, group, half, tier, flag }` |
| `src/pools.js` | 8 pre-configured pools as arrays of team ID strings |
| `src/fifaRankings.js` | FIFA API fetch + kebab-case ↔ FIFA-name mapping |

### Data flow

1. `pools.js` stores pools as arrays of kebab-case team ID strings.
2. `App.jsx` resolves those IDs against `TEAMS` at startup into `POOLS_DATA` (full team objects).
3. `POOLS_DATA` is passed to `simulateTournament()`, which attaches `poolId` to each team object and returns `{ champion, runnerUp, third, groupStage, matchesR32, matchesR16, matchesQF, matchesSF, matchThird, matchFinal }`.
4. Prize attribution works by reading `.poolId` on the result team objects and looking up the owning player.

### localStorage keys

| Key | Contents |
|-----|----------|
| `wc26_players` | Array of 8 player objects (names + poolId assignments) |
| `wc26_hasAssigned` | Boolean — whether the draw has happened |
| `wc26_tournamentResults` | `{ champion, runnerUp, third, groupStage, matchesR32, matchesR16, matchesQF, matchesSF, matchThird, matchFinal }` or null |
| `wc26_fifaRankings` | `{ fetchedAt, rankings: { [teamId]: points } }` |

Player state is **not** written to localStorage while `isShuffling` is true, to avoid saving transient animation state.

## App State (`App.jsx`)

```js
players          // [{ id, name, poolId, points }] × 8 — names editable, poolId set after draw
isShuffling      // bool — true during 2s animation; blocks name edits + localStorage writes
hasAssigned      // bool — true once draw is complete
tournamentResults // { champion, runnerUp, third, groupStage, matchesR32, matchesR16, matchesQF, matchesSF, matchThird, matchFinal } | null
fifaRankings     // { [teamId]: number } | null — FIFA points per team
rankingsStatus   // 'idle' | 'loading' | 'error'
activeTab        // 'pools' | 'dashboard' | 'scoring'
exportFeedback   // UI string for share/copy/download feedback
```

## UI Tabs

| Tab key | Label | Contents |
|---------|-------|----------|
| `pools` | Pre-Configured Pools | All 8 pools with team cards; always visible pre- and post-draw |
| `dashboard` | Player Dashboards & Standings | Prize winners + individual player pool cards |
| `scoring` | Scoring Rules | Static prize rules |

## Extending

**Change prize amounts** — edit `PRIZES` in `SlipPickApp` in `App.jsx`:
```js
const PRIZES = { first: 25, second: 10, third: 5 };
```

**Add/change teams** — edit `src/teams.js`. Each entry needs: `id` (kebab-case), `name`, `group` (A–L), `half` (`"Left"` or `"Right"`), `tier` (`"Top Tier"` / `"Mid Tier"` / `"Underdog"`), `flag` (emoji). Add corresponding entry to `FIFA_NAME_MAP` in `fifaRankings.js`.

**Add/change pool composition** — edit `src/pools.js` following the four pool composition rules (see `Key Conventions` below and `.github/instructions/bracket-logic.instructions.md`).

**Reset all saved data:**
```js
['wc26_players','wc26_hasAssigned','wc26_tournamentResults','wc26_fifaRankings']
  .forEach(k => localStorage.removeItem(k));
```

## Key Conventions

### Team IDs
All team references use kebab-case IDs (e.g., `"south-korea"`, `"united-states"`, `"ivory-coast"`). The `FIFA_NAME_MAP` in `fifaRankings.js` maps these to the exact strings the FIFA API returns — update it if team names change (non-obvious: `south-korea` → `"Korea Republic"`, `united-states` → `"USA"`, `iran` → `"IR Iran"`).

### FIFA API proxy
The rankings fetch hits `/api/fifa-ranking/*`, which Vite proxies to `https://inside.fifa.com/api/live-world-ranking/*`. This proxy is active in `dev` and `preview` only — it does **not** work when serving `dist/` from a static host.

### Bracket simulator
`BracketSimulator.jsx` implements the **fixed** 2026 FIFA bracket (M73–M104). Match pairings are hardcoded and must not change. Three things are random: which team finishes 1st/2nd/3rd in each group (Fisher-Yates shuffle), which 8 of 12 third-place teams qualify and how they are seeded into R32, and each individual knockout match outcome (50/50 `coinFlip`). All 16 R32 matches are contested — there are no byes. See `.github/instructions/bracket-logic.instructions.md` for the authoritative bracket structure, quarter map, pool composition rules, and fairness analysis.

### Pool composition rules (for changes to `pools.js`)
- One team per group (A–L)
- Exactly 3 teams from Left half (groups A–F) and 3 from Right half (groups G–L)
- Prefer bracket-safe group pairings: Type-13 groups {A,C,E,F,I} paired with Type-24 groups {D,G,H,J,K}; B paired with L
- Pool average FIFA points within ±150 pts of the ~1,572 pt overall mean

### `half` field is cosmetic
The `half` field (`"Left"` / `"Right"`) on team objects reflects which half of the world draw the group falls in. It does **not** determine bracket quarter. Use the Quarter Map in `skill-world-cup-bracket-logic.md` for bracket path calculations.

### Tailwind CSS v4
The project uses Tailwind v4, which has a different configuration model from v3 — no `tailwind.config.js`; configuration is done via CSS `@theme` directives in `index.css`.
