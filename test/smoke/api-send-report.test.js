/* global process */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../api/send-report.js';
import * as firebaseAuth from '../../api/_lib/firebase-auth.js';

vi.mock('../../api/_lib/firebase-auth.js');

// Mock resend
vi.mock('resend', () => {
  return {
    Resend: class {
      constructor() {
        this.emails = {
          send: vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null })
        };
      }
    }
  };
});

describe('API Route: /api/send-report', () => {
  let req;
  let res;
  let resData;
  let originalEnv;

  beforeEach(() => {
    vi.resetAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' };
    
    resData = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((data) => {
        resData = data;
        return res;
      }),
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    
    req = {
      method: 'POST',
      headers: {},
      body: {
        to: 'test@example.com',
        projectName: 'Test Project'
      }
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects non-POST requests with 405', async () => {
    req.method = 'GET';
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('fails if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.VITE_RESEND_API_KEY;
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(resData.error).toContain('Email service not configured');
  });

  it('rejects unauthorized requests', async () => {
    const error = new Error('Authentication required.');
    error.status = 401;
    vi.mocked(firebaseAuth.requireFirebaseAuth).mockRejectedValue(error);
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('requires missing required fields', async () => {
    vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user', email: 'user@example.com' });
    req.body.to = '';
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(resData.error).toContain('Missing required fields');
  });

  it('processes valid report request successfully', async () => {
    vi.mocked(firebaseAuth.requireFirebaseAuth).mockResolvedValue({ user_id: 'test-user', email: 'user@example.com' });
    
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(resData.success).toBe(true);
    expect(resData.id).toBe('mock-email-id');
  });
});
