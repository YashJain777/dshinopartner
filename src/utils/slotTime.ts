/**
 * Slot time handling — a faithful port of the backend's `utils/slotTime.js`.
 *
 * A booking carries a DATEONLY `scheduledDate` plus a wall-clock
 * `scheduledTimeSlot`, which the slot generator emits as "04:20 PM-05:20 PM"
 * and the create/reschedule validators also accept as "16:20-17:20".
 *
 * The app used to parse that with `/^(\d{2}):(\d{2})/` and throw the rest
 * away. "04:20 PM-05:20 PM" became 04:20 — four in the MORNING — so every
 * afternoon job looked like it had ended eleven hours ago. Add the two-hour
 * grace and the Jobs tab declared the job expired at 07:20 while the partner
 * was standing next to the car at 15:13, with the server perfectly willing to
 * accept the status change. Dropping the meridiem silently is the whole bug.
 *
 * The other half: the old code built the slot's end from `Service.duration`
 * rather than the end the slot string already states, so a 90-minute service
 * in an hourly window expired at the wrong time too.
 *
 * Wall clock here is ALWAYS India Standard Time, matching the server. A phone
 * set to the wrong timezone must not change when a job expires.
 */

/** India is UTC+05:30 year-round — no DST. */
const IST_OFFSET_MS = 330 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

/** Grace the backend allows past a slot's end before refusing the action. */
export const SLOT_GRACE_MINUTES = 120;

export interface SlotTimes {
  start: Date;
  end: Date;
}

/**
 * "08:00", "8:00 AM", "08:00PM" → minutes since midnight. null if unparseable.
 */
export const parseWallClockMinutes = (value?: string | null): number | null => {
  const match = String(value ?? '')
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
};

/** The two wall-clock sides of a slot string, in minutes since midnight. */
export const parseSlotMinutes = (
  timeSlot?: string | null,
): {startMinutes: number; endMinutes: number} | null => {
  const parts = String(timeSlot ?? '').split('-');
  if (parts.length < 2) {
    return null;
  }
  const startMinutes = parseWallClockMinutes(parts[0]);
  const endMinutes = parseWallClockMinutes(parts[1]);
  if (startMinutes === null || endMinutes === null) {
    return null;
  }
  return {startMinutes, endMinutes};
};

/** `YYYY-MM-DD` → its parts. Accepts a Date, read as UTC like the server does. */
const parseDateParts = (
  scheduledDate?: string | Date | null,
): {year: number; month: number; day: number} | null => {
  if (scheduledDate instanceof Date) {
    if (Number.isNaN(scheduledDate.getTime())) {
      return null;
    }
    return {
      year: scheduledDate.getUTCFullYear(),
      month: scheduledDate.getUTCMonth() + 1,
      day: scheduledDate.getUTCDate(),
    };
  }
  const match = String(scheduledDate ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }
  return {year: Number(match[1]), month: Number(match[2]), day: Number(match[3])};
};

/** Resolves a date + slot into absolute instants. null if either is unparseable. */
export const parseSlotTimes = (
  scheduledDate?: string | Date | null,
  timeSlot?: string | null,
): SlotTimes | null => {
  const minutes = parseSlotMinutes(timeSlot);
  if (!minutes) {
    return null;
  }
  const dateParts = parseDateParts(scheduledDate);
  if (!dateParts) {
    return null;
  }

  // Midnight IST of scheduledDate, expressed as a UTC instant.
  const istMidnight =
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) - IST_OFFSET_MS;

  // A slot ending at or before its start crosses midnight ("11:00 PM-12:00 AM").
  const normalizedEnd =
    minutes.endMinutes <= minutes.startMinutes
      ? minutes.endMinutes + DAY_MINUTES
      : minutes.endMinutes;

  return {
    start: new Date(istMidnight + minutes.startMinutes * MINUTE_MS),
    end: new Date(istMidnight + normalizedEnd * MINUTE_MS),
  };
};

/**
 * Whether the slot's end plus a grace period is in the past.
 *
 * An unparseable slot returns false — the same choice the backend makes, so a
 * malformed row never locks a partner out of a job they can still do.
 */
export const isSlotExpired = (
  scheduledDate?: string | Date | null,
  timeSlot?: string | null,
  graceMinutes: number = SLOT_GRACE_MINUTES,
  now: Date = new Date(),
): boolean => {
  const times = parseSlotTimes(scheduledDate, timeSlot);
  if (!times) {
    return false;
  }
  return now.getTime() > times.end.getTime() + graceMinutes * MINUTE_MS;
};

/** When the slot stops being actionable. null if the slot is unparseable. */
export const slotExpiresAt = (
  scheduledDate?: string | Date | null,
  timeSlot?: string | null,
  graceMinutes: number = SLOT_GRACE_MINUTES,
): Date | null => {
  const times = parseSlotTimes(scheduledDate, timeSlot);
  return times ? new Date(times.end.getTime() + graceMinutes * MINUTE_MS) : null;
};

/** Minutes past the slot's end. Negative while the slot is still open. */
export const minutesPastSlotEnd = (
  scheduledDate?: string | Date | null,
  timeSlot?: string | null,
  now: Date = new Date(),
): number | null => {
  const times = parseSlotTimes(scheduledDate, timeSlot);
  if (!times) {
    return null;
  }
  return Math.floor((now.getTime() - times.end.getTime()) / MINUTE_MS);
};

/** Today in IST as `YYYY-MM-DD` — the correct "today" for a slot comparison. */
export const istDateString = (now: Date = new Date()): string =>
  new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

/** An absolute instant as IST wall clock, "16:20". */
export const istClock = (date?: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
};
