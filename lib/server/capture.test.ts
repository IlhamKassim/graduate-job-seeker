import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendEventRow, EVENT_RETENTION_MS, listCapture } from '@/lib/server/capture';

describe('appendEventRow file store', () => {
  const previous = process.env.CAPTURE_FILE;

  beforeEach(async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'langkah-capture-'));
    process.env.CAPTURE_FILE = path.join(dir, 'capture.json');
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.CAPTURE_FILE;
    else process.env.CAPTURE_FILE = previous;
  });

  it('drops events older than 90 days on write', async () => {
    const staleAt = new Date(Date.now() - EVENT_RETENTION_MS - 24 * 60 * 60 * 1000).toISOString();
    const freshAt = new Date().toISOString();
    const file = process.env.CAPTURE_FILE as string;

    await writeFile(
      file,
      JSON.stringify({
        waitlist: [],
        events: [{ id: 'stale', type: 'debug_viewed', at: staleAt, payload: { keep: false } }],
      }),
    );

    await appendEventRow({
      id: 'fresh',
      type: 'debug_viewed',
      at: freshAt,
      payload: { keep: true },
    });

    const listed = await listCapture();
    expect(listed.events.map((row) => row.id)).toEqual(['fresh']);

    const raw = JSON.parse(await readFile(process.env.CAPTURE_FILE as string, 'utf8')) as {
      events: { id: string }[];
    };
    expect(raw.events.map((row) => row.id)).toEqual(['fresh']);
  });
});
