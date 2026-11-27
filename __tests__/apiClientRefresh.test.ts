/**
 * Single-flight token refresh.
 *
 * The backend rotates refresh tokens and treats a reused one as theft: it
 * deletes every session for that user. Screens fire 3-4 requests in parallel,
 * so without the mutex an expired access token sent several refreshes carrying
 * the same token and logged the partner out — the highest-severity defect in
 * the app before this change.
 */

jest.mock('axios');

const mockLogout = jest.fn();
const mockSetTokens = jest.fn();
let mockStoreState: any;

jest.mock('../src/store/auth.store', () => ({
  useAuthStore: {getState: () => mockStoreState},
}));

import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

/** Captures the interceptor handlers the client registers on import. */
const interceptors: {
  request?: (c: any) => any;
  responseOk?: (r: any) => any;
  responseErr?: (e: any) => any;
} = {};

let instanceCalls: any[] = [];

const makeInstance = () => {
  const instance: any = jest.fn((config: any) => {
    instanceCalls.push(config);
    return Promise.resolve({data: {ok: true}, config});
  });
  instance.interceptors = {
    request: {use: (fn: any) => (interceptors.request = fn)},
    response: {
      use: (ok: any, err: any) => {
        interceptors.responseOk = ok;
        interceptors.responseErr = err;
      },
    },
  };
  return instance;
};

beforeAll(() => {
  mockedAxios.create = jest.fn(makeInstance) as any;
  // Importing the client registers its interceptors against the mock instance.
  require('../src/services/api/client');
});

beforeEach(() => {
  jest.clearAllMocks();
  instanceCalls = [];
  mockStoreState = {
    token: 'expired-access',
    refreshToken: 'refresh-1',
    isAuthenticated: true,
    setTokens: mockSetTokens,
    logout: mockLogout,
  };
});

/** A 401 as axios reports it. */
const unauthorized = (url: string) => ({
  response: {status: 401, data: {}},
  config: {url, headers: {}},
  message: 'Request failed with status code 401',
});

describe('401 handling', () => {
  it('sends exactly one refresh for four concurrent 401s', async () => {
    mockedAxios.post = jest.fn().mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                data: {data: {accessToken: 'fresh-access', refreshToken: 'refresh-2'}},
              }),
            10,
          ),
        ),
    ) as any;

    await Promise.all([
      interceptors.responseErr!(unauthorized('/private/partner/home')),
      interceptors.responseErr!(unauthorized('/private/partner/profile')),
      interceptors.responseErr!(unauthorized('/private/partner/notifications')),
      interceptors.responseErr!(unauthorized('/private/partner/wallet/balance')),
    ]);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/public/auth/refresh-token'),
      {refreshToken: 'refresh-1'},
    );
    // All four original requests are retried.
    expect(instanceCalls).toHaveLength(4);
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('retries each request with the new token', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: {data: {accessToken: 'fresh-access', refreshToken: 'refresh-2'}},
    }) as any;

    await interceptors.responseErr!(unauthorized('/private/partner/home'));

    expect(instanceCalls[0].headers.Authorization).toBe('Bearer fresh-access');
    expect(mockSetTokens).toHaveBeenCalledWith('fresh-access', 'refresh-2');
  });

  it('refreshes again on a later expiry, once the first has settled', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: {data: {accessToken: 'a2', refreshToken: 'r2'}},
    }) as any;

    await interceptors.responseErr!(unauthorized('/private/partner/home'));
    await interceptors.responseErr!(unauthorized('/private/partner/home'));

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('logs out when the refresh itself fails', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('invalid session')) as any;

    await expect(
      interceptors.responseErr!(unauthorized('/private/partner/home')),
    ).rejects.toThrow('invalid session');

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('logs out when there is no refresh token', async () => {
    mockStoreState.refreshToken = null;
    mockedAxios.post = jest.fn() as any;

    await expect(
      interceptors.responseErr!(unauthorized('/private/partner/home')),
    ).rejects.toThrow();

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  // These run during logout; refreshing on their behalf would re-enter logout.
  it.each([
    '/private/partner/settings/fcm-token',
    '/private/partner/auth/logout',
    '/public/auth/refresh-token',
  ])('does not refresh for %s', async (url) => {
    mockedAxios.post = jest.fn() as any;

    await expect(interceptors.responseErr!(unauthorized(url))).rejects.toBeDefined();

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('does not retry the same request twice', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: {data: {accessToken: 'a2', refreshToken: 'r2'}},
    }) as any;

    const alreadyRetried = {
      ...unauthorized('/private/partner/home'),
      config: {url: '/private/partner/home', headers: {}, _retry: true},
    };

    await expect(interceptors.responseErr!(alreadyRetried)).rejects.toBeDefined();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
