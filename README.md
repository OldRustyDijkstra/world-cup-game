# ⚽ World Cup 2026 — SLIP-PICK Bracket Balancer

> 🍗 A lighthearted sweepstakes crafted with FriedChicken love — built for casual fun among friends. Live match results are kept up to date when the bot is running; for matches yet to be played, hit Simulate to preview what might unfold. Play at your own risk and enjoy every kick! ⚽

A React single-page app for running a fair World Cup lottery with friends. Eight players each draw a random pool of 6 teams. The app loads the **real, played match results** from a bundled file and shows them in the Bracket tab; undecided matches appear as **TBD**.  Prizes go to whoever owns the top three finishers.

## Features

- **Fixed Player Roster** — player names and pool assignments live in `src/players.json` (production) or `src/players-preview.json` (preview environment). When the active file is non-empty, names are locked (no in-app editing). Set the active file to `[]` to restore fully editable mode. See [Managing Players](#managing-players) for environment details.
- **Sweepstakes Draw** — animated Fisher-Yates shuffle randomly assigns one of 8 balanced pools to each player (active only when `players.json` is empty)
- **Balanced Pools** — each pool has 6 teams from 6 unique groups, split evenly across Left (A–F) and Right (G–L) bracket halves, with FIFA points balanced within ±150 pts of the overall average
- **Real 2026 Bracket Structure** — the knockout bracket follows the official fixed structure (R32 → R16 → QF → SF → Final); all 32 teams play in R32 (24 group qualifiers + best 8 of 12 third-place finishers); only match _results_ are variable, never the match pairings
- **Actual Results, Auto-Fetched** — run `node scripts/fetch-results.mjs` to pull live results from the unofficial FIFA API and write `src/actualResults.json` automatically. The file is partial-friendly: leave a value `null` until that match/group is decided and it shows as **TBD**
- **Simulation Lock** — when `actualResults.json` contains any real data, the "Simulate gaps" button is hidden. Simulation is only available before the tournament starts (pre-result state)
- **Prize Tracking** — $25 / $10 / $5 for 1st / 2nd / 3rd; winners show once the Final / 3rd-place match is actually decided (otherwise TBD). Shows which player owns the winning team
- **FIFA Ranking Points** — fetches live FIFA ranking points from the official FIFA API on first load; each team displays its current points, each pool card shows the average across its 6 teams, and the last sync time is shown in **Perth Western Australian time (AWST)**
- **Session Persistence** — pool assignments and FIFA ranking points are saved to `localStorage` and survive page refreshes. Actual match results come from the bundled file (not localStorage)
- **Export Results** — share via Web Share API, copy to clipboard, or download as `.txt`

> **Note:** FIFA ranking fetches use a Vite proxy (`/api/fifa-ranking/*` → `https://inside.fifa.com/...`). This works with `npm run dev` and `npm run preview`. It will **not** work if you serve the `dist/` folder directly from a static host without a proxy configured.

## Getting Started

```bash
npm install
npm run dev       # dev server with HMR
npm run build     # production build → dist/
npm run preview   # preview the production build
npm run lint      # ESLint
```

## Project Structure

```
src/
  main.jsx              # React entry point
  App.jsx               # Main app component — all UI and game logic
  BracketSimulator.jsx  # buildBracket() — actual-aware bracket builder + simulation
  actualResults.json    # Real played match results (auto-fetched or hand-edited)
  players.json          # Fixed player roster { id, name, poolId }[] — production environment
  players-preview.json  # Fixed player roster for preview environment — set [] for editable mode
  teams.js              # 48 World Cup teams with group, half, tier, and flag
  pools.js              # 8 pre-configured balanced pools of 6 teams each
  fifaRankings.js       # FIFA rankings API fetch + name mapping
  assets/
    kfc-logo.svg        # KFC logo used in the footer disclaimer
scripts/
  fetch-results.mjs     # Node script — fetches live WC results → actualResults.json
```

## Managing Players

Player names and pool assignments are stored in environment-specific JSON files:

| Environment | File | URL pattern |
|-------------|------|-------------|
| **Production** | `src/players.json` | `gray-field-0dbb8c600.7.azurestaticapps.net` |
| **Preview** | `src/players-preview.json` | `gray-field-0dbb8c600-preview.eastasia…` |
| **Local dev** | `src/players.json` | `localhost` |

The active file is selected at runtime by checking `window.location.hostname.includes('preview')`.

Both files share the same shape:

```json
[
  { "id": 1, "name": "Dan Woods", "poolId": 1 },
  { "id": 2, "name": "Leo",       "poolId": 2 },
  ...
  { "id": 8, "name": "Adrian",    "poolId": 8 }
]
```

- When the active file has entries, names and assignments are **locked** — no in-app editing.
- Set the file to `[]` to revert to the standard editable mode with the Draw button active.
- `poolId` values match the `id` in `src/pools.js` (1–8).

## Updating Match Results

### Option A — Auto-fetch (recommended)

```bash
# From repo root, requires Node 18+
node scripts/fetch-results.mjs
```

The script connects to the unofficial FIFA API (`api.fifa.com/api/v3`) — no API key needed. It:
1. Auto-discovers the 2026 World Cup season ID from opening-day fixtures
2. Fetches all 104 match results
3. Calculates group standings (W/D/L/GD) from scores
4. Maps knockout winners to bracket labels (M73–M96, QF1–QF4, SF1–SF2, 3rd, Final)
5. Writes `src/actualResults.json`, merging with any existing hand-edits

Falls back to the ESPN unofficial API if the FIFA API is unreachable.

After running: **restart `npm run dev`** or run `npm run build` (Vite bundles the JSON at build time).

> If the FIFA season ID changes (new tournament cycle), update `FIFA_WC_SEASON_FALLBACK`
> and `FIFA_WC_OPEN_DATE` at the top of `scripts/fetch-results.mjs`.

### Option B — Hand-edit

Edit `src/actualResults.json` directly. All team references use kebab-case IDs from `src/teams.js` (e.g. `"south-korea"`, `"united-states"`). Leave any value `null` until it is decided.

```jsonc
{
  // Per-group final standings, ordered [1st, 2nd, 3rd, 4th]. null until decided.
  "groups": {
    "A": ["mexico", "south-korea", "czechia", "south-africa"],
    "B": null
    // ... C–L
  },

  // Which qualified 3rd-place team fills each of the 8 "bye" R32 slots.
  "thirdSlots": {
    "M74": null,
    "M77": null
    // ... M79, M80, M81, M82, M85, M87
  },

  // Winning team id for each knockout match. null until played.
  "winners": {
    "M73": null
    // ... M88 (R32), M89–M96 (R16), QF1–QF4, SF1, SF2, "3rd", "Final"
  }
}
```

Match labels (M73–M88 R32, M89–M96 R16, QF1–QF4, SF1/SF2, `3rd`, `Final`) follow the fixed bracket in `.github/instructions/bracket-logic.instructions.md`.

### Simulation lock

When `actualResults.json` contains any non-null value, the **"Simulate gaps" button is hidden**. Simulation is only available in the pre-tournament (all-null) state. This prevents misleading speculative results alongside real ones.

## localStorage Keys

| Key                 | Value                                                       |
| ------------------- | ----------------------------------------------------------- |
| `wc26_players`      | Array of 8 players (names + pool IDs) — ignored when `players.json` is non-empty |
| `wc26_hasAssigned`  | Boolean — whether pools have been drawn                     |
| `wc26_prizes`       | `{ first, second, third }` — prize amounts in whole dollars |
| `wc26_fifaRankings` | `{ fetchedAt, rankings: { [teamId]: points } }`             |

> Match results are **not** stored in `localStorage` — actual results come from
> `src/actualResults.json` and any simulation preview is ephemeral.

## Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4**
- **lucide-react** icons
- No backend — fully client-side

