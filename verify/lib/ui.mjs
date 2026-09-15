/**
 * App-shaped interactions, so the checks read as "fill the form, submit, read
 * the rows" rather than as a pile of locator plumbing.
 *
 * Everything here is deliberately tolerant about *how* a control is built — a
 * degree field may be a <select> or an <input>, visa sponsorship may be a
 * checkbox or a yes/no select — because the contract freezes the testid, not the
 * element. What is not tolerated is the testid being absent; that is reported.
 */

import { TESTID, tid, cityFieldId, sectorFieldId, citizenshipFieldId } from './contract.mjs';

export const loc = (page, testid) => page.locator(tid(testid));

export async function countOf(page, testid) {
  return loc(page, testid).count();
}

export async function exists(page, testid) {
  return (await loc(page, testid).count()) > 0;
}

export async function textOf(page, testid) {
  const locator = loc(page, testid).first();
  if (!(await locator.count())) return null;
  return (await locator.innerText()).trim();
}

async function describe(locator) {
  return locator.evaluate((el) => ({
    tag: el.tagName.toLowerCase(),
    type: (el.getAttribute('type') || '').toLowerCase(),
    role: el.getAttribute('role'),
    optionLabels: el.tagName === 'SELECT' ? Array.from(el.options).map((o) => o.textContent.trim()) : null,
    optionValues: el.tagName === 'SELECT' ? Array.from(el.options).map((o) => o.value) : null,
  }));
}

/**
 * Sets one control by testid, adapting to whatever element the app used.
 * Returns `{ ok, how }` on success or `{ ok: false, reason }` so the caller can
 * report a precise "selector not found" or "no option matched".
 */
export async function setField(page, testid, value, options = {}) {
  const { tap = false } = options;
  const locator = loc(page, testid).first();
  if (!(await locator.count())) return { ok: false, reason: `selector not found: ${tid(testid)}` };
  const info = await describe(locator);

  if (info.tag === 'select') {
    const wanted = String(value);
    const candidates = [wanted];
    if (/^\d+$/.test(wanted)) candidates.push(String(Number(wanted)), wanted.padStart(2, '0'));
    if (typeof value === 'boolean') candidates.push(value ? 'Yes' : 'No', value ? 'true' : 'false');
    for (const candidate of candidates) {
      for (const by of ['value', 'label']) {
        try {
          await locator.selectOption({ [by]: candidate }, { timeout: 2000 });
          return { ok: true, how: `select by ${by}=${candidate}` };
        } catch {
          // Try the next shape.
        }
      }
    }
    // Last resort: a case-insensitive prefix match against the option labels.
    const index = (info.optionLabels || []).findIndex((label) =>
      label.toLowerCase().startsWith(String(value).toLowerCase().slice(0, 3)),
    );
    if (index >= 0) {
      await locator.selectOption({ index });
      return { ok: true, how: `select by index ${index} (${info.optionLabels[index]})` };
    }
    return {
      ok: false,
      reason: `no option matched ${JSON.stringify(value)}; options: ${JSON.stringify(info.optionValues)}`,
    };
  }

  if (info.type === 'checkbox' || info.type === 'radio' || info.role === 'checkbox') {
    const wanted = value === undefined ? true : Boolean(value);
    if (info.type === 'radio') {
      if (tap) await locator.tap();
      else await locator.check();
      return { ok: true, how: 'radio checked' };
    }
    const checked = await locator.isChecked().catch(() => false);
    if (checked !== wanted) {
      if (tap) await locator.tap();
      else await locator.setChecked(wanted);
    }
    return { ok: true, how: `checkbox set to ${wanted}` };
  }

  if (info.tag === 'input' || info.tag === 'textarea') {
    await locator.fill(String(value));
    return { ok: true, how: `filled "${value}"` };
  }

  if (info.tag === 'button' || info.role === 'button') {
    if (tap) await locator.tap();
    else await locator.click();
    return { ok: true, how: 'clicked' };
  }

  return { ok: false, reason: `unsupported control <${info.tag} type="${info.type}">` };
}

/**
 * Fills all seven profile fields through the UI. Returns `{ problems, actions }`
 * — problems are per-field so a half-built form tells you exactly which field
 * is missing rather than only that submit did nothing.
 */
export async function fillProfileForm(page, profile, options = {}) {
  const problems = [];
  const actions = [];
  const apply = async (testid, value) => {
    const result = await setField(page, testid, value, options);
    if (result.ok) actions.push(`${testid}: ${result.how}`);
    else problems.push({ testid, reason: result.reason });
    return result.ok;
  };

  await apply(TESTID.fieldDegree, profile.degreeField);
  await apply(TESTID.fieldCgpa, profile.cgpa.toFixed(2));
  await apply(TESTID.fieldGradMonth, profile.graduationMonth);
  await apply(TESTID.fieldGradYear, profile.graduationYear);

  for (const city of profile.preferredCities) {
    const testid = cityFieldId(city);
    if (await exists(page, testid)) await apply(testid, true);
    else problems.push({ testid, reason: `selector not found: ${tid(testid)} (city "${city}")` });
  }

  for (const sector of profile.sectorsOfInterest) {
    const testid = sectorFieldId(sector);
    if (await exists(page, testid)) await apply(testid, true);
    else problems.push({ testid, reason: `selector not found: ${tid(testid)} (sector "${sector}")` });
  }

  const citizenshipTestid = citizenshipFieldId(profile.citizenship);
  if (await exists(page, citizenshipTestid)) await apply(citizenshipTestid, true);
  else problems.push({ testid: citizenshipTestid, reason: `selector not found: ${tid(citizenshipTestid)}` });

  await apply(TESTID.fieldVisa, profile.needsVisaSponsorship);

  return { problems, actions };
}

export async function submitProfile(page, options = {}) {
  const { tap = false } = options;
  const button = loc(page, TESTID.profileSubmit).first();
  if (!(await button.count())) return { ok: false, reason: `selector not found: ${tid(TESTID.profileSubmit)}` };
  if (tap) await button.tap();
  else await button.click();
  return { ok: true };
}

/** Resolves once the URL settles on the shortlist, or reports what it settled on. */
export async function waitForShortlist(page, timeout = 8000) {
  try {
    await page.waitForURL(/\/shortlist\/?(\?|#|$)/, { timeout });
    await page.waitForLoadState('networkidle').catch(() => {});
    return { ok: true, url: page.url() };
  } catch {
    return { ok: false, url: page.url() };
  }
}

const FIRST_NUMBER = /-?\d+(?:\.\d+)?/;

/** One entry per eligible row, with the attributes the filter checks rely on. */
export async function readShortlistRows(page) {
  return page.evaluate((ids) => {
    const number = (text) => {
      const match = String(text || '').match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : null;
    };
    return Array.from(document.querySelectorAll(`[data-testid="${ids.shortlistRow}"]`)).map((row, index) => {
      const totalEl = row.querySelector(`[data-testid="${ids.fitTotal}"]`);
      const link = row.querySelector('a[href*="/program/"]');
      const href = link ? link.getAttribute('href') : null;
      const fromHref = href ? (href.match(/\/program\/([^/?#]+)/) || [])[1] : null;
      return {
        index,
        programId: row.getAttribute('data-program-id') || row.getAttribute('data-program') || fromHref || null,
        href,
        fitTotalText: totalEl ? totalEl.textContent.trim() : null,
        fitTotal: totalEl ? number(totalEl.textContent) : null,
        sector: row.getAttribute('data-sector'),
        country: row.getAttribute('data-country'),
        status: row.getAttribute('data-status') || row.getAttribute('data-window-status'),
        hasSectorAttr: row.hasAttribute('data-sector'),
        hasCountryAttr: row.hasAttribute('data-country'),
        hasStatusAttr: row.hasAttribute('data-status') || row.hasAttribute('data-window-status'),
        visible: window.__verify ? window.__verify.isVisible(row) : true,
        text: row.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
      };
    });
  }, TESTID);
}

export async function readIneligibleRows(page) {
  return page.evaluate((ids) => {
    return Array.from(document.querySelectorAll(`[data-testid="${ids.ineligibleRow}"]`)).map((row, index) => ({
      index,
      programId: row.getAttribute('data-program-id') || row.getAttribute('data-program') || null,
      visible: window.__verify ? window.__verify.isVisible(row) : true,
      reasons: Array.from(row.querySelectorAll(`[data-testid="${ids.ineligibleReason}"]`)).map((reason) => ({
        text: reason.textContent.trim(),
        visible: window.__verify ? window.__verify.isVisible(reason) : true,
      })),
      text: row.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
    }));
  }, TESTID);
}

/**
 * The ineligible half may sit behind a disclosure. Opens whatever it is, by
 * <details> first and then by any control whose label talks about eligibility.
 */
export async function openIneligibleSection(page) {
  const before = await countOf(page, TESTID.ineligibleRow);
  const opened = await page.evaluate(() => {
    let touched = false;
    for (const details of Array.from(document.querySelectorAll('details'))) {
      if (!details.open && /not eligible|ineligible|don.t (yet )?qualify|missed/i.test(details.textContent || '')) {
        details.open = true;
        touched = true;
      }
    }
    return touched;
  });
  if (!opened) {
    const button = page
      .locator('button, [role="button"]')
      .filter({ hasText: /not eligible|ineligible|don.t qualify|show .*(ineligible|not eligible)/i })
      .first();
    if (await button.count()) await button.click().catch(() => {});
  }
  await page.waitForTimeout(150);
  const after = await countOf(page, TESTID.ineligibleRow);
  return { before, after, opened };
}

/** Clicks the nth fit toggle and returns the aria state either side of the click. */
export async function expandFit(page, index = 0, options = {}) {
  const { tap = false, press = null } = options;
  const toggle = loc(page, TESTID.fitToggle).nth(index);
  if (!(await toggle.count())) return { ok: false, reason: `selector not found: ${tid(TESTID.fitToggle)}` };
  const before = await toggle.getAttribute('aria-expanded');
  const controls = await toggle.getAttribute('aria-controls');
  if (press) {
    await toggle.focus();
    await page.keyboard.press(press);
  } else if (tap) {
    await toggle.tap();
  } else {
    await toggle.click();
  }
  await page.waitForTimeout(200);
  const after = await toggle.getAttribute('aria-expanded');
  return { ok: true, before, after, controls };
}

/** Reads the breakdown a given toggle owns, preferring aria-controls over proximity. */
export async function readBreakdownFor(page, index = 0) {
  return page.evaluate(
    ({ ids, idx }) => {
      const toggles = Array.from(document.querySelectorAll(`[data-testid="${ids.fitToggle}"]`));
      const toggle = toggles[idx];
      if (!toggle) return { found: false, reason: 'no fit toggle at that index' };
      const controls = toggle.getAttribute('aria-controls');
      let panel = controls ? document.getElementById(controls) : null;
      let resolvedBy = panel ? 'aria-controls' : null;
      if (!panel) {
        const row = toggle.closest(`[data-testid="${ids.shortlistRow}"]`) || toggle.parentElement;
        panel = row ? row.querySelector(`[data-testid="${ids.fitBreakdown}"]`) : null;
        resolvedBy = panel ? 'nearest breakdown in row' : null;
      }
      if (!panel) return { found: false, reason: `no [data-testid="${ids.fitBreakdown}"] reachable from toggle ${idx}` };
      const visible = window.__verify ? window.__verify.isVisible(panel) : true;
      const components = Array.from(panel.querySelectorAll(`[data-testid="${ids.fitComponent}"]`)).map((c) => ({
        text: c.textContent.trim().replace(/\s+/g, ' '),
        visible: window.__verify ? window.__verify.isVisible(c) : true,
      }));
      return {
        found: true,
        resolvedBy,
        controls,
        panelIsBreakdown: panel.getAttribute('data-testid') === ids.fitBreakdown,
        panelId: panel.id || null,
        visible,
        components,
        text: panel.textContent.trim().replace(/\s+/g, ' ').slice(0, 300),
      };
    },
    { ids: TESTID, idx: index },
  );
}

/** Which filter chips the page actually rendered, by kind. */
export async function readFilterChips(page) {
  return page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('[data-testid^="filter-"]'));
    return chips.map((chip) => {
      const testid = chip.getAttribute('data-testid');
      const match = testid.match(/^filter-(sector|country|status)-(.+)$/);
      return {
        testid,
        kind: match ? match[1] : testid === 'filter-reset' ? 'reset' : 'other',
        value: match ? match[2] : null,
        tag: chip.tagName.toLowerCase(),
        pressed: chip.getAttribute('aria-pressed'),
        visible: window.__verify ? window.__verify.isVisible(chip) : true,
      };
    });
  });
}

export function firstNumber(text) {
  const match = String(text || '').match(FIRST_NUMBER);
  return match ? Number(match[0]) : null;
}

export function programRoute(id) {
  return `/program/${id}/`;
}
