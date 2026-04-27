import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api/ai.js';
import * as firebaseAuth from '../../api/_lib/firebase-auth.js';
import * as aiProvider from '../../api/_lib/ai-provider.js';

vi.mock('../../api/_lib/firebase-auth.js');
vi.mock('../../api/_lib/ai-provider.js');

describe('API Route: /api/ai', () => {
  let req;
  let res;
  let resData;

  beforeEach(() => {
    vi.resetAllMocks();
    
    resData = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((data) => {
        resData = data;
        return res;
      }),
      send: vi.fn().mockImplementation((data) => {
        resData = data;
        return res;
      }),
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    
    req = {
      method: 'POST',
      headers: {},
      body: {}
    };
  });

  it('rejects non-POST requests with 405', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects unauthorized requests', async () => {
    const error = new Error('Authentication required.');
    error.status = 401;
    vi.mocked(firebaseAuth.requireFirebaseAuth).mockRejectedValue(error);
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(resData.error).toBe('Authentication required.');
  });

  it('rejects unknown actions with 400', async () => {
    vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user' });
    req.body = { action: 'unknown-action' };
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(resData.error).toBe('Unknown AI action.');
  });

  it('processes valid action successfully', async () => {
    vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user' });
    vi.mocked(aiProvider.generateRateInsight).mockResolvedValue({ some: 'data' });
    
    req.body = { action: 'rate-insight', item: 'cement' };
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(resData.success).toBe(true);
    expect(resData.result).toEqual({ some: 'data' });
  });
});
