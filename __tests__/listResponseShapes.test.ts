/**
 * Response-shape handling for the paginated lists.
 *
 * Reading the rows off the wrong level returns an empty list with no error —
 * the screen just looks like the partner has no history. These pin down both
 * the current and the older server shapes.
 */

jest.mock('../src/services/api/client', () => ({
  __esModule: true,
  default: {get: jest.fn()},
  replaceUrlParams: (url: string) => url,
}));

import apiClient from '../src/services/api/client';
import {getBookings} from '../src/services/api/booking.api';
import {getTransactions} from '../src/services/api/wallet.api';

const mockGet = apiClient.get as unknown as jest.Mock;

const BOOKING = {id: 'bk-1', bookingNumber: 'DSH-1', status: 'COMPLETED'};
const TXN = {id: 'tx-1', type: 'CREDIT', amount: '250.50', description: 'Job', createdAt: '2026-11-26'};

beforeEach(() => jest.clearAllMocks());

describe('getBookings', () => {
  it('reads the paginated shape { data, pagination }', async () => {
    mockGet.mockResolvedValue({
      data: {success: true, data: {data: [BOOKING], pagination: {total: 35}}},
    });

    const page = await getBookings({page: 1, limit: 20});
    expect(page.bookings).toHaveLength(1);
    expect(page.total).toBe(35);
  });

  // An older deployment returns the array directly; `.data` off an array is
  // undefined, which silently emptied the history screen.
  it('reads the legacy flat-array shape', async () => {
    mockGet.mockResolvedValue({data: {success: true, data: [BOOKING, BOOKING]}});

    const page = await getBookings();
    expect(page.bookings).toHaveLength(2);
    // No count available — fall back to what was returned, not 0.
    expect(page.total).toBe(2);
  });

  it('returns an empty page rather than throwing on an unexpected body', async () => {
    mockGet.mockResolvedValue({data: {success: true}});
    await expect(getBookings()).resolves.toEqual({bookings: [], total: 0});
  });

  it('passes the status filter through to the server', async () => {
    mockGet.mockResolvedValue({data: {success: true, data: {data: [], pagination: {total: 0}}}});

    await getBookings({page: 2, limit: 20, status: 'CANCELLED,SLA_BREACHED'});
    expect(mockGet).toHaveBeenCalledWith(
      '/private/partner/bookings',
      {params: {page: 2, limit: 20, status: 'CANCELLED,SLA_BREACHED'}},
    );
  });
});

describe('getTransactions', () => {
  it('reads rows and count spread onto the response body', async () => {
    mockGet.mockResolvedValue({
      data: {success: true, data: [TXN], pagination: {total: 120}},
    });

    const page = await getTransactions({page: 1, limit: 20});
    expect(page.transactions).toHaveLength(1);
    expect(page.total).toBe(120);
  });

  it('also reads a nested { data, pagination } body', async () => {
    mockGet.mockResolvedValue({
      data: {success: true, data: {data: [TXN], pagination: {total: 7}}},
    });

    const page = await getTransactions();
    expect(page.transactions).toHaveLength(1);
    expect(page.total).toBe(7);
  });

  it('normalises a row without inventing an id', async () => {
    mockGet.mockResolvedValue({data: {success: true, data: [TXN], pagination: {total: 1}}});

    const [txn] = (await getTransactions()).transactions;
    expect(txn).toEqual({
      id: 'tx-1',
      type: 'CREDIT',
      amount: 250.5,
      description: 'Job',
      date: '2026-11-26',
      balance: 0,
    });
  });

  it('defaults an unknown type to CREDIT only when it is not DEBIT', async () => {
    mockGet.mockResolvedValue({
      data: {success: true, data: [{...TXN, type: 'DEBIT'}], pagination: {total: 1}},
    });
    expect((await getTransactions()).transactions[0].type).toBe('DEBIT');
  });

  it('sends the type filter only when one is selected', async () => {
    mockGet.mockResolvedValue({data: {success: true, data: [], pagination: {total: 0}}});

    await getTransactions({page: 1, limit: 20, type: undefined});
    expect(mockGet).toHaveBeenCalledWith(
      '/private/partner/wallet/transactions',
      {params: {page: 1, limit: 20, type: undefined}},
    );
  });
});
