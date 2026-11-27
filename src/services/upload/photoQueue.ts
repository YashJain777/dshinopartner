/**
 * Evidence photo upload queue.
 *
 * Before this, a failed upload was simply lost: the screen showed
 * "Upload failed" and the partner had to walk back to the panel and shoot it
 * again. Doorstep work happens in basements, lift lobbies and gated
 * compounds, so a dropped upload is normal, not exceptional.
 *
 * The queue takes the photo the moment it is captured, persists the intent,
 * and keeps trying. The partner can carry on shooting the other three angles
 * while the first is still going up.
 *
 * Retries are attempted when:
 *   - a photo is enqueued
 *   - the app returns to the foreground
 *   - a screen showing the queue asks it to (focus, pull-to-refresh)
 *   - the backoff timer fires
 *
 * There is no connectivity listener: @react-native-community/netinfo is not
 * a dependency, and adding a native module to learn something a failed
 * request already tells us is not worth it. The cost is that a retry can
 * happen a few seconds later than a NetInfo-driven one would.
 *
 * KNOWN LIMIT: the queue stores the picker's file URI, which on Android
 * points into the app cache. That survives a restart but the OS may reclaim
 * it under storage pressure, in which case the upload fails permanently and
 * the entry is marked `lost` so the screen can ask for a re-shoot rather
 * than retrying forever. Holding the bytes ourselves would need
 * react-native-fs; this is the honest behaviour until then.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState, AppStateStatus} from 'react-native';
import {uploadJobPhotos} from '../api/booking.api';
import {logger} from '../../utils/logger';

const STORAGE_KEY = '@dshino_photo_queue';

/** Give up after this many tries and ask the partner to shoot it again. */
const MAX_ATTEMPTS = 6;

/** Backoff per attempt, in ms. The last value repeats. */
const BACKOFF_MS = [2000, 5000, 15000, 30000, 60000];

export type QueuedPhotoState = 'pending' | 'uploading' | 'lost';

export interface QueuedPhoto {
  id: string;
  bookingId: string;
  type: 'BEFORE' | 'AFTER';
  uri: string;
  attempts: number;
  state: QueuedPhotoState;
  createdAt: number;
  lastError?: string;
}

type Listener = (items: QueuedPhoto[]) => void;

let queue: QueuedPhoto[] = [];
let listeners: Listener[] = [];
let loaded = false;
let draining = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const notify = () => {
  const snapshot = [...queue];
  listeners.forEach(l => {
    try {
      l(snapshot);
    } catch {
      // A bad subscriber must not stop the queue.
    }
  });
};

const persist = async () => {
  try {
    // `uploading` is a runtime state; on reload those are pending again.
    const toStore = queue.map(item =>
      item.state === 'uploading' ? {...item, state: 'pending' as const} : item,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (err: any) {
    logger.warn?.('[photoQueue] could not persist', err?.message);
  }
};

const load = async (): Promise<void> => {
  if (loaded) {
    return;
  }
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        queue = parsed.filter(
          (i: any) => i && typeof i.uri === 'string' && typeof i.bookingId === 'string',
        );
      }
    }
  } catch (err: any) {
    logger.warn?.('[photoQueue] could not read stored queue', err?.message);
    queue = [];
  }
  notify();
};

const scheduleDrain = (delayMs: number) => {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    timer = null;
    drain();
  }, delayMs);
};

/**
 * Uploads one item at a time. Sequential on purpose: four photos racing over
 * a weak connection is how you get four timeouts instead of one success.
 */
export const drain = async (): Promise<void> => {
  await load();
  if (draining) {
    return;
  }

  const next = queue.find(i => i.state === 'pending');
  if (!next) {
    return;
  }

  draining = true;
  next.state = 'uploading';
  notify();

  try {
    await uploadJobPhotos(next.bookingId, next.uri, next.type);
    queue = queue.filter(i => i.id !== next.id);
    await persist();
    notify();
    draining = false;
    // Straight on to the next one while the connection is good.
    drain();
    return;
  } catch (err: any) {
    next.attempts += 1;
    next.lastError = err?.response?.data?.message || err?.message || 'Upload failed';

    // A 4xx other than 408/429 means the server refused this photo — the
    // booking moved on, or the file is unreadable. Retrying cannot fix it.
    const status = err?.response?.status;
    const permanent =
      (status >= 400 && status < 500 && status !== 408 && status !== 429) ||
      next.attempts >= MAX_ATTEMPTS;

    next.state = permanent ? 'lost' : 'pending';
    await persist();
    notify();
    draining = false;

    if (!permanent) {
      scheduleDrain(BACKOFF_MS[Math.min(next.attempts - 1, BACKOFF_MS.length - 1)]);
    }
  }
};

/** Adds a photo and starts trying immediately. */
export const enqueuePhoto = async (
  bookingId: string,
  uri: string,
  type: 'BEFORE' | 'AFTER',
): Promise<QueuedPhoto> => {
  await load();
  const item: QueuedPhoto = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    bookingId,
    type,
    uri,
    attempts: 0,
    state: 'pending',
    createdAt: Date.now(),
  };
  queue = [...queue, item];
  await persist();
  notify();
  drain();
  return item;
};

/** Drops an entry the partner has given up on (or re-shot). */
export const discardPhoto = async (id: string): Promise<void> => {
  await load();
  queue = queue.filter(i => i.id !== id);
  await persist();
  notify();
};

/** Puts a `lost` entry back in the queue, for a manual "try again". */
export const retryPhoto = async (id: string): Promise<void> => {
  await load();
  const item = queue.find(i => i.id === id);
  if (item) {
    item.attempts = 0;
    item.state = 'pending';
    item.lastError = undefined;
    await persist();
    notify();
    drain();
  }
};

/** Everything still queued for one booking and side. */
export const pendingFor = (
  items: QueuedPhoto[],
  bookingId?: string | null,
  type?: 'BEFORE' | 'AFTER',
): QueuedPhoto[] =>
  items.filter(
    i =>
      (!bookingId || i.bookingId === bookingId) &&
      (!type || i.type === type),
  );

export const subscribe = (listener: Listener): (() => void) => {
  listeners = [...listeners, listener];
  load().then(() => listener([...queue]));
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

export const getQueue = (): QueuedPhoto[] => [...queue];

/**
 * Retry whenever the app comes back to the foreground — the single most
 * likely moment for a partner to have walked back into signal.
 */
let appStateSub: {remove: () => void} | null = null;
let lastAppState: AppStateStatus = AppState.currentState;

export const startPhotoQueue = (): void => {
  if (appStateSub) {
    return;
  }
  appStateSub = AppState.addEventListener('change', next => {
    if (lastAppState.match(/inactive|background/) && next === 'active') {
      drain();
    }
    lastAppState = next;
  });
  drain();
};
