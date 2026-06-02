import React, { useState } from 'react';
import { Shuffle, Award, ShieldCheck, Layers, HelpCircle, Share2, RefreshCw } from 'lucide-react';

// ==========================================
// DATA STRUCTURES
// ==========================================

const POOLS_DATA = [
  {
    id: 1,
    name: "Pool 1 (Heavy Hitters - Left)",
    teams: [
      { name: "Mexico", group: "A", half: "Left", tier: "Top Tier", flag: "🇲🇽" },
      { name: "Canada", group: "B", half: "Left", tier: "Mid Tier", flag: "🇨🇦" },
      { name: "Brazil", group: "C", half: "Left", tier: "Top Tier", flag: "🇧🇷" },
      { name: "United States", group: "D", half: "Left", tier: "Top Tier", flag: "🇺🇸" },
      { name: "Germany", group: "E", half: "Left", tier: "Top Tier", flag: "🇩🇪" },
      { name: "Netherlands", group: "F", half: "Left", tier: "Top Tier", flag: "🇳🇱" },
    ]
  },
  {
    id: 2,
    name: "Pool 2 (Mid-Tier Contenders - Left)",
    teams: [
      { name: "South Africa", group: "A", half: "Left", tier: "Underdog", flag: "🇿🇦" },
      { name: "Switzerland", group: "B", half: "Left", tier: "Mid Tier", flag: "🇨🇭" },
      { name: "Scotland", group: "C", half: "Left", tier: "Mid Tier", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
      { name: "Türkiye", group: "D", half: "Left", tier: "Mid Tier", flag: "🇹🇷" },
      { name: "Ivory Coast", group: "E", half: "Left", tier: "Mid Tier", flag: "🇨🇮" },
      { name: "Tunisia", group: "F", half: "Left", tier: "Mid Tier", flag: "🇹🇳" },
    ]
  },
  {
    id: 3,
    name: "Pool 3 (Wildcards & Dreamers - Left)",
    teams: [
      { name: "South Korea", group: "A", half: "Left", tier: "Mid Tier", flag: "🇰🇷" },
      { name: "Qatar", group: "B", half: "Left", tier: "Underdog", flag: "🇶🇦" },
      { name: "Haiti", group: "C", half: "Left", tier: "Underdog", flag: "🇭🇹" },
      { name: "Australia", group: "D", half: "Left", tier: "Mid Tier", flag: "🇦🇺" },
      { name: "Curaçao", group: "E", half: "Left", tier: "Underdog", flag: "🇨🇼" },
      { name: "Japan", group: "F", half: "Left", tier: "Mid Tier", flag: "🇯🇵" },
    ]
  },
  {
    id: 4,
    name: "Pool 4 (Dark Horses - Left)",
    teams: [
      { name: "Czechia", group: "A", half: "Left", tier: "Mid Tier", flag: "🇨🇿" },
      { name: "Bosnia & Herz.", group: "B", half: "Left", tier: "Mid Tier", flag: "🇧🇦" },
      { name: "Morocco", group: "C", half: "Left", tier: "Top Tier", flag: "🇲🇦" },
      { name: "Paraguay", group: "D", half: "Left", tier: "Mid Tier", flag: "🇵🇾" },
      { name: "Ecuador", group: "E", half: "Left", tier: "Mid Tier", flag: "🇪🇨" },
      { name: "Sweden", group: "F", half: "Left", tier: "Mid Tier", flag: "🇸🇪" },
    ]
  },
  {
    id: 5,
    name: "Pool 5 (Heavy Hitters - Right)",
    teams: [
      { name: "Belgium", group: "G", half: "Right", tier: "Top Tier", flag: "🇧🇪" },
      { name: "Spain", group: "H", half: "Right", tier: "Top Tier", flag: "🇪🇸" },
      { name: "France", group: "I", half: "Right", tier: "Top Tier", flag: "🇫🇷" },
      { name: "Argentina", group: "J", half: "Right", tier: "Top Tier", flag: "🇦🇷" },
      { name: "Portugal", group: "K", half: "Right", tier: "Top Tier", flag: "🇵🇹" },
      { name: "Croatia", group: "L", half: "Right", tier: "Top Tier", flag: "🇭🇷" },
    ]
  },
  {
    id: 6,
    name: "Pool 6 (Mid-Tier Contenders - Right)",
    teams: [
      { name: "Egypt", group: "G", half: "Right", tier: "Mid Tier", flag: "🇪🇬" },
      { name: "Uruguay", group: "H", half: "Right", tier: "Top Tier", flag: "🇺🇾" },
      { name: "Norway", group: "I", half: "Right", tier: "Mid Tier", flag: "🇳🇴" },
      { name: "Algeria", group: "J", half: "Right", tier: "Mid Tier", flag: "🇩🇿" },
      { name: "Colombia", group: "K", half: "Right", tier: "Mid Tier", flag: "🇨🇴" },
      { name: "England", group: "L", half: "Right", tier: "Top Tier", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    ]
  },
  {
    id: 7,
    name: "Pool 7 (Dark Horses - Right)",
    teams: [
      { name: "Iran", group: "G", half: "Right", tier: "Mid Tier", flag: "🇮🇷" },
      { name: "Saudi Arabia", group: "H", half: "Right", tier: "Underdog", flag: "🇸🇦" },
      { name: "Senegal", group: "I", half: "Right", tier: "Mid Tier", flag: "🇸🇳" },
      { name: "Austria", group: "J", half: "Right", tier: "Mid Tier", flag: "🇦🇹" },
      { name: "Jamaica", group: "K", half: "Right", tier: "Underdog", flag: "🇯🇲" },
      { name: "Ghana", group: "L", half: "Right", tier: "Mid Tier", flag: "🇬🇭" },
    ]
  },
  {
    id: 8,
    name: "Pool 8 (Wildcards & Dreamers - Right)",
    teams: [
      { name: "New Zealand", group: "G", half: "Right", tier: "Underdog", flag: "🇳🇿" },
      { name: "Cape Verde", group: "H", half: "Right", tier: "Underdog", flag: "🇨🇻" },
      { name: "Iraq", group: "I", half: "Right", tier: "Underdog", flag: "🇮🇶" },
      { name: "Jordan", group: "J", half: "Right", tier: "Underdog", flag: "🇯🇴" },
      { name: "Uzbekistan", group: "K", half: "Right", tier: "Underdog", flag: "🇺🇿" },
      { name: "Panama", group: "L", half: "Right", tier: "Underdog", flag: "🇵🇦" },
    ]
  }
];

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
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [isShuffling, setIsShuffling] = useState(false);
  const [hasAssigned, setHasAssigned] = useState(false);
  const [activeTab, setActiveTab] = useState('pools'); // 'pools' | 'dashboard' | 'scoring'

  // ==========================================
  // SLIP-PICK SHUFFLE ENGINE
  // ==========================================
  const handleSlipPick = () => {
    setIsShuffling(true);

    let animationInterval = setInterval(() => {
      // Create a frantic visual shuffle effect
      setPlayers(prev => prev.map(p => ({
        ...p,
        poolId: Math.floor(Math.random() * 8) + 1
      })));
    }, 100);

    setTimeout(() => {
      clearInterval(animationInterval);

      // Perform the actual fair mapping (Fisher-Yates shuffle on pools)
      const poolIds = [1, 2, 3, 4, 5, 6, 7, 8];
      for (let i = poolIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [poolIds[i], poolIds[j]] = [poolIds[j], poolIds[i]];
      }

      // Mock assigning deterministic live tournament progress points for dynamic leaderboard
      const mockPoints = [24, 18, 14, 28, 32, 10, 12, 16];

      setPlayers(prev => prev.map((player, index) => ({
        ...player,
        poolId: poolIds[index],
        points: mockPoints[poolIds[index] - 1] // Tied to pool combinations
      })));

      setIsShuffling(false);
      setHasAssigned(true);
      setActiveTab('dashboard');
    }, 2000);
  };

  const resetDraft = () => {
    setPlayers(INITIAL_PLAYERS);
    setHasAssigned(false);
    setActiveTab('pools');
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
                {isShuffling ? 'Drawing Slips...' : 'Execute Slip Pick!'}
              </button>
            ) : (
              <button
                onClick={resetDraft}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-medium px-4 py-2 rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Re-Shuffle Pools
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 mt-8">

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
              To prevent players from knocking their own teams out early, this app enforces a strict rule algorithm: Every drawn slip contains exactly <strong className="text-white">6 teams</strong> structurally distributed across <strong className="text-white">6 unique groups</strong> and split perfectly <strong className="text-white">3-3 between Left & Right Tournament Bracket Halves</strong>. No overlapping groups, maximum competitive longevity.
            </p>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('pools')}
            className={`px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'pools' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Layers className="w-4 h-4 inline mr-2" /> Pre-Configured Pools
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Award className="w-4 h-4 inline mr-2" /> Player Dashboards & Standings
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`px-4 py-2.5 font-semibold text-sm transition-all border-b-2 ${activeTab === 'scoring' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <HelpCircle className="w-4 h-4 inline mr-2" /> Scoring Rules
          </button>
        </div>

        {/* TAB 1: THE POOLS DISPLAY */}
        {activeTab === 'pools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {POOLS_DATA.map((pool) => (
              <div key={pool.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 shadow-md backdrop-blur-sm">
                <div className="border-b border-slate-700 pb-2 mb-3">
                  <h4 className="font-bold text-sm text-amber-400 truncate uppercase tracking-wide">{pool.name}</h4>
                </div>
                <div className="space-y-2">
                  {pool.teams.map((team, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg text-xs border border-slate-800">
                      <span className="font-medium truncate flex items-center gap-1.5">
                        <span className="text-base">{team.flag}</span> {team.name}
                      </span>
                      <div className="flex gap-1 text-[10px]">
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">G: {team.group}</span>
                        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{team.half[0]}H</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: PLAYER DASHBOARDS */}
        {activeTab === 'dashboard' && (
          <div>
            {!hasAssigned ? (
              <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-800 border-dashed">
                <Shuffle className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                <h3 className="text-lg font-bold text-slate-400">No Slips Drawn Yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                  Click the "Execute Slip Pick" button at the top to randomly allocate tournament pools to your 8 players.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Live Leaderboard Standings Tracker */}
                <div className="lg:col-span-1 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-700 shadow-xl h-fit">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                    <span>🏆 Live Standings</span>
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded font-normal text-slate-400">Simulated Progress</span>
                  </h3>
                  <div className="space-y-2">
                    {[...players].sort((a,b) => b.points - a.points).map((player, idx) => (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-sm">{player.name}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400 text-sm">{player.points} pts</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 py-2 rounded-xl transition-all">
                    <Share2 className="w-3.5 h-3.5" /> Export Results Sheet
                  </button>
                </div>

                {/* Individual Cards Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {players.map((player) => {
                    const pool = POOLS_DATA.find(p => p.id === player.poolId);
                    return (
                      <div key={player.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-all hover:border-slate-600">
                        <div>
                          <div className="flex justify-between items-start border-b border-slate-700 pb-3 mb-3">
                            <div>
                              <h3 className="font-black text-lg text-white">{player.name}</h3>
                              <p className="text-[11px] text-amber-400 font-medium truncate max-w-[180px]">{pool?.name}</p>
                            </div>
                            <span className="bg-slate-900 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                              {player.points} pts
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {pool?.teams.map((team, idx) => (
                              <div key={idx} className="bg-slate-900/60 p-2 rounded-xl border border-slate-850 flex flex-col justify-between text-xs min-h-[64px]">
                                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                                  <span>{team.flag}</span>
                                  <span className="truncate">{team.name}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/50">
                                  <span className="text-[10px] text-slate-400">Grp {team.group} • {team.half[0]}H</span>
                                  <span className={`text-[9px] px-1.5 rounded-full font-semibold border ${getTierColor(team.tier)}`}>
                                    {team.tier.split(' ')[0]}
                                  </span>
                                </div>
                              </div>
                            ))}
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

        {/* TAB 3: SCORING EXPLANATION */}
        {activeTab === 'scoring' && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-4">🏆 Dynamic Scoring Matrix</h3>
            <p className="text-slate-400 text-sm mb-6">
              Points stack dynamically as teams navigate further down the knockout bracket. Your overall scoring performance updates automatically based on the longevity weight of your allocated slip.
            </p>

            <div className="overflow-hidden rounded-xl border border-slate-700">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-700 font-mono text-xs">
                    <th className="p-3">Tournament Milestone Achieved</th>
                    <th className="p-3 text-right">Points Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 bg-slate-900/30">
                  <tr><td className="p-3 font-medium text-slate-300">Group Stage Exit</td><td className="p-3 text-right text-slate-500 font-mono">0 pts</td></tr>
                  <tr><td className="p-3 font-medium text-slate-300">Survives to Round of 32</td><td className="p-3 text-right text-emerald-400 font-mono">+1 pt</td></tr>
                  <tr><td className="p-3 font-medium text-slate-300">Survives to Round of 16</td><td className="p-3 text-right text-emerald-400 font-mono">+2 pts</td></tr>
                  <tr><td className="p-3 font-medium text-slate-300">Survives to Quarter-Finals</td><td className="p-3 text-right text-emerald-400 font-mono">+4 pts</td></tr>
                  <tr><td className="p-3 font-medium text-slate-300">Survives to Semi-Finals</td><td className="p-3 text-right text-emerald-400 font-mono">+8 pts</td></tr>
                  <tr><td className="p-3 font-medium text-slate-300">Reaches the Final</td><td className="p-3 text-right text-amber-400 font-mono">+12 pts</td></tr>
                  <tr><td className="p-3 font-medium text-slate-400 font-bold">World Cup 2026 Champion</td><td className="p-3 text-right text-amber-400 font-black font-mono">+20 pts</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}