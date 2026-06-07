# ⚽ World Cup 2026 — SLIP-PICK Bracket Balancer

A React single-page app for running a fair World Cup lottery with friends. Eight players each draw a random pool of 6 teams. The app loads the **real, played match results** from a bundled file and shows them in the Bracket tab; undecided matches appear as **TBD**. You can also run a random **simulation** that fills only the undecided matches as a preview. Prizes go to whoever owns the top three finishers.

## Features

- **Slip-Pick Draw** — animated Fisher-Yates shuffle randomly assigns one of 8 balanced pools to each of 8 players
- **Balanced Pools** — each pool has 6 teams from 6 unique groups, split evenly across Left (A–F) and Right (G–L) bracket halves, with FIFA points balanced within ±150 pts of the overall average
- **Real 2026 Bracket Structure** — the knockout bracket follows the official fixed structure (R32 → R16 → QF → SF → Final); all 32 teams play in R32 (24 group qualifiers + best 8 of 12 third-place finishers); only match *results* are variable, never the match pairings
- **Actual Results, Loaded on Startup** — the real played matches live in `src/actualResults.json` and are displayed in the Bracket tab on load. The file is partial-friendly: leave a value `null` until that match/group is decided and it shows as **TBD** (see [Recording Real Match Results](#recording-real-match-results))
- **Constraint-Aware Simulation** — the "Simulate" button fills **only** the undecided (TBD) matches with a random preview (labeled "Sim"). It **never overrides** an actual played result
- **Redraw Keeps Results** — "Redraw Pools" re-shuffles the player→pool assignments while keeping all actual played matches; the bracket stays populated
- **Prize Tracking** — $25 / $10 / $5 for 1st / 2nd / 3rd; winners show once the Final / 3rd-place match is actually decided (otherwise TBD); a simulated preview is clearly labeled. Shows which player owns the winning team
- **FIFA Ranking Points** — fetches live FIFA ranking points from the official FIFA API on first load; each team displays its current points, and each pool card shows the average across its 6 teams for fairness comparison
- **Refresh Rankings** — a "Refresh FIFA Rankings" button re-fetches and updates the cache at any time
- **Editable Player Names** — enter real names before the draw; names remain editable on the dashboard after assignment
- **Session Persistence** — player names, pool assignments, and FIFA ranking points are saved to `localStorage` and survive page refreshes. Actual match results come from the bundled file (not localStorage); a simulation preview is ephemeral and resets to actual on reload
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
  actualResults.json    # Real played match results (hand-edited, loaded on startup)
  teams.js              # 48 World Cup teams with group, half, tier, and flag
  pools.js              # 8 pre-configured balanced pools of 6 teams each
```

## Recording Real Match Results

The Bracket tab is driven by `src/actualResults.json`. Edit it as matches are
played; the app loads it on startup. Everything is optional — leave a value
`null` until it is decided and the app shows **TBD**. All teams are referenced by
their kebab-case `id` from `src/teams.js` (e.g. `"south-korea"`, `"united-states"`).

```jsonc
{
  // Per-group final standings, ordered [1st, 2nd, 3rd, 4th]. null until decided.
  "groups": {
    "A": ["mexico", "south-korea", "czechia", "south-africa"],
    "B": null
    // ... C–L
  },

  // Which qualified 3rd-place team fills each of the 8 "bye" R32 slots
  // (Team B of those matches). The 8 values are the thirds that advanced.
  "thirdSlots": {
    "M74": null, "M77": null, "M79": null, "M80": null,
    "M81": null, "M82": null, "M85": null, "M87": null
  },

  // Winning team id for each knockout match actually played. null until played.
  "winners": {
    "M73": null, "M74": null, /* ... M88 */
    "M89": null, /* ... M96 */
    "QF1": null, "QF2": null, "QF3": null, "QF4": null,
    "SF1": null, "SF2": null,
    "3rd": null, "Final": null
  }
}
```

Match labels (M73–M88 R32, M89–M96 R16, QF1–QF4, SF1/SF2, `3rd`, `Final`) follow
the fixed bracket in `.github/instructions/bracket-logic.instructions.md`. Since
the file is bundled via `import`, an edit is picked up on the next HMR reload /
rebuild.

## localStorage Keys

| Key                  | Value                                                       |
|----------------------|-------------------------------------------------------------|
| `wc26_players`       | Array of 8 players (names + pool IDs)                       |
| `wc26_hasAssigned`   | Boolean — whether pools have been drawn                     |
| `wc26_prizes`        | `{ first, second, third }` — prize amounts in whole dollars |
| `wc26_fifaRankings`  | `{ fetchedAt, rankings: { [teamId]: points } }`            |

> Match results are **not** stored in `localStorage` — actual results come from
> `src/actualResults.json` and any simulation preview is ephemeral.
>
> Animation frames during the draw are **not** written to storage to avoid saving transient state.

## Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4**
- **lucide-react** icons
- No backend — fully client-side
