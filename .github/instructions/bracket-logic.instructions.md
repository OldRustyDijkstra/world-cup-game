---
applyTo: "src/BracketSimulator.jsx,src/pools.js,src/teams.js"
---

# World Cup 2026 Bracket Logic

Authoritative reference for implementing or debugging `BracketSimulator.jsx`, pool composition rules, or any bracket-related logic.

## Overview

48 teams across 12 groups (A–L), 4 teams per group. Top 2 from each group (24 teams) plus the best 8 of 12 third-place finishers (32 teams total) advance to the Round of 32. All 16 R32 matches are real contested matches — there are no byes. Since all 48 tournament teams are pool-owned, third-place qualifiers are real players' teams and can earn prizes if they advance far enough.

## Round of 32 — Fixed Match Pairings (M73–M88)

| Match | Team A | Team B | Notes |
|-------|--------|--------|-------|
| M73 | 2A | 2B | |
| M74 | 1E | 3rd-place (best-8) | Former bye slot |
| M75 | 1F | 2C | |
| M76 | 1C | 2F | |
| M77 | 1I | 3rd-place (best-8) | Former bye slot |
| M78 | 2E | 2I | |
| M79 | 1A | 3rd-place (best-8) | Former bye slot |
| M80 | 1L | 3rd-place (best-8) | Former bye slot |
| M81 | 1D | 3rd-place (best-8) | Former bye slot |
| M82 | 1G | 3rd-place (best-8) | Former bye slot |
| M83 | 2K | 2L | |
| M84 | 1H | 2J | |
| M85 | 1B | 3rd-place (best-8) | Former bye slot |
| M86 | 1J | 2H | |
| M87 | 1K | 3rd-place (best-8) | Former bye slot |
| M88 | 2D | 2G | |

8 group winners (A, B, D, E, G, I, K, L) previously had byes — they now face a third-place qualifier in R32.

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

Two groups are "bracket-safe" (their qualifiers can never meet before the **Semi-Finals**) only if their quarter-sets are disjoint: Type-13 + Type-24, and B + L. Same-group teams are always bracket-safe (e.g., 1A→Q3, 2A→Q1).

> **Important:** "Bracket-safe" means the two teams can only meet at the **Semi-Finals or later** — not "Final only". For example, 1A (Q3→SF2) and 1J (Q4→SF2) are bracket-safe but can still meet in SF2.

## Pool Composition Rules (for changes to `pools.js`)

1. **One team per group** — no two teams from the same group
2. **3 Left + 3 Right** — exactly 3 teams from groups A–F and 3 from G–L
3. **Bracket-safe pairings preferred** — pair Type-13 groups {A,C,E,F,I} with Type-24 groups {D,G,H,J,K}; pair B with L
4. **FIFA points balance** — each pool's average within ±150 pts of the overall mean (~1,572 pts)

> **Note on Rule 4:** FIFA points balance is a design-time fairness signal only. The simulator uses 50/50 knockout outcomes — FIFA rankings do not affect simulation results.

## Pool Fairness Analysis

Each pool has 6 teams → 15 possible intra-pool pairings. A pairing is **bracket-safe** (earliest clash = SF) if the two groups are Type-13 + Type-24 or B + L. All other pairings can clash earlier.

### Earliest possible clash by group-type pairing

| Group-type pair | Earliest same-pool clash | Example R32 match |
|-----------------|--------------------------|-------------------|
| **A + B** (T13 + T14) | **Round of 32** | M73: 2A vs 2B |
| **E + I** (T13 + T13) | **Round of 32** | M78: 2E vs 2I |
| **K + L** (T24 + T23) | **Round of 32** | M83: 2K vs 2L |
| T13 + T13 (other pairs) | **Round of 16** | e.g. M90: 2A/2B winner vs 1F/2C winner |
| T24 + T24 | **Quarter-Finals** | Shared Q2 or Q4 |
| T13 + T14 (B, non-A) | **Quarter-Finals** | Shared Q1 or Q4 |
| T13 + T23 (L) | **Quarter-Finals** | Shared Q3 |
| T24 + T14 (B) | **Quarter-Finals** | Shared Q4 |
| T24 + T23 (L) | **Quarter-Finals** | Shared Q2 |
| **T13 + T24** | **Semi-Finals** ← bracket-safe | Disjoint {Q1,Q3} vs {Q2,Q4} |
| **B + L** (T14 + T23) | **Semi-Finals** ← bracket-safe | Disjoint {Q1,Q4} vs {Q2,Q3} |

### Safe pair count per pool (current `pools.js`)

| Pool | Groups (with type) | Safe pairs / 15 | Notes |
|------|--------------------|-----------------|-------|
| Pool 1 | A(T13), B(T14), F(T13), I(T13), J(T24), K(T24) | **6** | A+B can clash in R32 (M73) |
| Pool 2 | C(T13), D(T24), F(T13), H(T24), I(T13), K(T24) | **9** ← best | All three T13 paired against three T24 |
| Pool 3 | A(T13), B(T14), E(T13), G(T24), H(T24), J(T24) | **6** | |
| Pool 4 | A(T13), B(T14), F(T13), I(T13), J(T24), L(T23) | **4** ← worst | B+L is safe; A+B can clash in R32 (M73) |
| Pool 5 | A(T13), B(T14), F(T13), G(T24), H(T24), K(T24) | **6** | |
| Pool 6 | C(T13), D(T24), E(T13), I(T13), K(T24), L(T23) | **6** | E+I can clash in R32 (M78) |
| Pool 7 | C(T13), D(T24), E(T13), G(T24), H(T24), L(T23) | **6** | |
| Pool 8 | C(T13), D(T24), E(T13), G(T24), J(T24), L(T23) | **6** | |

**Target when redesigning pools:** maximise safe pairs per pool; aim for Pool 2's structure (3 pure T13 groups paired with 3 pure T24 groups) to achieve 9/15. Perfect bracket safety across all 15 pairs is mathematically impossible with 6 teams per pool.

### Former bye-group consideration

The 8 groups whose winner formerly had a bye (A, B, D, E, G, I, K, L) now face a third-place qualifier in R32. While third-place opponents are generally weaker, the 50/50 simulation treats all R32 matches equally. There is no longer a structural advancement advantage for these group winners.

## What is and isn't random in `BracketSimulator.jsx`

**Random:** which team finishes 1st/2nd/3rd per group (Fisher-Yates shuffle); which 8 of 12 third-place teams qualify (random selection); how the 8 qualifiers are seeded into the R32 slots (random assignment); which team wins each knockout match (50/50 `coinFlip`).

**Fixed (never randomise):** match pairings — all follow the bracket tables above exactly.

> **Known simulator bias:** The group-stage shuffle uses `arr.slice().sort(() => Math.random() - 0.5)`, which is not a statistically fair shuffle. Teams listed earlier in each group array in `teams.js` qualify at a higher rate (~56%) than later-listed teams (~37.5%). This affects expected advancement probability per pool slot.

## Common Pitfalls

- **Do not shuffle the bracket** — only shuffle group stage outcomes and match results.
- **No byes** — all 16 R32 matches are contested; the 8 former bye slots now host group winners vs third-place qualifiers.
- **`half` field in `teams.js` is cosmetic** — it does NOT determine bracket quarter. Use the Quarter Map above, not the `half` field, when computing bracket paths.
- **"Bracket-safe" ≠ "meet only in the Final"** — bracket-safe pairs can meet as early as the Semi-Finals; it only guarantees no clash before the semis.
- **FIFA balance does not drive simulation outcomes** — all knockout matches are 50/50. FIFA points inform pool design only.
