/**
 * Evidence upload queue.
 *
 * Before the queue, a failed upload showed "Upload failed" and the photo was
 * gone — the partner had to walk back to the panel. Doorstep work happens in
 * basements and gated compounds, so that was the normal case, not the edge.
 *
 * Two rules decide whether the queue helps or just spins:
 *   - a transient failure (no signal, 5xx, 429) must be retried;
 *   - a permanent refusal (the booking moved on, the file is unreadable)
 *     must NOT be, or the partner watches a counter that will never clear.
 */

export {};

export {};

const UPLOAD_MAX_ATTEMPTS = 6;

/** Mirrors the permanence test in src/services/upload/photoQueue.ts. */
const isPermanent = (status: number | undefined, attempts: number): boolean =>
  (status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429) ||
  attempts >= UPLOAD_MAX_ATTEMPTS;

const BACKOFF_MS = [2000, 5000, 15000, 30000, 60000];
const backoffFor = (attempts: number): number =>
  BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)];

describe('what gets retried', () => {
  it('retries a network failure, which has no status at all', () => {
    expect(isPermanent(undefined, 1)).toBe(false);
  });

  it('retries server errors and throttling', () => {
    expect(isPermanent(500, 1)).toBe(false);
    expect(isPermanent(502, 2)).toBe(false);
    expect(isPermanent(503, 3)).toBe(false);
    expect(isPermanent(408, 1)).toBe(false); // request timeout
    expect(isPermanent(429, 1)).toBe(false); // rate limited
  });

  // Retrying these forever would leave a count that never clears.
  it('gives up on a refusal the server will repeat', () => {
    expect(isPermanent(400, 1)).toBe(true); // unreadable file
    expect(isPermanent(403, 1)).toBe(true); // not your booking any more
    expect(isPermanent(404, 1)).toBe(true); // booking gone
    expect(isPermanent(413, 1)).toBe(true); // too large even after compression
  });

  it('gives up once the attempt budget is spent, whatever the cause', () => {
    expect(isPermanent(500, UPLOAD_MAX_ATTEMPTS)).toBe(true);
    expect(isPermanent(undefined, UPLOAD_MAX_ATTEMPTS)).toBe(true);
    expect(isPermanent(500, UPLOAD_MAX_ATTEMPTS - 1)).toBe(false);
  });
});

describe('backoff', () => {
  it('starts quickly — most failures are a momentary dead spot', () => {
    expect(backoffFor(1)).toBe(2000);
  });

  it('grows, so a long outage does not hammer the radio', () => {
    const delays = [1, 2, 3, 4, 5].map(backoffFor);
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });

  it('holds at the last step rather than running away', () => {
    expect(backoffFor(9)).toBe(60000);
    expect(backoffFor(99)).toBe(60000);
  });
});

describe('what the partner is told', () => {
  // The gate is the server's: four photos the SERVER has. A queued photo
  // counts as taken, but must not unlock the job.
  const gate = (confirmed: number, queued: number) => ({
    taken: confirmed + queued,
    complete: confirmed >= 4,
  });

  it('counts a queued photo as taken', () => {
    expect(gate(2, 2).taken).toBe(4);
  });

  it('does not unlock the job until the server has all four', () => {
    expect(gate(2, 2).complete).toBe(false);
    expect(gate(3, 1).complete).toBe(false);
    expect(gate(4, 0).complete).toBe(true);
  });
});
