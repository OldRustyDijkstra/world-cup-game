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
  const groupStage = [];
  Object.entries(byGroup).forEach(([g, teams]) => {
    const ranked = shuffle(teams);
    first[g]  = ranked[0];
    second[g] = ranked[1];
    groupStage.push({ group: g, first: ranked[0], second: ranked[1] });
  });
  groupStage.sort((a, b) => a.group.localeCompare(b.group));

  // Round of 32 — compute winners first, then build match objects for display
  // 8 active matches; 8 group winners receive byes (1A,1B,1D,1E,1G,1I,1K,1L)
  const r32W = {
    M73: coinFlip(second.A, second.B),
    M74: first.E,                        // bye — winner is predetermined
    M75: coinFlip(first.F,  second.C),
    M76: coinFlip(first.C,  second.F),
    M77: first.I,                        // bye
    M78: coinFlip(second.E, second.I),
    M79: first.A,                        // bye
    M80: first.L,                        // bye
    M81: first.D,                        // bye
    M82: first.G,                        // bye
    M83: coinFlip(second.K, second.L),
    M84: coinFlip(first.H,  second.J),
    M85: first.B,                        // bye
    M86: coinFlip(first.J,  second.H),
    M87: first.K,                        // bye
    M88: coinFlip(second.D, second.G),
  };

  const matchesR32 = [
    { label: 'M73', teamA: second.A, teamB: second.B,  winner: r32W.M73, isBye: false },
    { label: 'M74', teamA: first.E,  teamB: null,       winner: r32W.M74, isBye: true  },
    { label: 'M75', teamA: first.F,  teamB: second.C,  winner: r32W.M75, isBye: false },
    { label: 'M76', teamA: first.C,  teamB: second.F,  winner: r32W.M76, isBye: false },
    { label: 'M77', teamA: first.I,  teamB: null,       winner: r32W.M77, isBye: true  },
    { label: 'M78', teamA: second.E, teamB: second.I,  winner: r32W.M78, isBye: false },
    { label: 'M79', teamA: first.A,  teamB: null,       winner: r32W.M79, isBye: true  },
    { label: 'M80', teamA: first.L,  teamB: null,       winner: r32W.M80, isBye: true  },
    { label: 'M81', teamA: first.D,  teamB: null,       winner: r32W.M81, isBye: true  },
    { label: 'M82', teamA: first.G,  teamB: null,       winner: r32W.M82, isBye: true  },
    { label: 'M83', teamA: second.K, teamB: second.L,  winner: r32W.M83, isBye: false },
    { label: 'M84', teamA: first.H,  teamB: second.J,  winner: r32W.M84, isBye: false },
    { label: 'M85', teamA: first.B,  teamB: null,       winner: r32W.M85, isBye: true  },
    { label: 'M86', teamA: first.J,  teamB: second.H,  winner: r32W.M86, isBye: false },
    { label: 'M87', teamA: first.K,  teamB: null,       winner: r32W.M87, isBye: true  },
    { label: 'M88', teamA: second.D, teamB: second.G,  winner: r32W.M88, isBye: false },
  ];

  // Round of 16 — compute winners first, then build match objects
  const r16W = {
    M89: coinFlip(r32W.M74, r32W.M77),  // Q1 — 1E vs 1I
    M90: coinFlip(r32W.M73, r32W.M75),  // Q1
    M91: coinFlip(r32W.M76, r32W.M78),  // Q3
    M92: coinFlip(r32W.M79, r32W.M80),  // Q3 — 1A vs 1L
    M93: coinFlip(r32W.M83, r32W.M84),  // Q2
    M94: coinFlip(r32W.M81, r32W.M82),  // Q2 — 1D vs 1G
    M95: coinFlip(r32W.M86, r32W.M88),  // Q4
    M96: coinFlip(r32W.M85, r32W.M87),  // Q4 — 1B vs 1K
  };

  const matchesR16 = [
    { label: 'M89', teamA: r32W.M74, teamB: r32W.M77, winner: r16W.M89, isBye: false },
    { label: 'M90', teamA: r32W.M73, teamB: r32W.M75, winner: r16W.M90, isBye: false },
    { label: 'M91', teamA: r32W.M76, teamB: r32W.M78, winner: r16W.M91, isBye: false },
    { label: 'M92', teamA: r32W.M79, teamB: r32W.M80, winner: r16W.M92, isBye: false },
    { label: 'M93', teamA: r32W.M83, teamB: r32W.M84, winner: r16W.M93, isBye: false },
    { label: 'M94', teamA: r32W.M81, teamB: r32W.M82, winner: r16W.M94, isBye: false },
    { label: 'M95', teamA: r32W.M86, teamB: r32W.M88, winner: r16W.M95, isBye: false },
    { label: 'M96', teamA: r32W.M85, teamB: r32W.M87, winner: r16W.M96, isBye: false },
  ];

  // Quarter-finals — Q1+Q2 feed SF1; Q3+Q4 feed SF2
  const qf1W = coinFlip(r16W.M89, r16W.M90);  // → SF1
  const qf2W = coinFlip(r16W.M93, r16W.M94);  // → SF1
  const qf3W = coinFlip(r16W.M91, r16W.M92);  // → SF2
  const qf4W = coinFlip(r16W.M95, r16W.M96);  // → SF2

  const matchesQF = [
    { label: 'QF1', teamA: r16W.M89, teamB: r16W.M90, winner: qf1W, isBye: false },
    { label: 'QF2', teamA: r16W.M93, teamB: r16W.M94, winner: qf2W, isBye: false },
    { label: 'QF3', teamA: r16W.M91, teamB: r16W.M92, winner: qf3W, isBye: false },
    { label: 'QF4', teamA: r16W.M95, teamB: r16W.M96, winner: qf4W, isBye: false },
  ];

  // Semi-finals
  const sf1Winner = coinFlip(qf1W, qf2W);
  const sf1Loser  = sf1Winner === qf1W ? qf2W : qf1W;
  const sf2Winner = coinFlip(qf3W, qf4W);
  const sf2Loser  = sf2Winner === qf3W ? qf4W : qf3W;

  const matchesSF = [
    { label: 'SF1', teamA: qf1W, teamB: qf2W, winner: sf1Winner, isBye: false },
    { label: 'SF2', teamA: qf3W, teamB: qf4W, winner: sf2Winner, isBye: false },
  ];

  // Final + 3rd place match
  const champion = coinFlip(sf1Winner, sf2Winner);
  const runnerUp = champion === sf1Winner ? sf2Winner : sf1Winner;
  const third    = coinFlip(sf1Loser, sf2Loser);

  const matchThird = { label: '3rd Place', teamA: sf1Loser,  teamB: sf2Loser,  winner: third,    isBye: false };
  const matchFinal = { label: 'Final',     teamA: sf1Winner, teamB: sf2Winner, winner: champion, isBye: false };

  return {
    champion,
    runnerUp,
    third,
    // Keep original r32 array (M73–M88 in insertion order) for backward compat
    r32: [
      r32W.M73, r32W.M74, r32W.M75, r32W.M76,
      r32W.M77, r32W.M78, r32W.M79, r32W.M80,
      r32W.M81, r32W.M82, r32W.M83, r32W.M84,
      r32W.M85, r32W.M86, r32W.M87, r32W.M88,
    ],
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
