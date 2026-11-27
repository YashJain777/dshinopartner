/**
 * Notification routing.
 *
 * Regression cover for the reported bug: every push rendered as a new job
 * assignment, so a cancellation arrived tagged "NEW ASSIGNMENT" with a button
 * that opened an empty Jobs tab.
 */

jest.mock('../src/navigation/navigationRef', () => ({navigate: jest.fn()}));
jest.mock('../src/services/notification/inAppNotificationManager', () => {
  const actual = jest.requireActual(
    '../src/services/notification/inAppNotificationManager',
  );
  return {...actual, showInAppNotification: jest.fn()};
});

import {navigate} from '../src/navigation/navigationRef';
import {
  showInAppNotification,
  getNotificationPresentation,
} from '../src/services/notification/inAppNotificationManager';
import {handleNotificationPayload} from '../src/services/notification/notificationPayloadHandler';

const BOOKING_ID = 'bk-1';

beforeEach(() => jest.clearAllMocks());

describe('getNotificationPresentation', () => {
  it('presents a job assignment as an assignment', () => {
    const p = getNotificationPresentation('FSM_JOB_ASSIGNED');
    expect(p.tag).toBe('NEW ASSIGNMENT');
    expect(p.action).toBe('ACTIVE_JOB');
  });

  it('presents a cancellation as a cancellation, not an assignment', () => {
    const p = getNotificationPresentation('JOB_CANCELLED');
    expect(p.tag).toBe('BOOKING CANCELLED');
    expect(p.action).toBe('BOOKING_DETAILS');
    expect(p.tag).not.toBe('NEW ASSIGNMENT');
  });

  // The reassignment notice goes to the PREVIOUS partner, so the booking's
  // partnerId is someone else by then and GET /bookings/:id would 404.
  it('gives a reassignment no booking destination', () => {
    expect(getNotificationPresentation('JOB_REASSIGNED').action).toBe('NONE');
  });

  it('treats both wallet type names the same', () => {
    expect(getNotificationPresentation('WALLET').action).toBe('EARNINGS');
    expect(getNotificationPresentation('WALLET_UPDATE').action).toBe('EARNINGS');
  });

  it('gives every known type a list icon', () => {
    ['FSM_JOB_ASSIGNED', 'JOB_CANCELLED', 'JOB_REASSIGNED', 'WALLET', 'SOS_ALERT', 'UNKNOWN']
      .forEach(t => expect(getNotificationPresentation(t).icon).toBeTruthy());
  });

  it('routes a wallet update to earnings', () => {
    expect(getNotificationPresentation('WALLET_UPDATE').action).toBe('EARNINGS');
  });

  it('gives an SOS alert no navigation action', () => {
    expect(getNotificationPresentation('SOS_ALERT').action).toBe('NONE');
  });

  it('falls back to a plain notification for an unknown type', () => {
    const p = getNotificationPresentation('SOMETHING_NEW');
    expect(p.tag).toBe('NOTIFICATION');
    expect(p.action).toBe('NONE');
  });

  it('falls back when the type is missing entirely', () => {
    expect(getNotificationPresentation(undefined).tag).toBe('NOTIFICATION');
  });
});

describe('handleNotificationPayload — foreground', () => {
  it('shows the backend title rather than a hardcoded one', () => {
    handleNotificationPayload(
      {
        notification: {title: 'Booking Cancelled ❌', body: 'DSH-1 was cancelled.'},
        data: {bookingId: BOOKING_ID, type: 'JOB_CANCELLED'},
      },
      true,
    );

    expect(showInAppNotification).toHaveBeenCalledWith({
      title: 'Booking Cancelled ❌',
      body: 'DSH-1 was cancelled.',
      bookingId: BOOKING_ID,
      type: 'JOB_CANCELLED',
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses the per-type fallback copy for a data-only push', () => {
    handleNotificationPayload({data: {bookingId: BOOKING_ID, type: 'JOB_CANCELLED'}}, true);

    expect(showInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({title: 'Booking Cancelled'}),
    );
  });

  it('ignores an empty message', () => {
    handleNotificationPayload(null, true);
    handleNotificationPayload({}, true);
    expect(showInAppNotification).not.toHaveBeenCalled();
  });
});

describe('handleNotificationPayload — background tap', () => {
  it('opens the Jobs tab for an assignment', () => {
    handleNotificationPayload(
      {data: {bookingId: BOOKING_ID, type: 'FSM_JOB_ASSIGNED'}},
      false,
    );
    expect(navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Jobs',
      params: {bookingId: BOOKING_ID},
    });
  });

  // The reported bug: this used to land on the Jobs tab, which reads the
  // active booking and so showed "No Active Job".
  it('opens the booking, not the Jobs tab, for a cancellation', () => {
    handleNotificationPayload(
      {data: {bookingId: BOOKING_ID, type: 'JOB_CANCELLED'}},
      false,
    );
    expect(navigate).toHaveBeenCalledWith('BookingDetails', {bookingId: BOOKING_ID});
  });

  it('falls back to the notification list when a cancellation carries no bookingId', () => {
    handleNotificationPayload({data: {type: 'JOB_CANCELLED'}}, false);
    expect(navigate).toHaveBeenCalledWith('Notifications');
  });

  it('falls back to the notification list for a reassignment', () => {
    handleNotificationPayload({data: {bookingId: BOOKING_ID, type: 'JOB_REASSIGNED'}}, false);
    expect(navigate).toHaveBeenCalledWith('Notifications');
  });

  it('opens Earnings for a wallet update', () => {
    handleNotificationPayload({data: {type: 'WALLET_UPDATE'}}, false);
    expect(navigate).toHaveBeenCalledWith('MainTabs', {screen: 'Earnings'});
  });

  it('opens the notification list for an unknown type', () => {
    handleNotificationPayload({data: {type: 'SOMETHING_NEW'}}, false);
    expect(navigate).toHaveBeenCalledWith('Notifications');
  });
});
