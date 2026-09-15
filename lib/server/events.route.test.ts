import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/events/route';
import { listCapture } from '@/lib/server/capture';
import { resetRateLimitsForTests } from '@/lib/server/http';

function eventRequest(body: unknown, ip: string): Request {
  return new Request('http://127.0.0.1/api/events/', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/events', () => {
  const previous = process.env.CAPTURE_FILE;

  beforeEach(async () => {
    resetRateLimitsForTests();
    const dir = await mkdtemp(path.join(os.tmpdir(), 'langkah-events-'));
    process.env.CAPTURE_FILE = path.join(dir, 'capture.json');
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.CAPTURE_FILE;
    else process.env.CAPTURE_FILE = previous;
  });

  it('stores a sanitised profile_submitted payload', async () => {
    const response = await POST(
      eventRequest(
        {
          type: 'profile_submitted',
          payload: {
            degreeField: 'Computer Science',
            graduationYear: 2027,
            citizenship: 'MY',
            needsVisaSponsorship: false,
            preferredCities: ['Kuala Lumpur'],
            sectorsOfInterest: ['tech', 'banking'],
            cgpa: 3.85,
            email: 'student@example.com',
          },
        },
        '198.51.100.40',
      ),
    );
    expect(response.status).toBe(200);
    const listed = await listCapture();
    expect(listed.events).toHaveLength(1);
    expect(listed.events[0]?.payload).toEqual({
      degreeField: 'Computer Science',
      graduationYear: 2027,
      citizenship: 'MY',
      needsVisaSponsorship: false,
      cityCount: 1,
      sectorCount: 2,
    });
    expect(JSON.stringify(listed.events[0]?.payload)).not.toMatch(/3\.85|student@example/);
  });

  it('rejects an unknown event type', async () => {
    const response = await POST(
      eventRequest({ type: 'password_reset', payload: {} }, '198.51.100.41'),
    );
    expect(response.status).toBe(400);
    expect((await listCapture()).events).toHaveLength(0);
  });
});
