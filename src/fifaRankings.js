// Maps our kebab-case team IDs to the exact team name strings used by the FIFA API.
// Non-obvious cases: south-korea → "Korea Republic", united-states → "USA",
// iran → "IR Iran", ivory-coast → "Côte d'Ivoire", cape-verde → "Cabo Verde"
export const FIFA_NAME_MAP = {
  'mexico':                 'Mexico',
  'south-africa':           'South Africa',
  'south-korea':            'Korea Republic',
  'czechia':                'Czechia',
  'switzerland':            'Switzerland',
  'canada':                 'Canada',
  'qatar':                  'Qatar',
  'bosnia-and-herzegovina': 'Bosnia and Herzegovina',
  'brazil':                 'Brazil',
  'scotland':               'Scotland',
  'haiti':                  'Haiti',
  'morocco':                'Morocco',
  'united-states':          'USA',
  'turkiye':                'Türkiye',
  'australia':              'Australia',
  'paraguay':               'Paraguay',
  'germany':                'Germany',
  'ivory-coast':            'Côte d\'Ivoire',
  'curacao':                'Curaçao',
  'ecuador':                'Ecuador',
  'netherlands':            'Netherlands',
  'tunisia':                'Tunisia',
  'japan':                  'Japan',
  'sweden':                 'Sweden',
  'belgium':                'Belgium',
  'egypt':                  'Egypt',
  'iran':                   'IR Iran',
  'new-zealand':            'New Zealand',
  'spain':                  'Spain',
  'uruguay':                'Uruguay',
  'saudi-arabia':           'Saudi Arabia',
  'cape-verde':             'Cabo Verde',
  'france':                 'France',
  'norway':                 'Norway',
  'senegal':                'Senegal',
  'iraq':                   'Iraq',
  'argentina':              'Argentina',
  'algeria':                'Algeria',
  'austria':                'Austria',
  'jordan':                 'Jordan',
  'portugal':               'Portugal',
  'colombia':               'Colombia',
  'jamaica':                'Jamaica',
  'uzbekistan':             'Uzbekistan',
  'croatia':                'Croatia',
  'england':                'England',
  'ghana':                  'Ghana',
  'panama':                 'Panama',
};

// Inverted map: FIFA name → our team ID, used when parsing API responses.
const FIFA_NAME_TO_ID = Object.fromEntries(
  Object.entries(FIFA_NAME_MAP).map(([id, name]) => [name, id])
);

/**
 * Fetches the FIFA match-window rankings via the Vite proxy and returns
 * a map of { [teamId]: points } for all teams we track.
 *
 * Requires the Vite proxy to be active (npm run dev / npm run preview).
 * The proxy rewrites /api/fifa-ranking/* → https://inside.fifa.com/api/live-world-ranking/*
 */
export async function fetchFifaRankings() {
  const url =
    '/api/fifa-ranking/get-match-window-matches?locale=en&gender=1&rankingType=0';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`FIFA API responded with ${res.status}`);

  const data = await res.json();

  // Walk every match in every window and collect the latest points per team.
  // TeamAPointsBefore / TeamBPointsBefore are the team's FIFA points before that match.
  const teamPoints = {};
  for (const window of Object.values(data.matches ?? {})) {
    for (const match of window.MatchesList ?? []) {
      const sides = [
        { teamData: match.Home, pointsKey: 'TeamAPointsBefore' },
        { teamData: match.Away, pointsKey: 'TeamBPointsBefore' },
      ];
      for (const { teamData, pointsKey } of sides) {
        const fifaName = teamData?.TeamName?.find(
          (n) => n.Locale === 'en-GB'
        )?.Description;
        const points = match[pointsKey];
        if (fifaName && typeof points === 'number') {
          const teamId = FIFA_NAME_TO_ID[fifaName];
          if (teamId) teamPoints[teamId] = points;
        }
      }
    }
  }

  return teamPoints;
}
