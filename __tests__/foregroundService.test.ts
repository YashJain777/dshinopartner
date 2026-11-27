/**
 * The Android foreground service wrapper.
 *
 * It sits on a platform boundary: the native module exists only on Android, and
 * a refusal from Android must not take tracking down with it, because
 * foreground tracking still works without the service.
 */

const loadOn = (os: 'android' | 'ios', native?: unknown) => {
  let mod: typeof import('../src/services/location/foregroundService');
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: {OS: os},
      NativeModules: native === undefined ? {} : {LocationTracking: native},
    }));
    mod = require('../src/services/location/foregroundService');
  });
  // @ts-expect-error assigned inside isolateModules
  return mod;
};

afterEach(() => {
  jest.dontMock('react-native');
});

describe('on android', () => {
  it('starts and stops the native service', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const mod = loadOn('android', {start, stop});

    await mod.startForegroundService();
    await mod.stopForegroundService();

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  // Foreground tracking still works, so a refusal must not propagate and
  // abort the watcher.
  it('swallows a refusal to start', async () => {
    const start = jest.fn().mockRejectedValue(new Error('service not allowed'));
    const mod = loadOn('android', {start, stop: jest.fn()});

    await expect(mod.startForegroundService()).resolves.toBeUndefined();
  });

  it('swallows a refusal to stop', async () => {
    const stop = jest.fn().mockRejectedValue(new Error('not running'));
    const mod = loadOn('android', {start: jest.fn(), stop});

    await expect(mod.stopForegroundService()).resolves.toBeUndefined();
  });

  // A debug build made before the native module was added would crash here.
  it('does nothing when the native module is missing', async () => {
    const mod = loadOn('android');

    await expect(mod.startForegroundService()).resolves.toBeUndefined();
    await expect(mod.stopForegroundService()).resolves.toBeUndefined();
  });
});

describe('on ios', () => {
  it('does not touch the native module', async () => {
    const start = jest.fn();
    const stop = jest.fn();
    const mod = loadOn('ios', {start, stop});

    await mod.startForegroundService();
    await mod.stopForegroundService();

    expect(start).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
  });
});
