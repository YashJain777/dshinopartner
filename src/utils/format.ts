import {parseSlotMinutes, parseWallClockMinutes} from './slotTime';

/**
 * Display formatters.
 *
 * Money uses the Indian grouping (1,49,999 — not 149,999), because every
 * amount in this app is rupees shown to an Indian partner.
 */

/** 1499 → "1,49,999" style grouping on the integer part. */
const groupIndian = (whole: string): string => {
  if (whole.length <= 3) {
    return whole;
  }
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
};

export const formatMoney = (
  value: string | number | null | undefined,
  options: {decimals?: boolean; sign?: boolean} = {},
): string => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) {
    return '₹0';
  }
  const abs = Math.abs(n);
  const showDecimals = options.decimals && abs % 1 !== 0;
  const fixed = showDecimals ? abs.toFixed(2) : String(Math.round(abs));
  const [whole, fraction] = fixed.split('.');
  const grouped = groupIndian(whole);
  const body = fraction ? `${grouped}.${fraction}` : grouped;
  const prefix = n < 0 ? '−' : options.sign ? '+' : '';
  return `${prefix}₹${body}`;
};

/**
 * The start of a slot as 24-hour wall clock: "04:20 PM-05:20 PM" → "16:20".
 *
 * This used to be `slot.match(/^(\d{2}):(\d{2})/)`, which returned "04:20"
 * for that input — the meridiem was dropped, so every afternoon slot read as
 * the small hours. Parsing now goes through the canonical module that matches
 * the backend. See src/utils/slotTime.ts.
 */
export const formatSlotTime = (slot?: string | null): string => {
  if (!slot) {
    return '';
  }
  const minutes = parseWallClockMinutes(slot.split('-')[0]);
  if (minutes === null) {
    return slot;
  }
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
};

/**
 * "04:20 PM-05:20 PM" → "16:20 – 17:20".
 *
 * The slot string already states its end, so that is what is shown. The old
 * version ignored it and added `Service.duration` to the start instead, which
 * disagreed with the slot — and with the server — whenever a service was not
 * exactly one hour long. `durationMinutes` is now only a fallback for a slot
 * with no parseable end.
 */
export const formatSlotRange = (
  slot?: string | null,
  durationMinutes?: number | null,
): string => {
  const start = formatSlotTime(slot);
  if (!start) {
    return '';
  }
  const pad = (v: number) => String(v).padStart(2, '0');
  const asClock = (totalMinutes: number) =>
    `${pad(Math.floor(totalMinutes / 60) % 24)}:${pad(totalMinutes % 60)}`;

  const parsed = parseSlotMinutes(slot);
  if (parsed) {
    return `${start} – ${asClock(parsed.endMinutes)}`;
  }

  const startMinutes = parseWallClockMinutes(String(slot).split('-')[0]);
  if (startMinutes === null) {
    return start;
  }
  const fallback =
    startMinutes + (durationMinutes && durationMinutes > 0 ? durationMinutes : 60);
  return `${start} – ${asClock(fallback)}`;
};

/** Metres under a kilometre, one decimal above it. */
export const formatDistance = (metres?: number | null): string => {
  if (metres == null || !Number.isFinite(metres)) {
    return '';
  }
  if (metres < 1000) {
    return `${Math.round(metres)} m`;
  }
  return `${(metres / 1000).toFixed(1)} km`;
};

/** 96 → "1h 36m", 45 → "45 min". */
export const formatDuration = (minutes?: number | null): string => {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return '';
  }
  const m = Math.round(minutes);
  if (m < 60) {
    return `${m} min`;
  }
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

/** Initials for an avatar, at most two letters. */
export const initialsOf = (name?: string | null): string => {
  if (!name) {
    return '--';
  }
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '--';
};

/** "2026-11-27T09:31:00Z" → "09:31". */
export const formatClock = (iso?: string | null): string => {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
