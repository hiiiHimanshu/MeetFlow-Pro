import { describe, it, expect, vi } from 'vitest';
import { workspaceScope } from '../../apps/api/src/scopes';

function mockReq(headers: Record<string, string> = {}, body: any = {}, query: any = {}) {
  return { header: (k: string) => headers[k.toLowerCase()], body, query } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('workspaceScope', () => {
  it('allows when header provided', () => {
    const req: any = mockReq({ 'x-workspace-id': 'ws1' });
    const res = mockRes();
    const next = vi.fn();
    workspaceScope(req, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.workspaceId).toBe('ws1');
  });

  it('rejects when missing', () => {
    const req: any = mockReq();
    const res = mockRes();
    const next = vi.fn();
    workspaceScope(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
