/**
 * The upload queue, as React state.
 *
 * Screens need two things from it: how many photos are still going up for
 * the job in front of them, and whether any have been given up on.
 */

import {useEffect, useMemo, useState} from 'react';
import {
  QueuedPhoto,
  subscribe,
  startPhotoQueue,
  drain,
  retryPhoto,
  discardPhoto,
} from '../services/upload/photoQueue';

export interface PhotoQueueState {
  /** Everything queued, across all bookings. */
  all: QueuedPhoto[];
  /** Queued for this booking and side — the count a screen shows. */
  waiting: QueuedPhoto[];
  /** Entries that have stopped retrying and need a re-shoot. */
  lost: QueuedPhoto[];
  retry: (id: string) => Promise<void>;
  discard: (id: string) => Promise<void>;
  drainNow: () => Promise<void>;
}

export const usePhotoQueue = (
  bookingId?: string | null,
  type?: 'BEFORE' | 'AFTER',
): PhotoQueueState => {
  const [all, setAll] = useState<QueuedPhoto[]>([]);

  useEffect(() => {
    startPhotoQueue();
    return subscribe(setAll);
  }, []);

  const forThisJob = useMemo(
    () =>
      all.filter(
        i =>
          (!bookingId || i.bookingId === bookingId) && (!type || i.type === type),
      ),
    [all, bookingId, type],
  );

  return {
    all,
    waiting: forThisJob.filter(i => i.state !== 'lost'),
    lost: forThisJob.filter(i => i.state === 'lost'),
    retry: retryPhoto,
    discard: discardPhoto,
    drainNow: drain,
  };
};
