import {
  allowRequest,
  clientIp,
  CONSENT_VERSION,
  isHoneypot,
  newId,
  validEmail,
} from '@/lib/server/http';
import { appendWaitlistRow, capturePersistence, emailAlreadyListed } from '@/lib/server/capture';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request), 8, 60 * 60 * 1000, 'waitlist')) {
    return Response.json({ ok: false, error: 'Too many tries from this network. Wait and try again.' }, { status: 429 });
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
    return Response.json({ ok: true, persisted: capturePersistence() });
  }

  if (!validEmail(payload.email)) {
    return Response.json(
      { ok: false, error: 'Enter an address with an @ and a domain, like aina@example.com.' },
      { status: 400 },
    );
  }

  const email = payload.email.trim().toLowerCase();
  if (payload.consent !== true) {
    return Response.json(
      { ok: false, error: 'Tick the consent box so we can store the address for that purpose.' },
      { status: 400 },
    );
  }

  if (await emailAlreadyListed(email)) {
    return Response.json({ ok: true, already: true, persisted: capturePersistence() });
  }

  await appendWaitlistRow({
    id: newId(),
    email,
    at: new Date().toISOString(),
    consentVersion: CONSENT_VERSION,
  });

  return Response.json({ ok: true, persisted: capturePersistence() });
}
