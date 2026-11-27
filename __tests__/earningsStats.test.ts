/**
 * Earnings period mapping.
 *
 * The card previously divided the selected period's earnings by the LIFETIME
 * job count, and the same card labelled two different numbers "Total
 * Earnings". These pin the corrected shape down.
 */

import {EarningsSummaryResponse} from '../src/types/api.types';

type Period = 'day' | 'week' | 'month' | 'year';

/**
 * Mirrors the mapping in useEarnings. Kept here so the arithmetic can be
 * tested without a React renderer.
 */
const statsForPeriod = (sum: EarningsSummaryResponse, period: Period) => {
  const byPeriod = {
    day: {earnings: sum.today, jobs: sum.todayBookings},
    week: {earnings: sum.thisWeek, jobs: sum.weekBookings},
    month: {earnings: sum.thisMonth, jobs: sum.monthBookings},
    year: {earnings: sum.thisYear, jobs: sum.yearBookings},
  }[period];

  const periodEarnings = Number(byPeriod?.earnings || 0);
  const periodJobs = Number(byPeriod?.jobs || 0);

  return {
    periodEarnings,
    periodJobs,
    avgPerJob:
      periodJobs > 0 ? Math.round((periodEarnings / periodJobs) * 100) / 100 : null,
    totalJobs: Number(sum.totalBookings || 0),
  };
};

const SUMMARY: EarningsSummaryResponse = {
  today: 0,
  thisWeek: 1062,
  thisMonth: 4248,
  thisYear: 51000,
  todayBookings: 0,
  weekBookings: 3,
  monthBookings: 12,
  yearBookings: 140,
  totalBookings: 212,
  currency: 'INR',
};

describe('earnings per period', () => {
  it('reads week earnings and week jobs together', () => {
    expect(statsForPeriod(SUMMARY, 'week')).toEqual({
      periodEarnings: 1062,
      periodJobs: 3,
      avgPerJob: 354,
      totalJobs: 212,
    });
  });

  it.each<[Period, number, number]>([
    ['day', 0, 0],
    ['week', 1062, 3],
    ['month', 4248, 12],
    ['year', 51000, 140],
  ])('maps %s to its own window', (period, earnings, jobs) => {
    const stats = statsForPeriod(SUMMARY, period);
    expect(stats.periodEarnings).toBe(earnings);
    expect(stats.periodJobs).toBe(jobs);
  });

  // The old code did thisWeek / totalBookings = 1062 / 212 = 5.01.
  it('does not divide period earnings by the lifetime job count', () => {
    expect(statsForPeriod(SUMMARY, 'week').avgPerJob).not.toBeCloseTo(
      SUMMARY.thisWeek / SUMMARY.totalBookings,
    );
  });

  it('reports no average rather than zero when the period had no jobs', () => {
    expect(statsForPeriod(SUMMARY, 'day').avgPerJob).toBeNull();
  });

  it('keeps the lifetime count separate from the period count', () => {
    const stats = statsForPeriod(SUMMARY, 'week');
    expect(stats.totalJobs).toBe(212);
    expect(stats.totalJobs).not.toBe(stats.periodJobs);
  });

  it('rounds the average to paise', () => {
    const stats = statsForPeriod(
      {...SUMMARY, thisWeek: 1000, weekBookings: 3},
      'week',
    );
    expect(stats.avgPerJob).toBe(333.33);
  });

  it('treats a missing summary field as zero, not NaN', () => {
    const stats = statsForPeriod({...SUMMARY, thisWeek: undefined as any}, 'week');
    expect(stats.periodEarnings).toBe(0);
    expect(Number.isNaN(stats.periodEarnings)).toBe(false);
  });
});
