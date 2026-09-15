import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as waitlistPost } from '@/app/api/waitlist/route';
import { POST as consumePost } from '@/app/api/return/consume/route';
import { POST as requestPost } from '@/app/api/return/request/route';
import { CONSENT_VERSION } from '@/lib/config';
import { listCapture } from '@/lib/server/capture';
import { resetRateLimitsForTests } from '@/lib/server/http';
import { profileFixture } from '@/lib/test-fixtures';

function jsonRequest(url: string, body: unknown, ip: string): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('return visit routes', () => {
  const previous = process.env.CAPTURE_FILE;

  beforeEach(async () => {
    resetRateLimitsForTests();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'langkah-return-'));
    process.env.CAPTURE_FILE = path.join(dir, 'capture.json');
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.CAPTURE_FILE;
    else process.env.CAPTURE_FILE = previous;
  });

  it('restores a stored profile from a one-time link and then refuses reuse', async () => {
    const profile = profileFixture();
    await waitlistPost(
      jsonRequest(
        'http://127.0.0.1/api/waitlist/',
        {
          email: 'return.tester@example.com',
          consent: true,
          consentVersion: CONSENT_VERSION,
          profile,
          programmeIds: ['petronas-graduate-programme'],
        },
        '198.51.100.20',
      ),
    );
    const listed = await listCapture();
    const match = listed.outbound[0]?.body.match(/\/return\/([a-f0-9]{64})\//);
    expect(match?.[1]).toBeTruthy();
    const token = match?.[1] as string;

    const restored = await consumePost(
      jsonRequest('http://127.0.0.1/api/return/consume/', { token }, '198.51.100.21'),
    );
    const restoredBody = (await restored.json()) as { ok?: boolean; profile?: unknown };
    expect(restored.status).toBe(200);
    expect(restoredBody.profile).toEqual(profile);

    const reused = await consumePost(
      jsonRequest('http://127.0.0.1/api/return/consume/', { token }, '198.51.100.22'),
    );
    expect(reused.status).toBe(400);
  });

  it('does not reveal whether an unknown address is on the list', async () => {
    const response = await requestPost(
      jsonRequest(
        'http://127.0.0.1/api/return/request/',
        { email: 'missing@example.com', companyWebsite: '' },
        '198.51.100.23',
      ),
    );
    const body = (await response.json()) as { ok?: boolean };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect((await listCapture()).outbound).toHaveLength(0);
  });
});
