import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as waitlistPost } from '@/app/api/waitlist/route';
import { POST as consumeDelete } from '@/app/api/waitlist/delete/consume/route';
import { POST as requestDelete } from '@/app/api/waitlist/delete/request/route';
import { POST as consumeReturn } from '@/app/api/return/consume/route';
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

describe('waitlist deletion routes', () => {
  const previous = process.env.CAPTURE_FILE;

  beforeEach(async () => {
    resetRateLimitsForTests();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'langkah-delete-'));
    process.env.CAPTURE_FILE = path.join(dir, 'capture.json');
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.CAPTURE_FILE;
    else process.env.CAPTURE_FILE = previous;
  });

  it('erases a listed address from a one-time link and then refuses reuse', async () => {
    const profile = profileFixture();
    await waitlistPost(
      jsonRequest(
        'http://127.0.0.1/api/waitlist/',
        {
          email: 'delete.tester@example.com',
          consent: true,
          consentVersion: CONSENT_VERSION,
          profile,
          programmeIds: ['petronas-graduate-programme'],
        },
        '198.51.100.30',
      ),
    );

    const asked = await requestDelete(
      jsonRequest(
        'http://127.0.0.1/api/waitlist/delete/request/',
        { email: 'delete.tester@example.com', companyWebsite: '' },
        '198.51.100.31',
      ),
    );
    expect(asked.status).toBe(200);
    expect(((await asked.json()) as { ok?: boolean }).ok).toBe(true);

    const listed = await listCapture();
    const match = listed.outbound.find((row) => row.kind === 'deletion_link')?.body.match(
      /\/delete\/([a-f0-9]{64})\//,
    );
    expect(match?.[1]).toBeTruthy();
    const token = match?.[1] as string;

    const erased = await consumeDelete(
      jsonRequest('http://127.0.0.1/api/waitlist/delete/consume/', { token }, '198.51.100.32'),
    );
    expect(erased.status).toBe(200);
    expect(((await erased.json()) as { ok?: boolean }).ok).toBe(true);

    const after = await listCapture();
    expect(after.waitlist).toHaveLength(0);
    expect(after.outbound).toHaveLength(0);
    expect(after.events.some((row) => row.type === 'waitlist_deleted')).toBe(true);
    expect(JSON.stringify(after.events)).not.toMatch(/delete\.tester@example\.com/i);

    const reused = await consumeDelete(
      jsonRequest('http://127.0.0.1/api/waitlist/delete/consume/', { token }, '198.51.100.33'),
    );
    expect(reused.status).toBe(400);
  });

  it('does not reveal whether an unknown address is on the list', async () => {
    const response = await requestDelete(
      jsonRequest(
        'http://127.0.0.1/api/waitlist/delete/request/',
        { email: 'missing@example.com', companyWebsite: '' },
        '198.51.100.34',
      ),
    );
    const body = (await response.json()) as { ok?: boolean };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect((await listCapture()).outbound).toHaveLength(0);
  });

  it('will not treat a restore token as a deletion token', async () => {
    const profile = profileFixture();
    await waitlistPost(
      jsonRequest(
        'http://127.0.0.1/api/waitlist/',
        {
          email: 'cross.tester@example.com',
          consent: true,
          consentVersion: CONSENT_VERSION,
          profile,
          programmeIds: ['petronas-graduate-programme'],
        },
        '198.51.100.35',
      ),
    );
    const listed = await listCapture();
    const match = listed.outbound[0]?.body.match(/\/return\/([a-f0-9]{64})\//);
    expect(match?.[1]).toBeTruthy();
    const token = match?.[1] as string;

    const erased = await consumeDelete(
      jsonRequest('http://127.0.0.1/api/waitlist/delete/consume/', { token }, '198.51.100.36'),
    );
    expect(erased.status).toBe(400);
    expect((await listCapture()).waitlist).toHaveLength(1);

    const restored = await consumeReturn(
      jsonRequest('http://127.0.0.1/api/return/consume/', { token }, '198.51.100.37'),
    );
    expect(restored.status).toBe(200);
  });
});
