/**
 * The runner: contexts, soft assertions, screenshots and the report.
 *
 * A check receives one `CheckRun` (`t`) and asserts through it. `t.expect` is a
 * soft assertion — it records the failure and keeps going, so one run surfaces
 * every problem on a page rather than only the first. `t.require` is for the
 * preconditions a check cannot proceed without (a missing route, a missing
 * selector); it aborts that check alone and the run continues.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { installHelpers } from './probes.mjs';
import { STORAGE_KEYS } from './contract.mjs';

const SEED_SENTINEL = '__langkah_verify_seeded__';

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

export class HardFail extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'HardFail';
    this.detail = detail;
  }
}

/** One browser context plus its page, with page errors captured for diagnostics. */
export class Session {
  constructor(context, page, label) {
    this.context = context;
    this.page = page;
    this.label = label;
    this.pageErrors = [];
    this.consoleErrors = [];
    page.on('pageerror', (error) => {
      this.pageErrors.push(String(error && error.stack ? error.stack.split('\n')[0] : error));
    });
    page.on('console', (message) => {
      if (message.type() === 'error') this.consoleErrors.push(message.text().slice(0, 300));
    });
  }

  /** Navigates and returns the HTTP status, which callers assert on. */
  async goto(route) {
    const url = this.absolute(route);
    const response = await this.page.goto(url, { waitUntil: 'load' });
    await this.page.waitForLoadState('networkidle').catch(() => {});
    return { url, status: response ? response.status() : null, response };
  }

  absolute(route) {
    return new URL(route, this.baseUrl).toString();
  }

  async close() {
    await this.context.close().catch(() => {});
  }
}

export class Ctx {
  constructor({ browser, baseUrl, outDir, quiet, log }) {
    this.browser = browser;
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    this.outDir = outDir;
    this.quiet = quiet;
    this.log = log;
    /** Filled in by discover(): programme ids, counts, the first row's id. */
    this.discovery = null;
    this.sessions = new Set();
  }

  absolute(route) {
    return new URL(route.replace(/^\//, ''), this.baseUrl).toString();
  }

  /**
   * Opens a context with localStorage already seeded. The seed runs once per
   * context, guarded by a sentinel, so a navigation later in the same session
   * does not wipe state the app itself wrote.
   */
  async openSession(options = {}) {
    const {
      device = 'desktop',
      profile,
      events,
      waitlist,
      banner = { dismissed: false },
      samples = true,
      reducedMotion,
      permissions = [],
      label = 'session',
    } = options;

    const preset = VIEWPORTS[device] || VIEWPORTS.desktop;
    const context = await this.browser.newContext({
      ...preset,
      reducedMotion,
      permissions,
      baseURL: this.baseUrl,
    });

    const seed = {};
    if (profile !== undefined) seed[STORAGE_KEYS.profile] = profile;
    if (events !== undefined) seed[STORAGE_KEYS.events] = events;
    if (waitlist !== undefined) seed[STORAGE_KEYS.waitlist] = waitlist;
    if (banner !== undefined) seed[STORAGE_KEYS.banner] = banner;
    if (samples !== undefined) seed[STORAGE_KEYS.samples] = { included: Boolean(samples) };

    await context.addInitScript(installHelpers);
    await context.addInitScript(
      ({ entries, sentinel }) => {
        try {
          if (window.localStorage.getItem(sentinel)) return;
          for (const [key, value] of Object.entries(entries)) {
            if (value === null) window.localStorage.removeItem(key);
            else window.localStorage.setItem(key, JSON.stringify(value));
          }
          window.localStorage.setItem(sentinel, '1');
        } catch {
          // Storage unavailable. The check that needs the seed will say so.
        }
      },
      { entries: seed, sentinel: SEED_SENTINEL },
    );

    const page = await context.newPage();
    const session = new Session(context, page, label);
    session.baseUrl = this.baseUrl;
    this.sessions.add(session);
    return session;
  }

  async closeAll() {
    for (const session of this.sessions) await session.close();
    this.sessions.clear();
  }
}

export class CheckRun {
  constructor(check, ctx) {
    this.check = check;
    this.ctx = ctx;
    this.failures = [];
    this.notes = [];
    this.artifacts = [];
    this.ownedSessions = [];
  }

  get id() {
    return this.check.id;
  }

  /** Soft assertion: records and continues. */
  expect(condition, message, detail = {}) {
    if (!condition) this.fail(message, detail);
    return !!condition;
  }

  fail(message, detail = {}) {
    this.failures.push({ message, ...normaliseDetail(detail) });
  }

  /** Precondition: aborts this check, leaving the rest of the run alone. */
  require(condition, message, detail = {}) {
    if (!condition) throw new HardFail(message, normaliseDetail(detail));
    return true;
  }

  note(message, data) {
    this.notes.push(data === undefined ? message : `${message} ${inline(data)}`);
  }

  async session(options = {}) {
    const session = await this.ctx.openSession({ ...options, label: this.id });
    this.ownedSessions.push(session);
    return session;
  }

  /** Navigates, failing the check hard if the route does not serve 2xx. */
  async open(session, route) {
    const { status, url } = await session.goto(route);
    this.require(
      status === null || (status >= 200 && status < 300),
      `route ${route} did not serve OK`,
      { selector: url, observed: `HTTP ${status}`, expected: 'HTTP 200' },
    );
    return url;
  }

  async shot(page, name) {
    if (this.ctx.quiet) return null;
    const file = path.join(this.ctx.outDir, `${name}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
    this.artifacts.push(path.basename(file));
    return file;
  }

  async closeSessions() {
    for (const session of this.ownedSessions) {
      if (session.pageErrors.length) {
        this.fail('the page threw an uncaught exception', {
          selector: session.label,
          observed: session.pageErrors.slice(0, 3).join(' | '),
          expected: 'no uncaught exceptions',
        });
      }
      await session.close();
    }
    this.ownedSessions = [];
  }
}

function normaliseDetail(detail) {
  const out = {};
  if (detail.selector !== undefined) out.selector = String(detail.selector);
  if (detail.observed !== undefined) out.observed = inline(detail.observed);
  if (detail.expected !== undefined) out.expected = inline(detail.expected);
  if (detail.route !== undefined) out.route = String(detail.route);
  if (detail.hint !== undefined) out.hint = String(detail.hint);
  return out;
}

function inline(value) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function runChecks(checks, ctx) {
  const results = [];
  for (const check of checks) {
    const t = new CheckRun(check, ctx);
    const startedAt = Date.now();
    let status = 'PASS';
    try {
      await check.run(t);
    } catch (error) {
      if (error instanceof HardFail) {
        t.failures.unshift({ message: error.message, ...(error.detail || {}) });
      } else {
        t.failures.unshift({
          message: `harness error: ${error && error.message ? error.message : String(error)}`,
          observed: error && error.stack ? error.stack.split('\n').slice(0, 4).join(' | ') : undefined,
        });
      }
    }
    try {
      await t.closeSessions();
    } catch {
      // A context that will not close does not change the verdict.
    }
    if (t.failures.length) status = 'FAIL';
    const result = {
      id: check.id,
      group: check.group,
      title: check.title,
      status,
      durationMs: Date.now() - startedAt,
      failures: t.failures,
      notes: t.notes,
      artifacts: t.artifacts,
    };
    results.push(result);
    ctx.log.line(result);
  }
  return results;
}

export async function writeReport(outDir, report) {
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, 'report.json');
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return file;
}
