/**
 * Group A — the acceptance criteria the brief names.
 *
 * These drive the app the way a student would: fill the form, read the
 * shortlist, open a programme, look at the calendar. Nothing here writes app
 * state directly except where a check is explicitly about a *saved* profile.
 */

import {
  TESTID,
  tid,
  ROUTES,
  PROFILE_MAIN,
  PROFILE_GRAD_JAN,
  PROFILE_GRAD_DEC,
  SEED_EVENTS,
  SEED_WAITLIST,
  FIT_COMPONENT_LABELS,
  MONTH_SHORT,
  BANNED_PATTERNS,
} from '../lib/contract.mjs';
import {
  loc,
  countOf,
  exists,
  fillProfileForm,
  submitProfile,
  waitForShortlist,
  readShortlistRows,
  readIneligibleRows,
  openIneligibleSection,
  expandFit,
  readBreakdownFor,
  programRoute,
} from '../lib/ui.mjs';
import {
  probeFitTotals,
  probeCalendarGeometry,
  probeVisibleText,
  probeStorage,
  probeOverflow,
} from '../lib/probes.mjs';
import { discover } from '../lib/discovery.mjs';

const NEGATIVE_VERDICT = /\bnot eligible\b|\bineligible\b|\bdoes not (meet|qualify)\b|\bdon'?t (meet|qualify)\b/i;
const POSITIVE_VERDICT = /\beligible\b|\bqualif|\byou meet\b|\bmeets\b/i;

export const acceptanceChecks = [
  {
    id: 'A1',
    group: 'A',
    title: 'All five routes serve 200 and render a body',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      const routes = [ROUTES.landing, ROUTES.shortlist, ROUTES.calendar, ROUTES.debug];
      if (discovery.programId) routes.push(programRoute(discovery.programId));
      else t.fail('no programme id available, so /program/<id>/ was not reached', { hint: discovery.error });

      for (const route of routes) {
        const { status } = await session.goto(route);
        t.expect(status === null || (status >= 200 && status < 300), `route did not serve OK`, {
          route,
          observed: `HTTP ${status}`,
          expected: 'HTTP 200',
        });
        const bodyText = await session.page.evaluate(probeVisibleText);
        t.expect(bodyText.trim().length > 20, 'route rendered no meaningful text', {
          route,
          observed: `${bodyText.trim().length} characters of visible text`,
          expected: '> 20 characters',
        });
      }
      t.note('routes checked:', routes);
    },
  },

  {
    id: 'A2',
    group: 'A',
    title: 'Form fill through the UI lands on /shortlist/ with rows in descending fit order',
    async run(t) {
      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, ROUTES.landing);
      const page = session.page;

      t.require(await exists(page, TESTID.profileForm), 'selector not found', {
        selector: tid(TESTID.profileForm),
        expected: 'the profile form on /',
      });

      const { problems, actions } = await fillProfileForm(page, PROFILE_MAIN);
      for (const problem of problems) {
        t.fail('could not set a profile field through the UI', {
          selector: tid(problem.testid),
          observed: problem.reason,
          expected: 'a settable control',
        });
      }
      t.note(`filled ${actions.length} controls`);

      const submitted = await submitProfile(page);
      t.require(submitted.ok, 'selector not found', {
        selector: tid(TESTID.profileSubmit),
        observed: submitted.reason,
      });

      const landed = await waitForShortlist(page);
      t.require(landed.ok, 'submitting the form did not navigate to the shortlist', {
        observed: landed.url,
        expected: `${t.ctx.baseUrl}shortlist/`,
      });

      const rows = await readShortlistRows(page);
      t.expect(rows.length >= 1, 'no shortlist rows after submitting a broad profile', {
        selector: tid(TESTID.shortlistRow),
        observed: `${rows.length} rows`,
        expected: '>= 1 row',
      });

      const totals = rows.map((row) => row.fitTotal);
      const missing = rows.filter((row) => row.fitTotal === null);
      for (const row of missing) {
        t.fail('shortlist row has no readable fit total', {
          selector: `${tid(TESTID.shortlistRow)}:nth(${row.index}) ${tid(TESTID.fitTotal)}`,
          observed: row.fitTotalText === null ? 'element absent' : `"${row.fitTotalText}"`,
          expected: 'text containing a number',
        });
      }
      for (let i = 1; i < totals.length; i += 1) {
        if (totals[i] === null || totals[i - 1] === null) continue;
        t.expect(totals[i - 1] >= totals[i], 'shortlist rows are not in descending fit order', {
          selector: tid(TESTID.shortlistRow),
          observed: `row ${i - 1} = ${totals[i - 1]}, row ${i} = ${totals[i]}`,
          expected: `row ${i - 1} >= row ${i}`,
        });
      }
      t.note('fit totals in DOM order:', totals);
    },
  },

  {
    id: 'A3',
    group: 'A',
    title: 'Fit breakdown discloses exactly the four named components',
    async run(t) {
      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;

      const toggles = await countOf(page, TESTID.fitToggle);
      t.require(toggles >= 1, 'selector not found', {
        selector: tid(TESTID.fitToggle),
        observed: '0 toggles',
        expected: '>= 1 toggle on /shortlist/',
      });

      const before = await readBreakdownFor(page, 0);
      if (before.found) {
        t.expect(!before.visible, 'the fit breakdown is already visible before the toggle is clicked', {
          selector: tid(TESTID.fitBreakdown),
          observed: 'visible at rest',
          expected: 'collapsed until the toggle is used',
        });
      }

      const toggled = await expandFit(page, 0);
      t.expect(toggled.before === 'false', 'fit toggle does not start with aria-expanded="false"', {
        selector: tid(TESTID.fitToggle),
        observed: String(toggled.before),
        expected: '"false"',
      });
      t.expect(toggled.after === 'true', 'aria-expanded did not flip to true on click', {
        selector: tid(TESTID.fitToggle),
        observed: `before="${toggled.before}" after="${toggled.after}"`,
        expected: 'before="false" after="true"',
      });

      const panel = await readBreakdownFor(page, 0);
      t.require(panel.found, 'selector not found', {
        selector: tid(TESTID.fitBreakdown),
        observed: panel.reason,
        expected: 'a breakdown reachable from the toggle',
      });
      t.note('breakdown resolved by', panel.resolvedBy);

      t.expect(panel.visible, 'the fit breakdown did not become visible after the toggle was clicked', {
        selector: tid(TESTID.fitBreakdown),
        observed: 'not visible',
        expected: 'visible',
      });

      const components = panel.components;
      t.expect(components.length === 4, 'the breakdown does not contain exactly four components', {
        selector: tid(TESTID.fitComponent),
        observed: `${components.length} components: ${JSON.stringify(components.map((c) => c.text.slice(0, 30)))}`,
        expected: '4 components',
      });

      const haystack = components.map((c) => c.text.toLowerCase());
      for (const label of FIT_COMPONENT_LABELS) {
        const found = haystack.some((text) => text.includes(label));
        t.expect(found, `the breakdown never names "${label}"`, {
          selector: tid(TESTID.fitComponent),
          observed: JSON.stringify(haystack.map((h) => h.slice(0, 40))),
          expected: `one component whose text contains "${label}"`,
        });
      }

      const totals = await page.evaluate(probeFitTotals, TESTID);
      for (const total of totals) {
        if (!t.expect(total.hasRow, 'a fit total is rendered outside any row', {
          selector: total.selector,
          observed: `text "${total.text}", no shortlist-row/ineligible-row ancestor`,
          expected: 'every fit total inside a row that also has a fit toggle',
        })) continue;
        t.expect(total.hasToggle, 'a fit total is rendered in a row with no fit toggle', {
          selector: total.selector,
          observed: `row is ${total.rowTestid}, contains no ${tid(TESTID.fitToggle)}`,
          expected: `a reachable ${tid(TESTID.fitToggle)} in the same row`,
        });
        if (total.hasToggle) {
          t.expect(total.toggleVisible && !total.toggleDisabled, 'a fit total has a toggle that cannot be reached', {
            selector: total.selector,
            observed: `toggle visible=${total.toggleVisible} disabled=${total.toggleDisabled}`,
            expected: 'a visible, enabled toggle',
          });
        }
      }
      t.note(`${totals.length} fit totals inspected`);
    },
  },

  {
    id: 'A4',
    group: 'A',
    title: 'Every ineligible row explains itself in a real sentence',
    async run(t) {
      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;

      const opened = await openIneligibleSection(page);
      t.note('ineligible rows before/after opening the section:', [opened.before, opened.after]);

      const rows = await readIneligibleRows(page);
      t.require(rows.length >= 1, 'selector not found', {
        selector: tid(TESTID.ineligibleRow),
        observed: '0 ineligible rows',
        expected: '>= 1 (the seed data should fail this profile on something)',
      });

      for (const row of rows) {
        const reasons = row.reasons.filter((reason) => reason.text.trim().length > 0);
        if (!t.expect(reasons.length >= 1, 'an ineligible row gives no reason', {
          selector: `${tid(TESTID.ineligibleRow)}:nth(${row.index})`,
          observed: `0 non-empty ${tid(TESTID.ineligibleReason)}; row text "${row.text}"`,
          expected: `>= 1 non-empty ${tid(TESTID.ineligibleReason)}`,
        })) continue;

        for (const reason of reasons) {
          t.expect(reason.text.length >= 20, 'an ineligibility reason is too short to be a sentence', {
            selector: `${tid(TESTID.ineligibleRow)}:nth(${row.index}) ${tid(TESTID.ineligibleReason)}`,
            observed: `"${reason.text}" (${reason.text.length} chars)`,
            expected: '>= 20 characters',
          });
          const broken = reason.text.match(/\b(undefined|null|NaN)\b/);
          t.expect(!broken, 'an ineligibility reason contains a rendering artefact', {
            selector: `${tid(TESTID.ineligibleRow)}:nth(${row.index}) ${tid(TESTID.ineligibleReason)}`,
            observed: `"${reason.text}" contains "${broken ? broken[0] : ''}"`,
            expected: 'no undefined/null/NaN in user-facing copy',
          });
        }
      }
      t.note(`${rows.length} ineligible rows inspected`);
    },
  },

  {
    id: 'A5',
    group: 'A',
    title: 'Programme detail: ordered stages, an eligibility verdict, prep list and a safe source link',
    async run(t) {
      const discovery = await discover(t.ctx);
      t.require(discovery.programId, 'could not find a programme id to open', {
        selector: `${tid(TESTID.shortlistRow)} a[href*="/program/"]`,
        observed: discovery.error || 'no data-program-id and no /program/<id>/ link on any row',
        expected: 'a row that links to its programme page',
      });

      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, programRoute(discovery.programId));
      const page = session.page;
      t.note('programme under test:', discovery.programId);

      t.require(await exists(page, TESTID.stageTimeline), 'selector not found', {
        selector: tid(TESTID.stageTimeline),
        expected: 'a stage timeline on the programme page',
      });

      const stages = await page.evaluate((ids) => {
        const timeline = document.querySelector(`[data-testid="${ids.stageTimeline}"]`);
        if (!timeline) return [];
        return Array.from(timeline.querySelectorAll(`[data-testid="${ids.stageItem}"]`)).map((item, index) => {
          const rect = item.getBoundingClientRect();
          return {
            index,
            text: item.innerText.trim().replace(/\s+/g, ' '),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            selector: window.__verify.cssPath(item),
          };
        });
      }, TESTID);

      t.expect(stages.length >= 3, 'the stage timeline has fewer than three stages', {
        selector: tid(TESTID.stageItem),
        observed: `${stages.length} stages`,
        expected: '>= 3',
      });

      for (let i = 1; i < stages.length; i += 1) {
        const previous = stages[i - 1];
        const current = stages[i];
        const ordered = current.top > previous.top || (current.top === previous.top && current.left >= previous.left);
        t.expect(ordered, 'stage items are not laid out in DOM order', {
          selector: current.selector,
          observed: `stage ${i - 1} at (${previous.left}, ${previous.top}); stage ${i} at (${current.left}, ${current.top})`,
          expected: 'each stage at or after the previous one, reading order',
        });
      }

      for (const stage of stages) {
        t.expect(stage.text.length >= 12, 'a stage item has no readable note', {
          selector: stage.selector,
          observed: `"${stage.text}" (${stage.text.length} chars)`,
          expected: '>= 12 characters of visible note text',
        });
      }

      const verdict = await page.locator(tid(TESTID.eligibilityCheck)).first();
      t.require(await verdict.count(), 'selector not found', {
        selector: tid(TESTID.eligibilityCheck),
        expected: 'an eligibility verdict for the saved profile',
      });
      const verdictText = (await verdict.innerText()).trim();
      t.expect(POSITIVE_VERDICT.test(verdictText), 'the eligibility check does not state an outcome', {
        selector: tid(TESTID.eligibilityCheck),
        observed: `"${verdictText.slice(0, 160)}"`,
        expected: 'text naming the outcome for the saved profile',
      });
      t.expect(!NEGATIVE_VERDICT.test(verdictText), 'the programme came from the eligible list but reads as ineligible', {
        selector: tid(TESTID.eligibilityCheck),
        observed: `"${verdictText.slice(0, 160)}"`,
        expected: 'an eligible verdict, matching the shortlist it was opened from',
      });

      t.expect(await exists(page, TESTID.prepareList), 'selector not found', {
        selector: tid(TESTID.prepareList),
        expected: 'a what-to-prepare list',
      });
      const prepareItems = await countOf(page, TESTID.prepareItem);
      t.expect(prepareItems >= 1, 'the prepare list is empty', {
        selector: tid(TESTID.prepareItem),
        observed: `${prepareItems} items`,
        expected: '>= 1',
      });

      const link = page.locator(tid(TESTID.sourceLink)).first();
      if (t.expect(await link.count(), 'selector not found', {
        selector: tid(TESTID.sourceLink),
        expected: 'a link to the source the data came from',
      })) {
        const info = await link.evaluate((el) => ({
          tag: el.tagName.toLowerCase(),
          href: el.getAttribute('href'),
          target: el.getAttribute('target'),
          rel: el.getAttribute('rel'),
        }));
        t.expect(info.tag === 'a', 'the source link is not an anchor', {
          selector: tid(TESTID.sourceLink),
          observed: `<${info.tag}>`,
          expected: '<a>',
        });
        t.expect(String(info.href || '').startsWith('https://'), 'the source link is not an https URL', {
          selector: tid(TESTID.sourceLink),
          observed: String(info.href),
          expected: 'href starting with https://',
        });
        t.expect(info.target === '_blank', 'the source link does not open in a new tab', {
          selector: tid(TESTID.sourceLink),
          observed: `target="${info.target}"`,
          expected: 'target="_blank"',
        });
        t.expect(String(info.rel || '').includes('noopener'), 'the source link is missing rel="noopener"', {
          selector: tid(TESTID.sourceLink),
          observed: `rel="${info.rel}"`,
          expected: 'rel containing noopener',
        });
      }
    },
  },

  {
    id: 'A6',
    group: 'A',
    title: 'Calendar: twelve months, one row per programme, a bar per row, a placed graduation marker',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, ROUTES.calendar);
      const page = session.page;

      const geometry = await page.evaluate(probeCalendarGeometry, TESTID);
      t.require(geometry.axis, 'selector not found', {
        selector: tid(TESTID.calendarAxis),
        expected: 'a 12-month axis',
      });

      const months = geometry.axisMonths;
      t.expect(months.length === 12, 'the axis does not have exactly twelve month ticks', {
        selector: tid(TESTID.axisMonth),
        observed: `${months.length} ticks: ${JSON.stringify(months.map((m) => m.text))}`,
        expected: '12 ticks',
      });
      months.slice(0, 12).forEach((month, index) => {
        const expected = MONTH_SHORT[index];
        const actual = month.text.trim().slice(0, 3).toLowerCase();
        t.expect(actual === expected.toLowerCase(), `axis tick ${index + 1} is not ${expected}`, {
          selector: `${tid(TESTID.axisMonth)}:nth(${index})`,
          observed: `"${month.text}"`,
          expected: `text starting "${expected}"`,
        });
      });

      const rows = geometry.rows;
      if (discovery.totalPrograms !== null) {
        t.expect(rows.length === discovery.totalPrograms, 'the calendar does not have one row per programme', {
          selector: tid(TESTID.calendarRow),
          observed: `${rows.length} calendar rows`,
          expected: `${discovery.totalPrograms} (${discovery.eligibleCount} eligible + ${discovery.ineligibleCount} ineligible on /shortlist/${discovery.programsFromDisk === null ? '' : `, ${discovery.programsFromDisk} in data/programs.ts`})`,
        });
      } else {
        t.fail('could not establish the total programme count to compare against', {
          hint: discovery.error || 'shortlist rows were unreadable and data/programs.ts is unavailable',
        });
      }

      for (const row of rows) {
        t.expect(row.bars.length >= 1, 'a calendar row has no window bar', {
          selector: row.selector,
          observed: `0 ${tid(TESTID.windowBar)}; row text "${row.text}"`,
          expected: '>= 1 window bar',
        });
      }

      const marker = geometry.marker;
      if (t.expect(marker && marker.visible, 'selector not found or not visible', {
        selector: tid(TESTID.graduationMarker),
        observed: marker ? 'present but not visible' : 'absent',
        expected: 'a visible graduation marker',
      })) {
        const axis = geometry.axis;
        const centre = marker.box.x + marker.box.width / 2;
        t.expect(centre >= axis.x - 1 && centre <= axis.x + axis.width + 1, 'the graduation marker sits outside the axis', {
          selector: tid(TESTID.graduationMarker),
          observed: `marker centre x=${Math.round(centre)}`,
          expected: `between ${Math.round(axis.x)} and ${Math.round(axis.x + axis.width)}`,
        });
        t.note('marker centre / axis bounds:', {
          centre: Math.round(centre),
          axisLeft: Math.round(axis.x),
          axisRight: Math.round(axis.x + axis.width),
        });
      }

      // Moving graduation from January to December must move the marker right.
      const positions = {};
      for (const [label, profile] of [['jan', PROFILE_GRAD_JAN], ['dec', PROFILE_GRAD_DEC]]) {
        const probe = await t.session({ profile, events: [], waitlist: [] });
        await t.open(probe, ROUTES.calendar);
        const read = await probe.page.evaluate(probeCalendarGeometry, TESTID);
        positions[label] = read.marker ? read.marker.box.x + read.marker.box.width / 2 : null;
      }
      if (positions.jan !== null && positions.dec !== null) {
        t.expect(positions.dec > positions.jan, 'the graduation marker does not move right as the month advances', {
          selector: tid(TESTID.graduationMarker),
          observed: `january centre=${Math.round(positions.jan)}, december centre=${Math.round(positions.dec)}`,
          expected: 'december strictly right of january',
        });
      } else {
        t.fail('could not read the graduation marker for both January and December', {
          selector: tid(TESTID.graduationMarker),
          observed: JSON.stringify(positions),
        });
      }
    },
  },

  {
    id: 'A7',
    group: 'A',
    title: 'The unverified-data banner shows on every route and stays dismissed',
    async run(t) {
      const discovery = await discover(t.ctx);
      const routes = [ROUTES.landing, ROUTES.shortlist, ROUTES.calendar];
      if (discovery.programId) routes.splice(2, 0, programRoute(discovery.programId));
      else t.fail('no programme id available, so the banner was not checked on /program/<id>/', { hint: discovery.error });

      const session = await t.session({
        profile: PROFILE_MAIN,
        events: [],
        waitlist: [],
        banner: { dismissed: false },
      });
      const page = session.page;

      for (const route of routes) {
        await t.open(session, route);
        const present = await exists(page, TESTID.unverifiedBanner);
        t.expect(present, 'the unverified-data banner is missing', {
          selector: tid(TESTID.unverifiedBanner),
          route,
          observed: 'absent',
          expected: 'present',
        });
      }

      await t.open(session, ROUTES.shortlist);
      const dismiss = loc(page, TESTID.unverifiedBannerDismiss).first();
      t.require(await dismiss.count(), 'selector not found', {
        selector: tid(TESTID.unverifiedBannerDismiss),
        expected: 'a dismiss control on the banner',
      });
      await dismiss.click();
      await page.waitForTimeout(250);

      t.expect(!(await exists(page, TESTID.unverifiedBanner)), 'the banner is still present after dismissing it', {
        selector: tid(TESTID.unverifiedBanner),
        observed: 'still in the DOM',
        expected: 'removed',
      });

      const stored = await page.evaluate(probeStorage, 'langkah.banner.v1');
      t.expect(
        stored.parsed && stored.parsed.dismissed === true,
        'dismissing the banner did not persist to localStorage',
        {
          selector: 'langkah.banner.v1',
          observed: stored.raw === null ? 'key absent' : stored.raw,
          expected: '{"dismissed":true}',
        },
      );

      await page.reload({ waitUntil: 'load' });
      t.expect(!(await exists(page, TESTID.unverifiedBanner)), 'the banner came back after a reload', {
        selector: tid(TESTID.unverifiedBanner),
        route: ROUTES.shortlist,
        observed: 'present after reload',
        expected: 'still dismissed',
      });

      for (const route of routes) {
        await t.open(session, route);
        t.expect(!(await exists(page, TESTID.unverifiedBanner)), 'the banner came back on another route', {
          selector: tid(TESTID.unverifiedBanner),
          route,
          observed: 'present',
          expected: 'still dismissed',
        });
      }
    },
  },

  {
    id: 'A8',
    group: 'A',
    title: '/debug/ renders parseable JSON and the copy button copies it',
    async run(t) {
      const session = await t.session({
        profile: PROFILE_MAIN,
        events: SEED_EVENTS,
        waitlist: SEED_WAITLIST,
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      await t.open(session, ROUTES.debug);
      const page = session.page;

      const parseBlock = async (testid) => {
        const locator = loc(page, testid).first();
        if (!(await locator.count())) return { ok: false, reason: `selector not found: ${tid(testid)}` };
        const text = (await locator.innerText()).trim();
        try {
          return { ok: true, value: JSON.parse(text), text };
        } catch (error) {
          return { ok: false, reason: error.message, text };
        }
      };

      const events = await parseBlock(TESTID.debugEvents);
      t.expect(events.ok, 'the event log is not valid JSON', {
        selector: tid(TESTID.debugEvents),
        observed: events.ok ? '' : `${events.reason}; text starts "${String(events.text).slice(0, 80)}"`,
        expected: 'JSON.parse-able text',
      });

      const waitlist = await parseBlock(TESTID.debugWaitlist);
      t.expect(waitlist.ok, 'the waitlist is not valid JSON', {
        selector: tid(TESTID.debugWaitlist),
        observed: waitlist.ok ? '' : `${waitlist.reason}; text starts "${String(waitlist.text).slice(0, 80)}"`,
        expected: 'JSON.parse-able text',
      });

      const copy = loc(page, TESTID.debugCopyEvents).first();
      t.require(await copy.count(), 'selector not found', {
        selector: tid(TESTID.debugCopyEvents),
        expected: 'a copy-events button',
      });

      const stateOf = () =>
        copy.evaluate((el) => ({
          text: el.innerText.trim(),
          ariaLive: el.getAttribute('aria-live'),
          dataState: el.getAttribute('data-state') || el.getAttribute('data-copied'),
          liveRegions: Array.from(document.querySelectorAll('[aria-live], [role="status"]'))
            .map((r) => r.textContent.trim())
            .filter(Boolean)
            .join(' | '),
        }));

      const before = await stateOf();
      await copy.click();
      await page.waitForTimeout(300);
      const after = await stateOf();

      let clipboardText = null;
      let clipboardError = null;
      try {
        clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      } catch (error) {
        clipboardError = error.message.split('\n')[0];
      }

      if (clipboardText !== null) {
        let parsed = null;
        try {
          parsed = JSON.parse(clipboardText);
        } catch (error) {
          t.fail('the clipboard does not contain JSON', {
            selector: tid(TESTID.debugCopyEvents),
            observed: `${error.message}; clipboard starts "${clipboardText.slice(0, 80)}"`,
            expected: 'JSON.parse-able text',
          });
        }
        if (parsed !== null) {
          const stored = await page.evaluate(probeStorage, 'langkah.events.v1');
          t.expect(
            JSON.stringify(parsed) === JSON.stringify(stored.parsed),
            'the copied text does not match the stored event log',
            {
              selector: tid(TESTID.debugCopyEvents),
              observed: `clipboard has ${Array.isArray(parsed) ? parsed.length : '?'} entries`,
              expected: `the ${Array.isArray(stored.parsed) ? stored.parsed.length : '?'} entries in langkah.events.v1`,
            },
          );
        }
      } else {
        t.note('clipboard could not be read by the harness:', clipboardError);
        t.note('falling back to asserting the button reports success; the clipboard itself was NOT read');
        const changed =
          before.text !== after.text || before.dataState !== after.dataState || before.liveRegions !== after.liveRegions;
        t.expect(changed, 'the copy button gives no success feedback and the clipboard could not be read', {
          selector: tid(TESTID.debugCopyEvents),
          observed: `before ${JSON.stringify(before)} / after ${JSON.stringify(after)}`,
          expected: 'a visible or announced change confirming the copy',
        });
      }
    },
  },

  {
    id: 'A9',
    group: 'A',
    title: 'The primary path works at 375x812 with touch (detail in group C)',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({ device: 'mobile', profile: null, events: [], waitlist: [] });
      const page = session.page;
      await t.open(session, ROUTES.landing);

      const viewport = await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio,
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      }));
      t.expect(viewport.width === 375, 'the mobile context is not 375 CSS px wide', {
        observed: JSON.stringify(viewport),
        expected: 'width 375, dpr 2, touch true',
      });
      t.expect(viewport.dpr === 2, 'the mobile context is not at device scale factor 2', {
        observed: `devicePixelRatio ${viewport.dpr}`,
        expected: '2',
      });
      t.expect(viewport.touch, 'the mobile context does not report touch support', {
        observed: JSON.stringify(viewport),
        expected: 'hasTouch true',
      });

      const { problems } = await fillProfileForm(page, PROFILE_MAIN, { tap: true });
      for (const problem of problems) {
        t.fail('could not set a profile field at 375px', {
          selector: tid(problem.testid),
          observed: problem.reason,
        });
      }
      await submitProfile(page, { tap: true });
      const landed = await waitForShortlist(page);
      t.expect(landed.ok, 'the mobile form submit did not reach the shortlist', {
        observed: landed.url,
        expected: `${t.ctx.baseUrl}shortlist/`,
      });

      const overflow = await page.evaluate(probeOverflow);
      t.expect(!overflow.overflows, 'the shortlist overflows horizontally at 375px', {
        route: ROUTES.shortlist,
        observed: `scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}; widest offender ${
          overflow.offenders[0] ? overflow.offenders[0].selector : 'none identified'
        }`,
        expected: 'scrollWidth <= clientWidth + 1',
      });

      if (discovery.programId) {
        await t.open(session, programRoute(discovery.programId));
        t.expect(await exists(page, TESTID.stageTimeline), 'the programme page did not render at 375px', {
          selector: tid(TESTID.stageTimeline),
          route: programRoute(discovery.programId),
        });
      }
      t.note('the full mobile suite is group C; this check is the A9 gate on it');
    },
  },

  {
    id: 'A10',
    group: 'A',
    title: 'No route claims a model made the decision',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({
        profile: PROFILE_MAIN,
        events: SEED_EVENTS,
        waitlist: SEED_WAITLIST,
      });
      const page = session.page;

      const routes = [ROUTES.landing, ROUTES.shortlist, ROUTES.calendar, ROUTES.debug];
      if (discovery.programId) routes.splice(2, 0, programRoute(discovery.programId));
      else t.fail('no programme id available, so /program/<id>/ was not crawled', { hint: discovery.error });

      let scanned = 0;
      for (const route of routes) {
        await t.open(session, route);
        if (route === ROUTES.shortlist) {
          await expandFit(page, 0).catch(() => {});
          await openIneligibleSection(page).catch(() => {});
          await page.waitForTimeout(150);
        }
        const text = await page.evaluate(probeVisibleText);
        scanned += text.length;
        for (const { label, re } of BANNED_PATTERNS) {
          re.lastIndex = 0;
          let match = re.exec(text);
          while (match) {
            const start = Math.max(0, match.index - 40);
            const context = text.slice(start, match.index + match[0].length + 40).replace(/\s+/g, ' ');
            t.fail(`banned wording "${label}" appears in visible copy`, {
              route,
              selector: `visible text on ${route}`,
              observed: `…${context}…`,
              expected: `no "${label}" anywhere a reader can see it`,
            });
            match = re.exec(text);
          }
        }
      }
      t.note(`${scanned} characters of visible text scanned across ${routes.length} routes`);
    },
  },
];
