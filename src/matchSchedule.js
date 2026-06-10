// 2026 FIFA World Cup knockout match kick-off times (UTC ISO strings).
// Times sourced from the official FIFA API (api.fifa.com/api/v3), TimeDefined=true.
// Display in Perth Western Australian Standard Time (AWST = UTC+8, no DST).
//
// Label mapping:
//   M73–M88  → Round of 32
//   M89–M96  → Round of 16
//   QF1–QF4  → Quarter-Finals (FIFA match numbers 97–100)
//   SF1–SF2  → Semi-Finals   (FIFA match numbers 101–102)
//   3rd      → Third Place   (FIFA match number 103)
//   Final    → Final         (FIFA match number 104)

export const MATCH_SCHEDULE = {
  // Round of 32 (28 Jun – 4 Jul 2026 UTC)
  M73:   '2026-06-28T19:00:00Z',
  M74:   '2026-06-29T20:30:00Z',
  M75:   '2026-06-30T01:00:00Z',
  M76:   '2026-06-29T17:00:00Z',
  M77:   '2026-06-30T21:00:00Z',
  M78:   '2026-06-30T17:00:00Z',
  M79:   '2026-07-01T01:00:00Z',
  M80:   '2026-07-01T16:00:00Z',
  M81:   '2026-07-02T00:00:00Z',
  M82:   '2026-07-01T20:00:00Z',
  M83:   '2026-07-02T23:00:00Z',
  M84:   '2026-07-02T19:00:00Z',
  M85:   '2026-07-03T03:00:00Z',
  M86:   '2026-07-03T22:00:00Z',
  M87:   '2026-07-04T01:30:00Z',
  M88:   '2026-07-03T18:00:00Z',

  // Round of 16 (4–7 Jul 2026 UTC)
  M89:   '2026-07-04T21:00:00Z',
  M90:   '2026-07-04T17:00:00Z',
  M91:   '2026-07-05T20:00:00Z',
  M92:   '2026-07-06T00:00:00Z',
  M93:   '2026-07-06T19:00:00Z',
  M94:   '2026-07-07T00:00:00Z',
  M95:   '2026-07-07T16:00:00Z',
  M96:   '2026-07-07T20:00:00Z',

  // Quarter-Finals (9–12 Jul 2026 UTC)
  QF1:   '2026-07-09T20:00:00Z',
  QF2:   '2026-07-10T19:00:00Z',
  QF3:   '2026-07-11T21:00:00Z',
  QF4:   '2026-07-12T01:00:00Z',

  // Semi-Finals (14–15 Jul 2026 UTC)
  SF1:   '2026-07-14T19:00:00Z',
  SF2:   '2026-07-15T19:00:00Z',

  // Third Place & Final (18–19 Jul 2026 UTC)
  '3rd': '2026-07-18T21:00:00Z',
  Final: '2026-07-19T19:00:00Z',
};

const PERTH_FMT = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Perth',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Returns a formatted Perth-time string for the given match label,
 * e.g. "29 Jun, 3:00 am AWST". Returns null if the label has no scheduled time.
 */
export function formatMatchTime(label) {
  const utc = MATCH_SCHEDULE[label];
  if (!utc) return null;
  const formatted = PERTH_FMT.format(new Date(utc));
  return `${formatted} AWST`;
}
