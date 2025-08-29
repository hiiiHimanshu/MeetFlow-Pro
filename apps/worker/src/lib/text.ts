export function chunkText(text: string, size = 1500, overlap = 200) {
  const chunks: string[] = [];
  let start = 0;
  if (size <= 0) return [text];
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break; // prevent infinite loop at tail
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export type ActionItem = { text: string; assignee?: string; dueDate?: string };

export function extractActionItems(summary: string): ActionItem[] {
  // naive parser: lines starting with - [ ]
  return summary
    .split('\n')
    .filter((l) => l.trim().startsWith('- [ ]'))
    .map((l) => ({ text: l.replace('- [ ]', '').trim() }));
}
