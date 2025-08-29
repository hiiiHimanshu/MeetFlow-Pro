import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { loadEnv } from '@repo/config';

const env = loadEnv(process.env);

const connection = new IORedis(env.REDIS_URL);

export const jobsQueue = new Queue('jobs', { connection });

export async function enqueueSummarizeJob(payload: { meetingId: string }) {
  await jobsQueue.add('summarize', payload, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}
