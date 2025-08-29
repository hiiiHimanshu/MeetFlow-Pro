import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
// Try common env file locations
const envPaths = [
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import * as Sentry from '@sentry/node';
import { loadEnv } from '@repo/config';
import { PrismaClient } from '@prisma/client';
import { chunkText, extractActionItems } from './lib/text';
import { renderHtmlReport } from './lib/pdf';
import { embedChunks, generateSummary } from './lib/llm';
import { putObject } from './lib/storage';

const env = loadEnv(process.env);
Sentry.init({ dsn: env.SENTRY_DSN || undefined });

const connection = new IORedis(env.REDIS_URL);
const prisma = new PrismaClient();

async function processSummarize(job: Job<{ meetingId: string }>) {
  const { meetingId } = job.data;
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return;
  const text = meeting.transcriptText ?? '';
  const chunks = chunkText(text, 1500, 200);
  const embeddings = await embedChunks(chunks);
  // Store embeddings in Pinecone via embedChunks implementation

  const summary = await generateSummary(text);
  const saved = await prisma.summary.create({ data: { meetingId, content: summary } });

  const items = extractActionItems(summary);
  await prisma.$transaction(items.map((i: { text: string; assignee?: string; dueDate?: string }) => prisma.actionItem.create({ data: { meetingId, text: i.text, assignee: i.assignee, dueDate: i.dueDate ? new Date(i.dueDate) : undefined } })));

  const { pdf } = await renderHtmlReport({ meeting, summary, items });
  const key = `reports/${meetingId}.pdf`;
  await putObject(key, pdf);
  await prisma.summary.update({ where: { id: saved.id }, data: { pdfKey: key } });
  await prisma.auditLog.create({ data: { workspaceId: meeting.workspaceId, actorId: meeting.workspaceId, action: 'SUMMARY_CREATED', metadata: { meetingId } } });

  return { summaryId: saved.id };
}

new Worker('jobs', async (job: Job) => {
  if (job.name === 'summarize') return processSummarize(job as Job<{ meetingId: string }>);
}, { connection });
