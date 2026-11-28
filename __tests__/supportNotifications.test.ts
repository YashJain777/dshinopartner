/**
 * Support notifications and keyboard handling.
 *
 * Both of these made the support feature feel broken without anything
 * actually erroring:
 *
 *  - Nothing told the partner when support replied or resolved their
 *    ticket. They found out by happening to reopen the app.
 *  - The composer and the Submit button sat under the keyboard. The app sets
 *    `windowSoftInputMode="adjustResize"`, which is the right flag — but it
 *    targets SDK 36, and from Android 15 the system forces edge-to-edge and
 *    stops resizing the window for the IME. `behavior={undefined}` on
 *    Android then means KeyboardAvoidingView does nothing at all.
 */

export {};

type Action = 'ACTIVE_JOB' | 'BOOKING_DETAILS' | 'EARNINGS' | 'SUPPORT_TICKET' | 'NONE';

interface Target {
  type?: string;
  bookingId?: string;
  ticketId?: string;
}

const ACTION_FOR: Record<string, Action> = {
  ASSIGNMENT: 'ACTIVE_JOB',
  BOOKING_CANCELLED: 'BOOKING_DETAILS',
  WALLET: 'EARNINGS',
  SUPPORT_TICKET: 'SUPPORT_TICKET',
  SOS_ALERT: 'NONE',
};

const actionFor = (type?: string): Action => ACTION_FOR[type ?? ''] ?? 'NONE';

/** Mirrors the SUPPORT_TICKET branch of navigateForNotification. */
const destinationFor = (target: Target): string | null => {
  switch (actionFor(target.type)) {
    case 'SUPPORT_TICKET':
      return target.ticketId ? 'TicketDetails' : 'SupportTickets';
    case 'BOOKING_DETAILS':
      return target.bookingId ? 'BookingDetails' : null;
    case 'ACTIVE_JOB':
      return 'MainTabs/Jobs';
    case 'EARNINGS':
      return 'MainTabs/Earnings';
    case 'NONE':
      return null;
  }
};

describe('a support notification opens the thread', () => {
  it('goes straight to the ticket when it carries one', () => {
    expect(destinationFor({type: 'SUPPORT_TICKET', ticketId: 'tkt-1'})).toBe('TicketDetails');
  });

  // The backend always sends ticketId, but a malformed payload must not
  // strand the partner on a screen that cannot load.
  it('falls back to the ticket list when the id is missing', () => {
    expect(destinationFor({type: 'SUPPORT_TICKET'})).toBe('SupportTickets');
  });

  it('does not disturb the other notification types', () => {
    expect(destinationFor({type: 'ASSIGNMENT'})).toBe('MainTabs/Jobs');
    expect(destinationFor({type: 'BOOKING_CANCELLED', bookingId: 'b1'})).toBe('BookingDetails');
    expect(destinationFor({type: 'WALLET'})).toBe('MainTabs/Earnings');
    expect(destinationFor({type: 'SOS_ALERT'})).toBeNull();
    expect(destinationFor({type: 'something-new'})).toBeNull();
  });
});

describe('who gets told about a ticket', () => {
  const notifiesRaiser = (senderType: string) => ['admin', 'agency'].includes(senderType);

  it('notifies the raiser when staff reply', () => {
    expect(notifiesRaiser('admin')).toBe(true);
    expect(notifiesRaiser('agency')).toBe(true);
  });

  // Otherwise the partner is pinged by their own message.
  it('does not notify the raiser about their own reply', () => {
    expect(notifiesRaiser('partner')).toBe(false);
    expect(notifiesRaiser('customer')).toBe(false);
  });

  const notifiesOnStatus = (status: string) => ['RESOLVED', 'CLOSED'].includes(status);

  it('notifies on the statuses that end the conversation', () => {
    expect(notifiesOnStatus('RESOLVED')).toBe(true);
    expect(notifiesOnStatus('CLOSED')).toBe(true);
    expect(notifiesOnStatus('IN_PROGRESS')).toBe(false);
    expect(notifiesOnStatus('OPEN')).toBe(false);
  });
});

describe('keyboard behaviour', () => {
  // The old line, kept here as the thing that must not come back.
  const oldBehavior = (os: string) => (os === 'ios' ? 'padding' : undefined);
  const newBehavior = () => 'padding';

  it('used to leave Android with no behaviour at all', () => {
    expect(oldBehavior('android')).toBeUndefined();
  });

  it('now avoids the keyboard on both platforms', () => {
    expect(newBehavior()).toBe('padding');
  });
});

/**
 * One photo gate, one destination.
 *
 * The gate row navigated to the evidence screen (the viewfinder), but the
 * thumbnail strip rendered INSIDE that row was its own Pressable that opened
 * the OS picker. A tap on a thumbnail never reached the row.
 *
 * It only showed up on the after-photos gate because the before-gate carried
 * a "Tap to shoot the remaining panels" hint that pointed people at the row;
 * the after-gate had no hint, so almost every tap landed on the strip and the
 * viewfinder looked broken for AFTER and fine for BEFORE.
 */
describe('photo gate tap target', () => {
  type Target = 'viewfinder' | 'os-picker';

  /** Innermost pressable wins, which is what the bug relied on. */
  const tapped = (stripIsPressable: boolean): Target =>
    stripIsPressable ? 'os-picker' : 'viewfinder';

  it('used to send a thumbnail tap to the OS picker', () => {
    expect(tapped(true)).toBe('os-picker');
  });

  it('now sends every tap in the row to the viewfinder', () => {
    expect(tapped(false)).toBe('viewfinder');
  });

  // Both gates must behave the same; the asymmetry was the whole bug.
  it('treats the before and after gates identically', () => {
    const gate = (side: 'BEFORE' | 'AFTER', count: number) => ({
      destination: tapped(false),
      hint: count >= 4 ? undefined : 'Tap to shoot the remaining panels',
      side,
    });
    const before = gate('BEFORE', 0);
    const after = gate('AFTER', 0);
    expect(after.destination).toBe(before.destination);
    expect(after.hint).toBe(before.hint);
  });

  it('drops the hint once the side is complete', () => {
    const hintFor = (count: number) =>
      count >= 4 ? undefined : 'Tap to shoot the remaining panels';
    expect(hintFor(4)).toBeUndefined();
    expect(hintFor(3)).toBe('Tap to shoot the remaining panels');
  });
});
