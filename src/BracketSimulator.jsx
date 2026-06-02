// Simple bracket simulator for 48-team World Cup format
export function shuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function runToCount(arr, targetCount) {
  let current = shuffle(arr);
  while (current.length > targetCount) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1] ?? current[i];
      next.push(Math.random() < 0.5 ? a : b);
    }
    current = next;
  }
  return current;
}

// poolsData: array of pools where each pool has { id, teams: [{name,group,half,tier,flag}] }
export function simulateTournament(poolsData) {
  // flatten teams and attach owning poolId
  const allTeams = poolsData.flatMap((p) => p.teams.map((t) => ({ ...t, poolId: p.id })));

  // group teams by group letter
  const groups = {};
  allTeams.forEach((t) => {
    groups[t.group] = groups[t.group] || [];
    groups[t.group].push(t);
  });

  // Group stage: pick top2 per group randomly, collect third-place candidates
  const r32 = [];
  const thirdCandidates = [];
  Object.values(groups).forEach((groupArr) => {
    const ranked = shuffle(groupArr);
    r32.push(ranked[0], ranked[1]);
    if (ranked[2]) thirdCandidates.push(ranked[2]);
  });

  // pick 8 best third-placed teams randomly
  const selectedThirds = shuffle(thirdCandidates).slice(0, 8);
  selectedThirds.forEach((t) => r32.push(t));

  // split into halves by group
  const leftGroups = new Set(['A','B','C','D','E','F']);
  const left = r32.filter((t) => leftGroups.has(t.group));
  const right = r32.filter((t) => !leftGroups.has(t.group));

  // reduce each half down to 2 semifinalists
  const leftSemi = runToCount(left, 2);
  const rightSemi = runToCount(right, 2);

  // semifinals winners/losers per half
  const leftWinner = Math.random() < 0.5 ? leftSemi[0] : leftSemi[1];
  const leftLoser = leftSemi.find((t) => t !== leftWinner);
  const rightWinner = Math.random() < 0.5 ? rightSemi[0] : rightSemi[1];
  const rightLoser = rightSemi.find((t) => t !== rightWinner);

  // final
  const champion = Math.random() < 0.5 ? leftWinner : rightWinner;
  const runnerUp = champion === leftWinner ? rightWinner : leftWinner;

  // third place match
  const third = Math.random() < 0.5 ? leftLoser : rightLoser;

  return { champion, runnerUp, third, r32 };
}

export default { simulateTournament };
