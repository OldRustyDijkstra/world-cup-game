# Skill: World Cup 2026 Bracket Logic

This document captures the **actual 2026 FIFA World Cup knockout bracket structure** as it applies to the Slip-Pick game. Use this as the authoritative reference when implementing or debugging `BracketSimulator.jsx`, pool composition rules, or any bracket-related logic.

---

## Overview

The 2026 World Cup has **48 teams across 12 groups (A–L), 4 teams per group**.  
The top 2 teams from each group (24 teams) advance to the knockout stage.  
The knockout stage starts at the **Round of 32** — but 8 of the 24 spots would normally be filled by the best 3rd-place finishers. Since this app simulates only pool-picked teams, those 8 slots are treated as **byes** for the relevant group winners.

---

## Group Stage → Knockout Qualifiers

Each group produces:
- **1st place** (`X1`) — group winner
- **2nd place** (`X2`) — group runner-up

The bracket placement of each qualifier is **fixed** — it does not depend on other groups' results.

---

## Round of 32 — Fixed Match Pairings

Match numbers follow the official 2026 FIFA schedule (M73–M88).

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

**8 active R32 matches.** 8 group winners (A, B, D, E, G, I, K, L) receive byes and enter at the Round of 16.

---

## Round of 16 — Fixed Match Pairings

Winners of R32 matches feed into fixed R16 slots (M89–M96).

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

---

## Quarter-Finals — Fixed Match Pairings

| Match | Team A (from) | Team B (from) | Semi-final side |
|-------|---------------|---------------|-----------------|
| QF1 (M97) | W(M89) | W(M90) | → SF1 |
| QF2 (M98) | W(M93) | W(M94) | → SF1 |
| QF3 (M99) | W(M91) | W(M92) | → SF2 |
| QF4 (M100) | W(M95) | W(M96) | → SF2 |

---

## Semi-Finals, Final, and 3rd Place

| Match | Teams |
|-------|-------|
| SF1 (M101) | W(QF1) vs W(QF2) |
| SF2 (M102) | W(QF3) vs W(QF4) |
| 3rd Place (M103) | Loser(SF1) vs Loser(SF2) |
| Final (M104) | W(SF1) vs W(SF2) |

---

## Bracket Quarter Map

Each group's two qualifiers always land in specific quarters. This is **deterministic** — it does not change based on draw results.

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

Grouping by which pair of quarters a group's qualifiers occupy:

| Category | Groups | Quarter-set |
|----------|--------|-------------|
| Type-13 | A, C, E, F, I | {Q1, Q3} |
| Type-24 | D, G, H, J, K | {Q2, Q4} |
| Type-14 | B | {Q1, Q4} |
| Type-23 | L | {Q2, Q3} |

**Key insight:** Two groups are "bracket-safe" (their qualifiers can **never** be in the same bracket quarter, regardless of whether they finish 1st or 2nd) **only if** their quarter-sets are disjoint:

| Pairing | Safe? | Earliest they can meet |
|---------|-------|----------------------|
| Type-13 + Type-24 | ✅ Yes | Semi-final or Final |
| B (Type-14) + L (Type-23) | ✅ Yes | Semi-final or Final |
| Any other combination | ⚠️ No | Quarter-final possible |

**Same-group teams** (e.g., two teams both from Group A) are automatically bracket-safe from each other because 1A→Q3 and 2A→Q1 — they are always in different quarters.

---

## Pool Composition Rules (anti-self-play)

To reduce the chance that a player's two pool-mates meet each other before the Semi-finals:

### Rule 1 — One team per group
No pool may contain two teams from the same group (they would always be direct bracket opponents at some stage).

### Rule 2 — 3 Left + 3 Right
Each pool draws exactly 3 teams from left-half groups (A–F) and 3 from right-half groups (G–L). This is enforced by pool composition in `pools.js`.

### Rule 3 — Prefer bracket-safe group pairings
When assigning teams to pools, prefer pairings from **different quarter-set categories**:
- Pair Type-13 groups (A, C, E, F, I) with Type-24 groups (D, G, H, J, K)
- Pair B with L

Pairs within the **same** quarter-set category (e.g., A+C, or G+H) share a quarter and risk same-pool teams meeting at the quarter-final stage.

### Rule 4 — FIFA points balance
Each pool's average FIFA ranking points should be within **±150 points** of the overall mean (~1,572 pts across all 48 teams). Pools that are significantly below average are harder to win with.

---

## BracketSimulator.jsx — How It Should Work

### What is simulated (random)
- Which team finishes **1st vs 2nd** within each group (random)
- The **result of every knockout match** (50/50 coin flip)

### What is NOT random
- **Which teams play each other** — all match pairings follow the fixed bracket above
- The **bracket path** from R32 → R16 → QF → SF → Final is always the same structure

### Pseudocode

```js
// 1. Group stage: simulate 1st and 2nd place for all 12 groups
const qualifiers = {}; // { A: {first: team, second: team}, B: ..., ... }
for each group (A–L):
  shuffle group's 4 teams
  qualifiers[group] = { first: teams[0], second: teams[1] }

// 2. Round of 32 — 8 active matches, 8 byes
const r32Winners = {
  M73: coinFlip(qualifiers.A.second, qualifiers.B.second),
  M74: qualifiers.E.first,   // bye
  M75: coinFlip(qualifiers.F.first, qualifiers.C.second),
  M76: coinFlip(qualifiers.C.first, qualifiers.F.second),
  M77: qualifiers.I.first,   // bye
  M78: coinFlip(qualifiers.E.second, qualifiers.I.second),
  M79: qualifiers.A.first,   // bye
  M80: qualifiers.L.first,   // bye
  M81: qualifiers.D.first,   // bye
  M82: qualifiers.G.first,   // bye
  M83: coinFlip(qualifiers.K.second, qualifiers.L.second),
  M84: coinFlip(qualifiers.H.first, qualifiers.J.second),
  M85: qualifiers.B.first,   // bye
  M86: coinFlip(qualifiers.J.first, qualifiers.H.second),
  M87: qualifiers.K.first,   // bye
  M88: coinFlip(qualifiers.D.second, qualifiers.G.second),
}

// 3. Round of 16
const r16Winners = {
  M89: coinFlip(r32Winners.M74, r32Winners.M77),
  M90: coinFlip(r32Winners.M73, r32Winners.M75),
  M91: coinFlip(r32Winners.M76, r32Winners.M78),
  M92: coinFlip(r32Winners.M79, r32Winners.M80),
  M93: coinFlip(r32Winners.M83, r32Winners.M84),
  M94: coinFlip(r32Winners.M81, r32Winners.M82),
  M95: coinFlip(r32Winners.M86, r32Winners.M88),
  M96: coinFlip(r32Winners.M85, r32Winners.M87),
}

// 4. Quarter-finals
const qfWinners = {
  QF1: coinFlip(r16Winners.M89, r16Winners.M90), // → SF1
  QF2: coinFlip(r16Winners.M93, r16Winners.M94), // → SF1
  QF3: coinFlip(r16Winners.M91, r16Winners.M92), // → SF2
  QF4: coinFlip(r16Winners.M95, r16Winners.M96), // → SF2
}

// 5. Semi-finals
const sf1Winner = coinFlip(qfWinners.QF1, qfWinners.QF2)
const sf2Winner = coinFlip(qfWinners.QF3, qfWinners.QF4)
const sf1Loser  = the other one from SF1
const sf2Loser  = the other one from SF2

// 6. Final + 3rd place
const champion  = coinFlip(sf1Winner, sf2Winner)
const runnerUp  = the other finalist
const third     = coinFlip(sf1Loser, sf2Loser)

return { champion, runnerUp, third, r32: Object.values(r32Winners) }
```

---

## File Locations

| File | Relevance |
|------|-----------|
| `src/BracketSimulator.jsx` | Bracket simulation — must implement the fixed bracket above |
| `src/teams.js` | 48 teams with `group` (A–L) and `half` (Left/Right) fields |
| `src/pools.js` | Pool compositions — must follow Rules 1–4 above |
| `src/App.jsx` | Calls `simulateTournament(poolsData)` — expects `{ champion, runnerUp, third, r32 }` |

---

## Common Pitfalls

- **Do not shuffle the bracket** — only shuffle group stage outcomes and match results.
- **Byes are not random** — 8 specific group winners always skip the R32. The mapping is fixed.
- **`half` field in teams.js is cosmetic** — Left/Right indicates which half of the world draw the group is in. It does NOT directly determine bracket quarter (e.g., Group I is Left=Right, but 1I goes to Q1 on the "right side" of the SF draw). Use the Quarter Map above, not the `half` field, when computing bracket paths.
- **Same-pool teams from the same quarter-set can meet at QF** — this is acceptable but should be minimized in pool design.
