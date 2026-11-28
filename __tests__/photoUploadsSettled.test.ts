/**
 * Refreshing once a booking's photos have actually landed.
 *
 * Capture is offline-first: the photo goes into the queue and the partner walks
 * straight back to the job screen. The focus refresh there runs while the last
 * upload is still in flight, so the photo gates stayed shut on a job whose
 * photos were about to arrive.
 */

import React from 'react';
import {act, create, ReactTestRenderer} from 'react-test-renderer';
import {usePhotoUploadsSettled} from '../src/hooks/usePhotoUploadsSettled';
import type {QueuedPhoto} from '../src/services/upload/photoQueue';

let mockEmit: (items: QueuedPhoto[]) => void = () => {};
const mockUnsubscribe = jest.fn();

jest.mock('../src/services/upload/photoQueue', () => ({
  subscribe: (listener: (items: QueuedPhoto[]) => void) => {
    mockEmit = listener;
    return mockUnsubscribe;
  },
  pendingFor: (
    items: QueuedPhoto[],
    bookingId?: string | null,
    type?: 'BEFORE' | 'AFTER',
  ) =>
    items.filter(
      i => (!bookingId || i.bookingId === bookingId) && (!type || i.type === type),
    ),
}));

/** Mounts the hook. No testing-library here, so a host component stands in. */
const renderHook = (bookingId: string | null, onSettled: () => void) => {
  const Harness: React.FC = () => {
    usePhotoUploadsSettled(bookingId, onSettled);
    return null;
  };
  // Assigned synchronously inside act(), which TypeScript cannot see.
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(React.createElement(Harness));
  });
  return {unmount: () => act(() => tree.unmount())};
};

const photo = (overrides: Partial<QueuedPhoto> = {}): QueuedPhoto =>
  ({
    id: 'p1',
    bookingId: 'booking-1',
    type: 'BEFORE',
    uri: 'file://1.jpg',
    attempts: 0,
    state: 'pending',
    createdAt: 1,
    ...overrides,
  } as QueuedPhoto);

beforeEach(() => {
  jest.clearAllMocks();
  mockEmit = () => {};
});

describe('usePhotoUploadsSettled', () => {
  it('refreshes when the last upload leaves the queue', () => {
    const onSettled = jest.fn();
    renderHook('booking-1', onSettled);

    mockEmit([photo()]);
    expect(onSettled).not.toHaveBeenCalled();

    mockEmit([]);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  // Otherwise every screen that mounts with an empty queue would refetch.
  it('does not refresh when the queue was already empty', () => {
    const onSettled = jest.fn();
    renderHook('booking-1', onSettled);

    mockEmit([]);

    expect(onSettled).not.toHaveBeenCalled();
  });

  it('ignores photos belonging to another booking', () => {
    const onSettled = jest.fn();
    renderHook('booking-1', onSettled);

    mockEmit([photo({bookingId: 'booking-2'})]);
    mockEmit([]);

    expect(onSettled).not.toHaveBeenCalled();
  });

  // A lost photo will never reach the server, so it must not hold the
  // transition open for the rest of the shift.
  it('treats a given-up photo as no longer waiting', () => {
    const onSettled = jest.fn();
    renderHook('booking-1', onSettled);

    mockEmit([photo()]);
    mockEmit([photo({state: 'lost'})]);

    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('refreshes again for a second batch', () => {
    const onSettled = jest.fn();
    renderHook('booking-1', onSettled);

    mockEmit([photo()]);
    mockEmit([]);
    mockEmit([photo({id: 'p2'})]);
    mockEmit([]);

    expect(onSettled).toHaveBeenCalledTimes(2);
  });

  it('does nothing until there is a booking to watch', () => {
    const onSettled = jest.fn();
    renderHook(null, onSettled);

    mockEmit([photo()]);
    mockEmit([]);

    expect(onSettled).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const {unmount} = renderHook('booking-1', jest.fn());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
