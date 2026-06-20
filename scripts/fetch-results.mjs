#!/usr/bin/env node
/**
 * scripts/fetch-results.mjs
 *
 * Fetches FIFA World Cup 2026 match results and writes src/actualResults.json
 * in the format expected by the bracket app.
 *
 * PRIMARY source:  unofficial FIFA API (api.fifa.com) — no key needed
 * FALLBACK source: unofficial ESPN API  (site.api.espn.com) — no key needed
 *
 * Usage (from repo root, requires Node 18+):
 *   node scripts/fetch-results.mjs
 *
 * After running, restart `npm run dev` or run `npm run build` to pick up the
 * new file (Vite bundles it at build time).
 *
 * ─── OUTPUT FORMAT ────────────────────────────────────────────────────────────
 * {
 *   "groups": {
 *     "A": ["mexico", "south-africa", "south-korea", "czechia"],  // 1st→4th
 *     "B": null,    // null = not yet decided
 *     ...
 *   },
 *   "thirdSlots": {
 *     "M74": "some-team",   // which 3rd-placer fills the bye slot in M74
 *     ...
 *   },
 *   "winners": {
 *     "M73": "mexico",   // winning team of each knockout match
 *     ...
 *   }
 * }
 *
 * ─── IF THE SCRIPT FAILS ──────────────────────────────────────────────────────
 * Hand-edit src/actualResults.json directly. All team references use the
 * kebab-case IDs from src/teams.js (e.g. "south-korea", "united-states").
 * Leave null for any match that has not been played yet.
 */

import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/actualResults.json');

// ─── Team display name → our kebab-case ID ────────────────────────────────────
const NAME_TO_ID = {
  'Algeria': 'algeria',
  'Argentina': 'argentina',
  'Australia': 'australia',
  'Austria': 'austria',
  'Belgium': 'belgium',
  'Bosnia and Herzegovina': 'bosnia-and-herzegovina',
  'Bosnia & Herzegovina': 'bosnia-and-herzegovina',
  'Brazil': 'brazil',
  'Cabo Verde': 'cape-verde',
  'Cape Verde': 'cape-verde',
  'Canada': 'canada',
  'Colombia': 'colombia',
  'Croatia': 'croatia',
  'Congo DR': 'dr-congo',
  'DR Congo': 'dr-congo',
  'Curaçao': 'curacao',
  'Curacao': 'curacao',
  'Czechia': 'czechia',
  'Czech Republic': 'czechia',
  'Ecuador': 'ecuador',
  'Egypt': 'egypt',
  'England': 'england',
  'France': 'france',
  'Germany': 'germany',
  'Ghana': 'ghana',
  'Haiti': 'haiti',
  'IR Iran': 'iran',
  'Iran': 'iran',
  'Iraq': 'iraq',
  "Côte d'Ivoire": 'ivory-coast',
  "Cote d'Ivoire": 'ivory-coast',
  'Ivory Coast': 'ivory-coast',
  'Japan': 'japan',
  'Jordan': 'jordan',
  'Korea Republic': 'south-korea',
  'South Korea': 'south-korea',
  'Mexico': 'mexico',
  'Morocco': 'morocco',
  'Netherlands': 'netherlands',
  'New Zealand': 'new-zealand',
  'Norway': 'norway',
  'Panama': 'panama',
  'Paraguay': 'paraguay',
  'Portugal': 'portugal',
  'Qatar': 'qatar',
  'Saudi Arabia': 'saudi-arabia',
  'Scotland': 'scotland',
  'Senegal': 'senegal',
  'South Africa': 'south-africa',
  'Spain': 'spain',
  'Sweden': 'sweden',
  'Switzerland': 'switzerland',
  'Tunisia': 'tunisia',
  'Türkiye': 'turkiye',
  'Turkey': 'turkiye',
  'United States': 'united-states',
  'USA': 'united-states',
  'Uruguay': 'uruguay',
  'Uzbekistan': 'uzbekistan',
};

// Official FIFA match number → our bracket label.
// Group stage = matches 1–72. Knockout stage = 73–104.
function matchNumToLabel(num) {
  if (num >= 73 && num <= 96) return `M${num}`;
  if (num === 97) return 'QF1';
  if (num === 98) return 'QF2';
  if (num === 99) return 'QF3';
  if (num === 100) return 'QF4';
  if (num === 101) return 'SF1';
  if (num === 102) return 'SF2';
  if (num === 103) return '3rd';
  if (num === 104) return 'Final';
  return null;
}

function toId(name) {
  if (!name) return null;
  return NAME_TO_ID[name] ?? NAME_TO_ID[name.trim()] ?? null;
}

// ─── Empty template (mirrors src/actualResults.json) ─────────────────────────
function emptyResults() {
  const groups = Object.fromEntries('ABCDEFGHIJKL'.split('').map(g => [g, null]));
  const groupsComplete = Object.fromEntries('ABCDEFGHIJKL'.split('').map(g => [g, false]));
  const thirdSlots = Object.fromEntries(
    ['M74','M77','M79','M80','M81','M82','M85','M87'].map(l => [l, null])
  );
  const winners = Object.fromEntries(
    ['M73','M74','M75','M76','M77','M78','M79','M80',
     'M81','M82','M83','M84','M85','M86','M87','M88',
     'M89','M90','M91','M92','M93','M94','M95','M96',
     'QF1','QF2','QF3','QF4','SF1','SF2','3rd','Final']
    .map(l => [l, null])
  );
  const matchDates = Object.fromEntries(
    ['M73','M74','M75','M76','M77','M78','M79','M80',
     'M81','M82','M83','M84','M85','M86','M87','M88',
     'M89','M90','M91','M92','M93','M94','M95','M96',
     'QF1','QF2','QF3','QF4','SF1','SF2','3rd','Final']
    .map(l => [l, null])
  );
  return { groups, groupsComplete, thirdSlots, winners, matchDates };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIFA unofficial API
// Docs: none (unofficial). Competition 17 = FIFA World Cup™.
// Season ID is discovered automatically from the first WC match found on opening day.
// Hard-coded fallback in case the discovery request also fails.
// ─────────────────────────────────────────────────────────────────────────────
const FIFA_WC_SEASON_FALLBACK = '285023'; // 2026 FIFA World Cup season ID
const FIFA_WC_OPEN_DATE = '2026-06-11';   // first match day — update for future editions

async function discoverFIFASeasonId() {
  // Fetch a 3-day window around the WC opening day to find numbered WC matches
  const url = `https://api.fifa.com/api/v3/calendar/matches` +
    `?count=100&language=en-GB&from=${FIFA_WC_OPEN_DATE}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`discovery ${res.status}`);
  const data = await res.json();
  const matches = data?.Results ?? [];
  // WC group-stage matches always have MatchNumber set (1-72)
  const wcMatch = matches.find(m => m.MatchNumber !== null && m.MatchNumber >= 1 && m.MatchNumber <= 72);
  if (!wcMatch?.IdSeason) throw new Error('no WC group-stage match found near opening day');
  return wcMatch.IdSeason;
}

async function fetchFIFAMatches() {
  let seasonId = FIFA_WC_SEASON_FALLBACK;
  try {
    seasonId = await discoverFIFASeasonId();
    console.log(`   Discovered season ID: ${seasonId}`);
  } catch (err) {
    console.log(`   Season discovery failed (${err.message}), using fallback ${seasonId}`);
  }

  const url = `https://api.fifa.com/api/v3/calendar/matches` +
    `?idSeason=${seasonId}&count=200&language=en-GB`;

  console.log(`  FIFA API: ${url}`);
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`FIFA API ${res.status} ${res.statusText}`);
  return res.json();
}

function getFifaTeamName(teamObj) {
  return teamObj?.TeamName?.find(n => n.Locale === 'en-GB')?.Description ?? null;
}

function parseFIFAResults(data) {
  // FIFA API returns: { Results: [ match, ... ] }
  const matches = data?.Results ?? [];
  if (!matches.length) throw new Error('FIFA API returned 0 matches');

  const out = emptyResults();

  // Group standings: accumulate W/D/L/GF/GA per team per group, plus match count
  const groupStats = {}; // { 'A': { 'mexico': {pts,gd,gf,matchesPlayed}, ... } }
  const groupMatchCounts = {}; // { 'A': { played: n, total: 6 } }

  for (const m of matches) {
    const num = m.MatchNumber;
    const homeName = getFifaTeamName(m.Home);
    const awayName = getFifaTeamName(m.Away);
    const homeId = toId(homeName);
    const awayId = toId(awayName);
    const homeScore = m.HomeTeamScore ?? null;
    const awayScore = m.AwayTeamScore ?? null;
    const played = homeScore !== null && awayScore !== null;

    // Determine winner: use Home/Away IdTeam match against m.Winner (handles penalties)
    const winnerFifaId = m.Winner ?? null;
    const homeTeamFifaId = m.Home?.IdTeam;
    const awayTeamFifaId = m.Away?.IdTeam;
    let winnerId = null;
    if (played) {
      if (homeScore > awayScore) winnerId = homeId;
      else if (awayScore > homeScore) winnerId = awayId;
      else if (winnerFifaId) {
        // Penalty shootout: use the Winner field
        if (String(winnerFifaId) === String(homeTeamFifaId)) winnerId = homeId;
        else if (String(winnerFifaId) === String(awayTeamFifaId)) winnerId = awayId;
      }
    }

    // Group stage
    const groupDesc = m.GroupName?.find(n => n.Locale === 'en-GB')?.Description ?? '';
    const groupLetter = groupDesc.match(/Group\s+([A-L])/i)?.[1]?.toUpperCase() ?? null;

    if (groupLetter && num >= 1 && num <= 72) {
      if (!groupStats[groupLetter]) groupStats[groupLetter] = {};
      if (!groupMatchCounts[groupLetter]) groupMatchCounts[groupLetter] = { played: 0, total: 6 };

      const addTeam = (id, gf, ga) => {
        if (!id) return;
        if (!groupStats[groupLetter][id])
          groupStats[groupLetter][id] = { pts: 0, gd: 0, gf: 0, matchesPlayed: 0 };
        if (!played || gf === null || ga === null) return;
        const s = groupStats[groupLetter][id];
        s.gf += gf;
        s.gd += gf - ga;
        s.matchesPlayed += 1;
        if (gf > ga) s.pts += 3;
        else if (gf === ga) s.pts += 1;
      };
      addTeam(homeId, homeScore, awayScore);
      addTeam(awayId, awayScore, homeScore);
      if (played) groupMatchCounts[groupLetter].played += 1;
    }

    // Knockout stage winners + match dates
    const label = matchNumToLabel(num);
    if (label) {
      if (played && winnerId && label in out.winners) {
        out.winners[label] = winnerId;
      }
      // Capture UTC kick-off time (TimeDefined=true means the time is set)
      if (m.Date && label in out.matchDates) {
        out.matchDates[label] = m.Date;
      }
    }
  }

  // Sort each group by current standings (points → GD → GF) and populate out.groups.
  // Partial standings are written too — they reflect the live order, will firm up
  // as more matches are played. groupsComplete[letter] flips to true once all 6
  // matches in the group are played (downstream: R32 seeding gates on this).
  for (const [letter, teams] of Object.entries(groupStats)) {
    const counts = groupMatchCounts[letter];
    const sorted = Object.entries(teams)
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    if (sorted.length === 4) {
      out.groups[letter] = sorted.map(t => t.id);
      out.groupsComplete[letter] = !!counts && counts.played >= 6;
    }
  }

  // Derive thirdSlots from R32 match data + group standings:
  // In each bye-slot R32 match, Team A = 1st of some group, Team B = the third-placer.
  const THIRD_SLOT_FIRST_GROUP = {
    M74: 'E', M77: 'I', M79: 'A', M80: 'L',
    M81: 'D', M82: 'G', M85: 'B', M87: 'K',
  };
  for (const m of matches) {
    const num = m.MatchNumber;
    const slot = `M${num}`;
    if (!(slot in THIRD_SLOT_FIRST_GROUP)) continue;
    const firstGroup = THIRD_SLOT_FIRST_GROUP[slot];
    const firstId = out.groups[firstGroup]?.[0];
    const homeId = toId(getFifaTeamName(m.Home));
    const awayId = toId(getFifaTeamName(m.Away));
    if (firstId && homeId && awayId) {
      // The team that isn't 1st of the group is the 3rd-placer bye slot filler
      const thirdPlacer = homeId === firstId ? awayId : homeId;
      out.thirdSlots[slot] = thirdPlacer;
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// ESPN unofficial API fallback
// Standings: https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings
// Schedule:  https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/schedule
// ─────────────────────────────────────────────────────────────────────────────
async function fetchESPNStandings() {
  const url = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
  console.log(`  ESPN standings: ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`ESPN standings ${res.status}`);
  return res.json();
}

async function fetchESPNSchedule() {
  // Fetch a wide date range covering the full 2026 World Cup
  const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/schedule' +
    '?limit=200&dates=20260611-20260719';
  console.log(`  ESPN schedule: ${url}`);
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`ESPN schedule ${res.status}`);
  return res.json();
}

function parseESPNResults(standingsData, scheduleData) {
  const out = emptyResults();

  // ── Group standings ───────────────────────────────────────────────────────
  const groups = standingsData?.groups ?? standingsData?.children ?? [];
  for (const grp of groups) {
    const nameParts = (grp.name ?? grp.abbreviation ?? '').toUpperCase();
    const letter = nameParts.match(/GROUP\s*([A-L])/)?.[1]
      ?? nameParts.match(/^([A-L])$/)?.[1]
      ?? null;
    if (!letter) continue;

    const entries = grp.standings?.entries ?? grp.entries ?? [];
    if (entries.length < 4) continue;

    // ESPN returns entries in standing order (1st→4th)
    const ids = entries.map(e => {
      const displayName = e.team?.displayName ?? e.team?.name ?? '';
      return toId(displayName);
    });
    if (ids.length === 4 && ids.every(Boolean)) {
      out.groups[letter] = ids;
    }
  }

  // ── Knockout match winners from schedule ──────────────────────────────────
  // ESPN schedule events have a `name` like "Mexico vs South Africa"
  // and `competitions[0].competitors` with home/away + winner info.
  const events = [
    ...(scheduleData?.events ?? []),
    ...(scheduleData?.leagues?.[0]?.events ?? []),
  ];
  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const competitors = comp.competitors ?? [];
    if (competitors.length !== 2) continue;

    // Only include completed matches
    const status = comp.status?.type?.name ?? event.status?.type?.name ?? '';
    if (!status.toLowerCase().includes('final') && !status.toLowerCase().includes('post')) continue;

    const home = competitors.find(c => c.homeAway === 'home');
    const away = competitors.find(c => c.homeAway === 'away');
    if (!home || !away) continue;

    const homeId = toId(home.team?.displayName ?? '');
    const awayId = toId(away.team?.displayName ?? '');
    const homeScore = parseInt(home.score ?? '-1', 10);
    const awayScore = parseInt(away.score ?? '-1', 10);
    if (!homeId || !awayId || homeScore < 0 || awayScore < 0) continue;

    // Try to find the match label from the event's round/note
    const note = (event.note ?? event.name ?? '').toLowerCase();
    const round = (event.competitions?.[0]?.notes?.[0]?.headline ?? '').toLowerCase();

    // Map by round name + determine which M-label by team matchup
    // This is approximate; group matches are skipped (handled by standings).
    // For knockouts, ESPN usually includes the round name.
    // We attempt a direct winner lookup if we can't match by label.
    if (note.includes('round of 32') || round.includes('round of 32')) {
      // Find which R32 label matches these two teams
      const r32Labels = ['M73','M74','M75','M76','M77','M78','M79','M80',
                          'M81','M82','M83','M84','M85','M86','M87','M88'];
      // We'll fill these in during a second pass once groups are known
    }

    // For later rounds, set winner by matching team names to a known match
    const winnerId = homeScore > awayScore ? homeId : awayScore > homeScore ? awayId : null;
    if (winnerId) {
      // Store match result keyed by [homeId, awayId] for later bracket mapping
      event._homeId = homeId;
      event._awayId = awayId;
      event._winnerId = winnerId;
    }
  }

  // Second pass: map completed ESPN events to bracket labels using group standings
  // (This is best-effort; the FIFA API path is more reliable)
  console.log('  ESPN bracket label mapping is best-effort. Use FIFA API for complete knockout data.');

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌍 Fetching FIFA World Cup 2026 results…\n');

  let results = null;
  let source = '';

  // ── Try FIFA API first ────────────────────────────────────────────────────
  try {
    console.log('1. Trying FIFA API…');
    const data = await fetchFIFAMatches();
    results = parseFIFAResults(data);
    source = 'FIFA API';
    console.log('   ✅ FIFA API OK');
  } catch (err) {
    console.warn(`   ⚠️  FIFA API failed: ${err.message}`);
    console.log('      If this keeps failing, update FIFA_SEASON_ID in this script.');
    console.log('      Discover current season ID from:');
    console.log('      https://api.fifa.com/api/v3/competition/season?idCompetition=17&count=10&language=en-GB\n');
  }

  // ── Fallback to ESPN ──────────────────────────────────────────────────────
  if (!results) {
    try {
      console.log('2. Trying ESPN API fallback…');
      const [standings, schedule] = await Promise.all([
        fetchESPNStandings(),
        fetchESPNSchedule(),
      ]);
      results = parseESPNResults(standings, schedule);
      source = 'ESPN API';
      console.log('   ✅ ESPN API OK (group standings only; knockout results may need manual entry)');
    } catch (err) {
      console.warn(`   ⚠️  ESPN API failed: ${err.message}`);
    }
  }

  if (!results) {
    console.error('\n❌ Both APIs failed. Edit src/actualResults.json manually.');
    console.error('   Format reference: see the _comment/_format fields in that file.\n');
    process.exit(1);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const groupsWithStandings = Object.values(results.groups).filter(Boolean).length;
  const groupsComplete = Object.values(results.groupsComplete).filter(Boolean).length;
  const decidedWinners = Object.values(results.winners).filter(Boolean).length;
  const decidedThirds = Object.values(results.thirdSlots).filter(Boolean).length;

  console.log(`\n📊 Results summary (source: ${source}):`);
  console.log(`   Groups with standings:    ${groupsWithStandings}/12 (${groupsComplete} fully decided)`);
  console.log(`   Third-place slots filled: ${decidedThirds}/8`);
  console.log(`   Knockout winners:        ${decidedWinners}/32`);

  // ── Merge with existing file (preserve any manually set nulls → non-null) ─
  let existing = emptyResults();
  try {
    const raw = JSON.parse(readFileSync(OUT, 'utf-8'));
    existing = {
      groups: raw.groups ?? {},
      groupsComplete: raw.groupsComplete ?? {},
      thirdSlots: raw.thirdSlots ?? {},
      winners: raw.winners ?? {},
      matchDates: raw.matchDates ?? {},
    };
  } catch { /* file missing or malformed, start fresh */ }

  const merged = {
    _comment: "Real (played) World Cup 2026 results. Run `npm run fetch-results` to auto-update, or hand-edit this file. All team references use kebab-case IDs from src/teams.js.",
    _format: {
      fetchedAt: "ISO timestamp of the last successful `npm run fetch-results` run. Displayed in the Bracket tab.",
      groups: "Per-group standings as an ordered array [1st, 2nd, 3rd, 4th] of team IDs by current points/GD/GF. May be partial while the group is still in progress; firms up as matches are played.",
      groupsComplete: "Per-group boolean — true once all 6 of that group's matches are played. R32 seeding only uses `groups[X]` when groupsComplete[X] is true.",
      thirdSlots: "Which qualified 3rd-place team fills each of the 8 'bye' Round-of-32 slots (team B of those matches). The 8 values are the thirds that advanced. Use null until seeded.",
      winners: "Winning team ID for each knockout match actually played (labels M73-M88, M89-M96, QF1-QF4, SF1, SF2, 3rd, Final). Use null until the match is played.",
      matchDates: "UTC ISO kick-off time for each knockout match (auto-populated from FIFA API). Used for display purposes only."
    },
    fetchedAt: new Date().toISOString(),
    groups: Object.fromEntries(
      Object.keys(existing.groups).map(k => [k, results.groups[k] ?? existing.groups[k] ?? null])
    ),
    groupsComplete: Object.fromEntries(
      'ABCDEFGHIJKL'.split('').map(k => [k, results.groupsComplete[k] ?? existing.groupsComplete?.[k] ?? false])
    ),
    thirdSlots: Object.fromEntries(
      Object.keys(existing.thirdSlots).map(k => [k, results.thirdSlots[k] ?? existing.thirdSlots[k] ?? null])
    ),
    winners: Object.fromEntries(
      Object.keys(existing.winners).map(k => [k, results.winners[k] ?? existing.winners[k] ?? null])
    ),
    matchDates: Object.fromEntries(
      Object.keys(emptyResults().matchDates).map(k => [k, results.matchDates[k] ?? existing.matchDates[k] ?? null])
    ),
  };

  writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`\n✅ Written to ${OUT}`);
  console.log('   Restart `npm run dev` or run `npm run build` to pick up the changes.\n');

  // Warn about any gaps that likely need manual entry
  const nullGroups = Object.entries(merged.groups).filter(([,v]) => !v).map(([k]) => k);
  if (nullGroups.length) {
    console.log(`⚠️  Groups still null (not yet decided or not fetched): ${nullGroups.join(', ')}`);
    console.log('   Hand-edit src/actualResults.json for those groups.\n');
  }
  const nullThirds = Object.entries(merged.thirdSlots).filter(([,v]) => !v).map(([k]) => k);
  if (nullThirds.length && groupsComplete > 0) {
    console.log(`⚠️  Third-place slots still null: ${nullThirds.join(', ')}`);
    console.log('   These are filled by FIFA after the group stage ends.\n');
  }
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
