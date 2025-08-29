export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  DATABASE_URL: string;
  REDIS_URL: string;
  S3_ENDPOINT: string;
  S3_REGION: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_BUCKET: string;
  PINECONE_API_KEY?: string;
  PINECONE_INDEX?: string;
  OPENAI_API_KEY?: string;
  LLM_PROVIDER: 'openai';
  AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SLACK_BOT_TOKEN?: string;
  SLACK_SIGNING_SECRET?: string;
  NOTION_TOKEN?: string;
  SENTRY_DSN?: string;
  TEMPERATURE: number;
}
export function loadEnv(env?: NodeJS.ProcessEnv): EnvConfig;
