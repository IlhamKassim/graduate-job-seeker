import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/waitlist/route';
import { CONSENT_VERSION } from '@/lib/config';
import { emailAlreadyListed, listCapture } from '@/lib/server/capture';
import { resetRateLimitsForTests } from '@/lib/server/http';
import { profileFixture } from '@/lib/test-fixtures';

function waitlistRequest(body: unknown, ip: string): Request {
  return new Request('http://127.0.0.1/api/waitlist/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/waitlist', () => {
  const previous = process.env.CAPTURE_FILE;
  let ip = 1;

  beforeEach(async () => {
    resetRateLimitsForTests();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'langkah-waitlist-'));
    process.env.CAPTURE_FILE = path.join(dir, 'capture.json');
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.CAPTURE_FILE;
    else process.env.CAPTURE_FILE = previous;
  });

  function nextIp(): string {
    ip += 1;
    return `203.0.113.${ip}`;
  }

  it('stores a consented address in the file capture', async () => {
    const email = 'pilot.tester@example.com';
    const response = await POST(
      waitlistRequest(
        { email, consent: true, consentVersion: CONSENT_VERSION, companyWebsite: '' },
        nextIp(),
      ),
    );
    const body = (await response.json()) as { ok?: boolean; persisted?: string };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.persisted).toBe('file');
    expect(await emailAlreadyListed(email)).toBe(true);
    const listed = await listCapture();
    expect(listed.waitlist[0]?.consentVersion).toBe(CONSENT_VERSION);
    expect(listed.waitlist[0]?.profile).toBeNull();
    expect(listed.outbound).toHaveLength(0);
  });

  it('stores a profile snapshot and writes an outbound restore mail', async () => {
    const email = 'return.tester@example.com';
    const profile = profileFixture();
    const response = await POST(
      waitlistRequest(
        {
          email,
          consent: true,
          consentVersion: CONSENT_VERSION,
          companyWebsite: '',
          profile,
          programmeIds: ['petronas-graduate-programme', 'not-a-real-id'],
        },
        nextIp(),
      ),
    );
    const body = (await response.json()) as { ok?: boolean; mailed?: boolean | null; already?: boolean };
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.already).toBe(false);
    expect(body.mailed).toBe(false);

    const listed = await listCapture();
    expect(listed.waitlist[0]?.profile).toEqual(profile);
    expect(listed.waitlist[0]?.programmeIds).toEqual(['petronas-graduate-programme']);
    expect(listed.outbound).toHaveLength(1);
    expect(listed.outbound[0]?.kind).toBe('return_link');
    expect(listed.outbound[0]?.body).toContain('/return/');
    expect(listed.outbound[0]?.body).not.toMatch(/\b3\.60\b/);
  });

  it('refuses an address without a consent tick', async () => {
    const response = await POST(
      waitlistRequest({ email: 'pilot.tester@example.com', consent: false }, nextIp()),
    );
    expect(response.status).toBe(400);
    expect(await emailAlreadyListed('pilot.tester@example.com')).toBe(false);
  });

  it('pretends to succeed when the honeypot is filled', async () => {
    const response = await POST(
      waitlistRequest(
        {
          email: 'bot@example.com',
          consent: true,
          companyWebsite: 'https://spam.example',
        },
        nextIp(),
      ),
    );
    expect(response.status).toBe(200);
    expect(await emailAlreadyListed('bot@example.com')).toBe(false);
  });
});
