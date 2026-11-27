/**
 * Completion gate.
 *
 * Finishing a job is the only action with a server-side retry limit
 * (`completeOtpLimiter`: 5 tries per booking per 10 minutes) and the only one
 * whose money row can mislead. Two things are easy to get wrong and expensive
 * when wrong:
 *
 *   - telling the partner they have tries left after the server has locked
 *     them out, so they stand at the vehicle re-entering a code that cannot
 *     be accepted;
 *   - showing "payment settled" as a blocking gate. The server settles any
 *     pending non-ONLINE payment as part of completing, so cash jobs must not
 *     be presented as blocked. An unsettled ONLINE payment is different: the
 *     partner is about to hand the vehicle back unpaid.
 */

export {};

const MAX_ATTEMPTS = 5;

type GateState = 'met' | 'pending' | 'blocked';

interface Payment {
  amount?: string | number;
  method?: string;
  status?: string;
}

/** Mirrors `paymentRow` in CompleteJobScreen. */
const paymentState = (payment: Payment | undefined): GateState => {
  if (payment?.status === 'COMPLETED') return 'met';
  if ((payment?.method ?? '').toUpperCase() === 'ONLINE') return 'blocked';
  return 'pending';
};

/** Mirrors the attempt counter and the lockout flip. */
const attemptsLeft = (used: number): number => Math.max(0, MAX_ATTEMPTS - used);

/** Mirrors `swipeState` in CompleteJobScreen. */
const swipeState = (args: {
  otpLength: number;
  lockedOut: boolean;
  submitting: boolean;
}): 'ready' | 'locked' | 'loading' => {
  if (args.submitting) return 'loading';
  if (args.otpLength === 4 && !args.lockedOut) return 'ready';
  return 'locked';
};

describe('payment row', () => {
  it('reads as settled once the payment is COMPLETED', () => {
    expect(paymentState({status: 'COMPLETED', method: 'ONLINE'})).toBe('met');
    expect(paymentState({status: 'COMPLETED', method: 'CASH'})).toBe('met');
  });

  // Cash and pay-after-service settle server-side on completion, so they are
  // never a blocker — presenting them as one would strand the partner.
  it('does not block a pending cash or pay-after-service payment', () => {
    expect(paymentState({status: 'PENDING', method: 'CASH'})).toBe('pending');
    expect(paymentState({status: 'PENDING', method: 'PAY_AFTER_SERVICE'})).toBe('pending');
    expect(paymentState(undefined)).toBe('pending');
  });

  it('warns on an unsettled online payment', () => {
    expect(paymentState({status: 'PENDING', method: 'ONLINE'})).toBe('blocked');
    expect(paymentState({status: 'FAILED', method: 'online'})).toBe('blocked');
  });
});

describe('attempt counter', () => {
  it('counts down from the server limit', () => {
    expect(attemptsLeft(0)).toBe(5);
    expect(attemptsLeft(3)).toBe(2);
  });

  it('never promises a try that the server will refuse', () => {
    expect(attemptsLeft(MAX_ATTEMPTS)).toBe(0);
    expect(attemptsLeft(MAX_ATTEMPTS + 4)).toBe(0);
  });
});

describe('final swipe', () => {
  it('unlocks only on a full code', () => {
    expect(swipeState({otpLength: 3, lockedOut: false, submitting: false})).toBe('locked');
    expect(swipeState({otpLength: 4, lockedOut: false, submitting: false})).toBe('ready');
  });

  // The lockout has to win: a complete code is exactly when a locked-out
  // partner would otherwise keep swiping.
  it('stays locked while the booking is rate limited, even with a full code', () => {
    expect(swipeState({otpLength: 4, lockedOut: true, submitting: false})).toBe('locked');
  });

  it('shows progress while the code is being checked', () => {
    expect(swipeState({otpLength: 4, lockedOut: false, submitting: true})).toBe('loading');
  });
});
