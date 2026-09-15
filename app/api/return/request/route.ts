import { allowRequest, clientIp, isHoneypot, validEmail } from '@/lib/server/http';
import { getWaitlistByEmail } from '@/lib/server/capture';
import { issueReturnLink } from '@/lib/server/return-visit';
import { publicOrigin } from '@/lib/server/mail';
import { reportError } from '@/lib/server/sentry';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request), 5, 60 * 60 * 1000, 'return')) {
    return Response.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Send a JSON body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ ok: false, error: 'Send a JSON object.' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  if (isHoneypot(payload.companyWebsite) || isHoneypot(payload.company_website)) {
    return Response.json({ ok: true });
  }

  if (!validEmail(payload.email)) {
    return Response.json(
      { ok: false, error: 'Enter an address with an @ and a domain, like aina@example.com.' },
      { status: 400 },
    );
  }

  try {
    const row = await getWaitlistByEmail(payload.email.trim());
    if (row?.profile) {
      await issueReturnLink(row.email, publicOrigin(request));
    }
  } catch (error) {
    await reportError(error);
  }

  return Response.json({ ok: true });
}
