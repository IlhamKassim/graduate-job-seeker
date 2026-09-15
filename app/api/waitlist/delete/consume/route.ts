import { eraseFromToken } from '@/lib/server/deletion';
import { reportError } from '@/lib/server/sentry';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Send a JSON body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ ok: false, error: 'Send a JSON object.' }, { status: 400 });
  }

  const token = (body as Record<string, unknown>).token;
  if (typeof token !== 'string') {
    return Response.json({ ok: false, error: 'This link is not valid.' }, { status: 400 });
  }

  try {
    const result = await eraseFromToken(token.trim());
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    await reportError(error);
    return Response.json(
      { ok: false, error: 'Could not delete that address just now. Try the link again shortly.' },
      { status: 500 },
    );
  }
}
