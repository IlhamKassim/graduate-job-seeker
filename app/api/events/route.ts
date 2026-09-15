import { allowRequest, clientIp, newId } from '@/lib/server/http';
import { appendEventRow } from '@/lib/server/capture';

export const runtime = 'nodejs';

const ALLOWED = new Set([
  'profile_submitted',
  'shortlist_viewed',
  'program_detail_opened',
  'filter_used',
  'calendar_viewed',
  'waitlist_joined',
  'fit_breakdown_expanded',
  'debug_viewed',
]);

function sanitise(type: string, payload: Record<string, unknown>): Record<string, unknown> {
  if (type === 'profile_submitted') {
    return {
      degreeField: payload.degreeField,
      graduationYear: payload.graduationYear,
      citizenship: payload.citizenship,
      needsVisaSponsorship: payload.needsVisaSponsorship,
      cityCount: Array.isArray(payload.preferredCities) ? payload.preferredCities.length : undefined,
      sectorCount: Array.isArray(payload.sectorsOfInterest)
        ? payload.sectorsOfInterest.length
        : undefined,
    };
  }
  if (type === 'waitlist_joined') {
    return { joined: true };
  }
  const { email, cgpa, ...rest } = payload;
  void email;
  void cgpa;
  return rest;
}

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request), 80, 60 * 60 * 1000, 'events')) {
    return Response.json({ ok: false }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ ok: false }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  if (typeof payload.type !== 'string' || !ALLOWED.has(payload.type)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const data =
    payload.payload && typeof payload.payload === 'object'
      ? (payload.payload as Record<string, unknown>)
      : {};

  await appendEventRow({
    id: typeof payload.id === 'string' ? payload.id : newId(),
    type: payload.type,
    at: typeof payload.at === 'string' ? payload.at : new Date().toISOString(),
    payload: sanitise(payload.type, data),
  });

  return Response.json({ ok: true });
}
