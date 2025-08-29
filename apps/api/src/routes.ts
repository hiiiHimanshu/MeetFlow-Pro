import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from './index';
import { signedUploadUrl, signedDownloadUrl, putObject } from './storage';
import { enqueueSummarizeJob } from './workerClient';
import { postToSlack } from './integrations';
import { workspaceScope } from './scopes';

export const router = Router();

// Simple auth stub (replace with Auth.js session verification via middleware)
router.use(workspaceScope);

// Health
router.get('/health', async (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const ingestSchema = z.object({
  workspaceId: z.string(),
  title: z.string().min(1),
  fileUrl: z.string().url().optional(),
  text: z.string().optional(),
  calendarEventId: z.string().optional()
});

router.post('/meetings/ingest', async (req: Request, res: Response) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { workspaceId, title, fileUrl, text, calendarEventId } = parsed.data;

  const meeting = await prisma.meeting.create({ data: { workspaceId, title, transcriptUrl: fileUrl, transcriptText: text, calendarEventId } });
  await enqueueSummarizeJob({ meetingId: meeting.id });
  res.json({ meeting });
});

// List recent meetings for a workspace
router.get('/meetings', async (req: Request, res: Response) => {
  const wsId = (req as any).workspaceId as string;
  const take = Math.min(Number(req.query.limit ?? 20), 50);
  const items = await prisma.meeting.findMany({
    where: { workspaceId: wsId },
    orderBy: { createdAt: 'desc' },
    take
  });
  res.json({ meetings: items });
});

router.post('/meetings/:id/summarize', async (req: Request, res: Response) => {
  const { id } = req.params;
  await enqueueSummarizeJob({ meetingId: id });
  res.json({ queued: true });
});

router.get('/meetings/:id/summary', async (req: Request, res: Response) => {
  const { id } = req.params;
  const summary = await prisma.summary.findFirst({ where: { meetingId: id }, orderBy: { createdAt: 'desc' } });
  res.json({ summary });
});

// Meeting detail with latest summary and action items
router.get('/meetings/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return res.status(404).json({ error: 'not found' });
  const summary = await prisma.summary.findFirst({ where: { meetingId: id }, orderBy: { createdAt: 'desc' } });
  const actions = await prisma.actionItem.findMany({ where: { meetingId: id }, orderBy: { createdAt: 'desc' } });
  res.json({ meeting, summary, actions });
});

const actionsSchema = z.object({
  meetingId: z.string(),
  items: z.array(z.object({ text: z.string(), assignee: z.string().optional(), dueDate: z.string().optional() }))
});

router.post('/actions/bulk-create', async (req: Request, res: Response) => {
  const parsed = actionsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { meetingId, items } = parsed.data;
  const created = await prisma.$transaction(items.map((i: any) => prisma.actionItem.create({ data: { meetingId, text: i.text, assignee: i.assignee, dueDate: i.dueDate ? new Date(i.dueDate) : undefined } })));
  res.json({ items: created });
});

// Webhooks with idempotency
const webhookSchema = z.object({ idempotencyKey: z.string(), payload: z.any() });

router.post('/webhooks/slack', async (req: Request, res: Response) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({});
  const { idempotencyKey, payload } = parsed.data;
  // TODO: verify Slack signature using SLACK_SIGNING_SECRET
  const existing = await prisma.webhookEvent.findUnique({ where: { idempotencyKey } }).catch(() => null);
  if (existing) return res.json({ ok: true, idempotent: true });
  await prisma.webhookEvent.create({ data: { source: 'slack', idempotencyKey, payload } });
  res.json({ ok: true });
});

router.post('/webhooks/zoom', async (req: Request, res: Response) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({});
  const { idempotencyKey, payload } = parsed.data;
  const existing = await prisma.webhookEvent.findUnique({ where: { idempotencyKey } }).catch(() => null);
  if (existing) return res.json({ ok: true, idempotent: true });
  await prisma.webhookEvent.create({ data: { source: 'zoom', idempotencyKey, payload } });
  res.json({ ok: true });
});

router.post('/webhooks/google', async (req: Request, res: Response) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({});
  const { idempotencyKey, payload } = parsed.data;
  const existing = await prisma.webhookEvent.findUnique({ where: { idempotencyKey } }).catch(() => null);
  if (existing) return res.json({ ok: true, idempotent: true });
  await prisma.webhookEvent.create({ data: { source: 'google', idempotencyKey, payload } });
  res.json({ ok: true });
});

router.get('/storage/upload-url', async (_req: Request, res: Response) => {
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  const url = await signedUploadUrl(key);
  res.json({ key, url });
});

router.get('/storage/download-url', async (req: Request, res: Response) => {
  const key = z.string().parse(req.query.key);
  const url = await signedDownloadUrl(key);
  res.json({ url });
});

// Post latest summary to Slack
router.post('/meetings/:id/post-slack', async (req: Request, res: Response) => {
  const { id } = req.params;
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  const summary = await prisma.summary.findFirst({ where: { meetingId: id }, orderBy: { createdAt: 'desc' } });
  if (!meeting || !summary) return res.status(404).json({ error: 'not found' });
  const ok = await postToSlack(`#general`, `*${meeting.title}*\n\n${summary.content}`);
  res.json({ ok });
});

// Return signed URL to summary PDF
router.get('/meetings/:id/pdf', async (req: Request, res: Response) => {
  const { id } = req.params;
  const summary = await prisma.summary.findFirst({ where: { meetingId: id }, orderBy: { createdAt: 'desc' } });
  if (!summary?.pdfKey) return res.status(404).json({ error: 'no pdf' });
  const url = await signedDownloadUrl(summary.pdfKey);
  res.json({ url });
});

// Upsert Notion page with latest summary
router.post('/meetings/:id/notion', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { parentId } = req.body as { parentId: string };
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  const summary = await prisma.summary.findFirst({ where: { meetingId: id }, orderBy: { createdAt: 'desc' } });
  if (!meeting || !summary) return res.status(404).json({ error: 'not found' });
  try {
    const { upsertNotionPage } = await import('./integrations');
    const page = await upsertNotionPage(parentId, meeting.title, summary.content);
    res.json({ ok: true, page });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'notion error' });
  }
});
