/**
 * Which job is "the active job".
 *
 * A partner holding two jobs started the second one on their route. Both the
 * dashboard banner and `GET /bookings/active` ordered purely by route
 * position:
 *
 *     [['clusterSequence','ASC'], ['scheduledDate','ASC'], ['scheduledTimeSlot','ASC']]
 *
 * so both returned the OTHER job — the one not being worked on. The live job
 * screen ignored the id the Jobs tab passed it and used that endpoint, so the
 * job in hand became unreachable: tapping it opened the wrong one.
 *
 * This mirrors `utils/activeBooking.js` on the server. Two rules:
 *   1. a job that is underway beats route order;
 *   2. a job that is only ASSIGNED for a FUTURE date is not the active job —
 *      it is tomorrow's work, and the banner was presenting it as today's.
 */

type Status =
  | 'PARTNER_ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS';

interface Candidate {
  id: string;
  status: Status;
  clusterSequence: number;
  scheduledDate: string;
}

const UNDERWAY: Status[] = ['EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

/** Mirrors `activeBookingStatusWhere`. */
const qualifies = (job: Candidate, today: string): boolean =>
  UNDERWAY.includes(job.status) ||
  (job.status === 'PARTNER_ASSIGNED' && job.scheduledDate <= today);

/** Mirrors the CASE in `activeBookingOrder` — furthest along the FSM first. */
const statusRank = (status: Status): number => {
  switch (status) {
    case 'IN_PROGRESS':
      return 0;
    case 'ARRIVED':
      return 1;
    case 'EN_ROUTE':
    case 'ON_THE_WAY':
      return 2;
    default:
      return 3;
  }
};

const pickActive = (jobs: Candidate[], today: string): Candidate | null => {
  const eligible = jobs.filter(j => qualifies(j, today));
  if (!eligible.length) {
    return null;
  }
  return [...eligible].sort(
    (a, b) =>
      statusRank(a.status) - statusRank(b.status) ||
      a.clusterSequence - b.clusterSequence ||
      a.scheduledDate.localeCompare(b.scheduledDate),
  )[0];
};

const TODAY = '2026-11-27';
const TOMORROW = '2026-11-28';

describe('the job in hand wins over route order', () => {
  // The exact reported bug.
  it('returns the started job even when another is earlier on the route', () => {
    const jobs: Candidate[] = [
      {id: 'stop-1', status: 'PARTNER_ASSIGNED', clusterSequence: 1, scheduledDate: TODAY},
      {id: 'stop-2', status: 'IN_PROGRESS', clusterSequence: 2, scheduledDate: TODAY},
    ];
    expect(pickActive(jobs, TODAY)?.id).toBe('stop-2');
  });

  it('prefers the furthest-along job when several are underway', () => {
    const jobs: Candidate[] = [
      {id: 'a', status: 'EN_ROUTE', clusterSequence: 1, scheduledDate: TODAY},
      {id: 'b', status: 'ARRIVED', clusterSequence: 2, scheduledDate: TODAY},
      {id: 'c', status: 'IN_PROGRESS', clusterSequence: 3, scheduledDate: TODAY},
    ];
    expect(pickActive(jobs, TODAY)?.id).toBe('c');
  });

  // Route order still decides what to pick up next.
  it('falls back to route order when nothing has been started', () => {
    const jobs: Candidate[] = [
      {id: 'second', status: 'PARTNER_ASSIGNED', clusterSequence: 2, scheduledDate: TODAY},
      {id: 'first', status: 'PARTNER_ASSIGNED', clusterSequence: 1, scheduledDate: TODAY},
    ];
    expect(pickActive(jobs, TODAY)?.id).toBe('first');
  });
});

describe("tomorrow's work is not today's active job", () => {
  it('ignores an assigned booking scheduled for a later date', () => {
    const jobs: Candidate[] = [
      {id: 'tomorrow', status: 'PARTNER_ASSIGNED', clusterSequence: 1, scheduledDate: TOMORROW},
    ];
    expect(pickActive(jobs, TODAY)).toBeNull();
  });

  it("picks today's job over tomorrow's even when tomorrow's is first on the route", () => {
    const jobs: Candidate[] = [
      {id: 'tomorrow', status: 'PARTNER_ASSIGNED', clusterSequence: 1, scheduledDate: TOMORROW},
      {id: 'today', status: 'PARTNER_ASSIGNED', clusterSequence: 9, scheduledDate: TODAY},
    ];
    expect(pickActive(jobs, TODAY)?.id).toBe('today');
  });

  // A service running past midnight is still the job in hand, so an underway
  // booking must not be filtered out by the date bound.
  it('keeps an underway job whose scheduled date has rolled over', () => {
    const jobs: Candidate[] = [
      {id: 'overnight', status: 'IN_PROGRESS', clusterSequence: 1, scheduledDate: TOMORROW},
    ];
    expect(pickActive(jobs, TODAY)?.id).toBe('overnight');
  });

  it('returns null when there is nothing to do', () => {
    expect(pickActive([], TODAY)).toBeNull();
  });
});
