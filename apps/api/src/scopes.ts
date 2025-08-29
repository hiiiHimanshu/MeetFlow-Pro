import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Basic workspace scoping using header X-Workspace-Id (for demo)
export function workspaceScope(req: Request, res: Response, next: NextFunction) {
  const wsId = z.string().safeParse(req.header('x-workspace-id') || req.body?.workspaceId || req.query?.workspaceId);
  if (!wsId.success) return res.status(401).json({ error: 'workspace required' });
  (req as any).workspaceId = wsId.data;
  next();
}
