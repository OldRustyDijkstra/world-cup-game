import { useState, useEffect } from 'react';
import { Shuffle, Award, ShieldCheck, Layers, HelpCircle, Share2, RefreshCw, Trophy } from 'lucide-react';
import { simulateTournament } from './BracketSimulator.jsx';
import { TEAMS } from './teams';
import { POOLS } from './pools';
import { fetchFifaRankings } from './fifaRankings';

// ==========================================
// DATA STRUCTURES
// ==========================================

const TEAMS_BY_ID = Object.fromEntries(TEAMS.map((team) => [team.id, team]));
const POOLS_DATA = POOLS.map((pool) => ({
  ...pool,
  teams: pool.teams.map((teamId) => TEAMS_BY_ID[teamId]).filter(Boolean)
}));
const POOL_IDS = POOLS_DATA.map((pool) => pool.id);

const INITIAL_PLAYERS = [
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
    try { return JSON.parse(localStorage.getItem('wc26_hasAssigned')) ?? false; }
    catch { return false; }
  });
  const [activeTab, setActiveTab] = useState('pools'); // 'pools' | 'dashboard' | 'scoring' | 'bracket'
  const PRIZES = { first: 25, second: 10, third: 5 };
  const TOTAL_POT = PRIZES.first + PRIZES.second + PRIZES.third;
  const [tournamentResults, setTournamentResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wc26_tournamentResults')); }
    catch { return null; }
  });
  const [exportFeedback, setExportFeedback] = useState('');

  // FIFA rankings: { [teamId]: points } | null
  const [fifaRankings, setFifaRankings] = useState(() => {
    try {
      const stored = localStorage.getItem('wc26_fifaRankings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.rankings && typeof parsed.rankings === 'object') return parsed.rankings;
      }
    } catch {}
    return null;
  });
  const [rankingsStatus, setRankingsStatus] = useState('idle'); // 'idle' | 'loading' | 'error'

  // Persist FIFA rankings to localStorage whenever they change
  useEffect(() => {
    if (fifaRankings) {
      localStorage.setItem(
        'wc26_fifaRankings',
        JSON.stringify({ fetchedAt: new Date().toISOString(), rankings: fifaRankings })
      );
    }
  }, [fifaRankings]);

  // Auto-fetch FIFA rankings on first load if not cached
  useEffect(() => {
    if (!fifaRankings) handleFetchRankings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to localStorage — skip player sync during animation to avoid saving transient state
  useEffect(() => {
    if (!isShuffling) localStorage.setItem('wc26_players', JSON.stringify(players));
  }, [players, isShuffling]);
  useEffect(() => {
    localStorage.setItem('wc26_hasAssigned', JSON.stringify(hasAssigned));
  }, [hasAssigned]);
  useEffect(() => {
    localStorage.setItem('wc26_tournamentResults', JSON.stringify(tournamentResults));
  }, [tournamentResults]);

  // ==========================================
  // FIFA RANKINGS
  // ==========================================
  const handleFetchRankings = async () => {
    setRankingsStatus('loading');
    try {
      const rankings = await fetchFifaRankings();
      setFifaRankings(rankings);
      setRankingsStatus('idle');
    } catch {
      setRankingsStatus('error');
    }
  };

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

      // Run tournament simulation and store top-3 results
      const results = simulateTournament(POOLS_DATA);
      setTournamentResults(results);
    }, 2000);
  };

  const resetDraft = () => {
    setPlayers(prev => prev.map(p => ({ ...p, poolId: null, points: 0 })));
    setTournamentResults(null);
    setExportFeedback('');
    setHasAssigned(false);
    setActiveTab('pools');
  };

  const handleNameChange = (playerId, newName) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, name: newName } : p));
  };

  const getPoolOwnerName = (poolId) => {
    return players.find((player) => player.poolId === poolId)?.name ?? 'Unassigned';
  };

  const buildResultSummary = () => {
    if (!tournamentResults) {
      return 'No tournament results are available yet.';
    }

    const lines = [
      'World Cup 2026 Slip-Pick Results',
      '',
      `1st Place: ${tournamentResults.champion.name} ${tournamentResults.champion.flag} - ${getPoolOwnerName(tournamentResults.champion.poolId)} - $${PRIZES.first}`,
      `2nd Place: ${tournamentResults.runnerUp.name} ${tournamentResults.runnerUp.flag} - ${getPoolOwnerName(tournamentResults.runnerUp.poolId)} - $${PRIZES.second}`,
      `3rd Place: ${tournamentResults.third.name} ${tournamentResults.third.flag} - ${getPoolOwnerName(tournamentResults.third.poolId)} - $${PRIZES.third}`,
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
          title: 'World Cup 2026 Slip-Pick Results',
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
      link.download = 'world-cup-slip-pick-results.txt';
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
              World Cup 2026
            </span>
            <h1 className="text-3xl font-black tracking-tight mt-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
              ⚽ SLIP-PICK Bracket Balancer
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
            ) : (
              <button
                onClick={resetDraft}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-medium px-4 py-2 rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Redraw Pools
              </button>
            )}
          </div>
        </div>
      </header>

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
                    <span>${PRIZES.first}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Runner-up</span>
                    <span>${PRIZES.second}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Third</span>
                    <span>${PRIZES.third}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Player name setup */}
            <div className="mt-6">
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
                onClick={() => setActiveTab('pools')}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-medium px-6 py-3 rounded-xl transition-all"
              >
                <Layers className="w-4 h-4" /> Preview Pools
              </button>
            </div>
          </section>
        )}

        {/* Fairness Guarantee Notice */}
        <section className="bg-gradient-to-br from-indigo-950 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-start">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
              Mathematical Fairness Blueprint Activated
            </h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Each pool contains exactly <strong className="text-white">6 teams</strong> from <strong className="text-white">6 unique groups</strong>, split <strong className="text-white">3-3 between Left &amp; Right bracket halves</strong>. Pools follow the real 2026 World Cup bracket — only match results are simulated at random. Pool mates are kept in different bracket quarters where possible, meaning most can only meet in the Semi-finals or Final.
            </p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-800 mb-6 gap-1">
          <button
            onClick={() => setActiveTab('pools')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'pools' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-4 h-4 inline mr-2" /> Pre-Configured Pools
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Award className="w-4 h-4 inline mr-2" /> Player Dashboards & Standings
          </button>
          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'bracket' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Trophy className="w-4 h-4 inline mr-2" /> Bracket
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'scoring' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <HelpCircle className="w-4 h-4 inline mr-2" /> Scoring Rules
          </button>
        </div>

        {/* TAB 1: THE POOLS DISPLAY */}
        {activeTab === 'pools' && (
          <div>
            {/* Rankings status bar + refresh button */}
            <div className="flex items-center justify-between mb-4">
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
                  <span className="text-slate-500">FIFA ranking points shown per team.</span>
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
                              <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{team.half[0]}H</span>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Prize Winners */}
                <div className="lg:col-span-1 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-700 shadow-xl h-fit">
                  <h3 className="text-lg font-bold text-white mb-4">🏅 Prize Winners</h3>
                  {!tournamentResults ? (
                    <p className="text-slate-400 text-sm">Prizes will be awarded after drawing slips.</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="font-semibold text-amber-400">1st — ${PRIZES.first}</div>
                        <div className="text-slate-300">{tournamentResults.champion.name} • {tournamentResults.champion.flag}</div>
                        <div className="text-slate-400 text-xs">Owned by: {getPoolOwnerName(tournamentResults.champion.poolId)}</div>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="font-semibold text-slate-300">2nd — ${PRIZES.second}</div>
                        <div className="text-slate-300">{tournamentResults.runnerUp.name} • {tournamentResults.runnerUp.flag}</div>
                        <div className="text-slate-400 text-xs">Owned by: {getPoolOwnerName(tournamentResults.runnerUp.poolId)}</div>
                      </div>

                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="font-semibold text-slate-300">3rd — ${PRIZES.third}</div>
                        <div className="text-slate-300">{tournamentResults.third.name} • {tournamentResults.third.flag}</div>
                        <div className="text-slate-400 text-xs">Owned by: {getPoolOwnerName(tournamentResults.third.poolId)}</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleExportResults}
                    className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 py-2 rounded-xl transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Export Results Sheet
                  </button>
                  {exportFeedback && (
                    <p className="mt-2 text-xs text-slate-400">{exportFeedback}</p>
                  )}
                </div>

                {/* Individual Cards Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {players.map((player) => {
                    const pool = POOLS_DATA.find(p => p.id === player.poolId);
                    const avgPts = pool ? getPoolAvgPoints(pool) : null;
                    return (
                      <div key={player.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:border-slate-600">
                        <div>
                          <div className="flex justify-between items-start border-b border-slate-700 pb-3 mb-3">
                            <div>
                              <input
                                type="text"
                                value={player.name}
                                onChange={(e) => handleNameChange(player.id, e.target.value)}
                                className="font-black text-lg text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-amber-500 focus:outline-none w-full transition-all"
                              />
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
            )}
          </div>
        )}

        {/* TAB 3: PRIZE RULES */}
        {activeTab === 'scoring' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4">🏆 Prize Rules</h3>
            <p className="text-slate-400 text-sm mb-4">This app awards prizes to the owners of the top three teams after a simulated tournament run.</p>
            <ul className="list-disc ml-5 text-slate-300">
              <li>1st place: ${PRIZES.first}</li>
              <li>2nd place: ${PRIZES.second}</li>
              <li>3rd place: ${PRIZES.third}</li>
            </ul>
          </div>
        )}

        {/* TAB 4: BRACKET / MATCH RESULTS */}
        {activeTab === 'bracket' && (() => {
          const hasBracketData = tournamentResults?.matchesR32
            && tournamentResults?.matchesR16
            && tournamentResults?.matchesQF
            && tournamentResults?.matchesSF
            && tournamentResults?.matchThird
            && tournamentResults?.matchFinal;

          const TeamRow = ({ team, isWinner }) => (
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

          const MatchCard = ({ match, accent }) => (
            <div className={`bg-slate-800/60 border rounded-xl p-3 flex flex-col gap-1 ${accent ? 'border-amber-500/30' : 'border-slate-700/60'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono font-semibold text-slate-400">{match.label}</span>
              </div>
              <TeamRow team={match.teamA} isWinner={match.winner === match.teamA} />
              <div className="text-center text-[10px] text-slate-600 font-semibold tracking-widest">VS</div>
              <TeamRow team={match.teamB} isWinner={match.winner === match.teamB} />
            </div>
          );

          const RoundSection = ({ title, matches, cols = 'grid-cols-2 sm:grid-cols-4', accent = false }) => (
            <section>
              <h4 className="text-xs uppercase tracking-[0.15em] font-bold text-slate-400 mb-3">{title}</h4>
              <div className={`grid ${cols} gap-3`}>
                {matches.map((m) => <MatchCard key={m.label} match={m} accent={accent} />)}
              </div>
            </section>
          );

          if (!tournamentResults) {
            return (
              <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-400">No Bracket Yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                  Click "Draw Pools" to simulate the tournament and see the full bracket here.
                </p>
              </div>
            );
          }

          if (!hasBracketData) {
            return (
              <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                <RefreshCw className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-400">Outdated Simulation</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                  Click "Redraw Pools" to re-run the simulation and unlock the full match breakdown.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-8">
              {/* Group Stage */}
              <section>
                <h4 className="text-xs uppercase tracking-[0.15em] font-bold text-slate-400 mb-3">Group Stage — Qualifiers (1st, 2nd + best 8 of 12 third-place ★)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {tournamentResults.groupStage.map(({ group, first, second, third: thirdTeam, thirdQualified }) => (
                    <div key={group} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-amber-400 mb-2 uppercase tracking-wide">Group {group}</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[9px] text-emerald-400 font-bold w-5 shrink-0">1st</span>
                          <span className="text-base shrink-0">{first.flag}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-200 truncate">{first.name}</div>
                            <div className="text-[9px] text-slate-500 truncate">{getPoolOwnerName(first.poolId)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[9px] text-slate-500 font-bold w-5 shrink-0">2nd</span>
                          <span className="text-base shrink-0">{second.flag}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-300 truncate">{second.name}</div>
                            <div className="text-[9px] text-slate-500 truncate">{getPoolOwnerName(second.poolId)}</div>
                          </div>
                        </div>
                        {thirdTeam && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className={`text-[9px] font-bold w-5 shrink-0 ${thirdQualified ? 'text-sky-400' : 'text-slate-600'}`}>3rd</span>
                            <span className="text-base shrink-0">{thirdTeam.flag}</span>
                            <div className="min-w-0">
                              <div className={`font-medium truncate ${thirdQualified ? 'text-slate-300' : 'text-slate-500 line-through'}`}>{thirdTeam.name}</div>
                              <div className="text-[9px] text-slate-500 truncate">
                                {thirdQualified ? getPoolOwnerName(thirdTeam.poolId) : 'Eliminated'}
                              </div>
                            </div>
                            {thirdQualified && <span className="text-sky-400 text-[9px] font-bold shrink-0">★</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <RoundSection title="Round of 32 (M73–M88)" matches={tournamentResults.matchesR32} cols="grid-cols-2 sm:grid-cols-4" />
              <RoundSection title="Round of 16 (M89–M96)" matches={tournamentResults.matchesR16} cols="grid-cols-2 sm:grid-cols-4" />
              <RoundSection title="Quarter-Finals" matches={tournamentResults.matchesQF} cols="grid-cols-2 sm:grid-cols-4" />
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

      </main>
    </div>
  );
}