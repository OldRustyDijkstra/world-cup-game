# ⚽ World Cup 2026 — SLIP-PICK Bracket Balancer

A React single-page app for running a fair World Cup lottery with friends. Eight players each draw a random pool of 6 teams, then the app simulates the entire tournament bracket and awards prizes to whoever owns the top three finishers.

## Features

- **Slip-Pick Draw** — animated Fisher-Yates shuffle randomly assigns one of 8 balanced pools to each of 8 players
- **Balanced Pools** — each pool has 6 teams from 6 unique groups, split evenly across Left (A–F) and Right (G–L) bracket halves, with FIFA points balanced within ±150 pts of the overall average
- **Real 2026 Bracket Structure** — the knockout simulator follows the official fixed bracket (R32 → R16 → QF → SF → Final); only match results are random, not the match pairings
- **Prize Tracking** — $25 / $10 / $5 for 1st / 2nd / 3rd; shows which player owns the winning team
- **FIFA Ranking Points** — fetches live FIFA ranking points from the official FIFA API on first load; each team displays its current points, and each pool card shows the average across its 6 teams for fairness comparison
- **Refresh Rankings** — a "Refresh FIFA Rankings" button re-fetches and updates the cache at any time
- **Editable Player Names** — enter real names before the draw; names remain editable on the dashboard after assignment
- **Session Persistence** — player names, pool assignments, tournament results, and FIFA ranking points are saved to `localStorage` and survive page refreshes
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
  BracketSimulator.jsx  # Tournament bracket simulation logic
  teams.js              # 48 World Cup teams with group, half, tier, and flag
  pools.js              # 8 pre-configured balanced pools of 6 teams each
```

## localStorage Keys

| Key                      | Value                                      |
|--------------------------|--------------------------------------------|
| `wc26_players`           | Array of 8 players (names + pool IDs)      |
| `wc26_hasAssigned`       | Boolean — whether pools have been drawn    |
| `wc26_tournamentResults` | `{ champion, runnerUp, third, r32 }` or null |

> Animation frames during the draw are **not** written to storage to avoid saving transient state.

## Stack

- **React 19** + **Vite 8**
- **Tailwind CSS v4**
- **lucide-react** icons
- No backend — fully client-side
