/**
 * Refetch once a booking's queued photos have all left the queue.
 *
 * Capturing is deliberately offline-first: a photo goes into the upload queue
 * and the partner walks back to the job screen straight away. Returning there
 * refetches, but the upload is usually still in flight at that moment, so the
 * server has nothing yet and the photo gates stay closed on a job whose photos
 * are about to land.
 *
 * This fires on the transition that matters — the booking's queue going from
 * holding something to holding nothing — so the gates open as soon as the last
 * upload is actually accepted.
 */

import {useEffect, useRef} from 'react';
import {pendingFor, subscribe} from '../services/upload/photoQueue';

export const usePhotoUploadsSettled = (
  bookingId: string | null | undefined,
  onSettled: () => void,
): void => {
  // Kept in refs so a callback or id that changes identity every render does
  // not resubscribe, which would re-deliver the current queue each time.
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const bookingIdRef = useRef(bookingId);
  bookingIdRef.current = bookingId;

  useEffect(() => {
    let waiting = 0;

    return subscribe(items => {
      const id = bookingIdRef.current;
      if (!id) {
        return;
      }

      // 'lost' photos have given up and will never reach the server, so they
      // must not hold the transition open for the rest of the shift.
      const outstanding = pendingFor(items, id).filter(
        photo => photo.state !== 'lost',
      ).length;

      if (waiting > 0 && outstanding === 0) {
        onSettledRef.current();
      }
      waiting = outstanding;
    });
  }, []);
};
