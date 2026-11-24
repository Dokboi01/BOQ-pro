import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/market-price-proposals.js';
import * as auth from '../../api/_lib/firebase-auth.js';
import * as firestore from '../../api/_lib/firestore.js';

vi.mock('../../api/_lib/firebase-auth.js');
vi.mock('../../api/_lib/firestore.js', () => ({
  listCollectionDocuments: vi.fn(),
  patchDocumentByPath: vi.fn(),
}));

describe('/api/market-price-proposals authorization and method handling', () => {
  let req; let res;
  beforeEach(() => {
    vi.resetAllMocks();
    req = { method: 'GET', headers: {}, query: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn(), end: vi.fn() };
  });

  it('returns 401 when Firebase authentication fails', async () => {
    vi.mocked(auth.requireFirebaseAuth).mockRejectedValue(Object.assign(new Error('Authentication required.'), { status: 401 }));
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required.' });
  });

  it('returns 403 to authenticated non-admins', async () => {
    vi.mocked(auth.requireFirebaseAuth).mockResolvedValue({ user_id: 'u1' });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 405 for unsupported methods after admin authorization', async () => {
    req.method = 'DELETE';
    vi.mocked(auth.requireFirebaseAuth).mockResolvedValue({ user_id: 'admin', admin: true });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('lists proposals for an authenticated admin', async () => {
    const proposals = [{ id: 'proposal-1', status: 'pending' }];
    vi.mocked(auth.requireFirebaseAuth).mockResolvedValue({ user_id: 'admin', admin: true });
    vi.mocked(firestore.listCollectionDocuments).mockResolvedValue(proposals);
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ proposals, total: 1 });
  });
});
