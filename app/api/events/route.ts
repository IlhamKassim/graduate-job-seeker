import { allowRequest, clientIp, newId } from '@/lib/server/http';
import { appendEventRow } from '@/lib/server/capture';
import { isAllowedEventType, sanitiseEventPayload } from '@/lib/server/events';
import { reportError } from '@/lib/server/sentry';

export const runtime = 'nodejs';

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
  if (typeof payload.type !== 'string' || !isAllowedEventType(payload.type)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const data =
    payload.payload && typeof payload.payload === 'object'
      ? (payload.payload as Record<string, unknown>)
      : {};

  try {
    await appendEventRow({
      id: typeof payload.id === 'string' ? payload.id : newId(),
      type: payload.type,
      at: typeof payload.at === 'string' ? payload.at : new Date().toISOString(),
      payload: sanitiseEventPayload(payload.type, data),
    });
  } catch (error) {
    await reportError(error);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}
