import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/cron/reminders/route';

describe('GET /api/cron/reminders', () => {
  it('refuses a missing secret', async () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const response = await GET(new Request('http://127.0.0.1/api/cron/reminders'));
    expect(response.status).toBe(401);
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });
});
