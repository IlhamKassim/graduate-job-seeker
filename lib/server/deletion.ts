import { APP_NAME } from '@/lib/config';
import {
  MAGIC_LINK_TTL_MS,
  appendEventRow,
  consumeMagicLink,
  deleteWaitlistByEmail,
  getWaitlistByEmail,
  saveMagicLink,
} from '@/lib/server/capture';
import { newId } from '@/lib/server/http';
import { hashReturnToken, newReturnToken, sendMail } from '@/lib/server/mail';

export function composeDeletionEmail(input: { origin: string; token: string }): {
  subject: string;
  text: string;
} {
  const url = `${input.origin}/delete/${input.token}/`;
  const text = [
    `You asked ${APP_NAME} to delete a waitlist address and any answers stored with it.`,
    '',
    'Open this link once, within seven days, to confirm:',
    url,
    '',
    'After that we will not email this address unless you leave it on a shortlist again, with consent.',
    'If you did not ask for this, ignore the message.',
  ].join('\n');
  return { subject: `Confirm deleting your ${APP_NAME} waitlist address`, text };
}

export async function issueDeletionLink(
  email: string,
  origin: string,
): Promise<{ delivered: boolean; url: string }> {
  const token = newReturnToken();
  const now = new Date();
  await saveMagicLink({
    tokenHash: hashReturnToken(token),
    email,
    at: now.toISOString(),
    expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS).toISOString(),
    usedAt: null,
    purpose: 'delete',
  });
  const url = `${origin}/delete/${token}/`;
  const composed = composeDeletionEmail({ origin, token });
  const delivered = await sendMail({
    kind: 'deletion_link',
    to: email,
    subject: composed.subject,
    text: composed.text,
  });
  return { delivered, url };
}

export async function eraseFromToken(token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return { ok: false, error: 'This link is not valid. Ask for a new one from /delete/.' };
  }
  const email = await consumeMagicLink(hashReturnToken(token), new Date(), 'delete');
  if (!email) {
    return {
      ok: false,
      error: 'This link has expired or was already used. Ask for a new one from /delete/.',
    };
  }
  await deleteWaitlistByEmail(email);
  await appendEventRow({
    id: newId(),
    type: 'waitlist_deleted',
    at: new Date().toISOString(),
    payload: { deleted: true },
  });
  return { ok: true };
}

export async function listedForDeletion(email: string): Promise<boolean> {
  return (await getWaitlistByEmail(email)) !== null;
}
