/**
 * Live location tracking.
 *
 * This is what the customer's tracking map reads, so the cases that matter are
 * the ones that would silently stop feeding it: a payload the backend rejects,
 * a tunnel that loses the trail, and a junk fix that teleports the partner.
 */

import type {GeoPosition} from 'react-native-geolocation-service';

const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();
const mockUpdateLocation = jest.fn();
const mockSyncLocations = jest.fn();
const mockCheckPermission = jest.fn();
const mockRequestPermission = jest.fn();
const mockStartForegroundService = jest.fn();
const mockStopForegroundService = jest.fn();

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    watchPosition: (...args: unknown[]) => mockWatchPosition(...args),
    clearWatch: (...args: unknown[]) => mockClearWatch(...args),
  },
  PositionError: {
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
    PLAY_SERVICE_NOT_AVAILABLE: 4,
    SETTINGS_NOT_SATISFIED: 5,
    INTERNAL_ERROR: -1,
  },
}));

jest.mock('../src/services/api/availability.api', () => ({
  updateLocation: (...args: unknown[]) => mockUpdateLocation(...args),
  syncLocations: (...args: unknown[]) => mockSyncLocations(...args),
}));

jest.mock('../src/utils/permissions', () => ({
  checkLocationPermission: () => mockCheckPermission(),
  requestLocationPermission: () => mockRequestPermission(),
}));

jest.mock('../src/services/location/foregroundService', () => ({
  startForegroundService: () => mockStartForegroundService(),
  stopForegroundService: () => mockStopForegroundService(),
}));

type Tracker = typeof import('../src/services/location/locationTracker');

/** Interval the tracker throttles on, from API_CONFIG. */
const INTERVAL = 45000;

const fixAt = (
  timestamp: number,
  overrides: Partial<GeoPosition['coords']> = {},
): GeoPosition =>
  ({
    timestamp,
    coords: {
      latitude: 19.076,
      longitude: 72.8777,
      accuracy: 12,
      altitude: null,
      heading: null,
      speed: null,
      ...overrides,
    },
  } as GeoPosition);

/** Loads a fresh copy, because the tracker holds the watcher in module state. */
const loadTracker = (): Tracker => {
  let tracker: Tracker;
  jest.isolateModules(() => {
    tracker = require('../src/services/location/locationTracker');
  });
  // @ts-expect-error assigned inside isolateModules
  return tracker;
};

/** Starts tracking and hands back the callback the watcher was given. */
const start = async (tracker: Tracker, onStop = jest.fn()) => {
  await tracker.startLocationTracking({onStop});
  const [onPosition, onError] = mockWatchPosition.mock.calls[0] ?? [];
  return {
    onPosition: onPosition as (p: GeoPosition) => void,
    onError: onError as (e: {code: number; message: string}) => void,
    onStop,
  };
};

/** Lets the tracker's un-awaited promise chain settle. */
const settle = () => new Promise<void>(resolve => setImmediate(() => resolve()));

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckPermission.mockResolvedValue(true);
  mockRequestPermission.mockResolvedValue('granted');
  mockUpdateLocation.mockResolvedValue({success: true});
  mockSyncLocations.mockResolvedValue({success: true});
  mockWatchPosition.mockReturnValue(7);
  mockStartForegroundService.mockResolvedValue(undefined);
  mockStopForegroundService.mockResolvedValue(undefined);
});

describe('starting and stopping', () => {
  it('attaches one watcher and reports it is tracking', async () => {
    const tracker = loadTracker();
    await start(tracker);

    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
    expect(tracker.isTracking()).toBe(true);
  });

  it('does not attach a second watcher when started again', async () => {
    const tracker = loadTracker();
    await start(tracker);
    await tracker.startLocationTracking({});

    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
  });

  it('releases the watcher on stop', async () => {
    const tracker = loadTracker();
    await start(tracker);
    tracker.stopLocationTracking();

    expect(mockClearWatch).toHaveBeenCalledWith(7);
    expect(tracker.isTracking()).toBe(false);
  });

  it('holds the foreground service while the watcher is attached', async () => {
    const tracker = loadTracker();
    await start(tracker);

    expect(mockStartForegroundService).toHaveBeenCalledTimes(1);
    expect(mockStopForegroundService).not.toHaveBeenCalled();

    tracker.stopLocationTracking();

    expect(mockStopForegroundService).toHaveBeenCalledTimes(1);
  });

  it('does not start a second service when started again', async () => {
    const tracker = loadTracker();
    await start(tracker);
    await tracker.startLocationTracking({});

    expect(mockStartForegroundService).toHaveBeenCalledTimes(1);
  });

  // A notification claiming the customer can see the partner, with nothing
  // being sent, is worse than no notification.
  it('releases the service when permission is revoked mid-drive', async () => {
    const tracker = loadTracker();
    const {onError} = await start(tracker);

    onError({code: 1, message: 'denied'});

    expect(mockStopForegroundService).toHaveBeenCalledTimes(1);
  });

  it('never starts the service when permission is refused', async () => {
    mockCheckPermission.mockResolvedValue(false);
    mockRequestPermission.mockResolvedValue('denied');
    const tracker = loadTracker();

    await tracker.startLocationTracking({});

    expect(mockStartForegroundService).not.toHaveBeenCalled();
  });

  it('never attaches a watcher when permission is refused', async () => {
    mockCheckPermission.mockResolvedValue(false);
    mockRequestPermission.mockResolvedValue('denied');
    const tracker = loadTracker();
    const onStop = jest.fn();

    await tracker.startLocationTracking({onStop});

    expect(mockWatchPosition).not.toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledWith('PERMISSION_DENIED');
  });
});

describe('what gets sent', () => {
  it('sends the first fix', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    onPosition(fixAt(1_000_000));
    await settle();

    expect(mockUpdateLocation).toHaveBeenCalledWith({
      lat: 19.076,
      lng: 72.8777,
      accuracy: 12,
    });
  });

  // Joi validates these as numbers, so a null would be rejected outright and
  // the whole update lost.
  it('omits heading and speed rather than sending null', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    onPosition(fixAt(1_000_000, {heading: null, speed: null}));
    await settle();

    const payload = mockUpdateLocation.mock.calls[0][0];
    expect('bearing' in payload).toBe(false);
    expect('speed' in payload).toBe(false);
  });

  it('includes heading and speed once the partner is moving', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    onPosition(fixAt(1_000_000, {heading: 182.5, speed: 8.3}));
    await settle();

    expect(mockUpdateLocation).toHaveBeenCalledWith({
      lat: 19.076,
      lng: 72.8777,
      accuracy: 12,
      bearing: 182.5,
      speed: 8.3,
    });
  });

  it('throttles a second fix inside the interval', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    onPosition(fixAt(1_000_000));
    await settle();
    onPosition(fixAt(1_000_000 + INTERVAL - 1));
    await settle();

    expect(mockUpdateLocation).toHaveBeenCalledTimes(1);
  });

  it('sends again once the interval has passed', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    onPosition(fixAt(1_000_000));
    await settle();
    onPosition(fixAt(1_000_000 + INTERVAL));
    await settle();

    expect(mockUpdateLocation).toHaveBeenCalledTimes(2);
  });

  it('discards a fix too inaccurate to place the partner', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    onPosition(fixAt(1_000_000, {accuracy: 450}));
    await settle();

    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });
});

describe('losing the connection', () => {
  it('replays a buffered fix once a later send succeeds', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    mockUpdateLocation.mockRejectedValueOnce(new Error('offline'));
    onPosition(fixAt(1_000_000));
    await settle();

    expect(mockSyncLocations).not.toHaveBeenCalled();

    onPosition(fixAt(1_000_000 + INTERVAL));
    await settle();

    expect(mockSyncLocations).toHaveBeenCalledTimes(1);
    const [breadcrumbs] = mockSyncLocations.mock.calls[0];
    expect(breadcrumbs).toHaveLength(1);
    expect(breadcrumbs[0]).toMatchObject({lat: 19.076, lng: 72.8777});
    expect(breadcrumbs[0].timestamp).toBe(new Date(1_000_000).toISOString());
  });

  it('keeps buffering while every send fails', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    mockUpdateLocation.mockRejectedValue(new Error('offline'));
    onPosition(fixAt(1_000_000));
    await settle();
    onPosition(fixAt(1_000_000 + INTERVAL));
    await settle();

    // Nothing was delivered, so the throttle never advanced and nothing synced.
    expect(mockSyncLocations).not.toHaveBeenCalled();

    mockUpdateLocation.mockResolvedValue({success: true});
    onPosition(fixAt(1_000_000 + INTERVAL * 2));
    await settle();

    const [breadcrumbs] = mockSyncLocations.mock.calls[0];
    expect(breadcrumbs).toHaveLength(2);
  });

  it('hands over the remaining trail when tracking stops', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    mockUpdateLocation.mockRejectedValueOnce(new Error('offline'));
    onPosition(fixAt(1_000_000));
    await settle();

    tracker.stopLocationTracking();
    await settle();

    expect(mockSyncLocations).toHaveBeenCalledTimes(1);
  });

  it('retains the trail when the sync itself fails', async () => {
    const tracker = loadTracker();
    const {onPosition} = await start(tracker);

    mockUpdateLocation.mockRejectedValueOnce(new Error('offline'));
    onPosition(fixAt(1_000_000));
    await settle();

    mockSyncLocations.mockRejectedValueOnce(new Error('offline'));
    onPosition(fixAt(1_000_000 + INTERVAL));
    await settle();

    onPosition(fixAt(1_000_000 + INTERVAL * 2));
    await settle();

    expect(mockSyncLocations).toHaveBeenCalledTimes(2);
    const [breadcrumbs] = mockSyncLocations.mock.calls[1];
    expect(breadcrumbs).toHaveLength(1);
  });
});

describe('watcher errors', () => {
  it('stops and reports when permission is revoked mid-drive', async () => {
    const tracker = loadTracker();
    const {onError, onStop} = await start(tracker);

    onError({code: 1, message: 'denied'});

    expect(mockClearWatch).toHaveBeenCalledWith(7);
    expect(onStop).toHaveBeenCalledWith('PERMISSION_DENIED');
    expect(tracker.isTracking()).toBe(false);
  });

  it('stops and reports when location services are switched off', async () => {
    const tracker = loadTracker();
    const {onError, onStop} = await start(tracker);

    onError({code: 5, message: 'settings not satisfied'});

    expect(onStop).toHaveBeenCalledWith('UNAVAILABLE');
  });

  it('keeps the watcher through a transient timeout', async () => {
    const tracker = loadTracker();
    const {onError, onStop} = await start(tracker);

    onError({code: 3, message: 'timeout'});

    expect(mockClearWatch).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(tracker.isTracking()).toBe(true);
  });
});
