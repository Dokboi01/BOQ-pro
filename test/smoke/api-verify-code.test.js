import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/verify-code.js';
import * as auth from '../../api/_lib/firebase-auth.js';
import * as firestore from '../../api/_lib/firestore.js';

vi.mock('../../api/_lib/firebase-auth.js');
vi.mock('../../api/_lib/firestore.js', () => ({
  getDocumentByPath: vi.fn(),
  patchDocumentByPath: vi.fn(),
  patchProfileDocument: vi.fn(),
  deleteDocumentByPath: vi.fn(),
}));

describe('/api/verify-code brute-force protection', () => {
  let req; let res;
  beforeEach(() => {
    vi.resetAllMocks();
    req = { method: 'POST', headers: {}, body: { code: '123456' } };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    vi.mocked(auth.requireFirebaseAuth).mockResolvedValue({ user_id: 'user-1', email: 'user@example.com' });
    vi.mocked(firestore.deleteDocumentByPath).mockResolvedValue(undefined);
    vi.mocked(firestore.getDocumentByPath).mockResolvedValue({ uid: 'user-1', code: '999999', attempts: 0, expiresAt: new Date(Date.now() + 60_000).toISOString() });
  });

  it('persists failed attempts for an incorrect code', async () => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(firestore.patchDocumentByPath).toHaveBeenCalledWith('verification_codes/user@example.com', { attempts: 1 });
  });

  it('invalidates the code after the fifth failed attempt', async () => {
    vi.mocked(firestore.getDocumentByPath).mockResolvedValue({ uid: 'user-1', code: '999999', attempts: 4, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(firestore.deleteDocumentByPath).toHaveBeenCalledWith('verification_codes/user@example.com');
  });

  it('does not accept a code associated with another user ID', async () => {
    vi.mocked(firestore.getDocumentByPath).mockResolvedValue({ uid: 'other-user', code: '123456', attempts: 0, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(firestore.patchProfileDocument).not.toHaveBeenCalled();
  });
});
