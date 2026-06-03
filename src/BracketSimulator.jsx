// 2026 FIFA World Cup bracket simulator.
// Match pairings follow the official fixed bracket structure (matches M73–M104).
// Only results are randomised: which team finishes 1st/2nd per group, and each knockout outcome.

export function shuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function coinFlip(a, b) {
  return Math.random() < 0.5 ? a : b;
}

// poolsData: array of { id, teams: [{id, name, group, half, tier, flag}] }
export function simulateTournament(poolsData) {
  // Attach owning poolId to each team
  const allTeams = poolsData.flatMap((p) =>
    p.teams.map((t) => ({ ...t, poolId: p.id }))
  );

  // Index teams by group letter
  const byGroup = {};
  allTeams.forEach((t) => {
    byGroup[t.group] = byGroup[t.group] || [];
    byGroup[t.group].push(t);
  });

  // Group stage: randomly determine 1st and 2nd place per group
  const first = {};   // group → team
  const second = {};  // group → team
  Object.entries(byGroup).forEach(([g, teams]) => {
    const ranked = shuffle(teams);
    first[g]  = ranked[0];
    second[g] = ranked[1];
  });

  // Round of 32 — fixed matchups (M73–M88)
  // 8 active matches; 8 group winners receive byes (1A,1B,1D,1E,1G,1I,1K,1L)
  const r32 = {
    M73: coinFlip(second.A, second.B),
    M74: first.E,                          // bye
    M75: coinFlip(first.F,  second.C),
    M76: coinFlip(first.C,  second.F),
    M77: first.I,                          // bye
    M78: coinFlip(second.E, second.I),
    M79: first.A,                          // bye
    M80: first.L,                          // bye
    M81: first.D,                          // bye
    M82: first.G,                          // bye
    M83: coinFlip(second.K, second.L),
    M84: coinFlip(first.H,  second.J),
    M85: first.B,                          // bye
    M86: coinFlip(first.J,  second.H),
    M87: first.K,                          // bye
    M88: coinFlip(second.D, second.G),
  };

  // Round of 16 — fixed pairings (M89–M96)
  const r16 = {
    M89: coinFlip(r32.M74, r32.M77),   // Q1 — 1E vs 1I
    M90: coinFlip(r32.M73, r32.M75),   // Q1
    M91: coinFlip(r32.M76, r32.M78),   // Q3
    M92: coinFlip(r32.M79, r32.M80),   // Q3 — 1A vs 1L
    M93: coinFlip(r32.M83, r32.M84),   // Q2
    M94: coinFlip(r32.M81, r32.M82),   // Q2 — 1D vs 1G
    M95: coinFlip(r32.M86, r32.M88),   // Q4
    M96: coinFlip(r32.M85, r32.M87),   // Q4 — 1B vs 1K
  };

  // Quarter-finals — Q1+Q2 feed SF1; Q3+Q4 feed SF2
  const qf1 = coinFlip(r16.M89, r16.M90);  // → SF1
  const qf2 = coinFlip(r16.M93, r16.M94);  // → SF1
  const qf3 = coinFlip(r16.M91, r16.M92);  // → SF2
  const qf4 = coinFlip(r16.M95, r16.M96);  // → SF2

  // Semi-finals
  const sf1Winner = coinFlip(qf1, qf2);
  const sf1Loser  = sf1Winner === qf1 ? qf2 : qf1;
  const sf2Winner = coinFlip(qf3, qf4);
  const sf2Loser  = sf2Winner === qf3 ? qf4 : qf3;

  // Final + 3rd place match
  const champion = coinFlip(sf1Winner, sf2Winner);
  const runnerUp = champion === sf1Winner ? sf2Winner : sf1Winner;
  const third    = coinFlip(sf1Loser, sf2Loser);

  return {
    champion,
    runnerUp,
    third,
    r32: Object.values(r32),
  };
}

export default { simulateTournament };
