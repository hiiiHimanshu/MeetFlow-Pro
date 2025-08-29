import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { loadEnv } from '@repo/config';

const env = loadEnv(process.env);

// Lightweight, deterministic summary as a local fallback
function localSummary(text: string): string {
  const clean = (text || '').replace(/\r/g, ' ').slice(0, 2000);
  const sentences = clean
    .split(/[\.\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const bullets = sentences.map(s => `- ${s}`);
  const actions: string[] = [];
  for (const s of sentences) {
    if (/\b(todo|follow up|action|assign|due)\b/i.test(s)) actions.push(`- [ ] ${s}`);
  }
  if (actions.length === 0 && bullets[0]) actions.push(`- [ ] Confirm next steps for: ${bullets[0].replace(/^-\s*/, '')}`);
  return [`Summary:`, ...bullets, '', 'Action Items:', ...actions].join('\n');
}

export async function embedChunks(chunks: string[]) {
  // Abstract vector API with optional Pinecone usage.
  // Always compute deterministic vectors locally; only upsert when Pinecone is configured.
  const vectors = chunks.map((c, i) => ({
    id: `c${i}`,
    values: Array(1536)
      .fill(0)
      .map((_, j) => ((c.charCodeAt(j % c.length) % 10) / 10))
  }));

  if (env.PINECONE_API_KEY && env.PINECONE_INDEX) {
    try {
      const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
      const index = pc.index(env.PINECONE_INDEX);
      await index.upsert(vectors);
    } catch (_e) {
      // Ignore network/config errors in local dev; vectors still computed.
    }
  }

  return vectors.length;
}

export async function generateSummary(text: string) {
  // Prefer OpenAI when configured; otherwise use deterministic local fallback
  if (env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const prompt = `You are a helpful assistant. Summarize the following meeting transcript in concise bullet points. End with a section 'Action Items' using '- [ ]' lines. Keep output deterministic and brief. Transcript:\n\n${text}`;
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: env.TEMPERATURE,
        messages: [{ role: 'user', content: prompt }]
      });
      return resp.choices[0]?.message?.content || localSummary(text);
    } catch (_e) {
      return localSummary(text);
    }
  }
  return localSummary(text);
}
