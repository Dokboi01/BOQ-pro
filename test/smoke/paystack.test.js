/* global Buffer */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import initHandler from '../../api/paystack-initialize-subscription.js';
import verifyHandler from '../../api/paystack-verify-subscription.js';
import * as firebaseAuth from '../../api/_lib/firebase-auth.js';
import * as paystackLib from '../../api/_lib/paystack.js';
import * as subscriptionSync from '../../api/_lib/subscriptionSync.js';

vi.mock('../../api/_lib/firebase-auth.js');
vi.mock('../../api/_lib/paystack.js');
vi.mock('../../api/_lib/subscriptionSync.js');

describe('API Routes: Paystack', () => {
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
      on: vi.fn((event, cb) => {
        if (event === 'data') cb(Buffer.from(JSON.stringify(req.body || {})));
        if (event === 'end') cb();
      }),
      body: {}
    };
  });

  describe('POST /api/paystack-initialize-subscription', () => {
    it('rejects non-POST requests with 405', async () => {
      req.method = 'GET';
      await initHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('rejects unauthorized requests', async () => {
      const error = new Error('Authentication required.');
      error.status = 401;
      vi.mocked(firebaseAuth.requireFirebaseAuth).mockRejectedValue(error);
      
      await initHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('fails without required fields', async () => {
      vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user', email: 'user@example.com' });
      // body is empty
      
      await initHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(resData.error).toContain('Missing required fields');
    });

    it('successfully initializes checkout', async () => {
      vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user', email: 'user@example.com' });
      vi.mocked(paystackLib.initializeSubscriptionTransaction).mockResolvedValue({
        authorization_url: 'https://checkout.paystack.com/xxxx',
        reference: 'test-ref'
      });
      
      req.body = { planName: 'Pro', billingCycle: 'monthly' };
      
      await initHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(resData.success).toBe(true);
      expect(resData.authorization_url).toBe('https://checkout.paystack.com/xxxx');
    });
  });

  describe('POST /api/paystack-verify-subscription', () => {
    it('fails without reference', async () => {
      vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user', email: 'user@example.com' });
      
      await verifyHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(resData.error).toContain('reference is required');
    });

    it('rejects cross-user verification', async () => {
      // Authenticated as test-user
      vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user', email: 'user@example.com' });
      
      // Transaction belongs to other-user
      vi.mocked(paystackLib.verifySubscriptionTransaction).mockResolvedValue({
        transaction: { status: 'success', amount: 500000 },
        context: { userId: 'other-user', email: 'other@example.com' },
        expectedAmount: 500000
      });
      
      req.body = { reference: 'test-ref' };
      
      await verifyHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(resData.status).toBe('forbidden');
    });

    it('successfully verifies and syncs', async () => {
      vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user', email: 'user@example.com' });
      
      const mockTransaction = { status: 'success', amount: 500000 };
      vi.mocked(paystackLib.verifySubscriptionTransaction).mockResolvedValue({
        transaction: mockTransaction,
        context: { userId: 'test-user', email: 'user@example.com' },
        expectedAmount: 500000
      });
      
      vi.mocked(subscriptionSync.applyVerifiedSubscriptionCharge).mockResolvedValue({ isPro: true });
      
      req.body = { reference: 'test-ref' };
      
      await verifyHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(resData.success).toBe(true);
      expect(resData.verified).toBe(true);
      expect(resData.serverSynced).toBe(true);
    });
  });
});
