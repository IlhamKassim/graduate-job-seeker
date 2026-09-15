import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

export interface CaptureWaitlistRow {
  id: string;
  email: string;
  at: string;
  consentVersion: string;
}

export interface CaptureEventRow {
  id: string;
  type: string;
  at: string;
  payload: Record<string, unknown>;
}

interface CaptureFile {
  waitlist: CaptureWaitlistRow[];
  events: CaptureEventRow[];
}

/** Product events older than this are dropped on write. Waitlist rows are kept. */
export const EVENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

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

function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

async function readFileStore(): Promise<CaptureFile> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ filePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<CaptureFile>;
    return {
      waitlist: Array.isArray(parsed.waitlist) ? parsed.waitlist : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return { waitlist: [], events: [] };
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
  await sql`
    CREATE TABLE IF NOT EXISTS langkah_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    )
  `;
  return sql;
}

export function capturePersistence(): 'postgres' | 'file' {
  return databaseUrl() ? 'postgres' : 'file';
}

export async function appendWaitlistRow(row: CaptureWaitlistRow): Promise<void> {
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    await sql`
      INSERT INTO langkah_waitlist (id, email, at, consent_version)
      VALUES (${row.id}, ${row.email}, ${row.at}, ${row.consentVersion})
      ON CONFLICT (id) DO NOTHING
    `;
    return;
  }
  const store = await readFileStore();
  if (store.waitlist.some((entry) => entry.email.toLowerCase() === row.email.toLowerCase())) {
    return;
  }
  store.waitlist.push(row);
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
    const waitlist = (await sql`
      SELECT id, email, at, consent_version AS "consentVersion"
      FROM langkah_waitlist
      ORDER BY at DESC
      LIMIT 500
    `) as CaptureWaitlistRow[];
    const events = (await sql`
      SELECT id, type, at, payload
      FROM langkah_events
      ORDER BY at DESC
      LIMIT 500
    `) as CaptureEventRow[];
    return { waitlist, events };
  }
  return readFileStore();
}

export async function emailAlreadyListed(email: string): Promise<boolean> {
  const needle = email.toLowerCase();
  if (databaseUrl()) {
    const sql = await ensurePostgres();
    const rows = (await sql`
      SELECT 1 FROM langkah_waitlist WHERE lower(email) = ${needle} LIMIT 1
    `) as Array<Record<string, unknown>>;
    return rows.length > 0;
  }
  const store = await readFileStore();
  return store.waitlist.some((entry) => entry.email.toLowerCase() === needle);
}
