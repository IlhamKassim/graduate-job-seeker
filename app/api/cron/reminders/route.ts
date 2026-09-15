import {
  listWaitlistForReminders,
  markWaitlistReminded,
} from '@/lib/server/capture';
import { publicOrigin } from '@/lib/server/mail';
import {
  issueReturnLink,
  reminderIsDue,
  reminderProgrammesFor,
  shortlistLines,
} from '@/lib/server/return-visit';
import { reportError } from '@/lib/server/sentry';

export const runtime = 'nodejs';

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

async function run(request: Request): Promise<Response> {
  if (!authorised(request)) {
    return Response.json({ ok: false, error: 'Unauthorised.' }, { status: 401 });
  }

  const now = new Date();
  const origin = publicOrigin(request);
  let mailed = 0;
  let skipped = 0;

  try {
    const rows = await listWaitlistForReminders();
    for (const row of rows) {
      if (mailed >= 20) break;
      if (!reminderIsDue(row.lastRemindedAt, now)) {
        skipped += 1;
        continue;
      }
      const moving = reminderProgrammesFor(row, now);
      if (!moving.length) {
        skipped += 1;
        continue;
      }
      await issueReturnLink(
        row.email,
        origin,
        'window_reminder',
        shortlistLines(
          moving.map((program) => program.id),
          now,
        ),
      );
      await markWaitlistReminded(row.email, now.toISOString());
      mailed += 1;
    }
  } catch (error) {
    await reportError(error);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true, mailed, skipped });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
