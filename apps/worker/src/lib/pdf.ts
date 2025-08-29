import type { ActionItem } from './text';

export async function renderHtmlReport({ meeting, summary, items }: { meeting: any; summary: string; items: ActionItem[] }) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${meeting.title}</title></head><body>
    <h1>${meeting.title}</h1>
    <h2>Summary</h2>
    <pre>${escapeHtml(summary)}</pre>
    <h2>Action Items</h2>
    <ul>${items.map((i) => `<li>${escapeHtml(i.text)}</li>`).join('')}</ul>
  </body></html>`;
  // render PDF via puppeteer
  const { default: puppeteer } = await import('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();
  return { html, pdf };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
