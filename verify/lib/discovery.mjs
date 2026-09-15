/**
 * One warm-up pass that every group reuses: which programme to open, how many
 * programmes exist, which filter chips the app rendered.
 *
 * Doing this once keeps the checks honest — they assert against a programme the
 * app itself put on the shortlist rather than an id hard-coded here.
 */

import { TESTID, ROUTES, PROFILE_MAIN, DEGREE_FIELDS, NO_MATCH_CANDIDATES } from './contract.mjs';
import { readShortlistRows, readIneligibleRows, openIneligibleSection, readFilterChips, countOf } from './ui.mjs';
import { loadProgramsFromDisk, uncoveredFields, wrappingPrograms } from './programs.mjs';

export async function discover(ctx) {
  if (ctx.discovery) return ctx.discovery;

  const disk = await loadProgramsFromDisk();
  const result = {
    programId: null,
    programIds: [],
    eligibleCount: null,
    ineligibleCount: null,
    totalPrograms: null,
    programsFromDisk: disk.programs ? disk.programs.length : null,
    diskSource: disk.source,
    diskError: disk.error,
    programs: disk.programs,
    wrapping: disk.programs ? wrappingPrograms(disk.programs) : null,
    chips: [],
    sectors: [],
    countries: [],
    statuses: [],
    error: null,
  };

  let session;
  try {
    session = await ctx.openSession({ profile: PROFILE_MAIN, events: [], waitlist: [], label: 'discovery' });
    const response = await session.goto(ROUTES.shortlist);
    if (response.status && (response.status < 200 || response.status >= 300)) {
      result.error = `/shortlist/ served HTTP ${response.status}`;
    } else {
      const page = session.page;
      await openIneligibleSection(page).catch(() => {});
      const rows = await readShortlistRows(page);
      const ineligible = await readIneligibleRows(page);
      result.eligibleCount = rows.length;
      result.ineligibleCount = ineligible.length;
      result.rows = rows;

      const ids = [...rows, ...ineligible].map((row) => row.programId).filter(Boolean);
      if (!ids.length) {
        // Nothing carried an id; fall back to any programme link on the page.
        const hrefs = await page.$$eval('a[href*="/program/"]', (links) =>
          links.map((link) => (link.getAttribute('href').match(/\/program\/([^/?#]+)/) || [])[1]).filter(Boolean),
        );
        ids.push(...hrefs);
      }
      result.programIds = Array.from(new Set(ids));
      result.programId = rows.length && rows[0].programId ? rows[0].programId : result.programIds[0] || null;
      if (!result.programId) {
        result.error = 'no row exposed data-program-id and no row linked to /program/<id>/';
      }

      result.chips = await readFilterChips(page);
      result.sectors = result.chips.filter((c) => c.kind === 'sector').map((c) => c.value);
      result.countries = result.chips.filter((c) => c.kind === 'country').map((c) => c.value);
      result.statuses = result.chips.filter((c) => c.kind === 'status').map((c) => c.value);
    }
  } catch (error) {
    result.error = `discovery failed: ${error.message}`;
  } finally {
    if (session) await session.close();
  }

  result.totalPrograms =
    result.programsFromDisk !== null
      ? result.programsFromDisk
      : result.eligibleCount !== null && result.ineligibleCount !== null
        ? result.eligibleCount + result.ineligibleCount
        : null;

  ctx.discovery = result;
  return result;
}

/**
 * A profile that matches nothing.
 *
 * With the seed data on disk this is exact: pick a degree field no programme
 * names, which the eligibility gate rejects on its own. Without it, probe the
 * obscure-combination candidates in the browser and use the first that returns
 * an empty shortlist — reported either way so the owner knows which happened.
 */
export async function findNoMatchProfile(ctx) {
  if (ctx.noMatchProfile) return ctx.noMatchProfile;
  const discovery = await discover(ctx);
  const attempts = [];

  const candidates = [...NO_MATCH_CANDIDATES];
  if (discovery.programs) {
    const uncovered = uncoveredFields(discovery.programs, DEGREE_FIELDS);
    if (uncovered.length) {
      candidates.unshift({ ...NO_MATCH_CANDIDATES[0], degreeField: uncovered[0] });
    }
  }

  for (const profile of candidates) {
    const session = await ctx.openSession({ profile, events: [], waitlist: [], label: 'no-match probe' });
    try {
      await session.goto(ROUTES.shortlist);
      const rows = await countOf(session.page, TESTID.shortlistRow);
      attempts.push({ degreeField: profile.degreeField, rows });
      if (rows === 0) {
        ctx.noMatchProfile = { profile, attempts, ok: true };
        return ctx.noMatchProfile;
      }
    } finally {
      await session.close();
    }
  }

  ctx.noMatchProfile = { profile: candidates[0], attempts, ok: false };
  return ctx.noMatchProfile;
}
