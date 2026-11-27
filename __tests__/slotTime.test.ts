/**
 * Slot parsing.
 *
 * The reported bug, exactly: at 15:13 on 2026-11-27 the Jobs tab showed a
 * 04:20 PM job as "This slot has expired — closed at 07:20". The parser was
 * `/^(\d{2}):(\d{2})/`, so "04:20 PM-05:20 PM" became 04:20 in the morning,
 * and 04:20 + 60 min + a 2 h grace lands on 07:20. Every afternoon job in the
 * app was unopenable while the server was willing to accept the status change.
 */

import {
  parseWallClockMinutes,
  parseSlotMinutes,
  parseSlotTimes,
  isSlotExpired,
  slotExpiresAt,
  minutesPastSlotEnd,
  istDateString,
  istClock,
} from '../src/utils/slotTime';
import {formatSlotTime, formatSlotRange} from '../src/utils/format';

/** 2026-11-27 15:13 IST, the moment in the screenshot. */
const AT_1513_IST = new Date(Date.UTC(2026, 10, 27, 9, 43));

describe('wall clock parsing', () => {
  it('honours the meridiem', () => {
    expect(parseWallClockMinutes('04:20 PM')).toBe(16 * 60 + 20);
    expect(parseWallClockMinutes('04:20 AM')).toBe(4 * 60 + 20);
    expect(parseWallClockMinutes('8:00AM')).toBe(8 * 60);
  });

  it('handles the noon and midnight edges', () => {
    expect(parseWallClockMinutes('12:00 AM')).toBe(0);
    expect(parseWallClockMinutes('12:30 PM')).toBe(12 * 60 + 30);
  });

  it('accepts 24-hour slots, which the validators also allow', () => {
    expect(parseWallClockMinutes('16:20')).toBe(16 * 60 + 20);
    expect(parseWallClockMinutes('00:00')).toBe(0);
  });

  it('rejects nonsense rather than guessing', () => {
    expect(parseWallClockMinutes('25:00')).toBeNull();
    expect(parseWallClockMinutes('10:70')).toBeNull();
    expect(parseWallClockMinutes('13:00 PM')).toBeNull();
    expect(parseWallClockMinutes('')).toBeNull();
    expect(parseWallClockMinutes(null)).toBeNull();
  });
});

describe('the afternoon job that said it had expired', () => {
  const DATE = '2026-11-27';
  const SLOT = '04:20 PM-05:20 PM';

  it('is not expired at 15:13', () => {
    expect(isSlotExpired(DATE, SLOT, 120, AT_1513_IST)).toBe(false);
  });

  it('closes at 19:20, not 07:20', () => {
    expect(istClock(slotExpiresAt(DATE, SLOT))).toBe('19:20');
  });

  it('is not yet late at 15:13', () => {
    expect(minutesPastSlotEnd(DATE, SLOT, AT_1513_IST)).toBeLessThan(0);
  });

  it('does expire once the grace really has passed', () => {
    const at2000 = new Date(Date.UTC(2026, 10, 27, 14, 30)); // 20:00 IST
    expect(isSlotExpired(DATE, SLOT, 120, at2000)).toBe(true);
  });
});

describe('slot end comes from the slot, not the service duration', () => {
  it('uses the stated end even for a longer service', () => {
    // A 90-minute service in an hourly window: the window still ends at 17:20.
    expect(formatSlotRange('04:20 PM-05:20 PM', 90)).toBe('16:20 – 17:20');
  });

  it('formats the start in 24-hour time', () => {
    expect(formatSlotTime('04:20 PM-05:20 PM')).toBe('16:20');
    expect(formatSlotTime('08:00 AM-09:00 AM')).toBe('08:00');
    expect(formatSlotTime('16:20-17:20')).toBe('16:20');
  });

  it('falls back to the duration only when the end is unparseable', () => {
    expect(formatSlotRange('09:00 AM', 45)).toBe('09:00 – 09:45');
  });
});

describe('slots that cross midnight', () => {
  it('ends on the next day', () => {
    const times = parseSlotTimes('2026-11-27', '11:00 PM-12:00 AM');
    expect(times).not.toBeNull();
    expect(times!.end.getTime()).toBeGreaterThan(times!.start.getTime());
    expect((times!.end.getTime() - times!.start.getTime()) / 60000).toBe(60);
  });
});

describe('an unparseable slot never locks the partner out', () => {
  it('reports not-expired instead of expired', () => {
    expect(isSlotExpired('2026-11-27', 'whenever', 120, AT_1513_IST)).toBe(false);
    expect(isSlotExpired('2026-11-27', '', 120, AT_1513_IST)).toBe(false);
    expect(parseSlotMinutes('04:20 PM')).toBeNull();
  });
});

describe('today in IST', () => {
  // 00:30 IST on the 28th is still 19:00 UTC on the 27th: a UTC-based "today"
  // shows the partner yesterday's route for the first five and a half hours
  // of every day.
  it('is the IST date, not the UTC one', () => {
    const justAfterMidnightIST = new Date(Date.UTC(2026, 10, 27, 19, 0));
    expect(istDateString(justAfterMidnightIST)).toBe('2026-11-28');
    expect(justAfterMidnightIST.toISOString().slice(0, 10)).toBe('2026-11-27');
  });
});
