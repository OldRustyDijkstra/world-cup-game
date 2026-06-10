import { useState, useEffect, useRef } from 'react';
import { Shuffle, Award, ShieldCheck, Layers, HelpCircle, Share2, RefreshCw, Trophy } from 'lucide-react';
import { buildBracket } from './BracketSimulator.jsx';
import { TEAMS } from './teams';
import { POOLS } from './pools';
import { fetchFifaRankings } from './fifaRankings';
import rankingsFileCache from './fifaRankingsCache.json';
import actualResults from './actualResults.json';
import playersJson from './players.json';
import playersPreviewJson from './players-preview.json';
import kfcLogo from './assets/kfc-logo.svg';
import { formatMatchTime } from './matchSchedule';

// ==========================================
// DATA STRUCTURES
// ==========================================

const TEAMS_BY_ID = Object.fromEntries(TEAMS.map((team) => [team.id, team]));
const POOLS_DATA = POOLS.map((pool) => ({
  ...pool,
  teams: pool.teams.map((teamId) => TEAMS_BY_ID[teamId]).filter(Boolean)
}));
const POOL_IDS = POOLS_DATA.map((pool) => pool.id);

// If players.json is non-empty, player names and assignments are locked.
const isPreviewEnv = typeof window !== 'undefined' && window.location.hostname.includes('preview');
const activePlayersJson = isPreviewEnv ? playersPreviewJson : playersJson;
const PLAYERS_LOCKED = Array.isArray(activePlayersJson) && activePlayersJson.length > 0;

// If actualResults.json contains any real data, simulation of gaps is locked.
// This prevents showing speculative results alongside real ones during a live tournament.
const RESULTS_LOCKED =
  Object.values(actualResults.groups  ?? {}).some(v => v != null) ||
  Object.values(actualResults.thirdSlots ?? {}).some(v => v != null) ||
  Object.values(actualResults.winners ?? {}).some(v => v != null);

const INITIAL_PLAYERS = PLAYERS_LOCKED
  ? activePlayersJson.map((p) => ({ points: 0, ...p }))
  : [
      { id: 1, name: "Player 1", poolId: null, points: 0 },
      { id: 2, name: "Player 2", poolId: null, points: 0 },
      { id: 3, name: "Player 3", poolId: null, points: 0 },
      { id: 4, name: "Player 4", poolId: null, points: 0 },
      { id: 5, name: "Player 5", poolId: null, points: 0 },
      { id: 6, name: "Player 6", poolId: null, points: 0 },
      { id: 7, name: "Player 7", poolId: null, points: 0 },
      { id: 8, name: "Player 8", poolId: null, points: 0 },
    ];

export default function SlipPickApp() {
  const [players, setPlayers] = useState(() => {
    if (PLAYERS_LOCKED) return INITIAL_PLAYERS;
    try {
      const stored = localStorage.getItem('wc26_players');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 8) return parsed;
      }
    } catch {}
    return INITIAL_PLAYERS;
  });
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasAssigned, setHasAssigned] = useState(() => {
    if (PLAYERS_LOCKED) return INITIAL_PLAYERS.every((p) => p.poolId != null);
    try { return JSON.parse(localStorage.getItem('wc26_hasAssigned')) ?? false; }
    catch { return false; }
  });
  const [activeTab, setActiveTab] = useState('dashboard'); // 'pools' | 'dashboard' | 'scoring' | 'bracket'
  const [prizes, setPrizes] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('wc26_prizes'));
      if (stored && stored.first >= 1 && stored.second >= 1 && stored.third >= 1) return stored;
    } catch { /* ignore malformed localStorage */ }
    return { first: 25, second: 10, third: 5 };
  });
  const TOTAL_POT = prizes.first + prizes.second + prizes.third;
  // Display bracket: actual (played) results from the bundled file. Undecided
  // matches render as TBD. Simulation fills only the TBD gaps (ephemeral) and
  // never overrides an actual result.
  const [tournamentResults, setTournamentResults] = useState(() =>
    buildBracket(POOLS_DATA, actualResults, { simulate: false })
  );
  const [exportFeedback, setExportFeedback] = useState('');

  // FIFA rankings: { [teamId]: points } | null
  const [fifaRankings, setFifaRankings] = useState(() => {
    try {
      const stored = localStorage.getItem('wc26_fifaRankings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.rankings && typeof parsed.rankings === 'object' && Object.keys(parsed.rankings).length > 0)
          return parsed.rankings;
      }
    } catch { /* ignore malformed localStorage */ }
    // Fall back to the bundled static cache (src/fifaRankingsCache.json)
    if (rankingsFileCache?.rankings && Object.keys(rankingsFileCache.rankings).length > 0)
      return rankingsFileCache.rankings;
    return null;
  });
  const [rankingsFetchedAt, setRankingsFetchedAt] = useState(() => {
    try {
      const stored = localStorage.getItem('wc26_fifaRankings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.fetchedAt) return parsed.fetchedAt;
      }
    } catch { /* ignore */ }
    return rankingsFileCache?.fetchedAt ?? null;
  });
  const [rankingsStatus, setRankingsStatus] = useState('idle'); // 'idle' | 'loading' | 'error'
  const tabsRef = useRef(null);

  // Persist FIFA rankings to localStorage whenever they change
  useEffect(() => {
    if (fifaRankings) {
      const fetchedAt = rankingsFetchedAt ?? new Date().toISOString();
      localStorage.setItem(
        'wc26_fifaRankings',
        JSON.stringify({ fetchedAt, rankings: fifaRankings })
      );
    }
  }, [fifaRankings, rankingsFetchedAt]);

  // Sync to localStorage — skip player sync during animation to avoid saving transient state
  useEffect(() => {
    if (!isShuffling) localStorage.setItem('wc26_players', JSON.stringify(players));
  }, [players, isShuffling]);
  useEffect(() => {
    localStorage.setItem('wc26_hasAssigned', JSON.stringify(hasAssigned));
  }, [hasAssigned]);
  useEffect(() => {
    localStorage.setItem('wc26_prizes', JSON.stringify(prizes));
  }, [prizes]);

  // ==========================================
  // PRIZES
  // ==========================================
  function handlePrizeChange(place, raw) {
    const val = parseInt(raw, 10);
    if (!isNaN(val) && val >= 1) setPrizes(prev => ({ ...prev, [place]: val }));
  }

  // ==========================================
  // FIFA RANKINGS
  // ==========================================
  const handleFetchRankings = async () => {
    setRankingsStatus('loading');
    try {
      const rankings = await fetchFifaRankings();
      const fetchedAt = new Date().toISOString();
      setFifaRankings(rankings);
      setRankingsFetchedAt(fetchedAt);
      setRankingsStatus('idle');
      // Persist to src/fifaRankingsCache.json via the Vite dev/preview server plugin.
      // Silently ignored when running from a static host (no server-side endpoint).
      fetch('/api/save-rankings-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fetchedAt, rankings }),
      }).catch(() => {});
    } catch {
      setRankingsStatus('error');
    }
  };

  // Auto-fetch FIFA rankings on first load if not cached or empty
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!fifaRankings || Object.keys(fifaRankings).length === 0) handleFetchRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPoolAvgPoints = (pool) => {
    if (!fifaRankings) return null;
    const pts = pool.teams.map((t) => fifaRankings[t.id]).filter((p) => p != null);
    if (pts.length === 0) return null;
    return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  };

  // ==========================================
  // SLIP-PICK SHUFFLE ENGINE
  // ==========================================
  const getRandomPoolId = () => POOL_IDS[Math.floor(Math.random() * POOL_IDS.length)];

  const handleSlipPick = () => {
    setIsShuffling(true);

    let animationInterval = setInterval(() => {
      // Create a frantic visual shuffle effect
      setPlayers(prev => prev.map(p => ({
        ...p,
        poolId: getRandomPoolId()
      })));
    }, 100);

    setTimeout(() => {
      clearInterval(animationInterval);

      // Perform the actual fair mapping (Fisher-Yates shuffle on pools)
      const poolIds = [...POOL_IDS];
      for (let i = poolIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolIds[i], poolIds[j]] = [poolIds[j], poolIds[i]];
      }

      // Assign pools from shuffled poolIds, preserving any name edits made before shuffle
      setPlayers(prev => prev.map((player, index) => ({
        ...player,
        poolId: poolIds[index]
      })));
      setIsShuffling(false);
      setHasAssigned(true);
      setActiveTab('dashboard');
    }, 2000);
  };

  // Drop any simulated preview and show only the actual (played) results.
  const showActualBracket = () => {
    setTournamentResults(buildBracket(POOLS_DATA, actualResults, { simulate: false }));
  };

  // Fill undecided (TBD) matches with a random preview — actual results are kept.
  const handleSimulate = () => {
    setTournamentResults(buildBracket(POOLS_DATA, actualResults, { simulate: true }));
  };

  // Re-shuffle player→pool assignments while keeping the actual played matches.
  // The bracket stays populated; any simulated preview is reset to actual-only.
  const handleRedraw = () => {
    setExportFeedback('');
    showActualBracket();
    handleSlipPick();
  };

  const handleNameChange = (playerId, newName) => {
    if (PLAYERS_LOCKED) return;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, name: newName } : p));
  };

  const getPoolOwnerName = (poolId) => {
    return players.find((player) => player.poolId === poolId)?.name ?? 'Unassigned';
  };

  const buildPlayerAssignmentSheet = () => {
    const lines = [
      '🌍 World Cup 2026 Sweepstakes — Pool Assignments',
      '='.repeat(48),
      '',
    ];

    players.forEach((player) => {
      const pool = POOLS_DATA.find((p) => p.id === player.poolId);
      const avgPts = pool ? getPoolAvgPoints(pool) : null;
      lines.push(`👤 ${player.name}`);
      lines.push(`   Pool ${player.poolId ?? '-'}${pool ? `: ${pool.name}` : ''}${avgPts != null ? ` (Avg ${avgPts.toLocaleString()} pts)` : ''}`);
      if (pool) {
        pool.teams.forEach((team) => {
          const pts = fifaRankings?.[team.id];
          const ptsStr = pts != null ? `  ${Math.round(pts).toLocaleString()} pts` : '';
          lines.push(`   ${team.flag} ${team.name.padEnd(22)} Grp ${team.group} • ${team.half[0]}H • ${team.tier}${ptsStr}`);
        });
      }
      lines.push('');
    });

    if (tournamentResults) {
      const prizeLine = (team, amount) =>
        team ? `${team.flag} ${team.name} — ${getPoolOwnerName(team.poolId)}` : `TBD ($${amount} unawarded)`;
      lines.push('-'.repeat(48));
      lines.push('🏅 Prize Winners');
      lines.push(`🥇 1st ($${prizes.first}): ${prizeLine(tournamentResults.champion, prizes.first)}`);
      lines.push(`🥈 2nd ($${prizes.second}): ${prizeLine(tournamentResults.runnerUp, prizes.second)}`);
      lines.push(`🥉 3rd ($${prizes.third}): ${prizeLine(tournamentResults.third, prizes.third)}`);
      if (tournamentResults.simulatedAny) lines.push('(includes simulated preview for undecided matches)');
    }

    return lines.join('\n');
  };

  const [assignmentFeedback, setAssignmentFeedback] = useState('');

  const handleExportAssignments = async () => {
    if (!hasAssigned) {
      setAssignmentFeedback('Draw pools first to export assignments.');
      return;
    }
    const sheet = buildPlayerAssignmentSheet();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'World Cup 2026 Pool Assignments', text: sheet });
        setAssignmentFeedback('Assignments shared.');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sheet);
        setAssignmentFeedback('Assignments copied to clipboard.');
        return;
      }
      const blob = new Blob([sheet], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'world-cup-pool-assignments.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setAssignmentFeedback('Assignments downloaded.');
    } catch {
      setAssignmentFeedback('Could not export assignments.');
    }
  };

  // Build a Mermaid flowchart of the knockout bracket (actual or simulated),
  // with winners marked (✓), TBD where undecided, and a highlighted podium.
  const buildMermaidDiagram = () => {
    const r = tournamentResults;
    const safe = (s) => String(s).replace(/["[\]{}|<>]/g, '').trim();
    const teamLabel = (t) => (t ? safe(`${t.flag} ${t.name}`) : 'TBD');
    const winMark = (m, t) => (t && m.winner && t.id === m.winner.id ? '✓ ' : '');
    const matchDecl = (m, id = m.label) =>
      `  ${id}["${m.label}<br/>${winMark(m, m.teamA)}${teamLabel(m.teamA)}<br/>${winMark(m, m.teamB)}${teamLabel(m.teamB)}"]`;

    const lines = ['flowchart LR'];

    lines.push('  subgraph R32["Round of 32"]');
    r.matchesR32.forEach((m) => lines.push(matchDecl(m)));
    lines.push('  end');
    lines.push('  subgraph R16["Round of 16"]');
    r.matchesR16.forEach((m) => lines.push(matchDecl(m)));
    lines.push('  end');
    lines.push('  subgraph QFS["Quarter-Finals"]');
    r.matchesQF.forEach((m) => lines.push(matchDecl(m)));
    lines.push('  end');
    lines.push('  subgraph SFS["Semi-Finals"]');
    r.matchesSF.forEach((m) => lines.push(matchDecl(m)));
    lines.push('  end');
    lines.push('  subgraph FIN["Final & 3rd Place"]');
    lines.push(matchDecl(r.matchThird, 'T3'));
    lines.push(matchDecl(r.matchFinal, 'FINAL'));
    lines.push('  end');

    const feeds = [
      ['M74', 'M89'], ['M77', 'M89'], ['M73', 'M90'], ['M75', 'M90'],
      ['M76', 'M91'], ['M78', 'M91'], ['M79', 'M92'], ['M80', 'M92'],
      ['M83', 'M93'], ['M84', 'M93'], ['M81', 'M94'], ['M82', 'M94'],
      ['M86', 'M95'], ['M88', 'M95'], ['M85', 'M96'], ['M87', 'M96'],
      ['M89', 'QF1'], ['M90', 'QF1'], ['M93', 'QF2'], ['M94', 'QF2'],
      ['M91', 'QF3'], ['M92', 'QF3'], ['M95', 'QF4'], ['M96', 'QF4'],
      ['QF1', 'SF1'], ['QF2', 'SF1'], ['QF3', 'SF2'], ['QF4', 'SF2'],
      ['SF1', 'FINAL'], ['SF2', 'FINAL'],
    ];
    feeds.forEach(([a, b]) => lines.push(`  ${a} --> ${b}`));
    lines.push('  SF1 -.-> T3');
    lines.push('  SF2 -.-> T3');

    const podiumLine = (team) =>
      `${teamLabel(team)} — ${safe(team ? getPoolOwnerName(team.poolId) : '—')}`;
    lines.push('  subgraph PODIUM["🏅 Podium"]');
    lines.push(`    P1["🥇 1st: ${podiumLine(r.champion)}"]`);
    lines.push(`    P2["🥈 2nd: ${podiumLine(r.runnerUp)}"]`);
    lines.push(`    P3["🥉 3rd: ${podiumLine(r.third)}"]`);
    lines.push('  end');
    lines.push('  FINAL -.-> P1');

    lines.push('  classDef champ fill:#f59e0b,stroke:#b45309,color:#111827;');
    lines.push('  class FINAL,P1 champ;');

    return lines.join('\n');
  };

  const handlePreviewMermaid = () => {
    const diagram = buildMermaidDiagram();
    const isSimView = tournamentResults.simulatedAny;
    const title = `FMG World Cup 2026 Sweepstakes — Result Sheet${isSimView ? ' (Simulated Preview)' : ''}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'dark', flowchart: { curve: 'basis' } });
  </script>
  <style>
    body { background: #0f172a; color: #e2e8f0; font-family: sans-serif; margin: 0; padding: 24px; }
    h1 { font-size: 1.1rem; color: #fbbf24; margin-bottom: 20px; }
    .mermaid { width: 100%; }
  </style>
</head>
<body>
  <h1>⚽ ${title}</h1>
  <pre class="mermaid">
${diagram}
  </pre>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const buildResultSummary = () => {
    const placeLine = (team, amount) =>
      team
        ? `${team.name} ${team.flag} - ${getPoolOwnerName(team.poolId)} - $${amount}`
        : `TBD - $${amount}`;

    const envLabel = isPreviewEnv ? 'Secondary (Preview)' : 'Main (Production)';
    const lines = [
      `World Cup 2026 Slip-Pick Results — ${envLabel}`,
      tournamentResults.simulatedAny ? '(undecided matches shown as a simulated preview)' : '',
      '',
      '```mermaid',
      buildMermaidDiagram(),
      '```',
      '',
      `1st Place: ${placeLine(tournamentResults.champion, prizes.first)}`,
      `2nd Place: ${placeLine(tournamentResults.runnerUp, prizes.second)}`,
      `3rd Place: ${placeLine(tournamentResults.third, prizes.third)}`,
      '',
      'Assigned Pools:',
      ...players.map((player) => {
        const pool = POOLS_DATA.find((entry) => entry.id === player.poolId);
        return `${player.name}: ${pool?.name ?? 'Unassigned'}`;
      }),
    ];

    return lines.join('\n');
  };

  const handleExportResults = async () => {
    const summary = buildResultSummary();

    if (!tournamentResults) {
      setExportFeedback('Draw pools first to generate results.');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: `World Cup 2026 Sweepstakes Results — ${isPreviewEnv ? 'Secondary (Preview)' : 'Main (Production)'}`,
          text: summary,
        });
        setExportFeedback('Results shared.');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
        setExportFeedback('Results copied to clipboard.');
        return;
      }

      const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `world-cup-slip-pick-results${isPreviewEnv ? '-preview' : ''}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportFeedback('Results downloaded.');
    } catch {
      setExportFeedback('Could not export results.');
    }
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'Top Tier': return 'bg-red-100 text-red-800 border-red-200';
      case 'Mid Tier': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-12">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border-b border-slate-700 py-6 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="bg-amber-500 text-slate-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              FMG World Cup 2026
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-400 shrink-0" />
              Sweepstakes Worldcup
              {isPreviewEnv
                ? <span className="text-xs font-semibold bg-purple-600/80 text-purple-100 border border-purple-500/50 px-2 py-0.5 rounded-full normal-case tracking-normal">Secondary</span>
                : <span className="text-xs font-semibold bg-emerald-600/80 text-emerald-100 border border-emerald-500/50 px-2 py-0.5 rounded-full normal-case tracking-normal">Main</span>
              }
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!hasAssigned ? (
              <button
                onClick={handleSlipPick}
                disabled={isShuffling}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-bold px-6 py-3 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
              >
                <Shuffle className={`w-5 h-5 ${isShuffling ? 'animate-spin' : ''}`} />
                {isShuffling ? 'Drawing Pools...' : 'Draw Pools'}
              </button>
            ) : PLAYERS_LOCKED ? (
              <div className="relative group">
                <button
                  disabled
                  className="flex items-center gap-2 bg-slate-800 text-slate-500 border border-slate-700 font-medium px-4 py-2 rounded-xl cursor-not-allowed opacity-50"
                >
                  <RefreshCw className="w-4 h-4" /> Redraw Pools
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-700 text-slate-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  Pools have been allocated
                </div>
              </div>
            ) : (
              <button
                onClick={handleRedraw}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-medium px-4 py-2 rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Redraw Pools
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Testing Mode Banner — shown when players.json is empty (localStorage only, not permanent) */}
      {!PLAYERS_LOCKED && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <span className="shrink-0 self-start sm:self-auto bg-amber-500 text-slate-900 font-bold text-xs px-2 py-0.5 rounded-full uppercase tracking-wider">
              ⚠️ Testing Mode
            </span>
            <p className="min-w-0 text-sm text-amber-200/90 leading-snug">
              Preview only — data is stored in localStorage and is not permanent.
            </p>
          </div>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 mt-8">

        {!hasAssigned && (
          <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-slate-700 rounded-3xl p-6 md:p-8 mb-8 shadow-xl">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-amber-400 font-semibold">
                  Custom Bracket Pools
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white mt-2">
                  Draw pools, lock the halves, and keep every path alive.
                </h2>
                <p className="text-slate-400 text-sm mt-3 max-w-xl">
                  Each pool is built with 3 Left + 3 Right teams and six unique groups. The bracket advances only the top two from each group, so pool teammates can only meet in the Final.
                </p>
              </div>
              <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-4 w-full sm:w-[260px]">
                <div className="text-xs uppercase text-slate-400">Total Pot</div>
                <div className="text-3xl font-black text-amber-400">${TOTAL_POT}</div>
                <div className="mt-3 space-y-1 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <span>Winner</span>
                    <span>${prizes.first}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Runner-up</span>
                    <span>${prizes.second}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Third</span>
                    <span>${prizes.third}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Player name setup */}
            <div className="mt-6">
              {PLAYERS_LOCKED ? (
                <>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Players</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="bg-slate-800 border border-slate-700 text-slate-100 text-sm px-3 py-2 rounded-lg"
                      >
                        {player.name}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Enter Player Names</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {players.map((player) => (
                      <input
                        key={player.id}
                        type="text"
                        value={player.name}
                        disabled={isShuffling}
                        onChange={(e) => handleNameChange(player.id, e.target.value)}
                        placeholder={`Player ${player.id}`}
                        className="bg-slate-800 border border-slate-700 text-slate-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-40 transition-all"
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSlipPick}
                disabled={isShuffling}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-bold px-6 py-3 rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
              >
                <Shuffle className={`w-5 h-5 ${isShuffling ? 'animate-spin' : ''}`} />
                {isShuffling ? 'Drawing Pools...' : 'Draw Pools'}
              </button>
              <button
                onClick={() => {
                  setActiveTab('pools');
                  tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-medium px-6 py-3 rounded-xl transition-all"
              >
                <Layers className="w-4 h-4" /> Preview Pools
              </button>
            </div>
          </section>
        )}

        {/* Navigation Tabs */}
        <div ref={tabsRef} className="flex overflow-x-auto border-b border-slate-800 mb-6 gap-1">
          <button
            onClick={() => setActiveTab('pools')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'pools' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-4 h-4 inline mr-0 sm:mr-2" /><span className="hidden sm:inline">Pre-Configured Pools</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Award className="w-4 h-4 inline mr-0 sm:mr-2" /><span className="hidden sm:inline">Player Dashboards &amp; Standings</span>
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'bracket' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Trophy className="w-4 h-4 inline mr-0 sm:mr-2" /><span className="hidden sm:inline">Bracket</span>
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'scoring' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <HelpCircle className="w-4 h-4 inline mr-0 sm:mr-2" /><span className="hidden sm:inline">Scoring Rules</span>
          </button>
        </div>

        {/* TAB 1: THE POOLS DISPLAY */}
        {activeTab === 'pools' && (
          <div>
            {/* Rankings status bar + refresh button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="text-xs text-slate-500">
                {rankingsStatus === 'loading' && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Fetching FIFA rankings…
                  </span>
                )}
                {rankingsStatus === 'error' && (
                  <span className="text-red-400">Could not load FIFA rankings.</span>
                )}
                {rankingsStatus === 'idle' && fifaRankings && (
                  <span className="text-slate-500">
                    FIFA ranking points shown per team.
                    {rankingsFetchedAt && (
                      <> Last sync: {new Date(rankingsFetchedAt).toLocaleString('en-AU', { timeZone: 'Australia/Perth', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} AWST</>
                    )}
                  </span>
                )}
              </div>
              <button
                onClick={handleFetchRankings}
                disabled={rankingsStatus === 'loading'}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rankingsStatus === 'loading' ? 'animate-spin' : ''}`} />
                Refresh FIFA Rankings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {POOLS_DATA.map((pool) => {
                const avgPts = getPoolAvgPoints(pool);
                return (
                  <div key={pool.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 shadow-md backdrop-blur-sm">
                    <div className="border-b border-slate-700 pb-2 mb-3 flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-amber-400 truncate uppercase tracking-wide">{pool.name}</h4>
                      <span className="shrink-0 text-[10px] font-semibold text-slate-300 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded">
                        {avgPts != null ? `Avg ${avgPts.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {pool.teams.map((team, idx) => {
                        const pts = fifaRankings?.[team.id];
                        return (
                          <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg text-xs border border-slate-800">
                            <span className="font-medium truncate flex items-center gap-1.5">
                              <span className="text-base">{team.flag}</span> {team.name}
                            </span>
                            <div className="flex gap-1 text-[10px] shrink-0">
                              <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">G: {team.group}</span>
                              <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 hidden sm:inline-flex">{team.half[0]}H</span>
                              {pts != null && (
                                <span className="bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/50 font-mono">
                                  {Math.round(pts).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PLAYER DASHBOARDS */}
        {activeTab === 'dashboard' && (
          <div>
            {!hasAssigned ? (
              <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                <Shuffle className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-400">No Pools Drawn Yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                  Click the "Draw Pools" button to randomly allocate tournament pools to your 8 players.
                </p>
              </div>
            ) : (
              <>
              {/* Edit Player Names — hidden when players are locked via players.json */}
              {!PLAYERS_LOCKED && (
              <section className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Edit Player Names</p>
                  <span className="text-[10px] text-slate-500">Names can be changed at any time</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {players.map((player) => (
                    <input
                      key={player.id}
                      type="text"
                      value={player.name}
                      disabled={isShuffling}
                      onChange={(e) => handleNameChange(player.id, e.target.value)}
                      placeholder={`Player ${player.id}`}
                      className="bg-slate-800 border border-slate-700 text-slate-100 text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-40 transition-all"
                    />
                  ))}
                </div>
              </section>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Prize Winners */}
                <div className="lg:col-span-1 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-700 shadow-xl h-fit">
                  <h3 className="text-lg font-bold text-white mb-4">🏅 Prize Winners</h3>
                  {(() => {
                    const finalStatus = tournamentResults.matchFinal?.status ?? 'tbd';
                    const thirdStatus = tournamentResults.matchThird?.status ?? 'tbd';
                    const rows = [
                      { key: '1st', amount: prizes.first, team: tournamentResults.champion, status: finalStatus, color: 'text-amber-400' },
                      { key: '2nd', amount: prizes.second, team: tournamentResults.runnerUp, status: finalStatus, color: 'text-slate-300' },
                      { key: '3rd', amount: prizes.third, team: tournamentResults.third, status: thirdStatus, color: 'text-slate-300' },
                    ];
                    return (
                      <div className="space-y-3 text-sm">
                        {rows.map((row) => (
                          <div key={row.key} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                            <div className={`font-semibold ${row.color} flex items-center justify-between gap-2`}>
                              <span>{row.key} — ${row.amount}</span>
                              {row.team && row.status === 'simulated' && (
                                <span className="text-[9px] uppercase tracking-wide text-indigo-300 bg-indigo-900/40 border border-indigo-700/40 px-1.5 py-0.5 rounded-full">Simulated</span>
                              )}
                              {row.team && row.status === 'actual' && (
                                <span className="text-[9px] uppercase tracking-wide text-emerald-300 bg-emerald-900/30 border border-emerald-700/40 px-1.5 py-0.5 rounded-full">Final</span>
                              )}
                            </div>
                            {row.team ? (
                              <>
                                <div className="text-slate-300">{row.team.name} • {row.team.flag}</div>
                                <div className="text-slate-400 text-xs">Owned by: {getPoolOwnerName(row.team.poolId)}</div>
                              </>
                            ) : (
                              <div className="text-slate-500 text-xs italic mt-0.5">TBD — not yet decided</div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="mt-2 flex gap-2">
                    {!RESULTS_LOCKED && (
                      <button
                        onClick={handleSimulate}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-200 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 py-2 rounded-xl transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> {tournamentResults.simulatedAny ? 'Re-simulate' : 'Simulate gaps'}
                      </button>
                    )}
                    {tournamentResults.simulatedAny && (
                      <button
                        onClick={showActualBracket}
                        className="flex-1 flex items-center justify-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700 border border-slate-600 py-2 rounded-xl transition-all"
                      >
                        <Trophy className="w-3.5 h-3.5" /> Show actual
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handlePreviewMermaid}
                    className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 py-2 rounded-xl transition-all"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Preview Result Sheet
                  </button>
                </div>

                {/* Individual Cards Grid */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Player Assignments</h3>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={handleExportAssignments}
                        className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Export Pool Assignments
                      </button>
                      {assignmentFeedback && (
                        <p className="text-[10px] text-slate-400">{assignmentFeedback}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {players.map((player) => {
                    const pool = POOLS_DATA.find(p => p.id === player.poolId);
                    const avgPts = pool ? getPoolAvgPoints(pool) : null;
                    return (
                      <div key={player.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:border-slate-600">
                        <div>
                          <div className="flex justify-between items-start border-b border-slate-700 pb-3 mb-3">
                            <div>
                              {PLAYERS_LOCKED ? (
                                <p className="font-black text-lg text-white">{player.name}</p>
                              ) : (
                                <input
                                  type="text"
                                  value={player.name}
                                  onChange={(e) => handleNameChange(player.id, e.target.value)}
                                  className="font-black text-lg text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-amber-500 focus:outline-none w-full transition-all"
                                />
                              )}
                              <p className="text-[11px] text-amber-400 font-medium truncate max-w-[180px]">{pool?.name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="bg-slate-900 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                                Pool {player.poolId ?? '-'}
                              </span>
                              {avgPts != null && (
                                <span className="text-[10px] text-indigo-300 font-semibold">
                                  Avg {avgPts.toLocaleString()} pts
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {pool?.teams.map((team, idx) => {
                              const pts = fifaRankings?.[team.id];
                              return (
                                <div key={idx} className="bg-slate-900/60 p-2 rounded-xl border border-slate-850 flex flex-col justify-between text-xs min-h-[64px]">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                                    <span>{team.flag}</span>
                                    <span className="truncate">{team.name}</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/50">
                                    <span className="text-[10px] text-slate-400">Grp {team.group} • {team.half[0]}H</span>
                                    <div className="flex items-center gap-1">
                                      {pts != null && (
                                        <span className="text-[9px] px-1 py-px rounded font-mono text-indigo-300 bg-indigo-900/40 border border-indigo-700/40">
                                          {Math.round(pts).toLocaleString()}
                                        </span>
                                      )}
                                      <span className={`text-[9px] px-1.5 rounded-full font-semibold border ${getTierColor(team.tier)}`}>
                                        {team.tier.split(' ')[0]}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>

              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: PRIZE RULES */}
        {activeTab === 'scoring' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-2">🏆 Prize Rules</h3>
            <p className="text-slate-400 text-sm mb-6">Prizes are awarded to the owners of the top three finishing teams.</p>

            {!hasAssigned ? (
              <div className="space-y-4">
                <p className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">Configure prizes before the draw</p>
                {[
                  { place: 'first', label: '🥇 1st Place', color: 'text-amber-400' },
                  { place: 'second', label: '🥈 2nd Place', color: 'text-slate-300' },
                  { place: 'third', label: '🥉 3rd Place', color: 'text-orange-400' },
                ].map(({ place, label, color }) => (
                  <div key={place} className="flex items-center justify-between gap-4 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3">
                    <span className={`font-semibold ${color}`}>{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={prizes[place]}
                        onChange={e => handlePrizeChange(place, e.target.value)}
                        onBlur={e => { if (!e.target.value || parseInt(e.target.value, 10) < 1) handlePrizeChange(place, prizes[place]); }}
                        className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-right text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-semibold text-slate-300 mt-2">
                  <span>Total pot</span>
                  <span className="text-white">${TOTAL_POT}</span>
                </div>
              </div>
            ) : (
              <ul className="space-y-2 text-slate-300">
                <li className="flex justify-between items-center bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3">
                  <span className="font-semibold text-amber-400">🥇 1st Place</span>
                  <span className="font-bold text-white">${prizes.first}</span>
                </li>
                <li className="flex justify-between items-center bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3">
                  <span className="font-semibold text-slate-300">🥈 2nd Place</span>
                  <span className="font-bold text-white">${prizes.second}</span>
                </li>
                <li className="flex justify-between items-center bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3">
                  <span className="font-semibold text-orange-400">🥉 3rd Place</span>
                  <span className="font-bold text-white">${prizes.third}</span>
                </li>
                <li className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-semibold text-slate-400">
                  <span>Total pot</span>
                  <span className="text-white">${TOTAL_POT}</span>
                </li>
              </ul>
            )}
          </div>
        )}

        {/* TAB 4: BRACKET / MATCH RESULTS */}
        {activeTab === 'bracket' && (() => {
          const isSimView = tournamentResults.simulatedAny;
          // Third-place qualification is only known once thirds are seeded
          // (actual seeding present, or a simulation has run).
          const thirdsSeeded =
            isSimView || tournamentResults.groupStage.some((e) => e.thirdQualified);

          const statusBadge = (status) => {
            if (status === 'actual')
              return <span className="text-[9px] uppercase tracking-wide text-emerald-300 bg-emerald-900/30 border border-emerald-700/40 px-1.5 py-0.5 rounded-full">Played</span>;
            if (status === 'simulated')
              return <span className="text-[9px] uppercase tracking-wide text-indigo-300 bg-indigo-900/40 border border-indigo-700/40 px-1.5 py-0.5 rounded-full">Sim</span>;
            return <span className="text-[9px] uppercase tracking-wide text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-full">TBD</span>;
          };

          const TeamRow = ({ team, isWinner }) => {
            if (!team) {
              return (
                <div className="flex items-center px-2.5 py-1.5 rounded-lg text-xs bg-slate-900/40 border border-dashed border-slate-800 text-slate-600">
                  <span className="italic">TBD</span>
                </div>
              );
            }
            return (
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${isWinner ? 'bg-amber-500/10 border border-amber-500/40 text-slate-100' : 'bg-slate-900/50 border border-slate-800 text-slate-300'}`}>
                <span className="flex items-center gap-1.5 min-w-0 font-medium truncate">
                  <span className="text-base shrink-0">{team.flag}</span>
                  <span className="truncate">{team.name}</span>
                </span>
                <span className="flex items-center gap-1 shrink-0 ml-1">
                  <span className="text-[10px] text-slate-400 max-w-[72px] truncate">{getPoolOwnerName(team.poolId)}</span>
                  {isWinner && <span className="text-amber-400 font-bold">✓</span>}
                </span>
              </div>
            );
          };

          const isWin = (match, team) => !!(team && match.winner && match.winner.id === team.id);

          const MatchCard = ({ match, accent }) => {
            const matchTime = formatMatchTime(match.label);
            return (
            <div className={`bg-slate-800/60 border rounded-xl p-3 flex flex-col gap-1 ${accent ? 'border-amber-500/30' : 'border-slate-700/60'}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-mono font-semibold text-slate-400">{match.label}</span>
                {statusBadge(match.status)}
              </div>
              {matchTime && (
                <div className="text-[10px] text-slate-500 mb-0.5">{matchTime}</div>
              )}
              <TeamRow team={match.teamA} isWinner={isWin(match, match.teamA)} />
              <div className="text-center text-[10px] text-slate-600 font-semibold tracking-widest">VS</div>
              <TeamRow team={match.teamB} isWinner={isWin(match, match.teamB)} />
            </div>
            );
          };

          const RoundSection = ({ title, matches, cols = 'grid-cols-2 sm:grid-cols-4', accent = false }) => (
            <section>
              <h4 className="text-xs uppercase tracking-[0.15em] font-bold text-slate-400 mb-3">{title}</h4>
              <div className={`grid ${cols} gap-3`}>
                {matches.map((m) => <MatchCard key={m.label} match={m} accent={accent} />)}
              </div>
            </section>
          );

          const QualRow = ({ rank, rankColor, team }) => (
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`text-[9px] font-bold w-5 shrink-0 ${rankColor}`}>{rank}</span>
              {team ? (
                <>
                  <span className="text-base shrink-0">{team.flag}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 truncate">{team.name}</div>
                    <div className="text-[9px] text-slate-500 truncate">{getPoolOwnerName(team.poolId)}</div>
                  </div>
                </>
              ) : (
                <span className="text-[10px] text-slate-600 italic">TBD</span>
              )}
            </div>
          );

          return (
            <div className="space-y-8">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40 border border-slate-700/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {isSimView ? 'Actual results + simulated preview' : 'Actual results'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isSimView
                      ? 'Undecided matches are randomly simulated (“Sim”). Played matches are never changed.'
                      : 'Showing the real played matches. Undecided matches are marked TBD.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!RESULTS_LOCKED && (
                    <button
                      onClick={handleSimulate}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-100 bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-700/50 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {isSimView ? 'Re-simulate' : 'Simulate gaps'}
                    </button>
                  )}
                  {isSimView && (
                    <button
                      onClick={showActualBracket}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Trophy className="w-3.5 h-3.5" /> Show actual
                    </button>
                  )}
                </div>
              </div>
              {/* Group Stage */}
              <section>
                <h4 className="text-xs uppercase tracking-[0.15em] font-bold text-slate-400 mb-3">Group Stage — Qualifiers (1st, 2nd + best 8 of 12 third-place ★)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tournamentResults.groupStage.map(({ group, first, second, third: thirdTeam, thirdQualified, status }) => (
                    <div key={group} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Group {group}</div>
                        {statusBadge(status)}
                      </div>
                      <div className="space-y-1.5">
                        <QualRow rank="1st" rankColor="text-emerald-400" team={first} />
                        <QualRow rank="2nd" rankColor="text-slate-500" team={second} />
                        {thirdTeam ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className={`text-[9px] font-bold w-5 shrink-0 ${thirdQualified ? 'text-sky-400' : 'text-slate-600'}`}>3rd</span>
                            <span className="text-base shrink-0">{thirdTeam.flag}</span>
                            <div className="min-w-0">
                              <div className={`font-medium truncate ${thirdsSeeded && !thirdQualified ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{thirdTeam.name}</div>
                              <div className="text-[9px] text-slate-500 truncate">
                                {thirdsSeeded && !thirdQualified ? 'Eliminated' : getPoolOwnerName(thirdTeam.poolId)}
                              </div>
                            </div>
                            {thirdQualified && <span className="text-sky-400 text-[9px] font-bold shrink-0">★</span>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[9px] font-bold w-5 shrink-0 text-slate-600">3rd</span>
                            <span className="text-[10px] text-slate-600 italic">TBD</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <RoundSection title="Round of 32 (M73–M88)" matches={tournamentResults.matchesR32} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
              <RoundSection title="Round of 16 (M89–M96)" matches={tournamentResults.matchesR16} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
              <RoundSection title="Quarter-Finals" matches={tournamentResults.matchesQF} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" />
              <RoundSection title="Semi-Finals" matches={tournamentResults.matchesSF} cols="grid-cols-1 sm:grid-cols-2" />

              {/* 3rd Place + Final */}
              <section>
                <h4 className="text-xs uppercase tracking-[0.15em] font-bold text-slate-400 mb-3">Final Matches</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MatchCard match={tournamentResults.matchThird} accent={false} />
                  <MatchCard match={tournamentResults.matchFinal} accent={true} />
                </div>
              </section>
            </div>
          );
        })()}

        {/* Footer: App summary, Fairness notice, Disclaimer */}
        <footer className="mt-12 space-y-4">
          {/* App summary */}
          <section className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl shrink-0">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300">About This App</h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                The <strong className="text-white">FMG World Cup 2026 Sweepstakes</strong> splits 48 teams across 8 balanced pools — one pool per player. Each pool is carefully constructed to give every participant a fair shot: 6 teams from 6 unique groups, balanced across bracket halves. Players are randomly assigned a pool. The app tracks match results and rewards the top three finishers.
              </p>
            </div>
          </section>

          {/* Fairness Guarantee Notice */}
          <section className="bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-indigo-300">Mathematical Fairness Blueprint Activated</h3>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                Each pool contains exactly <strong className="text-white">6 teams</strong> from <strong className="text-white">6 unique groups</strong>, split <strong className="text-white">3-3 between Left &amp; Right bracket halves</strong>. Pools follow the real 2026 World Cup bracket. Pool mates are kept in different bracket quarters where possible, meaning most can only meet in the Semi-finals or Final.
              </p>
            </div>
          </section>

          {/* Disclaimer */}
          <section className="bg-slate-800/30 border border-slate-700/40 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-start">
            <img src={kfcLogo} alt="KFC" className="w-14 h-6 object-contain shrink-0 mt-0.5" />
            <p className="text-slate-500 text-xs leading-relaxed">
              <strong className="text-slate-400">Friendly use only.</strong> A lighthearted sweepstakes crafted with FriedChicken love — built for casual fun among friends. Live match results are kept up to date when the bot is running; for matches yet to be played, hit Simulate to preview what might unfold. Play at your own risk and enjoy every kick! ⚽
            </p>
          </section>
        </footer>

      </main>
    </div>
  );
}