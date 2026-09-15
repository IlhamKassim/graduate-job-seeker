import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import type { Profile } from '@/types';
import { parseProfile, parseProgrammeIds } from '@/lib/profile';
import { PROGRAMS } from '@/data/programs';

export interface CaptureWaitlistRow {
  id: string;
  email: string;
  at: string;
  consentVersion: string;
  profile: Profile | null;
  programmeIds: string[];
  lastRemindedAt: string | null;
}

export interface CaptureEventRow {
  id: string;
  type: string;
  at: string;
  payload: Record<string, unknown>;
}

export interface CaptureMagicLinkRow {
  tokenHash: string;
  email: string;
  at: string;
  expiresAt: string;
  usedAt: string | null;
}

export interface CaptureOutboundRow {
  id: string;
  kind: 'return_link' | 'window_reminder';
  to: string;
  subject: string;
  body: string;
  delivered: boolean;
  at: string;
}

interface CaptureFile {
  waitlist: CaptureWaitlistRow[];
  events: CaptureEventRow[];
  links: CaptureMagicLinkRow[];
  outbound: CaptureOutboundRow[];
}

/** Product events older than this are dropped on write. Waitlist rows are kept. */
export const EVENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function filePath(): string {
  const override = process.env.CAPTURE_FILE?.trim();
  if (override) return override;
  return path.join(process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.data'), 'capture.json');
}

function retentionCutoffIso(now = Date.now()): string {
  return new Date(now - EVENT_RETENTION_MS).toISOString();
}

function eventsWithinRetention(events: CaptureEventRow[], now = Date.now()): CaptureEventRow[] {
  const cutoff = now - EVENT_RETENTION_MS;
  return events.filter((row) => {
    const ts = Date.parse(row.at);
    if (Number.isNaN(ts)) return true;
    return ts >= cutoff;
  });
}

function knownProgramIds(): string[] {
  return PROGRAMS.map((program) => program.id);
}

function normaliseWaitlist(row: Partial<CaptureWaitlistRow> & Pick<CaptureWaitlistRow, 'id' | 'email' | 'at' | 'consentVersion'>): CaptureWaitlistRow {
  return {
    id: row.id,
    email: row.email,
    at: row.at,
    consentVersion: row.consentVersion,
    profile: parseProfile(row.profile),
    programmeIds: parseProgrammeIds(row.programmeIds, knownProgramIds()),
    lastRemindedAt: typeof row.lastRemindedAt === 'string' ? row.lastRemindedAt : null,
  };
}

function iso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return new Date().toISOString();
}

function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

async function readFileStore(): Promise<CaptureFile> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ filePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CaptureFile>;
    return {
      waitlist: Array.isArray(parsed.waitlist)
        ? parsed.waitlist.map((row) =>
            normaliseWaitlist({
              ...row,
              id: row.id,
              email: row.email,
              at: row.at,
              consentVersion: row.consentVersion,
            }),
          )
        : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
      outbound: Array.isArray(parsed.outbound) ? parsed.outbound : [],
    };
  } catch {
    return { waitlist: [], events: [], links: [], outbound: [] };
  }
}

async function writeFileStore(next: CaptureFile): Promise<void> {
  const destination = filePath();
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(/* turbopackIgnore: true */ destination, JSON.stringify(next, null, 2));
}

async function ensurePostgres() {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set');
  const sql = neon(url);
  await sql`
    CREATE TABLE IF NOT EXISTS langkah_waitlist (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL,
      consent_version TEXT NOT NULL
    )
  `;
  await sql`ALTER TABLE langkah_waitlist ADD COLUMN IF NOT EXISTS profile JSONB`;
  await sql`ALTER TABLE langkah_waitlist ADD COLUMN IF NOT EXISTS programme_ids TEXT[]`;
  await sql`ALTER TABLE langkah_waitlist ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ`;
  await sql`
    CREATE TABLE IF NOT EXISTS langkah_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS langkah_magic_links (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS langkah_outbound (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      delivered BOOLEAN NOT NULL,
      at TIMESTAMPTZ NOT NULL
    )
  `;
  return sql;
}

export function capturePersistence(): 'postgres' | 'file' {
  return databaseUrl() ? 'postgres' : 'file';
}

export async function upsertWaitlistRow(row: CaptureWaitlistRow): Promise<'created' | 'updated'> {
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    const existing = (await sql`
      SELECT id FROM langkah_waitlist WHERE lower(email) = ${row.email.toLowerCase()} LIMIT 1
    `) as Array<{ id: string }>;
    if (existing.length > 0) {
      await sql`
        UPDATE langkah_waitlist
        SET
          profile = ${JSON.stringify(row.profile)}::jsonb,
          programme_ids = ${row.programmeIds},
          consent_version = ${row.consentVersion}
        WHERE lower(email) = ${row.email.toLowerCase()}
      `;
      return 'updated';
    }
    await sql`
      INSERT INTO langkah_waitlist (id, email, at, consent_version, profile, programme_ids, last_reminded_at)
      VALUES (
        ${row.id},
        ${row.email},
        ${row.at},
        ${row.consentVersion},
        ${JSON.stringify(row.profile)}::jsonb,
        ${row.programmeIds},
        ${row.lastRemindedAt}
      )
    `;
    return 'created';
  }

  const store = await readFileStore();
  const index = store.waitlist.findIndex((entry) => entry.email.toLowerCase() === row.email.toLowerCase());
  if (index >= 0) {
    store.waitlist[index] = {
      ...store.waitlist[index],
      profile: row.profile,
      programmeIds: row.programmeIds,
      consentVersion: row.consentVersion,
    };
    await writeFileStore(store);
    return 'updated';
  }
  store.waitlist.push(row);
  await writeFileStore(store);
  return 'created';
}

/** @deprecated Prefer upsertWaitlistRow. Kept for older call sites. */
export async function appendWaitlistRow(row: CaptureWaitlistRow): Promise<void> {
  await upsertWaitlistRow(row);
}

export async function getWaitlistByEmail(email: string): Promise<CaptureWaitlistRow | null> {
  const needle = email.toLowerCase();
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    const rows = (await sql`
      SELECT
        id,
        email,
        at,
        consent_version AS "consentVersion",
        profile,
        programme_ids AS "programmeIds",
        last_reminded_at AS "lastRemindedAt"
      FROM langkah_waitlist
      WHERE lower(email) = ${needle}
      LIMIT 1
    `) as Array<Record<string, unknown>>;
    const row = rows[0];
    if (!row || typeof row.id !== 'string' || typeof row.email !== 'string') return null;
    return normaliseWaitlist({
      id: row.id,
      email: row.email,
      at: iso(row.at),
      consentVersion: typeof row.consentVersion === 'string' ? row.consentVersion : '',
      profile: row.profile as Profile | null,
      programmeIds: Array.isArray(row.programmeIds) ? (row.programmeIds as string[]) : [],
      lastRemindedAt: row.lastRemindedAt ? iso(row.lastRemindedAt) : null,
    });
  }
  const store = await readFileStore();
  return store.waitlist.find((entry) => entry.email.toLowerCase() === needle) ?? null;
}

export async function listWaitlistForReminders(): Promise<CaptureWaitlistRow[]> {
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    const rows = (await sql`
      SELECT
        id,
        email,
        at,
        consent_version AS "consentVersion",
        profile,
        programme_ids AS "programmeIds",
        last_reminded_at AS "lastRemindedAt"
      FROM langkah_waitlist
      WHERE programme_ids IS NOT NULL AND cardinality(programme_ids) > 0
      ORDER BY at DESC
      LIMIT 500
    `) as Array<Record<string, unknown>>;
    return rows.flatMap((row) => {
      if (typeof row.id !== 'string' || typeof row.email !== 'string') return [];
      return [
        normaliseWaitlist({
          id: row.id,
          email: row.email,
          at: iso(row.at),
          consentVersion: typeof row.consentVersion === 'string' ? row.consentVersion : '',
          profile: row.profile as Profile | null,
          programmeIds: Array.isArray(row.programmeIds) ? (row.programmeIds as string[]) : [],
          lastRemindedAt: row.lastRemindedAt ? iso(row.lastRemindedAt) : null,
        }),
      ];
    });
  }
  const store = await readFileStore();
  return store.waitlist.filter((row) => row.programmeIds.length > 0);
}

export async function markWaitlistReminded(email: string, at: string): Promise<void> {
  const needle = email.toLowerCase();
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    await sql`
      UPDATE langkah_waitlist SET last_reminded_at = ${at} WHERE lower(email) = ${needle}
    `;
    return;
  }
  const store = await readFileStore();
  const row = store.waitlist.find((entry) => entry.email.toLowerCase() === needle);
  if (!row) return;
  row.lastRemindedAt = at;
  await writeFileStore(store);
}

export async function saveMagicLink(row: CaptureMagicLinkRow): Promise<void> {
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    await sql`
      INSERT INTO langkah_magic_links (token_hash, email, at, expires_at, used_at)
      VALUES (${row.tokenHash}, ${row.email}, ${row.at}, ${row.expiresAt}, ${row.usedAt})
    `;
    return;
  }
  const store = await readFileStore();
  store.links.push(row);
  await writeFileStore(store);
}

export async function consumeMagicLink(tokenHash: string, now = new Date()): Promise<string | null> {
  const nowIso = now.toISOString();
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    const rows = (await sql`
      UPDATE langkah_magic_links
      SET used_at = ${nowIso}
      WHERE token_hash = ${tokenHash}
        AND used_at IS NULL
        AND expires_at > ${nowIso}
      RETURNING email
    `) as Array<{ email: string }>;
    return rows[0]?.email ?? null;
  }
  const store = await readFileStore();
  const row = store.links.find((entry) => entry.tokenHash === tokenHash);
  if (!row) return null;
  if (row.usedAt) return null;
  if (Date.parse(row.expiresAt) <= now.getTime()) return null;
  row.usedAt = nowIso;
  await writeFileStore(store);
  return row.email;
}

export async function appendOutbound(row: CaptureOutboundRow): Promise<void> {
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    await sql`
      INSERT INTO langkah_outbound (id, kind, to_email, subject, body, delivered, at)
      VALUES (${row.id}, ${row.kind}, ${row.to}, ${row.subject}, ${row.body}, ${row.delivered}, ${row.at})
    `;
    const cutoff = retentionCutoffIso();
    await sql`DELETE FROM langkah_outbound WHERE at < ${cutoff}`;
    return;
  }
  const store = await readFileStore();
  const cutoff = Date.now() - EVENT_RETENTION_MS;
  store.outbound = [...store.outbound, row]
    .filter((entry) => {
      const ts = Date.parse(entry.at);
      return Number.isNaN(ts) || ts >= cutoff;
    })
    .slice(-500);
  await writeFileStore(store);
}

export async function appendEventRow(row: CaptureEventRow): Promise<void> {
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    await sql`
      INSERT INTO langkah_events (id, type, at, payload)
      VALUES (${row.id}, ${row.type}, ${row.at}, ${JSON.stringify(row.payload)})
      ON CONFLICT (id) DO NOTHING
    `;
    const cutoff = retentionCutoffIso();
    await sql`DELETE FROM langkah_events WHERE at < ${cutoff}`;
    return;
  }
  const store = await readFileStore();
  store.events = eventsWithinRetention([...store.events, row]).slice(-2000);
  await writeFileStore(store);
}

export async function listCapture(): Promise<CaptureFile> {
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    const waitlistRaw = (await sql`
      SELECT
        id,
        email,
        at,
        consent_version AS "consentVersion",
        profile,
        programme_ids AS "programmeIds",
        last_reminded_at AS "lastRemindedAt"
      FROM langkah_waitlist
      ORDER BY at DESC
      LIMIT 500
    `) as Array<Record<string, unknown>>;
    const waitlist = waitlistRaw.flatMap((row) => {
      if (typeof row.id !== 'string' || typeof row.email !== 'string') return [];
      return [
        normaliseWaitlist({
          id: row.id,
          email: row.email,
          at: iso(row.at),
          consentVersion: typeof row.consentVersion === 'string' ? row.consentVersion : '',
          profile: row.profile as Profile | null,
          programmeIds: Array.isArray(row.programmeIds) ? (row.programmeIds as string[]) : [],
          lastRemindedAt: row.lastRemindedAt ? iso(row.lastRemindedAt) : null,
        }),
      ];
    });
    const events = (await sql`
      SELECT id, type, at, payload
      FROM langkah_events
      ORDER BY at DESC
      LIMIT 500
    `) as CaptureEventRow[];
    const outboundRaw = (await sql`
      SELECT id, kind, to_email AS "to", subject, body, delivered, at
      FROM langkah_outbound
      ORDER BY at DESC
      LIMIT 100
    `) as Array<Record<string, unknown>>;
    const outbound: CaptureOutboundRow[] = outboundRaw.flatMap((row) => {
      if (
        typeof row.id !== 'string' ||
        (row.kind !== 'return_link' && row.kind !== 'window_reminder') ||
        typeof row.to !== 'string' ||
        typeof row.subject !== 'string' ||
        typeof row.body !== 'string'
      ) {
        return [];
      }
      return [
        {
          id: row.id,
          kind: row.kind,
          to: row.to,
          subject: row.subject,
          body: row.body,
          delivered: Boolean(row.delivered),
          at: iso(row.at),
        },
      ];
    });
    return { waitlist, events, links: [], outbound };
  }
  return readFileStore();
}

export async function emailAlreadyListed(email: string): Promise<boolean> {
  return (await getWaitlistByEmail(email)) !== null;
}
