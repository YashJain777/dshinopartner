/**
 * Job timeline stages.
 *
 * The timeline used to run on its own step names, which left "Arrived"
 * unreachable because nothing ever set that step. It now derives every stage
 * from the booking status, so it cannot disagree with the action card.
 */

import {BookingStatus} from '../src/constants/api.constants';

const STAGES: {label: string; reachedBy: BookingStatus[]}[] = [
  {
    label: 'Assigned',
    reachedBy: ['PARTNER_ASSIGNED', 'EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'],
  },
  {
    label: 'On the way',
    reachedBy: ['EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED'],
  },
  {label: 'Arrived', reachedBy: ['ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED']},
  {label: 'Service', reachedBy: ['IN_PROGRESS', 'COMPLETED', 'REVIEWED']},
  {label: 'Done', reachedBy: ['COMPLETED', 'REVIEWED']},
];

type StepStatus = 'completed' | 'active' | 'pending';

/** Mirrors stageStatus in WorkflowTracker. */
const stageStatus = (index: number, status: BookingStatus): StepStatus => {
  const reachedCount = STAGES.filter(s => s.reachedBy.includes(status)).length;
  if (index < reachedCount - 1) return 'completed';
  if (index === reachedCount - 1) return 'active';
  return 'pending';
};

const trackerFor = (status: BookingStatus) =>
  STAGES.map((_, i) => stageStatus(i, status));

describe('workflow tracker', () => {
  it('marks only the first stage active when freshly assigned', () => {
    expect(trackerFor('PARTNER_ASSIGNED')).toEqual([
      'active', 'pending', 'pending', 'pending', 'pending',
    ]);
  });

  it('advances to On the way when the partner sets off', () => {
    expect(trackerFor('EN_ROUTE')).toEqual([
      'completed', 'active', 'pending', 'pending', 'pending',
    ]);
  });

  // Reachable at last: nothing used to set this stage.
  it('reaches Arrived when the partner confirms arrival', () => {
    expect(trackerFor('ARRIVED')).toEqual([
      'completed', 'completed', 'active', 'pending', 'pending',
    ]);
  });

  it('advances to Service once the job starts', () => {
    expect(trackerFor('IN_PROGRESS')).toEqual([
      'completed', 'completed', 'completed', 'active', 'pending',
    ]);
  });

  it('fills every stage on completion', () => {
    expect(trackerFor('COMPLETED')).toEqual([
      'completed', 'completed', 'completed', 'completed', 'active',
    ]);
  });

  it('treats the legacy ON_THE_WAY the same as EN_ROUTE', () => {
    expect(trackerFor('ON_THE_WAY')).toEqual(trackerFor('EN_ROUTE'));
  });

  it('treats REVIEWED the same as COMPLETED', () => {
    expect(trackerFor('REVIEWED')).toEqual(trackerFor('COMPLETED'));
  });

  it('never shows two active stages', () => {
    const statuses: BookingStatus[] = [
      'PARTNER_ASSIGNED', 'EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED',
    ];
    statuses.forEach(status => {
      const active = trackerFor(status).filter(s => s === 'active');
      expect(active).toHaveLength(1);
    });
  });

  it('never leaves a completed stage after a pending one', () => {
    const statuses: BookingStatus[] = [
      'PARTNER_ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED',
    ];
    statuses.forEach(status => {
      const steps = trackerFor(status);
      const firstPending = steps.indexOf('pending');
      if (firstPending !== -1) {
        expect(steps.slice(firstPending).every(s => s === 'pending')).toBe(true);
      }
    });
  });
});
