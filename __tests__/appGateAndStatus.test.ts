/**
 * Startup gate and booking-status mapping.
 */

import {
  BOOKING_STATUS,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_TONES,
  BookingStatus,
} from '../src/constants/api.constants';

/**
 * Mirrors the branch order in useAppGate. Kept as a helper so the rules can be
 * tested without a React renderer.
 */
const resolveStatus = (config: {maintenanceMode: boolean; updateRequired: boolean}) =>
  config.maintenanceMode
    ? 'MAINTENANCE'
    : config.updateRequired
    ? 'UPDATE_REQUIRED'
    : 'OK';

describe('booking status mapping', () => {
  const statuses = Object.values(BOOKING_STATUS) as BookingStatus[];

  it('covers every backend status with a label', () => {
    statuses.forEach(s => {
      expect(BOOKING_STATUS_LABELS[s]).toBeTruthy();
      // A raw database string must never reach the partner.
      expect(BOOKING_STATUS_LABELS[s]).not.toBe(s);
    });
  });

  it('covers every backend status with a tone', () => {
    statuses.forEach(s => {
      expect(BOOKING_STATUS_TONES[s]).toBeDefined();
    });
  });

  it('uses the statuses the partner endpoints actually return', () => {
    // getActiveBooking filters on exactly these.
    ['PARTNER_ASSIGNED', 'EN_ROUTE', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].forEach(s => {
      expect(statuses).toContain(s as BookingStatus);
    });
  });

  it('no longer carries the statuses the backend never sends', () => {
    expect(statuses).not.toContain('ACCEPTED' as BookingStatus);
    expect(statuses).not.toContain('PENDING' as BookingStatus);
  });

  it('marks a cancellation and a breach as failures, not normal outcomes', () => {
    expect(BOOKING_STATUS_TONES.CANCELLED).toBe('danger');
    expect(BOOKING_STATUS_TONES.SLA_BREACHED).toBe('danger');
    expect(BOOKING_STATUS_TONES.COMPLETED).toBe('success');
  });

  it('shows a breach in partner-friendly words', () => {
    expect(BOOKING_STATUS_LABELS.SLA_BREACHED).toBe('Running Behind');
  });
});

describe('app gate rules', () => {
  it('blocks on maintenance mode', () => {
    expect(resolveStatus({maintenanceMode: true, updateRequired: false})).toBe('MAINTENANCE');
  });

  it('blocks when the build is below the minimum', () => {
    expect(resolveStatus({maintenanceMode: false, updateRequired: true})).toBe('UPDATE_REQUIRED');
  });

  it('prefers maintenance over update when both apply', () => {
    expect(resolveStatus({maintenanceMode: true, updateRequired: true})).toBe('MAINTENANCE');
  });

  it('lets a supported build through', () => {
    expect(resolveStatus({maintenanceMode: false, updateRequired: false})).toBe('OK');
  });
});

describe('appConfig request', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports platform and version so the backend can compare', async () => {
    jest.resetModules();
    const apiClient = {get: jest.fn().mockResolvedValue({data: {data: {}}})};
    jest.doMock('../src/services/api/client', () => ({
      __esModule: true,
      default: apiClient,
    }));

    const {getAppConfig} = require('../src/services/api/appConfig.api');
    const {APP_VERSION} = require('../src/constants/app.constants');
    await getAppConfig();

    expect(apiClient.get).toHaveBeenCalledWith(
      '/public/app-config',
      {params: {platform: expect.any(String), version: APP_VERSION}},
    );
  });
});
