/**
 * Shared notification navigation.
 *
 * Used by the push handler, the in-app modal, the dashboard list and the
 * notification list, so this is where the "which booking was cancelled"
 * routing is pinned down.
 */

jest.mock('../src/navigation/navigationRef', () => ({navigate: jest.fn()}));

import {navigate} from '../src/navigation/navigationRef';
import {
  navigateForNotification,
  isNotificationActionable,
} from '../src/services/notification/notificationNavigation';

const BOOKING_ID = 'bk-1';

beforeEach(() => jest.clearAllMocks());

describe('navigateForNotification', () => {
  it('opens the cancelled booking, not the Jobs tab', () => {
    expect(
      navigateForNotification({type: 'JOB_CANCELLED', bookingId: BOOKING_ID}),
    ).toBe(true);
    expect(navigate).toHaveBeenCalledWith('BookingDetails', {bookingId: BOOKING_ID});
  });

  it('opens the Jobs tab for a new assignment', () => {
    expect(
      navigateForNotification({type: 'FSM_JOB_ASSIGNED', bookingId: BOOKING_ID}),
    ).toBe(true);
    expect(navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Jobs',
      params: {bookingId: BOOKING_ID},
    });
  });

  it('opens Earnings for a wallet credit', () => {
    expect(navigateForNotification({type: 'WALLET'})).toBe(true);
    expect(navigate).toHaveBeenCalledWith('MainTabs', {screen: 'Earnings'});
  });

  it('reports no destination for a reassignment', () => {
    expect(
      navigateForNotification({type: 'JOB_REASSIGNED', bookingId: BOOKING_ID}),
    ).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports no destination for an unknown type', () => {
    expect(navigateForNotification({type: 'SOMETHING_NEW'})).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  // Defensive: a booking screen with no id would render an error state.
  it('reports no destination when a booking notification has no id', () => {
    expect(navigateForNotification({type: 'JOB_CANCELLED'})).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still opens the Jobs tab when an assignment has no id', () => {
    expect(navigateForNotification({type: 'FSM_JOB_ASSIGNED'})).toBe(true);
    expect(navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Jobs',
      params: undefined,
    });
  });

  // The slot has not started yet, so this opens the job the partner is about
  // to travel to.
  it('opens the Jobs tab for a slot-starting-soon reminder', () => {
    expect(
      navigateForNotification({type: 'JOB_REMINDER', bookingId: BOOKING_ID}),
    ).toBe(true);
    expect(navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Jobs',
      params: {bookingId: BOOKING_ID},
    });
  });

  // A running-late job is still this partner's active job, so it opens where
  // they can mark Arrived.
  it('opens the Jobs tab for a running-late job', () => {
    expect(
      navigateForNotification({type: 'JOB_RUNNING_LATE', bookingId: BOOKING_ID}),
    ).toBe(true);
    expect(navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Jobs',
      params: {bookingId: BOOKING_ID},
    });
  });

  // Both of these unassign the partner, so the booking-details endpoint no
  // longer returns the booking to them and there is nothing to open.
  it.each(['JOB_RESCHEDULED', 'JOB_SLA_BREACHED'])(
    'reports no destination for %s',
    type => {
      expect(navigateForNotification({type, bookingId: BOOKING_ID})).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    },
  );
});

describe('isNotificationActionable', () => {
  it.each([
    [{type: 'JOB_CANCELLED', bookingId: BOOKING_ID}, true],
    [{type: 'JOB_CANCELLED'}, false],
    [{type: 'FSM_JOB_ASSIGNED'}, true],
    [{type: 'WALLET'}, true],
    [{type: 'JOB_REASSIGNED', bookingId: BOOKING_ID}, false],
    [{type: 'JOB_REMINDER', bookingId: BOOKING_ID}, true],
    [{type: 'JOB_RUNNING_LATE', bookingId: BOOKING_ID}, true],
    [{type: 'JOB_RESCHEDULED', bookingId: BOOKING_ID}, false],
    [{type: 'JOB_SLA_BREACHED', bookingId: BOOKING_ID}, false],
    [{type: 'SOS_ALERT'}, false],
    [{type: 'SOMETHING_NEW'}, false],
    [{}, false],
  ])('%j -> %s', (target, expected) => {
    expect(isNotificationActionable(target)).toBe(expected);
  });

  it('agrees with navigateForNotification', () => {
    const cases = [
      {type: 'JOB_CANCELLED', bookingId: BOOKING_ID},
      {type: 'JOB_CANCELLED'},
      {type: 'FSM_JOB_ASSIGNED'},
      {type: 'WALLET'},
      {type: 'JOB_REASSIGNED'},
      {type: 'JOB_REMINDER', bookingId: BOOKING_ID},
      {type: 'JOB_RUNNING_LATE', bookingId: BOOKING_ID},
      {type: 'JOB_RESCHEDULED'},
      {type: 'JOB_SLA_BREACHED'},
      {type: 'SOMETHING_NEW'},
    ];

    cases.forEach(target => {
      jest.clearAllMocks();
      // A row that shows a chevron must actually go somewhere.
      expect(navigateForNotification(target)).toBe(isNotificationActionable(target));
    });
  });
});
