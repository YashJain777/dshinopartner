/**
 * Shift controls.
 *
 * The backend refuses a break before check-in and after check-out, and there
 * is one attendance record per day so check-in is not repeatable. The home
 * screen must not offer a control the server will reject — an error toast
 * after the tap is not an acceptable substitute.
 */

interface ShiftSnapshot {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isOnBreak: boolean;
}

type Control = 'CHECK_IN' | 'BREAK_AND_END' | 'NONE';

/** Mirrors the control selection in DashboardScreen. */
const controlFor = (s: ShiftSnapshot): Control => {
  if (!s.hasCheckedIn) return 'CHECK_IN';
  if (!s.hasCheckedOut) return 'BREAK_AND_END';
  return 'NONE';
};

/** Mirrors `onShift` / `canToggleBreak` in useAttendance. */
const canToggleBreak = (s: ShiftSnapshot): boolean =>
  s.hasCheckedIn && !s.hasCheckedOut;

const snapshot = (over: Partial<ShiftSnapshot> = {}): ShiftSnapshot => ({
  hasCheckedIn: false,
  hasCheckedOut: false,
  isOnBreak: false,
  ...over,
});

describe('which shift control is offered', () => {
  it('offers check-in before the shift starts', () => {
    expect(controlFor(snapshot())).toBe('CHECK_IN');
  });

  it('offers break and end-shift during the shift', () => {
    expect(controlFor(snapshot({hasCheckedIn: true}))).toBe('BREAK_AND_END');
  });

  it('keeps offering break while already on a break, so it can be ended', () => {
    expect(controlFor(snapshot({hasCheckedIn: true, isOnBreak: true}))).toBe(
      'BREAK_AND_END',
    );
  });

  it('offers nothing once checked out — the record is closed for the day', () => {
    expect(
      controlFor(snapshot({hasCheckedIn: true, hasCheckedOut: true})),
    ).toBe('NONE');
  });

  it('never re-offers check-in after checking out', () => {
    expect(
      controlFor(snapshot({hasCheckedIn: true, hasCheckedOut: true})),
    ).not.toBe('CHECK_IN');
  });
});

describe('break gating matches the backend', () => {
  it.each<[string, ShiftSnapshot, boolean]>([
    ['before check-in', snapshot(), false],
    ['on shift', snapshot({hasCheckedIn: true}), true],
    ['on shift, mid-break', snapshot({hasCheckedIn: true, isOnBreak: true}), true],
    ['after check-out', snapshot({hasCheckedIn: true, hasCheckedOut: true}), false],
  ])('%s -> %s', (_label, state, expected) => {
    expect(canToggleBreak(state)).toBe(expected);
  });
});
