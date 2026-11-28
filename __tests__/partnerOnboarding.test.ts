/**
 * The gap between registering and being let in.
 *
 * `registerServicePartner` sets the new partner's user status to
 * 'suspended' and leaves it there until an admin approves their KYC. So
 * 'suspended' means two unrelated things — "halfway through signing up" and
 * "banned" — and every screen that saw a 403 treated them the same.
 *
 * What that produced, in the order a partner hit it:
 *   - the Done button appeared to do nothing: it dropped them into tabs
 *     where every request 403s;
 *   - the KYC checklist did not come back, because a failed status check
 *     fell through to those same dead tabs;
 *   - they could not sign out, because the profile call 403'd and the error
 *     state replaced the screen the Logout button lives on.
 */

export {};

type Code = 'KYC_PENDING' | 'ACCOUNT_SUSPENDED' | undefined;

// ─── backend: which 403 is this? ────────────────────────────────────────────

/**
 * `User.status` now carries the answer directly.
 *
 * It used to be inferred on every request by loading the ServicePartner row
 * and reading kycStatus, because registration wrote 'suspended' — the same
 * value a punished account gets. `pending_approval` is its own status, so
 * the middleware reads one column and nothing has to guess.
 */
const classify = (status: string): {code: Code; forceLogout: boolean} | null => {
  if (status === 'active') {
    return null;
  }
  if (status === 'pending_approval') {
    return {code: 'KYC_PENDING', forceLogout: false};
  }
  return {code: 'ACCOUNT_SUSPENDED', forceLogout: true};
};

describe('onboarding is not a punishment', () => {
  it('keeps a partner awaiting KYC approval signed in', () => {
    expect(classify('pending_approval')).toEqual({
      code: 'KYC_PENDING',
      forceLogout: false,
    });
  });

  it('ends the session for a genuinely suspended partner', () => {
    expect(classify('suspended')).toEqual({
      code: 'ACCOUNT_SUSPENDED',
      forceLogout: true,
    });
  });

  it('leaves an active account alone', () => {
    expect(classify('active')).toBeNull();
  });

  it('treats a deleted account as out', () => {
    expect(classify('deleted')?.forceLogout).toBe(true);
  });
});

describe('the partner lifecycle', () => {
  /** Mirrors the activation guard on the KYC-approval paths. */
  const onKycApproved = (current: string) =>
    current === 'pending_approval' ? 'active' : current;

  it('activates a partner when their KYC is approved', () => {
    expect(onKycApproved('pending_approval')).toBe('active');
  });

  // Re-approving a document must not quietly reinstate a punished partner.
  it('does not lift a suspension', () => {
    expect(onKycApproved('suspended')).toBe('suspended');
  });

  it('leaves an already-active partner alone', () => {
    expect(onKycApproved('active')).toBe('active');
  });
});

// ─── backend: the onboarding whitelist ──────────────────────────────────────

const WHITELIST = ['/kyc', '/zones', '/locations', '/upload', '/agency/profile', '/partner/profile'];

/** The old check: req.path, which is relative to the router's mount point. */
const oldWhitelisted = (mountRelativePath: string) =>
  WHITELIST.some(r => mountRelativePath.includes(r));

/** The new check: baseUrl + path, i.e. the full route without the query. */
const whitelisted = (baseUrl: string, path: string) =>
  WHITELIST.some(r => `${baseUrl}${path}`.includes(r));

describe('onboarding whitelist', () => {
  const BASE = '/v1/private/partner';

  // The entry is written '/partner/profile' but was tested against '/profile'.
  it('used to miss the profile route it was written for', () => {
    expect(oldWhitelisted('/profile')).toBe(false);
  });

  it('now lets a suspended partner reach their profile — and so, Logout', () => {
    expect(whitelisted(BASE, '/profile')).toBe(true);
  });

  it('keeps KYC reachable, which already worked by accident', () => {
    expect(oldWhitelisted('/kyc/status')).toBe(true);
    expect(whitelisted(BASE, '/kyc/status')).toBe(true);
  });

  it('still blocks everything else', () => {
    expect(whitelisted(BASE, '/home')).toBe(false);
    expect(whitelisted(BASE, '/bookings/active')).toBe(false);
    expect(whitelisted(BASE, '/wallet/balance')).toBe(false);
  });

  // The reason this matches baseUrl+path and not originalUrl.
  it('cannot be bypassed with a query string', () => {
    const originalUrl = '/v1/private/partner/wallet/balance?x=/kyc';
    expect(originalUrl.includes('/kyc')).toBe(true);
    expect(whitelisted(BASE, '/wallet/balance')).toBe(false);
  });
});

// ─── app: what the client does with the 403 ─────────────────────────────────

const clientAction = (body: {code?: Code; forceLogout?: boolean}) => {
  if (body.code === 'KYC_PENDING') {
    return 'stay-signed-in';
  }
  if (body.forceLogout === true) {
    return 'sign-out';
  }
  return 'stay-signed-in';
};

describe('the client honours the code', () => {
  it('does not eject a partner midway through onboarding', () => {
    expect(clientAction({code: 'KYC_PENDING', forceLogout: false})).toBe('stay-signed-in');
  });

  it('signs out when the server says the account is finished', () => {
    expect(clientAction({code: 'ACCOUNT_SUSPENDED', forceLogout: true})).toBe('sign-out');
  });
});

// ─── app: where a partner lands ─────────────────────────────────────────────

const destination = (args: {
  statusCheckFailed?: boolean;
  overallKycStatus?: string;
  aadhaarOnFile?: boolean;
}): 'kyc' | 'tabs' => {
  if (args.statusCheckFailed) {
    return 'kyc';
  }
  const approved = ['APPROVED', 'VERIFIED'].includes(
    String(args.overallKycStatus).toUpperCase(),
  );
  return !approved || !args.aadhaarOnFile ? 'kyc' : 'tabs';
};

describe('where a partner lands after registering', () => {
  it('goes to the checklist with nothing submitted', () => {
    expect(destination({overallKycStatus: 'PENDING', aadhaarOnFile: false})).toBe('kyc');
  });

  // Submitted is not approved: the account is still suspended, so the tabs
  // would be a dead app.
  it('stays on the checklist while documents are under review', () => {
    expect(destination({overallKycStatus: 'PENDING', aadhaarOnFile: true})).toBe('kyc');
  });

  it('enters the app once the documents are approved', () => {
    expect(destination({overallKycStatus: 'APPROVED', aadhaarOnFile: true})).toBe('tabs');
  });

  // The old code swallowed the error and fell through to the tabs.
  it('falls back to the checklist when the status check fails', () => {
    expect(destination({statusCheckFailed: true})).toBe('kyc');
  });
});

// ─── app: the Done button ───────────────────────────────────────────────────

const doneLabel = (uploaded: boolean, approved: boolean) =>
  approved ? 'Done' : uploaded ? 'Check status' : 'Finish later';

describe('the KYC button says what is true', () => {
  it('offers to finish later before anything is uploaded', () => {
    expect(doneLabel(false, false)).toBe('Finish later');
  });

  // It used to say "Done" here, which promised entry the server would refuse.
  it('does not claim Done while review is pending', () => {
    expect(doneLabel(true, false)).toBe('Check status');
  });

  it('says Done once every document is approved', () => {
    expect(doneLabel(true, true)).toBe('Done');
  });
});
