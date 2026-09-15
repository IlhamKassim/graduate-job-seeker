import { PROGRAMS } from '@/data/programs';
import { APP_NAME } from '@/lib/config';
import type { Profile, Program } from '@/types';
import {
  MAGIC_LINK_TTL_MS,
  consumeMagicLink,
  getWaitlistByEmail,
  saveMagicLink,
  type CaptureWaitlistRow,
} from '@/lib/server/capture';
import { hashReturnToken, newReturnToken, sendMail } from '@/lib/server/mail';
import { resolveWindow } from '@/lib/windows';

export interface ShortlistLine {
  id: string;
  employer: string;
  name: string;
  window: string;
  sourceUrl: string;
}

export function shortlistLines(programmeIds: string[], now = new Date()): ShortlistLine[] {
  const byId = new Map(PROGRAMS.map((program) => [program.id, program]));
  return programmeIds.flatMap((id) => {
    const program = byId.get(id);
    if (!program) return [];
    const window = resolveWindow(program, now);
    return [
      {
        id: program.id,
        employer: program.employer,
        name: program.name,
        window: window.rangeLabel,
        sourceUrl: program.sourceUrl,
      },
    ];
  });
}

export function programmesNeedingReminder(
  programmes: Program[],
  now = new Date(),
): Program[] {
  return programmes.filter((program) => {
    if (program.applicationCycle === 'rolling') return false;
    const window = resolveWindow(program, now);
    if (window.status === 'opening_soon') return true;
    return window.status === 'open' && window.monthsLeftOpen <= 1;
  });
}

export function reminderIsDue(lastRemindedAt: string | null, now = new Date()): boolean {
  if (!lastRemindedAt) return true;
  const ts = Date.parse(lastRemindedAt);
  if (Number.isNaN(ts)) return true;
  return now.getTime() - ts >= 6 * 24 * 60 * 60 * 1000;
}

function formatLines(lines: ShortlistLine[]): string {
  if (!lines.length) {
    return 'No checked programmes currently clear the eligibility gate for the answers we stored.';
  }
  return lines
    .map((line) => `- ${line.employer} — ${line.name} — ${line.window}\n  ${line.sourceUrl}`)
    .join('\n');
}

export function composeReturnEmail(input: {
  origin: string;
  token: string;
  lines: ShortlistLine[];
}): { subject: string; text: string } {
  const url = `${input.origin}/return/${input.token}/`;
  const text = [
    `You asked ${APP_NAME} to keep this shortlist and to email you when a saved window is about to open.`,
    '',
    'Open it in a browser. This link works once, for seven days:',
    url,
    '',
    'Programmes you currently clear:',
    formatLines(input.lines),
    '',
    'This is not an offer of a job. Windows still move. Open the employer page before you act.',
    'This message does not include the seven answers you typed. The link restores them on that device so the shortlist can be rebuilt.',
    '',
    'If you did not ask for this, ignore it. To delete the address, open /delete/ on this site.',
  ].join('\n');
  return { subject: `Your ${APP_NAME} shortlist`, text };
}

export function composeReminderEmail(input: {
  origin: string;
  token: string;
  lines: ShortlistLine[];
}): { subject: string; text: string } {
  const url = `${input.origin}/return/${input.token}/`;
  const text = [
    `A window you asked ${APP_NAME} to watch is opening soon, or is in its last month.`,
    '',
    formatLines(input.lines),
    '',
    'Open the shortlist we stored (this link works once, for seven days):',
    url,
    '',
    'This is not an offer of a job. Open the employer page before you act.',
    'If you did not ask for this, ignore it. To delete the address, open /delete/ on this site.',
  ].join('\n');
  return { subject: `A window on your ${APP_NAME} shortlist is moving`, text };
}

export async function issueReturnLink(
  email: string,
  origin: string,
  kind: 'return_link' | 'window_reminder' = 'return_link',
  lines?: ShortlistLine[],
): Promise<{ delivered: boolean; url: string }> {
  const token = newReturnToken();
  const now = new Date();
  await saveMagicLink({
    tokenHash: hashReturnToken(token),
    email,
    at: now.toISOString(),
    expiresAt: new Date(now.getTime() + MAGIC_LINK_TTL_MS).toISOString(),
    usedAt: null,
    purpose: 'return',
  });
  const url = `${origin}/return/${token}/`;
  const listed = lines ?? shortlistLines((await getWaitlistByEmail(email))?.programmeIds ?? []);
  const composed =
    kind === 'window_reminder'
      ? composeReminderEmail({ origin, token, lines: listed })
      : composeReturnEmail({ origin, token, lines: listed });
  const delivered = await sendMail({
    kind,
    to: email,
    subject: composed.subject,
    text: composed.text,
  });
  return { delivered, url };
}

export async function restoreFromToken(token: string): Promise<
  { ok: true; profile: Profile } | { ok: false; error: string }
> {
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return { ok: false, error: 'This link is not valid. Ask for a new one from the address we have on file.' };
  }
  const email = await consumeMagicLink(hashReturnToken(token));
  if (!email) {
    return {
      ok: false,
      error: 'This link has expired or was already used. Ask for a new one from the address we have on file.',
    };
  }
  const row = await getWaitlistByEmail(email);
  if (!row?.profile) {
    return {
      ok: false,
      error: 'We have that address, but no saved answers to rebuild a shortlist from. Fill the seven questions again.',
    };
  }
  return { ok: true, profile: row.profile };
}

export function reminderProgrammesFor(row: CaptureWaitlistRow, now = new Date()): Program[] {
  const wanted = new Set(row.programmeIds);
  const programmes = PROGRAMS.filter((program) => wanted.has(program.id));
  return programmesNeedingReminder(programmes, now);
}
