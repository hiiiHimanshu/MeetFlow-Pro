import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
// Load env from common locations in monorepo
const envPaths = [
  path.resolve(process.cwd(), '../../.env'), // repo root when running from app folder
  path.resolve(process.cwd(), '../.env'), // repo root when cwd inside src
  path.resolve(process.cwd(), '.env'), // app-local .env
];
for (const p of envPaths) {
  if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
}
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';
import { loadEnv } from '@repo/config';
import { router } from './routes';

const env = loadEnv(process.env);
const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

Sentry.init({ dsn: env.SENTRY_DSN || undefined, tracesSampleRate: 0.1 });
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(pinoHttp({ logger }));

export const prisma = new PrismaClient();

app.use('/api', router);

// Sentry v8 Express error handler (must be after all routes)
Sentry.setupExpressErrorHandler(app);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  logger.info(`API listening on http://localhost:${port}`);
});
