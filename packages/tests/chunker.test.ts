import { describe, it, expect } from 'vitest';
import { chunkText, extractActionItems } from '../../apps/worker/src/lib/text';
import { describe as d2 } from 'vitest';

describe('chunkText', () => {
  it('creates overlapping chunks', () => {
    const text = 'a'.repeat(5000);
    const chunks = chunkText(text, 512, 64);
    expect(chunks.length).toBeGreaterThan(3);
  });
});

describe('extractActionItems', () => {
  it('parses checkbox lines', () => {
    const s = 'Notes\n- [ ] Item A\n- [ ] Item B';
    const items = extractActionItems(s);
    expect(items.length).toBe(2);
    expect(items[0].text).toContain('Item A');
  });
});
