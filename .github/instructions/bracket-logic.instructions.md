---
applyTo: "src/BracketSimulator.jsx,src/pools.js,src/teams.js"
---

# World Cup 2026 Bracket Logic

Authoritative reference for implementing or debugging `BracketSimulator.jsx`, pool composition rules, or any bracket-related logic.

## Overview

48 teams across 12 groups (A–L), 4 teams per group. Top 2 from each group (24 teams) advance to the knockout stage starting at the Round of 32. The 8 slots normally filled by best 3rd-place finishers are treated as **byes** for the relevant group winners (since this app only simulates pool-picked teams).

## Round of 32 — Fixed Match Pairings (M73–M88)

| Match | Team A | Team B | Notes |
|-------|--------|--------|-------|
| M73 | 2A | 2B | Active match |
| M74 | 1E | *(3rd-place)* | **Bye → 1E auto-advances** |
| M75 | 1F | 2C | Active match |
| M76 | 1C | 2F | Active match |
| M77 | 1I | *(3rd-place)* | **Bye → 1I auto-advances** |
| M78 | 2E | 2I | Active match |
| M79 | 1A | *(3rd-place)* | **Bye → 1A auto-advances** |
| M80 | 1L | *(3rd-place)* | **Bye → 1L auto-advances** |
| M81 | 1D | *(3rd-place)* | **Bye → 1D auto-advances** |
| M82 | 1G | *(3rd-place)* | **Bye → 1G auto-advances** |
| M83 | 2K | 2L | Active match |
| M84 | 1H | 2J | Active match |
| M85 | 1B | *(3rd-place)* | **Bye → 1B auto-advances** |
| M86 | 1J | 2H | Active match |
| M87 | 1K | *(3rd-place)* | **Bye → 1K auto-advances** |
| M88 | 2D | 2G | Active match |

8 group winners (A, B, D, E, G, I, K, L) receive byes and enter at the Round of 16.

## Round of 16 — Fixed Match Pairings (M89–M96)

| Match | Team A (from) | Team B (from) | Bracket Quarter |
|-------|---------------|---------------|-----------------|
| M89 | W(M74) = 1E | W(M77) = 1I | Q1 |
| M90 | W(M73) = W(2A/2B) | W(M75) = W(1F/2C) | Q1 |
| M91 | W(M76) = W(1C/2F) | W(M78) = W(2E/2I) | Q3 |
| M92 | W(M79) = 1A | W(M80) = 1L | Q3 |
| M93 | W(M83) = W(2K/2L) | W(M84) = W(1H/2J) | Q2 |
| M94 | W(M81) = 1D | W(M82) = 1G | Q2 |
| M95 | W(M86) = W(1J/2H) | W(M88) = W(2D/2G) | Q4 |
| M96 | W(M85) = 1B | W(M87) = 1K | Q4 |

## Quarter-Finals (M97–M100)

| Match | Team A (from) | Team B (from) | Semi-final side |
|-------|---------------|---------------|-----------------|
| QF1 (M97) | W(M89) | W(M90) | → SF1 |
| QF2 (M98) | W(M93) | W(M94) | → SF1 |
| QF3 (M99) | W(M91) | W(M92) | → SF2 |
| QF4 (M100) | W(M95) | W(M96) | → SF2 |

## Semi-Finals, Final, and 3rd Place

| Match | Teams |
|-------|-------|
| SF1 (M101) | W(QF1) vs W(QF2) |
| SF2 (M102) | W(QF3) vs W(QF4) |
| 3rd Place (M103) | Loser(SF1) vs Loser(SF2) |
| Final (M104) | W(SF1) vs W(SF2) |

## Bracket Quarter Map

Each group's qualifiers always land in specific quarters — this is **deterministic**.

| Group | 1st place → Quarter | 2nd place → Quarter | SF half |
|-------|---------------------|---------------------|---------|
| A | **Q3** | Q1 | 1st→SF2, 2nd→SF1 |
| B | **Q4** | Q1 | 1st→SF2, 2nd→SF1 |
| C | **Q3** | Q1 | 1st→SF2, 2nd→SF1 |
| D | **Q2** | Q4 | 1st→SF1, 2nd→SF2 |
| E | **Q1** | Q3 | 1st→SF1, 2nd→SF2 |
| F | **Q1** | Q3 | 1st→SF1, 2nd→SF2 |
| G | **Q2** | Q4 | 1st→SF1, 2nd→SF2 |
| H | **Q2** | Q4 | 1st→SF1, 2nd→SF2 |
| I | **Q1** | Q3 | 1st→SF1, 2nd→SF2 |
| J | **Q4** | Q2 | 1st→SF2, 2nd→SF1 |
| K | **Q4** | Q2 | 1st→SF2, 2nd→SF1 |
| L | **Q3** | Q2 | 1st→SF2, 2nd→SF1 |

### Quarter-set categories

| Category | Groups | Quarter-set |
|----------|--------|-------------|
| Type-13 | A, C, E, F, I | {Q1, Q3} |
| Type-24 | D, G, H, J, K | {Q2, Q4} |
| Type-14 | B | {Q1, Q4} |
| Type-23 | L | {Q2, Q3} |

Two groups are "bracket-safe" (their qualifiers can never meet before the Semi-finals) only if their quarter-sets are disjoint: Type-13 + Type-24, and B + L. Same-group teams are always bracket-safe (e.g., 1A→Q3, 2A→Q1).

## Pool Composition Rules (for changes to `pools.js`)

1. **One team per group** — no two teams from the same group
2. **3 Left + 3 Right** — exactly 3 teams from groups A–F and 3 from G–L
3. **Bracket-safe pairings preferred** — pair Type-13 groups {A,C,E,F,I} with Type-24 groups {D,G,H,J,K}; pair B with L
4. **FIFA points balance** — each pool's average within ±150 pts of the overall mean (~1,572 pts)

## What is and isn't random in `BracketSimulator.jsx`

**Random:** which team finishes 1st vs 2nd within each group; which team wins each knockout match (50/50 `coinFlip`).

**Fixed (never randomise):** match pairings — all follow the bracket tables above exactly. Byes for 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L are hardcoded.

## Common Pitfalls

- **Do not shuffle the bracket** — only shuffle group stage outcomes and match results.
- **Byes are not random** — 8 specific group winners always skip the R32.
- **`half` field in `teams.js` is cosmetic** — it does NOT determine bracket quarter. Use the Quarter Map above, not the `half` field, when computing bracket paths.
