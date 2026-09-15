import { createHash, randomBytes } from 'node:crypto';
import { APP_NAME } from '@/lib/config';
import { newId } from '@/lib/server/http';
import { appendOutbound, type CaptureOutboundRow } from '@/lib/server/capture';

export function newReturnToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashReturnToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function publicOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) {
    const proto =
      request.headers.get('x-forwarded-proto') ||
      (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https');
    return `${proto}://${host}`.replace(/\/$/, '');
  }
  try {
    return new URL(request.url).origin.replace(/\/$/, '');
  } catch {
    const configured = process.env.RETURN_PUBLIC_URL?.trim();
    if (configured) {
      const url = configured.startsWith('http') ? configured : `https://${configured}`;
      return url.replace(/\/$/, '');
    }
    return 'http://127.0.0.1:3020';
  }
}

function fromAddress(): string {
  return process.env.RETURN_FROM_EMAIL?.trim() || `${APP_NAME} <beth.t@example.com>`;
}

async function deliverWithResend(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        subject,
        text,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendMail(input: {
  kind: CaptureOutboundRow['kind'];
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const delivered = await deliverWithResend(input.to, input.subject, input.text);
  await appendOutbound({
    id: newId(),
    kind: input.kind,
    to: input.to,
    subject: input.subject,
    body: input.text,
    delivered,
    at: new Date().toISOString(),
  });
  return delivered;
}
