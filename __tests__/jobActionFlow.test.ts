/**
 * Job action flow.
 *
 * The app used to jump straight from PARTNER_ASSIGNED to IN_PROGRESS, so the
 * customer was never told the partner had set off or arrived, and arrivedAt
 * was never written — leaving punctuality and travel-time reporting blank.
 */

import {BookingStatus, TERMINAL_STATUSES} from '../src/constants/api.constants';

type Action = 'EN_ROUTE' | 'ARRIVE' | 'START' | 'COMPLETE' | 'NONE';

/** Mirrors the primary-action selection in LiveJobScreen. */
const actionFor = (status: BookingStatus): Action => {
  if (TERMINAL_STATUSES.includes(status)) return 'NONE';
  if (status === 'IN_PROGRESS') return 'COMPLETE';
  if (status === 'ARRIVED') return 'START';
  if (status === 'EN_ROUTE' || status === 'ON_THE_WAY') return 'ARRIVE';
  if (status === 'PARTNER_ASSIGNED') return 'EN_ROUTE';
  // A breached or not-yet-assigned booking offers no action: the backend's FSM
  // would refuse the transition, so the screen must not invite the tap.
  return 'NONE';
};

/** Before photos only make sense once the partner is at the vehicle. */
const showsBeforePhotos = (status: BookingStatus): boolean =>
  status === 'ARRIVED' || status === 'IN_PROGRESS';

describe('action for each status', () => {
  it.each<[BookingStatus, Action]>([
    ['PARTNER_ASSIGNED', 'EN_ROUTE'],
    ['EN_ROUTE', 'ARRIVE'],
    ['ON_THE_WAY', 'ARRIVE'],
    ['ARRIVED', 'START'],
    ['IN_PROGRESS', 'COMPLETE'],
    ['COMPLETED', 'NONE'],
    ['REVIEWED', 'NONE'],
    ['CANCELLED', 'NONE'],
    ['SLA_BREACHED', 'NONE'],
  ])('%s -> %s', (status, expected) => {
    expect(actionFor(status)).toBe(expected);
  });

  // The whole point of the change: arrival is its own step.
  it('does not offer Start Service before the partner has arrived', () => {
    expect(actionFor('PARTNER_ASSIGNED')).not.toBe('START');
    expect(actionFor('EN_ROUTE')).not.toBe('START');
  });

  it('walks the full flow without skipping a step', () => {
    const order: BookingStatus[] = [
      'PARTNER_ASSIGNED',
      'EN_ROUTE',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
    ];
    expect(order.map(actionFor)).toEqual([
      'EN_ROUTE',
      'ARRIVE',
      'START',
      'COMPLETE',
      'NONE',
    ]);
  });
});

describe('before photos gating', () => {
  it.each<[BookingStatus, boolean]>([
    ['PARTNER_ASSIGNED', false],
    ['EN_ROUTE', false],
    ['ON_THE_WAY', false],
    ['ARRIVED', true],
    ['IN_PROGRESS', true],
    ['COMPLETED', false],
  ])('%s -> %s', (status, expected) => {
    expect(showsBeforePhotos(status)).toBe(expected);
  });
});
