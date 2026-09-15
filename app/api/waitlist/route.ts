import {
  allowRequest,
  clientIp,
  CONSENT_VERSION,
  isHoneypot,
  newId,
  validEmail,
} from '@/lib/server/http';
import { capturePersistence, upsertWaitlistRow } from '@/lib/server/capture';
import { reportError } from '@/lib/server/sentry';
import { parseProfile, parseProgrammeIds } from '@/lib/profile';
import { PROGRAMS } from '@/data/programs';
import { issueReturnLink } from '@/lib/server/return-visit';
import { publicOrigin } from '@/lib/server/mail';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!allowRequest(clientIp(request), 8, 60 * 60 * 1000, 'waitlist')) {
    return Response.json(
      { ok: false, error: 'Too many tries from this network. Wait and try again.' },
      { status: 429 },
    );
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

  const profile = parseProfile(payload.profile);
  const programmeIds = parseProgrammeIds(
    payload.programmeIds,
    PROGRAMS.map((program) => program.id),
  );

  try {
    const action = await upsertWaitlistRow({
      id: newId(),
      email,
      at: new Date().toISOString(),
      consentVersion: CONSENT_VERSION,
      profile,
      programmeIds,
      lastRemindedAt: null,
    });

    let mailed: boolean | null = null;
    if (profile) {
      const result = await issueReturnLink(email, publicOrigin(request));
      mailed = result.delivered;
    }

    return Response.json({
      ok: true,
      already: action === 'updated',
      mailed,
      persisted: capturePersistence(),
    });
  } catch (error) {
    await reportError(error);
    return Response.json(
      { ok: false, error: 'Could not save that just now. Try again shortly.' },
      { status: 500 },
    );
  }
}
