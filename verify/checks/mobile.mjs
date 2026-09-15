/**
 * Group C — 375x812, device scale factor 2, touch.
 *
 * Real reflow, not a resized desktop shot: the context is created mobile, so
 * media queries, pointer type and touch events all behave as they do on a
 * phone. A deliberately scrollable calendar strip is allowed; a document that
 * scrolls sideways is not, and C1 tells the two apart.
 */

import { TESTID, tid, ROUTES, PROFILE_MAIN, SEED_EVENTS, SEED_WAITLIST } from '../lib/contract.mjs';
import {
  exists,
  countOf,
  fillProfileForm,
  submitProfile,
  waitForShortlist,
  readShortlistRows,
  expandFit,
  readBreakdownFor,
  openIneligibleSection,
  programRoute,
} from '../lib/ui.mjs';
import { probeOverflow, probeFontSizes, probeTouchTargets } from '../lib/probes.mjs';
import { discover } from '../lib/discovery.mjs';

const MIN_FONT_PX = 12;
const TOUCH = { minBox: 40, minSmall: 24, minGap: 8 };

/** The five routes, with the programme id filled in once discovery has run. */
function routesFor(discovery) {
  const routes = [
    { name: 'landing', route: ROUTES.landing },
    { name: 'shortlist', route: ROUTES.shortlist },
    { name: 'calendar', route: ROUTES.calendar },
    { name: 'debug', route: ROUTES.debug },
  ];
  if (discovery.programId) {
    routes.splice(2, 0, { name: 'program', route: programRoute(discovery.programId) });
  }
  return routes;
}

export const mobileChecks = [
  {
    id: 'C1',
    group: 'C',
    title: 'No route scrolls the document sideways at 375px',
    async run(t) {
      const discovery = await discover(t.ctx);
      if (!discovery.programId) {
        t.fail('no programme id available, so /program/<id>/ was not measured', { hint: discovery.error });
      }
      const session = await t.session({
        device: 'mobile',
        profile: PROFILE_MAIN,
        events: SEED_EVENTS,
        waitlist: SEED_WAITLIST,
      });

      for (const { name, route } of routesFor(discovery)) {
        await t.open(session, route);
        const result = await session.page.evaluate(probeOverflow);
        if (result.scrollers.length) {
          t.note(
            `${name}: inner scrollable region(s) — ${result.scrollers
              .map((s) => `${s.selector} (overflow-x: ${s.overflowX}, ${s.scrollWidth} in ${s.clientWidth})`)
              .join('; ')}`,
          );
        }
        if (result.overflows) {
          const widest = result.offenders[0];
          t.fail('the document scrolls horizontally', {
            route,
            selector: widest ? widest.selector : 'document',
            observed: widest
              ? `scrollWidth ${result.scrollWidth} vs clientWidth ${result.clientWidth}; widest offender <${widest.tag}> class="${widest.classes}" box ${JSON.stringify(
                  widest.box,
                )} overhanging by ${widest.overhangPx}px`
              : `scrollWidth ${result.scrollWidth} vs clientWidth ${result.clientWidth}; no single element identified — check padding or a negative margin on body (overflow-x: ${result.bodyOverflowX})`,
            expected: 'documentElement.scrollWidth <= clientWidth + 1',
            hint: result.scrollers.length
              ? `an inner region does scroll (${result.scrollers[0].selector}) — that is fine, but it must not widen the document`
              : 'no element declares overflow-x: auto, so nothing here is an intentional scroller',
          });
          for (const offender of result.offenders.slice(1, 4)) {
            t.note(`${name}: also overhanging — ${offender.selector} by ${offender.overhangPx}px`);
          }
        } else {
          t.note(`${name}: scrollWidth ${result.scrollWidth} <= clientWidth ${result.clientWidth}`);
        }
      }
    },
  },

  {
    id: 'C2',
    group: 'C',
    title: 'No text renders below 12px at 375px',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({
        device: 'mobile',
        profile: PROFILE_MAIN,
        events: SEED_EVENTS,
        waitlist: SEED_WAITLIST,
      });

      for (const { name, route } of routesFor(discovery)) {
        await t.open(session, route);
        if (route === ROUTES.shortlist) {
          await expandFit(session.page, 0).catch(() => {});
          await openIneligibleSection(session.page).catch(() => {});
        }
        const small = await session.page.evaluate(probeFontSizes, MIN_FONT_PX);
        for (const entry of small) {
          t.fail('text renders below the 12px floor', {
            route,
            selector: entry.selector,
            observed: `${entry.fontSizePx}px — "${entry.text}"${entry.count > 1 ? ` (and ${entry.count - 1} more)` : ''}`,
            expected: `>= ${MIN_FONT_PX}px`,
          });
        }
        if (!small.length) t.note(`${name}: all text >= ${MIN_FONT_PX}px`);
      }
    },
  },

  {
    id: 'C3',
    group: 'C',
    title: 'Touch targets are 40x40, or 24px with 8px of clear space',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({
        device: 'mobile',
        profile: PROFILE_MAIN,
        events: SEED_EVENTS,
        waitlist: SEED_WAITLIST,
      });

      for (const { name, route } of routesFor(discovery)) {
        await t.open(session, route);
        if (route === ROUTES.shortlist) {
          await expandFit(session.page, 0).catch(() => {});
          await openIneligibleSection(session.page).catch(() => {});
        }
        const failures = await session.page.evaluate(probeTouchTargets, TOUCH);
        for (const failure of failures) {
          t.fail('touch target is too small to hit reliably', {
            route,
            selector: failure.selector,
            observed: `<${failure.tag}> "${failure.text}" is ${failure.box.width}x${failure.box.height}px, smaller dimension ${
              failure.smallerDimensionPx
            }px, nearest interactive neighbour ${
              failure.nearestNeighbourGapPx === null ? 'none' : `${failure.nearestNeighbourGapPx}px away (${failure.nearestNeighbour})`
            }`,
            expected: `${TOUCH.minBox}x${TOUCH.minBox}px, or >= ${TOUCH.minSmall}px in the smaller dimension with >= ${TOUCH.minGap}px of clear space`,
            hint: failure.inlineInText ? 'this is an inline link inside running text' : undefined,
          });
        }
        if (!failures.length) t.note(`${name}: every interactive element clears the target size`);
      }
    },
  },

  {
    id: 'C4',
    group: 'C',
    title: 'The primary path completes at 375px by touch, with no sideways scrolling',
    async run(t) {
      const session = await t.session({ device: 'mobile', profile: null, events: [], waitlist: [] });
      const page = session.page;

      const assertNoSidewaysScroll = async (step, route) => {
        const result = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollX: window.scrollX,
        }));
        t.expect(
          result.scrollWidth <= result.clientWidth + 1,
          `step "${step}" needed the document to scroll sideways`,
          {
            route,
            observed: `scrollWidth ${result.scrollWidth} vs clientWidth ${result.clientWidth}`,
            expected: 'no horizontal document overflow',
          },
        );
        t.expect(result.scrollX === 0, `step "${step}" left the document scrolled sideways`, {
          route,
          observed: `window.scrollX ${result.scrollX}`,
          expected: '0',
        });
      };

      await t.open(session, ROUTES.landing);
      await assertNoSidewaysScroll('landing', ROUTES.landing);

      const { problems } = await fillProfileForm(page, PROFILE_MAIN, { tap: true });
      for (const problem of problems) {
        t.fail('could not fill a field by touch', { selector: tid(problem.testid), observed: problem.reason });
      }
      await assertNoSidewaysScroll('form filled', ROUTES.landing);

      const submitted = await submitProfile(page, { tap: true });
      t.require(submitted.ok, 'selector not found', { selector: tid(TESTID.profileSubmit), observed: submitted.reason });
      const landed = await waitForShortlist(page);
      t.require(landed.ok, 'tapping submit did not reach the shortlist', {
        observed: landed.url,
        expected: `${t.ctx.baseUrl}shortlist/`,
      });
      await assertNoSidewaysScroll('shortlist', ROUTES.shortlist);

      const rows = (await readShortlistRows(page)).filter((row) => row.visible);
      t.require(rows.length >= 1, 'no shortlist rows at 375px', {
        selector: tid(TESTID.shortlistRow),
        observed: '0 visible rows',
        expected: '>= 1',
      });

      const toggled = await expandFit(page, 0, { tap: true });
      t.expect(toggled.ok && toggled.after === 'true', 'tapping the fit toggle did not expand the breakdown', {
        selector: tid(TESTID.fitToggle),
        observed: toggled.ok ? `aria-expanded "${toggled.before}" → "${toggled.after}"` : toggled.reason,
        expected: 'aria-expanded "true"',
      });
      const panel = await readBreakdownFor(page, 0);
      t.expect(panel.found && panel.visible, 'the fit breakdown is not visible after a tap', {
        selector: tid(TESTID.fitBreakdown),
        observed: panel.found ? 'found but not visible' : panel.reason,
        expected: 'visible',
      });
      await assertNoSidewaysScroll('fit breakdown expanded', ROUTES.shortlist);

      const programId = rows[0].programId;
      t.require(programId, 'the first row exposes no programme id to open', {
        selector: tid(TESTID.shortlistRow),
        expected: 'data-program-id or a /program/<id>/ link',
      });
      const link = page.locator(`${tid(TESTID.shortlistRow)} a[href*="/program/"]`).first();
      if (await link.count()) await link.tap();
      else await session.goto(programRoute(programId));
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForTimeout(250);

      t.expect(await exists(page, TESTID.stageTimeline), 'the programme page did not open from the shortlist', {
        selector: tid(TESTID.stageTimeline),
        observed: `url ${page.url()}`,
        expected: `a stage timeline on ${programRoute(programId)}`,
      });
      await assertNoSidewaysScroll('programme detail', programRoute(programId));

      const calendarNav = page.locator(tid(TESTID.navCalendar)).first();
      if (await calendarNav.count()) await calendarNav.tap();
      else await session.goto(ROUTES.calendar);
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForTimeout(250);

      t.expect(await exists(page, TESTID.calendarAxis), 'the calendar did not open', {
        selector: tid(TESTID.calendarAxis),
        observed: `url ${page.url()}`,
        expected: 'the calendar axis',
      });
      await assertNoSidewaysScroll('calendar', ROUTES.calendar);
      t.note('primary path completed by touch at 375x812');
    },
  },

  {
    id: 'C5',
    group: 'C',
    title: 'Screenshots at 375x812 and 1440x900',
    async run(t) {
      if (t.ctx.quiet) {
        t.note('--quiet: screenshots skipped');
        return;
      }
      const discovery = await discover(t.ctx);
      t.require(discovery.programId, 'no programme id available for the programme screenshot', {
        observed: discovery.error,
      });

      for (const device of ['mobile', 'desktop']) {
        const session = await t.session({
          device,
          profile: PROFILE_MAIN,
          events: SEED_EVENTS,
          waitlist: SEED_WAITLIST,
        });
        const page = session.page;
        const prefix = device === 'mobile' ? 'mobile' : 'desktop';

        await t.open(session, ROUTES.landing);
        await t.shot(page, `${prefix}-landing`);

        await t.open(session, ROUTES.shortlist);
        await t.shot(page, `${prefix}-shortlist`);
        await expandFit(page, 0).catch(() => {});
        await openIneligibleSection(page).catch(() => {});
        await page.waitForTimeout(200);
        await t.shot(page, `${prefix}-shortlist-expanded`);

        await t.open(session, programRoute(discovery.programId));
        await t.shot(page, `${prefix}-program`);

        await t.open(session, ROUTES.calendar);
        await t.shot(page, `${prefix}-calendar`);

        await t.open(session, ROUTES.debug);
        await t.shot(page, `${prefix}-debug`);
      }
      t.note('screenshots written:', t.artifacts);
    },
  },
];
