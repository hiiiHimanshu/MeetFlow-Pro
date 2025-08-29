import { WebClient } from '@slack/web-api';
import { Client as NotionClient } from '@notionhq/client';
import { loadEnv } from '@repo/config';

const env = loadEnv(process.env);
const slack = env.SLACK_BOT_TOKEN ? new WebClient(env.SLACK_BOT_TOKEN) : null;
const notion = env.NOTION_TOKEN ? new NotionClient({ auth: env.NOTION_TOKEN }) : null;

export async function postToSlack(channel: string, text: string) {
  if (!slack) return false;
  await slack.chat.postMessage({ channel, text });
  return true;
}

export async function upsertNotionPage(parentId: string, title: string, content: string) {
  if (!notion) return undefined;
  // Minimal page creation in a database or page
  const page = await notion.pages.create({
    parent: { page_id: parentId },
    properties: { title: { title: [{ text: { content: title } }] } },
    children: [{ paragraph: { rich_text: [{ text: { content } }] } }]
  } as any);
  return page;
}
