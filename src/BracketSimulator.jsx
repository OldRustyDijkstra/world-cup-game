// 2026 FIFA World Cup bracket simulator.
// Match pairings follow the official fixed bracket structure (matches M73–M104).
// Only results are randomised: which team finishes 1st/2nd/3rd per group, which 8 of 12
// third-place teams qualify, how they are seeded into R32, and each knockout outcome.

// Fisher-Yates shuffle — unbiased, unlike arr.sort(() => Math.random() - 0.5)
export function shuffle(arr) {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

  // Group stage: randomly determine 1st, 2nd, and 3rd place per group
  const first = {};   // group → team
  const second = {};  // group → team
  const third = {};   // group → team (3rd-place finisher, may advance as best-8)
  const groupStage = [];
  Object.entries(byGroup).forEach(([g, teams]) => {
    const ranked = shuffle(teams);
    first[g]  = ranked[0];
    second[g] = ranked[1];
    third[g]  = ranked[2];
    groupStage.push({ group: g, first: ranked[0], second: ranked[1], third: ranked[2] });
  });
  groupStage.sort((a, b) => a.group.localeCompare(b.group));

  // Real 2026 bracket: best 8 of 12 third-place teams advance to R32.
  // Randomly select and randomly seed them into the 8 former "bye" slots —
  // consistent with the simulator's 50/50 philosophy.
  const qualifiedThirds = shuffle(Object.values(third)).slice(0, 8);
  const qualifiedThirdIds = new Set(qualifiedThirds.map((t) => t.id));
  groupStage.forEach((entry) => {
    entry.thirdQualified = qualifiedThirdIds.has(entry.third.id);
  });
  const [t74, t77, t79, t80, t81, t82, t85, t87] = qualifiedThirds;

  // Round of 32 — all 16 matches are real contested matches (no byes)
  const r32W = {
    M73: coinFlip(second.A, second.B),
    M74: coinFlip(first.E,  t74),
    M75: coinFlip(first.F,  second.C),
    M76: coinFlip(first.C,  second.F),
    M77: coinFlip(first.I,  t77),
    M78: coinFlip(second.E, second.I),
    M79: coinFlip(first.A,  t79),
    M80: coinFlip(first.L,  t80),
    M81: coinFlip(first.D,  t81),
    M82: coinFlip(first.G,  t82),
    M83: coinFlip(second.K, second.L),
    M84: coinFlip(first.H,  second.J),
    M85: coinFlip(first.B,  t85),
    M86: coinFlip(first.J,  second.H),
    M87: coinFlip(first.K,  t87),
    M88: coinFlip(second.D, second.G),
  };

  const matchesR32 = [
    { label: 'M73', teamA: second.A, teamB: second.B,  winner: r32W.M73 },
    { label: 'M74', teamA: first.E,  teamB: t74,        winner: r32W.M74 },
    { label: 'M75', teamA: first.F,  teamB: second.C,  winner: r32W.M75 },
    { label: 'M76', teamA: first.C,  teamB: second.F,  winner: r32W.M76 },
    { label: 'M77', teamA: first.I,  teamB: t77,        winner: r32W.M77 },
    { label: 'M78', teamA: second.E, teamB: second.I,  winner: r32W.M78 },
    { label: 'M79', teamA: first.A,  teamB: t79,        winner: r32W.M79 },
    { label: 'M80', teamA: first.L,  teamB: t80,        winner: r32W.M80 },
    { label: 'M81', teamA: first.D,  teamB: t81,        winner: r32W.M81 },
    { label: 'M82', teamA: first.G,  teamB: t82,        winner: r32W.M82 },
    { label: 'M83', teamA: second.K, teamB: second.L,  winner: r32W.M83 },
    { label: 'M84', teamA: first.H,  teamB: second.J,  winner: r32W.M84 },
    { label: 'M85', teamA: first.B,  teamB: t85,        winner: r32W.M85 },
    { label: 'M86', teamA: first.J,  teamB: second.H,  winner: r32W.M86 },
    { label: 'M87', teamA: first.K,  teamB: t87,        winner: r32W.M87 },
    { label: 'M88', teamA: second.D, teamB: second.G,  winner: r32W.M88 },
  ];

  // Round of 16
  const r16W = {
    M89: coinFlip(r32W.M74, r32W.M77),  // Q1
    M90: coinFlip(r32W.M73, r32W.M75),  // Q1
    M91: coinFlip(r32W.M76, r32W.M78),  // Q3
    M92: coinFlip(r32W.M79, r32W.M80),  // Q3
    M93: coinFlip(r32W.M83, r32W.M84),  // Q2
    M94: coinFlip(r32W.M81, r32W.M82),  // Q2
    M95: coinFlip(r32W.M86, r32W.M88),  // Q4
    M96: coinFlip(r32W.M85, r32W.M87),  // Q4
  };

  const matchesR16 = [
    { label: 'M89', teamA: r32W.M74, teamB: r32W.M77, winner: r16W.M89 },
    { label: 'M90', teamA: r32W.M73, teamB: r32W.M75, winner: r16W.M90 },
    { label: 'M91', teamA: r32W.M76, teamB: r32W.M78, winner: r16W.M91 },
    { label: 'M92', teamA: r32W.M79, teamB: r32W.M80, winner: r16W.M92 },
    { label: 'M93', teamA: r32W.M83, teamB: r32W.M84, winner: r16W.M93 },
    { label: 'M94', teamA: r32W.M81, teamB: r32W.M82, winner: r16W.M94 },
    { label: 'M95', teamA: r32W.M86, teamB: r32W.M88, winner: r16W.M95 },
    { label: 'M96', teamA: r32W.M85, teamB: r32W.M87, winner: r16W.M96 },
  ];

  // Quarter-finals — Q1+Q2 feed SF1; Q3+Q4 feed SF2
  const qf1W = coinFlip(r16W.M89, r16W.M90);  // → SF1
  const qf2W = coinFlip(r16W.M93, r16W.M94);  // → SF1
  const qf3W = coinFlip(r16W.M91, r16W.M92);  // → SF2
  const qf4W = coinFlip(r16W.M95, r16W.M96);  // → SF2

  const matchesQF = [
    { label: 'QF1', teamA: r16W.M89, teamB: r16W.M90, winner: qf1W },
    { label: 'QF2', teamA: r16W.M93, teamB: r16W.M94, winner: qf2W },
    { label: 'QF3', teamA: r16W.M91, teamB: r16W.M92, winner: qf3W },
    { label: 'QF4', teamA: r16W.M95, teamB: r16W.M96, winner: qf4W },
  ];

  // Semi-finals
  const sf1Winner = coinFlip(qf1W, qf2W);
  const sf1Loser  = sf1Winner === qf1W ? qf2W : qf1W;
  const sf2Winner = coinFlip(qf3W, qf4W);
  const sf2Loser  = sf2Winner === qf3W ? qf4W : qf3W;

  const matchesSF = [
    { label: 'SF1', teamA: qf1W, teamB: qf2W, winner: sf1Winner },
    { label: 'SF2', teamA: qf3W, teamB: qf4W, winner: sf2Winner },
  ];

  // Final + 3rd place match
  const champion   = coinFlip(sf1Winner, sf2Winner);
  const runnerUp   = champion === sf1Winner ? sf2Winner : sf1Winner;
  const thirdPlace = coinFlip(sf1Loser, sf2Loser);

  const matchThird = { label: '3rd Place', teamA: sf1Loser,  teamB: sf2Loser,  winner: thirdPlace };
  const matchFinal = { label: 'Final',     teamA: sf1Winner, teamB: sf2Winner, winner: champion  };

  return {
    champion,
    runnerUp,
    third: thirdPlace,
    groupStage,
    matchesR32,
    matchesR16,
    matchesQF,
    matchesSF,
    matchThird,
    matchFinal,
  };
}

export default { simulateTournament };
