import { listCapture, capturePersistence } from '@/lib/server/capture';
import { reportError } from '@/lib/server/sentry';

export const runtime = 'nodejs';

function authorised(request: Request): boolean {
  const secret = process.env.CAPTURE_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const query = new URL(request.url).searchParams.get('secret') ?? '';
  return token === secret || query === secret;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: 'Unauthorised.' }, { status: 401 });
  }
  try {
    const data = await listCapture();
    return Response.json({
      ok: true,
      persisted: capturePersistence(),
      waitlist: data.waitlist,
      events: data.events,
    });
  } catch (error) {
    await reportError(error);
    return Response.json({ ok: false, error: 'Could not read capture just now.' }, { status: 500 });
  }
}
