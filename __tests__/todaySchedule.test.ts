/**
 * Today's schedule grouping.
 *
 * The Jobs tab used to show a single booking while a partner can hold up to
 * maxBookingsPerPartnerPerDay. These pin down which job is "current" and what
 * is left in the route.
 */

import {ScheduledJob} from '../src/services/api/schedule.api';
import {TERMINAL_STATUSES, BookingStatus} from '../src/constants/api.constants';

const LIVE_STATUSES: BookingStatus[] = [
  'EN_ROUTE',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
];

/** Mirrors the grouping in useTodaySchedule, testable without a renderer. */
const group = (jobs: ScheduledJob[]) => {
  const completed = jobs.filter(job => TERMINAL_STATUSES.includes(job.status));
  const open = jobs.filter(job => !TERMINAL_STATUSES.includes(job.status));
  const live = open.find(job => LIVE_STATUSES.includes(job.status));
  const currentJob = live ?? open[0] ?? null;
  const upcoming = open.filter(job => job.id !== currentJob?.id);
  return {currentJob, upcoming, completed};
};

const job = (id: string, status: BookingStatus, slot: string): ScheduledJob => ({
  id,
  bookingNumber: `DSH-${id}`,
  scheduledDate: '2026-11-26',
  scheduledTimeSlot: slot,
  status,
  netAmount: '500',
  clusterSequence: null,
  lat: null,
  lng: null,
  Service: {id: 'svc', name: 'Premium Wash', duration: 60},
  Cluster: null,
});

describe('today schedule grouping', () => {
  it('picks the first open job when nothing has started', () => {
    const jobs = [
      job('1', 'PARTNER_ASSIGNED', '02:00 PM-02:15 PM'),
      job('2', 'PARTNER_ASSIGNED', '02:45 PM-03:00 PM'),
      job('3', 'PARTNER_ASSIGNED', '03:30 PM-04:30 PM'),
    ];

    const {currentJob, upcoming} = group(jobs);
    expect(currentJob!.id).toBe('1');
    expect(upcoming.map(j => j.id)).toEqual(['2', '3']);
  });

  // A started job stays current even if an earlier slot is still open.
  it.each<BookingStatus>(['EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'])(
    'prefers the job already %s over an earlier slot',
    status => {
      const jobs = [
        job('1', 'PARTNER_ASSIGNED', '02:00 PM-02:15 PM'),
        job('2', status, '02:45 PM-03:00 PM'),
      ];

      const {currentJob, upcoming} = group(jobs);
      expect(currentJob!.id).toBe('2');
      expect(upcoming.map(j => j.id)).toEqual(['1']);
    },
  );

  it('keeps finished jobs out of the current slot and the upcoming list', () => {
    const jobs = [
      job('1', 'COMPLETED', '09:00 AM-10:00 AM'),
      job('2', 'REVIEWED', '11:00 AM-12:00 PM'),
      job('3', 'PARTNER_ASSIGNED', '02:00 PM-02:15 PM'),
    ];

    const {currentJob, upcoming, completed} = group(jobs);
    expect(currentJob!.id).toBe('3');
    expect(upcoming).toHaveLength(0);
    expect(completed.map(j => j.id)).toEqual(['1', '2']);
  });

  it('reports no current job once the day is finished', () => {
    const {currentJob, upcoming, completed} = group([
      job('1', 'COMPLETED', '09:00 AM-10:00 AM'),
    ]);

    expect(currentJob).toBeNull();
    expect(upcoming).toHaveLength(0);
    expect(completed).toHaveLength(1);
  });

  it('reports no current job on an empty day', () => {
    expect(group([]).currentJob).toBeNull();
  });

  it('never lists the current job as upcoming', () => {
    const jobs = [
      job('1', 'ARRIVED', '02:00 PM-02:15 PM'),
      job('2', 'PARTNER_ASSIGNED', '02:45 PM-03:00 PM'),
    ];
    const {currentJob, upcoming} = group(jobs);
    expect(upcoming.some(j => j.id === currentJob!.id)).toBe(false);
  });
});
