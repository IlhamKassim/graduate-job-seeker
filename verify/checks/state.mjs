/**
 * Group B — state and edge behaviour.
 *
 * The states a pilot actually meets: no profile saved, a profile that matches
 * nothing, a half-filled form, an empty log, a window that wraps the year. Each
 * one has an explicit expectation about what the user is told, because "an empty
 * page with no explanation" is the failure mode this group exists to catch.
 */

import {
  TESTID,
  tid,
  ROUTES,
  PROFILE_MAIN,
  PROFILE_GRAD_DEC,
  SEED_EVENTS,
} from '../lib/contract.mjs';
import {
  loc,
  countOf,
  exists,
  textOf,
  setField,
  fillProfileForm,
  submitProfile,
  waitForShortlist,
  readShortlistRows,
  readIneligibleRows,
  openIneligibleSection,
  readFilterChips,
  programRoute,
} from '../lib/ui.mjs';
import { probeStorage, probeCalendarGeometry, probeVisibleText } from '../lib/probes.mjs';
import { discover, findNoMatchProfile } from '../lib/discovery.mjs';

/** Visible, in-page error messaging — anything a sighted user would actually see. */
async function readVisibleErrors(page, ids) {
  return page.evaluate((testids) => {
    const V = window.__verify;
    const nodes = new Set();
    const add = (selector) => document.querySelectorAll(selector).forEach((n) => nodes.add(n));
    add(`[data-testid="${testids.formErrorSummary}"]`);
    add('[role="alert"]');
    add('[aria-live="assertive"]');
    add('[aria-invalid="true"]');
    add('[class*="error" i]');
    add('[class*="invalid" i]');
    add('[data-testid*="error" i]');
    return Array.from(nodes)
      .filter((node) => V.isVisible(node))
      .map((node) => ({
        selector: V.cssPath(node),
        testid: node.getAttribute('data-testid'),
        role: node.getAttribute('role'),
        text: (node.innerText || node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200),
        isSubmit:
          node.getAttribute('data-testid') === testids.profileSubmit ||
          node.tagName === 'BUTTON' ||
          (node.tagName === 'INPUT' && (node.type === 'submit' || node.type === 'button')),
      }))
      .filter((entry) => entry.text.length > 0);
  }, ids);
}

export const stateChecks = [
  {
    id: 'B1',
    group: 'B',
    title: '/shortlist/ with no saved profile explains itself and links back to /',
    async run(t) {
      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;

      const notice = loc(page, TESTID.shortlistNoProfile).first();
      t.require(await notice.count(), 'selector not found', {
        selector: tid(TESTID.shortlistNoProfile),
        observed: 'absent with no profile saved',
        expected: 'a no-profile state',
      });
      t.expect(await notice.isVisible(), 'the no-profile state is in the DOM but not visible', {
        selector: tid(TESTID.shortlistNoProfile),
      });

      const text = (await notice.innerText()).trim();
      t.expect(text.length >= 20, 'the no-profile state says almost nothing', {
        selector: tid(TESTID.shortlistNoProfile),
        observed: `"${text}" (${text.length} chars)`,
        expected: '>= 20 characters explaining what to do',
      });

      const link = await notice.evaluate((el) => {
        const anchors = Array.from(el.querySelectorAll('a[href]'));
        return anchors.map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() }));
      });
      const home = link.find((a) => /^\/?$|^\.\/?$|\/index\.html$/.test(a.href) || a.href === '/');
      t.expect(Boolean(home), 'the no-profile state has no link back to the form', {
        selector: `${tid(TESTID.shortlistNoProfile)} a[href]`,
        observed: link.length ? JSON.stringify(link) : 'no anchors inside the notice',
        expected: 'a link whose href is /',
      });

      const rows = await countOf(page, TESTID.shortlistRow);
      t.expect(rows === 0, 'rows are rendered even though no profile is saved', {
        selector: tid(TESTID.shortlistRow),
        observed: `${rows} rows`,
        expected: '0',
      });
    },
  },

  {
    id: 'B2',
    group: 'B',
    title: '/shortlist/ with a profile that matches nothing names something to change',
    async run(t) {
      const found = await findNoMatchProfile(t.ctx);
      t.note('no-match probe attempts (degreeField → rows):', found.attempts);
      t.expect(found.ok, 'no profile in the probe set produced an empty shortlist', {
        observed: JSON.stringify(found.attempts),
        expected: 'one combination that fails every programme',
        hint: 'the seed data may accept any degree field; widen NO_MATCH_CANDIDATES in lib/contract.mjs',
      });

      const session = await t.session({ profile: found.profile, events: [], waitlist: [] });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;

      const empty = loc(page, TESTID.shortlistEmpty).first();
      t.require(await empty.count(), 'selector not found', {
        selector: tid(TESTID.shortlistEmpty),
        observed: `no empty state with profile ${JSON.stringify(found.profile.degreeField)} / CGPA ${found.profile.cgpa}`,
        expected: 'an empty state explaining the zero result',
      });
      t.expect(await empty.isVisible(), 'the empty state is in the DOM but not visible', {
        selector: tid(TESTID.shortlistEmpty),
      });

      const text = (await empty.innerText()).trim();
      const levers = ['cgpa', 'city', 'cities', 'sector', 'citizenship', 'filter'];
      const mentioned = levers.filter((lever) => text.toLowerCase().includes(lever));
      t.expect(mentioned.length >= 1, 'the empty state names nothing the student could change', {
        selector: tid(TESTID.shortlistEmpty),
        observed: `"${text.slice(0, 200)}"`,
        expected: `text naming one of ${levers.join(', ')}`,
      });
      t.note('levers named in the empty state:', mentioned);
    },
  },

  {
    id: 'B3',
    group: 'B',
    title: 'Sector, country and status filters narrow correctly and reset restores',
    async run(t) {
      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;

      const baseline = (await readShortlistRows(page)).filter((row) => row.visible);
      t.require(baseline.length >= 1, 'no visible shortlist rows to filter', {
        selector: tid(TESTID.shortlistRow),
        observed: '0 visible rows',
        expected: '>= 1',
      });

      const chips = await readFilterChips(page);
      const byKind = {
        sector: chips.filter((c) => c.kind === 'sector' && c.visible),
        country: chips.filter((c) => c.kind === 'country' && c.visible),
        status: chips.filter((c) => c.kind === 'status' && c.visible),
      };
      t.note('filter chips found:', chips.map((c) => c.testid));

      const attrFor = { sector: 'sector', country: 'country', status: 'status' };
      const hasAttrFor = { sector: 'hasSectorAttr', country: 'hasCountryAttr', status: 'hasStatusAttr' };

      for (const row of baseline) {
        t.expect(row.hasSectorAttr, 'a shortlist row does not expose data-sector', {
          selector: `${tid(TESTID.shortlistRow)}:nth(${row.index})`,
          observed: `row text "${row.text.slice(0, 60)}"`,
          expected: 'a data-sector attribute the filter check can read',
        });
      }

      const reset = async () => {
        const resetButton = loc(page, TESTID.filterReset).first();
        if (await resetButton.count()) {
          await resetButton.click();
          await page.waitForTimeout(150);
          return true;
        }
        return false;
      };

      const hasReset = (await countOf(page, TESTID.filterReset)) > 0;
      t.expect(hasReset, 'selector not found', {
        selector: tid(TESTID.filterReset),
        expected: 'a control that clears every filter',
      });

      for (const kind of ['sector', 'country', 'status']) {
        const kindChips = byKind[kind];
        if (!kindChips.length) {
          t.fail(`no ${kind} filter chips were rendered`, {
            selector: `[data-testid^="filter-${kind}-"]`,
            observed: '0 chips',
            expected: `one chip per ${kind} present in the data`,
          });
          continue;
        }
        for (const chip of kindChips) {
          const chipLocator = page.locator(tid(chip.testid)).first();
          await chipLocator.click();
          await page.waitForTimeout(200);
          const rows = (await readShortlistRows(page)).filter((row) => row.visible);
          for (const row of rows) {
            if (!row[hasAttrFor[kind]]) {
              t.fail(`a row left visible by the ${kind} filter has no data-${attrFor[kind]}`, {
                selector: `${tid(TESTID.shortlistRow)}:nth(${row.index})`,
                observed: `row text "${row.text.slice(0, 60)}"`,
                expected: `data-${attrFor[kind]}="${chip.value}"`,
              });
              continue;
            }
            t.expect(row[attrFor[kind]] === chip.value, `the ${kind} filter left a row that does not match`, {
              selector: tid(chip.testid),
              observed: `row data-${attrFor[kind]}="${row[attrFor[kind]]}" (${row.text.slice(0, 50)})`,
              expected: `every visible row with data-${attrFor[kind]}="${chip.value}"`,
            });
          }
          if (!(await reset())) {
            await chipLocator.click();
            await page.waitForTimeout(150);
          }
        }
      }

      // One sector + one country must give the intersection, not the union.
      const sectorChip = byKind.sector.find((chip) =>
        baseline.some((row) => row.sector === chip.value && row.country),
      );
      const countryChip = sectorChip
        ? byKind.country.find((chip) =>
            baseline.some((row) => row.sector === sectorChip.value && row.country === chip.value),
          )
        : null;

      if (sectorChip && countryChip) {
        await page.locator(tid(sectorChip.testid)).first().click();
        await page.waitForTimeout(120);
        await page.locator(tid(countryChip.testid)).first().click();
        await page.waitForTimeout(200);
        const rows = (await readShortlistRows(page)).filter((row) => row.visible);
        const expectedIds = baseline
          .filter((row) => row.sector === sectorChip.value && row.country === countryChip.value)
          .map((row) => row.programId || row.text.slice(0, 40));
        const actualIds = rows.map((row) => row.programId || row.text.slice(0, 40));
        t.expect(
          JSON.stringify([...actualIds].sort()) === JSON.stringify([...expectedIds].sort()),
          'combining a sector and a country filter does not give the intersection',
          {
            selector: `${tid(sectorChip.testid)} + ${tid(countryChip.testid)}`,
            observed: `${actualIds.length} rows: ${JSON.stringify(actualIds)}`,
            expected: `${expectedIds.length} rows: ${JSON.stringify(expectedIds)}`,
          },
        );
        t.note('intersection tested:', `${sectorChip.value} + ${countryChip.value}`);
      } else {
        t.fail('could not find a sector and country combination to test the intersection with', {
          observed: `sector chips ${JSON.stringify(byKind.sector.map((c) => c.value))}, country chips ${JSON.stringify(
            byKind.country.map((c) => c.value),
          )}`,
          expected: 'at least one row sharing a sector chip and a country chip',
        });
      }

      if (hasReset) {
        await reset();
        const restored = (await readShortlistRows(page)).filter((row) => row.visible);
        t.expect(restored.length === baseline.length, 'reset did not restore the full list', {
          selector: tid(TESTID.filterReset),
          observed: `${restored.length} rows after reset`,
          expected: `${baseline.length} rows (the unfiltered list)`,
        });
      }
    },
  },

  {
    id: 'B4',
    group: 'B',
    title: 'The profile form refuses an empty submit and an out-of-range CGPA, visibly',
    async run(t) {
      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, ROUTES.landing);
      const page = session.page;

      t.require(await exists(page, TESTID.profileForm), 'selector not found', {
        selector: tid(TESTID.profileForm),
      });

      const urlBefore = page.url();
      const submitted = await submitProfile(page);
      t.require(submitted.ok, 'selector not found', { selector: tid(TESTID.profileSubmit) });
      await page.waitForTimeout(400);

      t.expect(page.url() === urlBefore, 'an empty submit navigated away', {
        observed: page.url(),
        expected: urlBefore,
      });

      const errors = await readVisibleErrors(page, TESTID);
      const nonButtonErrors = errors.filter((error) => !error.isSubmit);
      t.expect(errors.length >= 1, 'an empty submit produced no visible error message', {
        selector: tid(TESTID.formErrorSummary),
        observed: '0 visible error elements',
        expected: '>= 1 visible error',
      });
      t.expect(nonButtonErrors.length >= 1, 'the submit button is the only feedback on an empty submit', {
        selector: tid(TESTID.profileSubmit),
        observed: `visible error elements: ${JSON.stringify(errors.map((e) => e.selector))}`,
        expected: 'an error message outside the button',
      });
      t.note('visible errors:', nonButtonErrors.map((e) => `${e.selector}: ${e.text.slice(0, 60)}`));

      const focusState = await page.evaluate((ids) => {
        const V = window.__verify;
        const form = document.querySelector(`[data-testid="${ids.profileForm}"]`);
        if (!form) return null;
        const controls = Array.from(form.querySelectorAll('input, select, textarea')).filter(
          (el) => el.type !== 'hidden',
        );
        const firstInvalid =
          controls.find((el) => el.getAttribute('aria-invalid') === 'true') ||
          controls.find((el) => el.willValidate && !el.checkValidity()) ||
          controls[0];
        if (!firstInvalid) return null;
        const describedby = firstInvalid.getAttribute('aria-describedby');
        const described = describedby
          ? describedby
              .split(/\s+/)
              .map((id) => document.getElementById(id))
              .filter(Boolean)
              .map((el) => ({ id: el.id, text: el.textContent.trim().slice(0, 120), visible: V.isVisible(el) }))
          : [];
        return {
          firstInvalid: V.cssPath(firstInvalid),
          firstInvalidTestid: firstInvalid.getAttribute('data-testid'),
          focused: document.activeElement === firstInvalid,
          activeElement: V.cssPath(document.activeElement),
          described,
          nativeMessage: firstInvalid.validationMessage || null,
        };
      }, TESTID);

      if (focusState) {
        const describedVisible = focusState.described.some((d) => d.visible && d.text.length > 0);
        t.expect(
          focusState.focused || describedVisible,
          'the first invalid control is neither focused nor described by a visible error',
          {
            selector: focusState.firstInvalid,
            observed: `focused=${focusState.focused}, activeElement=${focusState.activeElement}, aria-describedby=${JSON.stringify(
              focusState.described,
            )}`,
            expected: 'focus moved to it, or aria-describedby pointing at a visible error',
          },
        );
      } else {
        t.fail('could not identify the first invalid control in the form', {
          selector: `${tid(TESTID.profileForm)} input, select, textarea`,
        });
      }

      // Out-of-range CGPA, both ends.
      for (const bad of ['9.9', '-1']) {
        await page.reload({ waitUntil: 'load' });
        await fillProfileForm(page, PROFILE_MAIN);
        const set = await setField(page, TESTID.fieldCgpa, bad);
        if (!set.ok) {
          t.fail('could not type an out-of-range CGPA', { selector: tid(TESTID.fieldCgpa), observed: set.reason });
          continue;
        }
        await submitProfile(page);
        await page.waitForTimeout(400);

        const rangeErrors = await readVisibleErrors(page, TESTID);
        const naming = rangeErrors.filter((error) => {
          const text = error.text.toLowerCase();
          return text.includes('4') && /(between|range|maximum|max|minimum|min|0)/.test(text);
        });
        if (naming.length) {
          t.note(`CGPA "${bad}" rejected with:`, naming[0].text.slice(0, 120));
        } else {
          const native = await page.evaluate((ids) => {
            const el = document.querySelector(`[data-testid="${ids.fieldCgpa}"]`);
            return el ? { message: el.validationMessage, valid: el.checkValidity ? el.checkValidity() : null } : null;
          }, TESTID);
          t.fail(`an out-of-range CGPA (${bad}) produced no in-page error naming the valid range`, {
            selector: tid(TESTID.fieldCgpa),
            observed: `visible errors: ${JSON.stringify(rangeErrors.map((e) => e.text.slice(0, 60)))}; native validationMessage: ${
              native ? JSON.stringify(native.message) : 'n/a'
            }`,
            expected: 'a visible message naming the 0–4 range',
          });
        }
        t.expect(!/\/shortlist\/?$/.test(new URL(page.url()).pathname), `an out-of-range CGPA (${bad}) was accepted`, {
          observed: page.url(),
          expected: 'still on /',
        });
      }
    },
  },

  {
    id: 'B5',
    group: 'B',
    title: '/program/<id>/ with no profile still renders, and claims no verdict it cannot compute',
    async run(t) {
      const discovery = await discover(t.ctx);
      t.require(discovery.programId, 'could not find a programme id to open', {
        observed: discovery.error,
        expected: 'a programme id from the shortlist',
      });

      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, programRoute(discovery.programId));
      const page = session.page;

      t.expect(await exists(page, TESTID.noProfileNotice), 'selector not found', {
        selector: tid(TESTID.noProfileNotice),
        route: programRoute(discovery.programId),
        observed: 'absent with no profile saved',
        expected: 'a notice that there is no profile to check against',
      });

      t.expect(await exists(page, TESTID.stageTimeline), 'the stage timeline disappeared without a profile', {
        selector: tid(TESTID.stageTimeline),
        observed: 'absent',
        expected: 'present — the stages do not depend on a profile',
      });
      const stages = await countOf(page, TESTID.stageItem);
      t.expect(stages >= 1, 'the stage timeline rendered no stages without a profile', {
        selector: tid(TESTID.stageItem),
        observed: `${stages} stages`,
        expected: '>= 1',
      });

      const verdict = await textOf(page, TESTID.eligibilityCheck);
      if (verdict !== null) {
        const claims = /\byou (are|aren'?t|are not|do not|don'?t)\s+(eligible|qualify|meet)\b|\bnot eligible\b|\byou qualify\b/i;
        t.expect(!claims.test(verdict), 'the page states an eligibility verdict with no profile to compute it from', {
          selector: tid(TESTID.eligibilityCheck),
          observed: `"${verdict.slice(0, 160)}"`,
          expected: 'no verdict, or copy that says a profile is needed first',
        });
      }

      const text = await page.evaluate(probeVisibleText);
      t.expect(text.trim().length > 40, 'the programme page rendered almost nothing without a profile', {
        route: programRoute(discovery.programId),
        observed: `${text.trim().length} characters`,
        expected: '> 40 characters',
      });
    },
  },

  {
    id: 'B6',
    group: 'B',
    title: '/debug/ with an empty log says it is empty rather than showing a bare []',
    async run(t) {
      const session = await t.session({ profile: PROFILE_MAIN, events: null, waitlist: null });
      await t.open(session, ROUTES.debug);
      const page = session.page;

      const emptyState = await exists(page, TESTID.debugEmpty);
      const eventsText = (await textOf(page, TESTID.debugEvents)) || '';

      if (emptyState) {
        const text = (await textOf(page, TESTID.debugEmpty)) || '';
        t.expect(text.trim().length >= 10, 'the empty state has no explanatory text', {
          selector: tid(TESTID.debugEmpty),
          observed: `"${text}"`,
          expected: '>= 10 characters of explanation',
        });
        t.note('empty state:', text.slice(0, 120));
        return;
      }

      t.expect(eventsText.trim() !== '[]', 'an empty log renders as a bare [] with no explanation', {
        selector: `${tid(TESTID.debugEmpty)} / ${tid(TESTID.debugEvents)}`,
        observed: `no ${tid(TESTID.debugEmpty)}; ${tid(TESTID.debugEvents)} is "${eventsText.trim()}"`,
        expected: `a ${tid(TESTID.debugEmpty)} element, or copy explaining that nothing has been recorded yet`,
      });
      t.expect(eventsText.trim().length >= 20, 'nothing on the page explains the empty log', {
        selector: tid(TESTID.debugEmpty),
        observed: `"${eventsText.trim().slice(0, 80)}"`,
        expected: 'an explicit empty state',
      });
    },
  },

  {
    id: 'B7',
    group: 'B',
    title: 'Email capture is shortlist-only, validates inline, and records to the waitlist',
    async run(t) {
      const landing = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(landing, ROUTES.landing);
      t.expect(!(await exists(landing.page, TESTID.emailCapture)), 'email capture appears on the first load of /', {
        selector: tid(TESTID.emailCapture),
        route: ROUTES.landing,
        observed: 'present',
        expected: 'absent until there is a shortlist to follow up on',
      });

      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;

      t.require(await exists(page, TESTID.emailCapture), 'selector not found', {
        selector: tid(TESTID.emailCapture),
        route: ROUTES.shortlist,
        expected: 'the email capture on /shortlist/',
      });

      const invalid = await setField(page, TESTID.emailInput, 'not-an-email');
      t.require(invalid.ok, 'selector not found', { selector: tid(TESTID.emailInput), observed: invalid.reason });
      const submit = loc(page, TESTID.emailSubmit).first();
      t.require(await submit.count(), 'selector not found', { selector: tid(TESTID.emailSubmit) });
      await submit.click();
      await page.waitForTimeout(350);

      const errors = await readVisibleErrors(page, TESTID);
      if (errors.length) {
        t.note('invalid email rejected with:', errors[0].text.slice(0, 120));
      } else {
        const native = await page.evaluate((ids) => {
          const el = document.querySelector(`[data-testid="${ids.emailInput}"]`);
          return el ? { message: el.validationMessage, valid: el.checkValidity ? el.checkValidity() : null } : null;
        }, TESTID);
        t.fail('an invalid email produced no inline error', {
          selector: tid(TESTID.emailInput),
          observed: `no visible error element; native validationMessage: ${native ? JSON.stringify(native.message) : 'n/a'}`,
          expected: 'a visible in-page error next to the field',
        });
      }
      t.expect(!(await exists(page, TESTID.emailDone)), 'an invalid email was accepted as done', {
        selector: tid(TESTID.emailDone),
        observed: 'present after submitting "not-an-email"',
        expected: 'absent',
      });

      const address = 'pilot.tester@example.com';
      await setField(page, TESTID.emailInput, address);
      await submit.click();
      await page.waitForTimeout(350);

      t.expect(!(await exists(page, TESTID.emailDone)), 'a valid email was accepted without consent', {
        selector: tid(TESTID.emailDone),
        observed: 'present after submitting without ticking consent',
        expected: 'absent until the consent box is ticked',
      });
      const consentErrors = await readVisibleErrors(page, TESTID);
      t.expect(consentErrors.length >= 1, 'submitting without consent produced no inline error', {
        selector: tid(TESTID.emailConsent),
        observed: 'no visible error',
        expected: 'a visible in-page error asking to tick the consent box',
      });

      const consent = await setField(page, TESTID.emailConsent, true);
      t.require(consent.ok, 'selector not found', {
        selector: tid(TESTID.emailConsent),
        observed: consent.reason,
      });
      await submit.click();
      await loc(page, TESTID.emailDone)
        .first()
        .waitFor({ state: 'visible', timeout: 8000 })
        .catch(() => {});

      t.expect(await exists(page, TESTID.emailDone), 'a valid consented email did not produce a done state', {
        selector: tid(TESTID.emailDone),
        observed: 'absent',
        expected: 'present after a valid submission with consent',
      });

      const stored = await page.evaluate(probeStorage, 'langkah.waitlist.v1');
      const entries = Array.isArray(stored.parsed) ? stored.parsed : [];
      t.expect(entries.length >= 1, 'the waitlist did not gain a record', {
        selector: 'langkah.waitlist.v1',
        observed: stored.raw === null ? 'key absent' : stored.raw.slice(0, 200),
        expected: 'one record with the submitted email',
      });
      t.expect(
        entries.some((entry) => entry && entry.email === address),
        'the stored waitlist record does not contain the submitted address',
        {
          selector: 'langkah.waitlist.v1',
          observed: JSON.stringify(entries).slice(0, 200),
          expected: `an entry with email "${address}"`,
        },
      );
    },
  },

  {
    id: 'B8',
    group: 'B',
    title: 'The event log records the five moments the pilot exists to measure',
    async run(t) {
      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, ROUTES.landing);
      const page = session.page;

      const { problems } = await fillProfileForm(page, PROFILE_MAIN);
      for (const problem of problems) {
        t.fail('could not complete the analytics flow', { selector: tid(problem.testid), observed: problem.reason });
      }
      await submitProfile(page);
      const landed = await waitForShortlist(page);
      t.require(landed.ok, 'the analytics flow never reached the shortlist', {
        observed: landed.url,
        expected: `${t.ctx.baseUrl}shortlist/`,
      });

      const chips = await readFilterChips(page);
      const chip = chips.find((c) => c.kind === 'sector' && c.visible) || chips.find((c) => c.kind === 'country' && c.visible);
      if (chip) {
        await page.locator(tid(chip.testid)).first().click();
        await page.waitForTimeout(200);
        const resetButton = loc(page, TESTID.filterReset).first();
        if (await resetButton.count()) await resetButton.click();
        await page.waitForTimeout(150);
      } else {
        t.fail('no filter chip to click, so no filter event could be produced', {
          selector: '[data-testid^="filter-"]',
        });
      }

      const rows = (await readShortlistRows(page)).filter((row) => row.visible);
      const programId = rows.length ? rows[0].programId : null;
      if (programId) {
        await session.goto(programRoute(programId));
        await page.waitForTimeout(250);
      } else {
        t.fail('no programme to open, so no detail event could be produced', {
          selector: tid(TESTID.shortlistRow),
        });
      }

      await session.goto(ROUTES.calendar);
      await page.waitForTimeout(250);

      const stored = await page.evaluate(probeStorage, 'langkah.events.v1');
      const events = Array.isArray(stored.parsed) ? stored.parsed : [];
      const types = Array.from(new Set(events.map((event) => String(event && event.type))));
      t.note('distinct event types recorded:', types);
      t.note(`${events.length} events recorded in total`);

      const normalise = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
      const wanted = [
        { label: 'profile submitted', test: (type) => /profile/.test(type) && /submit|save|complete/.test(type) },
        { label: 'shortlist viewed', test: (type) => /shortlist/.test(type) && /view|seen|open|load/.test(type) },
        {
          label: 'programme detail opened',
          test: (type) => /program|programme/.test(type) && /detail|open|view/.test(type),
        },
        { label: 'filter used', test: (type) => /filter/.test(type) },
        { label: 'calendar viewed', test: (type) => /calendar/.test(type) && /view|seen|open|load/.test(type) },
      ];

      for (const { label, test } of wanted) {
        const matching = events.filter((event) => test(normalise(event && event.type)));
        t.expect(matching.length >= 1, `no event recorded for "${label}"`, {
          selector: 'langkah.events.v1',
          observed: `types present: ${JSON.stringify(types)}`,
          expected: `at least one type matching "${label}"`,
        });
        if (label === 'programme detail opened' && matching.length && programId) {
          const carries = matching.some((event) => JSON.stringify(event.payload || {}).includes(programId));
          t.expect(carries, 'the programme-detail event does not carry the programme id', {
            selector: 'langkah.events.v1',
            observed: JSON.stringify(matching.map((event) => event.payload)).slice(0, 200),
            expected: `a payload containing "${programId}"`,
          });
        }
      }
    },
  },

  {
    id: 'B9',
    group: 'B',
    title: 'A window that wraps the year renders as two segments, and no bar has zero width',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, ROUTES.calendar);
      const geometry = await session.page.evaluate(probeCalendarGeometry, TESTID);

      t.require(geometry.rows.length >= 1, 'selector not found', {
        selector: tid(TESTID.calendarRow),
        observed: '0 rows',
        expected: '>= 1 calendar row',
      });

      for (const bar of geometry.allBars) {
        t.expect(bar.box.width >= 1, 'a window bar renders with no width', {
          selector: bar.selector,
          observed: `width ${bar.box.width}px`,
          expected: '>= 1px',
        });
      }
      t.note(`${geometry.allBars.length} window bars measured`);

      // Which programme wraps? Prefer the row's own attributes, then the seed file.
      const wrappingFromDom = geometry.rows.filter((row) => {
        const opens = Number(row.opensMonth);
        const closes = Number(row.closesMonth);
        return Number.isFinite(opens) && Number.isFinite(closes) && opens > closes;
      });

      let targets = wrappingFromDom;
      let sourceOfTruth = 'data-opens-month / data-closes-month on the calendar rows';

      if (!targets.length && discovery.programs) {
        const wrapping = discovery.wrapping || [];
        sourceOfTruth = discovery.diskSource;
        targets = geometry.rows.filter((row) =>
          wrapping.some(
            (program) =>
              (row.programId && row.programId === program.id) ||
              (program.name && row.text.includes(program.name)) ||
              (program.employer && row.text.includes(program.employer)),
          ),
        );
        if (wrapping.length && !targets.length) {
          t.fail('the seed data has a wrapping window but its calendar row could not be identified', {
            selector: tid(TESTID.calendarRow),
            observed: `wrapping programmes: ${JSON.stringify(wrapping.map((p) => p.id))}; rows carry ids ${JSON.stringify(
              geometry.rows.map((r) => r.programId),
            )}`,
            expected: 'data-program-id on each calendar row, or the programme name in the row text',
          });
          return;
        }
      }

      if (!targets.length) {
        t.fail('no programme with opensMonth > closesMonth could be found to test', {
          selector: tid(TESTID.calendarRow),
          observed: discovery.programs
            ? 'the seed data contains no window that wraps the year'
            : `calendar rows expose no data-opens-month/data-closes-month, and ${discovery.diskSource} could not be read (${discovery.diskError})`,
          expected:
            'at least one seeded programme whose window crosses December, or data-opens-month/data-closes-month on the rows',
        });
        return;
      }

      t.note('wrapping windows identified from:', sourceOfTruth);
      for (const row of targets) {
        const bars = row.bars;
        const markedWrapping =
          row.wraps === 'true' ||
          bars.some((bar) => bar.wraps === 'true' || /wrap|continues|carries over|through december/i.test(bar.label));
        t.expect(bars.length === 2 || (bars.length === 1 && markedWrapping), 'a wrapping window is not drawn as a wrap', {
          selector: row.selector,
          observed: `${bars.length} bars, wrap markers: ${JSON.stringify(bars.map((bar) => bar.wraps || bar.label))}`,
          expected: 'two segments, or one segment explicitly marked as wrapping',
        });
        for (const bar of bars) {
          t.expect(bar.box.width >= 1, 'a segment of a wrapping window has no width', {
            selector: bar.selector,
            observed: `width ${bar.box.width}px at x=${bar.box.x}`,
            expected: '>= 1px',
          });
        }
      }
    },
  },

  {
    id: 'B10',
    group: 'B',
    title: 'A December graduation puts the marker at the far right without dropping rows',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({ profile: PROFILE_GRAD_DEC, events: [], waitlist: [] });
      await t.open(session, ROUTES.calendar);
      const geometry = await session.page.evaluate(probeCalendarGeometry, TESTID);

      t.require(geometry.axis, 'selector not found', { selector: tid(TESTID.calendarAxis) });
      t.require(geometry.marker, 'selector not found', {
        selector: tid(TESTID.graduationMarker),
        observed: 'absent with graduationMonth 12',
        expected: 'a marker at the December end of the axis',
      });

      const axis = geometry.axis;
      const centre = geometry.marker.box.x + geometry.marker.box.width / 2;
      const fraction = (centre - axis.x) / axis.width;
      t.expect(fraction >= 0.8, 'the December marker is not at the far right of the axis', {
        selector: tid(TESTID.graduationMarker),
        observed: `centre at ${(fraction * 100).toFixed(1)}% of the axis (x=${Math.round(centre)}, axis ${Math.round(
          axis.x,
        )}–${Math.round(axis.x + axis.width)})`,
        expected: '>= 80% across',
      });
      t.expect(fraction <= 1.02, 'the December marker overshoots the axis', {
        selector: tid(TESTID.graduationMarker),
        observed: `centre at ${(fraction * 100).toFixed(1)}% of the axis`,
        expected: '<= 102%',
      });

      if (discovery.totalPrograms !== null) {
        t.expect(geometry.rows.length === discovery.totalPrograms, 'rows went missing with a December graduation', {
          selector: tid(TESTID.calendarRow),
          observed: `${geometry.rows.length} rows`,
          expected: `${discovery.totalPrograms}`,
        });
      }
    },
  },

  {
    id: 'B11',
    group: 'B',
    title: 'The default shortlist hides sample programmes until they are asked for',
    async run(t) {
      const session = await t.session({
        profile: PROFILE_MAIN,
        events: [],
        waitlist: [],
        samples: false,
      });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;
      await openIneligibleSection(page).catch(() => {});

      const hiddenCount =
        (await readShortlistRows(page)).length + (await readIneligibleRows(page)).length;
      t.expect(hiddenCount >= 1, 'the verified catalogue was empty for the seed profile', {
        selector: tid(TESTID.shortlistRow),
        observed: '0 rows with samples off',
        expected: '>= 1 checked programme',
      });

      t.require(await exists(page, TESTID.filterSamples), 'selector not found', {
        selector: tid(TESTID.filterSamples),
        expected: 'a control that reveals sample programmes',
      });
      const label = ((await textOf(page, TESTID.filterSamples)) || '').toLowerCase();
      t.expect(/show/.test(label), 'the samples control does not offer to show hidden rows', {
        selector: tid(TESTID.filterSamples),
        observed: `"${label}"`,
        expected: 'copy that starts from Show',
      });

      await loc(page, TESTID.filterSamples).first().click();
      await page.waitForTimeout(300);
      await openIneligibleSection(page).catch(() => {});
      const shownCount =
        (await readShortlistRows(page)).length + (await readIneligibleRows(page)).length;
      t.expect(shownCount > hiddenCount, 'turning samples on did not add any rows', {
        selector: tid(TESTID.filterSamples),
        observed: `${shownCount} rows after; ${hiddenCount} before`,
        expected: 'more rows than the verified-only catalogue',
      });
    },
  },

  {
    id: 'B12',
    group: 'B',
    title: 'A return visit can be requested without revealing whether the address is listed',
    async run(t) {
      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, ROUTES.returnVisit);
      const page = session.page;

      t.require(await exists(page, TESTID.returnForm), 'selector not found', {
        selector: tid(TESTID.returnForm),
        route: ROUTES.returnVisit,
        expected: 'a form that asks for the waitlist address',
      });

      const unknown = 'not-on-the-list@example.com';
      await setField(page, TESTID.returnEmail, unknown);
      const submit = loc(page, TESTID.returnSubmit).first();
      t.require(await submit.count(), 'selector not found', { selector: tid(TESTID.returnSubmit) });
      await submit.click();
      await loc(page, TESTID.returnDone)
        .first()
        .waitFor({ state: 'visible', timeout: 8000 })
        .catch(() => {});

      t.expect(await exists(page, TESTID.returnDone), 'an unknown address did not produce the same done state', {
        selector: tid(TESTID.returnDone),
        observed: 'absent',
        expected: 'present, without saying the address is missing',
      });
      const copy = ((await textOf(page, TESTID.returnDone)) || '').toLowerCase();
      t.expect(!/not on the list|unknown|no such/.test(copy), 'the done state reveals that the address is missing', {
        selector: tid(TESTID.returnDone),
        observed: `"${copy}"`,
        expected: 'copy that would be true whether or not the address is stored',
      });
    },
  },
];
