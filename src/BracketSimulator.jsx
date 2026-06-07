// 2026 FIFA World Cup bracket builder.
// Match pairings follow the official fixed bracket structure (matches M73–M104).
//
// The builder is constraint-aware: it renders the ACTUAL (played) results passed
// in, fills undecided matches by random simulation when asked, and otherwise
// leaves them as TBD. Actual results always take priority and are never
// overridden by simulation.
//
// Randomised (only when `simulate` is true and the slot has no actual result):
// which team finishes 1st/2nd/3rd per group, which 8 of 12 third-place teams
// qualify, how they are seeded into R32, and each knockout outcome.

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

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// The 8 former "bye" R32 slots whose Team B is a qualified third-place finisher.
const THIRD_SLOT_LABELS = ['M74', 'M77', 'M79', 'M80', 'M81', 'M82', 'M85', 'M87'];

const EMPTY_ACTUAL = { groups: {}, thirdSlots: {}, winners: {} };

// poolsData: array of { id, teams: [{id, name, group, half, tier, flag}] }
// actual:    { groups, thirdSlots, winners } — any field may be null/partial
// options:   { simulate } — when true, undecided slots are randomly filled
export function buildBracket(poolsData, actual = EMPTY_ACTUAL, { simulate = false } = {}) {
  const groupsActual = actual?.groups ?? {};
  const thirdSlotsActual = actual?.thirdSlots ?? {};
  const winnersActual = actual?.winners ?? {};

  // Index teams by id (with owning poolId attached) and by group letter
  const byId = {};
  const byGroup = {};
  poolsData.forEach((p) => {
    p.teams.forEach((t) => {
      const team = { ...t, poolId: p.id };
      byId[t.id] = team;
      (byGroup[t.group] = byGroup[t.group] || []).push(team);
    });
  });
  const resolveId = (id) => (id && byId[id]) || null;

  // ── Group stage standings ────────────────────────────────────────────────
  const first = {};
  const second = {};
  const third = {};
  const fourth = {};
  const groupStatus = {};
  GROUPS.forEach((g) => {
    const actualStandings = groupsActual[g];
    if (Array.isArray(actualStandings) && actualStandings.length > 0) {
      first[g] = resolveId(actualStandings[0]);
      second[g] = resolveId(actualStandings[1]);
      third[g] = resolveId(actualStandings[2]);
      fourth[g] = resolveId(actualStandings[3]);
      groupStatus[g] = 'actual';
    } else if (simulate && byGroup[g]) {
      const ranked = shuffle(byGroup[g]);
      first[g] = ranked[0] ?? null;
      second[g] = ranked[1] ?? null;
      third[g] = ranked[2] ?? null;
      fourth[g] = ranked[3] ?? null;
      groupStatus[g] = 'simulated';
    } else {
      first[g] = second[g] = third[g] = fourth[g] = null;
      groupStatus[g] = 'tbd';
    }
  });

  // ── Third-place qualification + seeding into the 8 bye slots ──────────────
  const thirdSlotTeam = {};
  const thirdSlotStatus = {};
  const usedThirdIds = new Set();

  // Actual seeding takes priority
  THIRD_SLOT_LABELS.forEach((label) => {
    const t = resolveId(thirdSlotsActual[label]);
    if (t) {
      thirdSlotTeam[label] = t;
      thirdSlotStatus[label] = 'actual';
      usedThirdIds.add(t.id);
    }
  });

  // Simulation fills the remaining slots from the unused third-place finishers
  if (simulate) {
    const available = shuffle(
      GROUPS.map((g) => third[g]).filter((t) => t && !usedThirdIds.has(t.id))
    );
    let idx = 0;
    THIRD_SLOT_LABELS.forEach((label) => {
      if (!thirdSlotTeam[label] && idx < available.length) {
        const t = available[idx++];
        thirdSlotTeam[label] = t;
        thirdSlotStatus[label] = 'simulated';
        usedThirdIds.add(t.id);
      }
    });
  }

  THIRD_SLOT_LABELS.forEach((label) => {
    if (!(label in thirdSlotTeam)) {
      thirdSlotTeam[label] = null;
      thirdSlotStatus[label] = 'tbd';
    }
  });

  const qualifiedThirdIds = new Set(
    Object.values(thirdSlotTeam).filter(Boolean).map((t) => t.id)
  );

  // ── Knockout rounds (built bottom-up; actual > simulated > tbd) ───────────
  const matchByLabel = {};

  const makeMatch = (label, teamA, teamB) => {
    const a = teamA ?? null;
    const b = teamB ?? null;
    let winner = null;
    let status = 'tbd';

    const actualWinner = resolveId(winnersActual[label]);
    if (actualWinner) {
      winner = actualWinner;
      status = 'actual';
    } else if (simulate && a && b) {
      winner = coinFlip(a, b);
      status = 'simulated';
    }

    const match = { label, teamA: a, teamB: b, winner, status };
    matchByLabel[label] = match;
    return match;
  };

  const W = (label) => matchByLabel[label]?.winner ?? null;
  const loser = (label) => {
    const m = matchByLabel[label];
    if (!m || !m.winner || !m.teamA || !m.teamB) return null;
    return m.winner.id === m.teamA.id ? m.teamB : m.teamA;
  };

  // Round of 32 (M73–M88) — all 16 matches are contested (no byes)
  const matchesR32 = [
    makeMatch('M73', second.A, second.B),
    makeMatch('M74', first.E, thirdSlotTeam.M74),
    makeMatch('M75', first.F, second.C),
    makeMatch('M76', first.C, second.F),
    makeMatch('M77', first.I, thirdSlotTeam.M77),
    makeMatch('M78', second.E, second.I),
    makeMatch('M79', first.A, thirdSlotTeam.M79),
    makeMatch('M80', first.L, thirdSlotTeam.M80),
    makeMatch('M81', first.D, thirdSlotTeam.M81),
    makeMatch('M82', first.G, thirdSlotTeam.M82),
    makeMatch('M83', second.K, second.L),
    makeMatch('M84', first.H, second.J),
    makeMatch('M85', first.B, thirdSlotTeam.M85),
    makeMatch('M86', first.J, second.H),
    makeMatch('M87', first.K, thirdSlotTeam.M87),
    makeMatch('M88', second.D, second.G),
  ];

  // Round of 16 (M89–M96)
  const matchesR16 = [
    makeMatch('M89', W('M74'), W('M77')),
    makeMatch('M90', W('M73'), W('M75')),
    makeMatch('M91', W('M76'), W('M78')),
    makeMatch('M92', W('M79'), W('M80')),
    makeMatch('M93', W('M83'), W('M84')),
    makeMatch('M94', W('M81'), W('M82')),
    makeMatch('M95', W('M86'), W('M88')),
    makeMatch('M96', W('M85'), W('M87')),
  ];

  // Quarter-finals — Q1+Q2 feed SF1; Q3+Q4 feed SF2
  const matchesQF = [
    makeMatch('QF1', W('M89'), W('M90')),
    makeMatch('QF2', W('M93'), W('M94')),
    makeMatch('QF3', W('M91'), W('M92')),
    makeMatch('QF4', W('M95'), W('M96')),
  ];

  // Semi-finals
  const matchesSF = [
    makeMatch('SF1', W('QF1'), W('QF2')),
    makeMatch('SF2', W('QF3'), W('QF4')),
  ];

  // 3rd place + Final
  const matchThird = makeMatch('3rd', loser('SF1'), loser('SF2'));
  const matchFinal = makeMatch('Final', W('SF1'), W('SF2'));

  const champion = matchFinal.winner;
  const runnerUp = loser('Final');
  const thirdPlace = matchThird.winner;

  // Group-stage view model
  const groupStage = GROUPS.map((g) => ({
    group: g,
    first: first[g],
    second: second[g],
    third: third[g],
    fourth: fourth[g],
    thirdQualified: !!(third[g] && qualifiedThirdIds.has(third[g].id)),
    status: groupStatus[g],
  }));

  const simulatedAny =
    Object.values(groupStatus).includes('simulated') ||
    Object.values(thirdSlotStatus).includes('simulated') ||
    Object.values(matchByLabel).some((m) => m.status === 'simulated');

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
    simulatedAny,
  };
}

// Backward-compatible fully-random simulation (no actual results).
export function simulateTournament(poolsData) {
  return buildBracket(poolsData, EMPTY_ACTUAL, { simulate: true });
}

export default { buildBracket, simulateTournament, shuffle };
