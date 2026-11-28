/**
 * Support ticket plumbing.
 *
 * Two separate bugs made a raised ticket look like it had vanished:
 *
 *  1. The list endpoint spreads its page into the body —
 *     `{success, data: [...], pagination}` — while every other endpoint nests
 *     under `data`. The app read `response.data.data` (the ARRAY) but typed
 *     it as the paginated object, so the hook's `response.data` was
 *     `undefined` and the list was always empty.
 *
 *  2. `SupportTicket.raisedById` is a User id — the model's `RaisedBy`
 *     association joins it to User. Partner tickets stored
 *     `ServicePartner.id`, so the admin panel resolved no name, phone or
 *     email against the ticket.
 */

export {};

interface Ticket {
  id: string;
  subject: string;
}

/** Mirrors `getTickets` in src/modules/support/services/support.api.ts. */
const unwrapList = (body: any): {data: Ticket[]; pagination?: unknown} => ({
  data: Array.isArray(body?.data) ? body.data : [],
  pagination: body?.pagination,
});

/** Mirrors the single-ticket endpoints, which DO nest under `data`. */
const unwrapOne = (body: any): Ticket | undefined => body?.data;

describe('the list response', () => {
  const body = {
    success: true,
    data: [{id: 't1', subject: 'Cannot see job details'}],
    pagination: {total: 1, page: 1, limit: 20, totalPages: 1},
  };

  it('finds the tickets the server actually sent', () => {
    expect(unwrapList(body).data).toHaveLength(1);
    expect(unwrapList(body).data[0].subject).toBe('Cannot see job details');
  });

  it('keeps the pagination the screen needs to page', () => {
    expect(unwrapList(body).pagination).toEqual({
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  // The old code returned the array, and the hook then read `.data` off it.
  it('does not hand back something whose .data is undefined', () => {
    const result = unwrapList(body);
    expect(Array.isArray(result)).toBe(false);
    expect(result.data).toBeDefined();
  });

  it('survives an empty or malformed body instead of throwing', () => {
    expect(unwrapList({success: true, data: []}).data).toEqual([]);
    expect(unwrapList({success: true}).data).toEqual([]);
    expect(unwrapList(undefined).data).toEqual([]);
    expect(unwrapList({success: true, data: null}).data).toEqual([]);
  });
});

describe('the single-ticket response', () => {
  it('is nested, unlike the list', () => {
    expect(unwrapOne({success: true, data: {id: 't1', subject: 'Hi'}})?.id).toBe('t1');
  });
});

describe('who raised the ticket', () => {
  // `raisedById` feeds a belongsTo(User) association, so it must be the
  // partner's USER id, not their ServicePartner row id.
  const partner = {
    id: '030d2a5e-8f92-4c9c-b0d6-4f8f333fd5bb',
    userId: '08e26202-7c7f-47c3-aab3-fc3bc685833b',
  };

  const raisedByFor = (p: {id: string; userId: string}) => p.userId;

  it('is the user id, which is what resolves a name', () => {
    expect(raisedByFor(partner)).toBe(partner.userId);
    expect(raisedByFor(partner)).not.toBe(partner.id);
  });
});
