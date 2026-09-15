/**
 * Group D — keyboard, semantics, motion and contrast.
 *
 * D6 is the one most likely to find something real. It implements the WCAG
 * relative-luminance formula in page context and composites translucent
 * backgrounds against the first opaque ancestor, so a `rgba(0,0,0,.05)` card on
 * a white page is compared against the colour that actually reaches the eye.
 */

import { TESTID, tid, ROUTES, PROFILE_MAIN, SEED_EVENTS, SEED_WAITLIST } from '../lib/contract.mjs';
import { exists, countOf, programRoute, expandFit, readBreakdownFor, openIneligibleSection } from '../lib/ui.mjs';
import {
  probeFocusStyle,
  probeRestingStyles,
  probeSemantics,
  probeMotion,
  probeMotionOf,
  probeContrast,
} from '../lib/probes.mjs';
import { discover } from '../lib/discovery.mjs';

const MAX_TABS = 120;
const REDUCED_MOTION_MAX_SECONDS = 0.01;

function routesFor(discovery) {
  const routes = [
    { name: 'landing', route: ROUTES.landing },
    { name: 'shortlist', route: ROUTES.shortlist },
    { name: 'calendar', route: ROUTES.calendar },
    { name: 'debug', route: ROUTES.debug },
  ];
  if (discovery.programId) routes.splice(2, 0, { name: 'program', route: programRoute(discovery.programId) });
  return routes;
}

/** Tabs forward, returning every element that took focus, in order. */
async function tabThrough(page, limit = MAX_TABS, stopWhen = null) {
  const visited = [];
  await page.evaluate(() => document.body.focus && document.body.focus());
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  for (let i = 0; i < limit; i += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(probeFocusStyle);
    if (!focused) break;
    visited.push(focused);
    if (stopWhen && stopWhen(focused)) break;
    if (visited.length > 2 && focused.selector === visited[0].selector) break;
  }
  return visited;
}

export const a11yChecks = [
  {
    id: 'D1',
    group: 'D',
    title: 'Every focusable control in the form shows a visible focus indicator',
    async run(t) {
      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, ROUTES.landing);
      const page = session.page;

      t.require(await exists(page, TESTID.profileForm), 'selector not found', { selector: tid(TESTID.profileForm) });

      const formControls = await page.evaluate((ids) => {
        const V = window.__verify;
        const form = document.querySelector(`[data-testid="${ids.profileForm}"]`);
        if (!form) return [];
        return Array.from(
          form.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        )
          .filter((el) => el.type !== 'hidden' && !el.disabled && V.isVisible(el))
          .map((el) => V.cssPath(el));
      }, TESTID);

      t.require(formControls.length >= 1, 'the form has no focusable controls', {
        selector: `${tid(TESTID.profileForm)} input, select, button`,
      });

      const resting = await page.evaluate(probeRestingStyles, formControls);
      const wanted = new Set(formControls);
      const visited = await tabThrough(page, MAX_TABS);
      const seen = new Map();
      for (const entry of visited) {
        if (wanted.has(entry.selector) && !seen.has(entry.selector)) seen.set(entry.selector, entry);
      }

      for (const selector of formControls) {
        const focused = seen.get(selector);
        if (!focused) {
          t.fail('a form control was never reached by Tab', {
            selector,
            observed: `not focused within ${MAX_TABS} tab presses`,
            expected: 'reachable in the tab order',
          });
          continue;
        }
        const before = resting[selector];
        if (!before) {
          t.fail('could not read the resting style of a control', { selector });
          continue;
        }
        const changed = Object.keys(focused.style).filter((key) => focused.style[key] !== before[key]);
        t.expect(changed.length > 0, 'focusing this control changes nothing visible', {
          selector,
          observed: `outline "${focused.style.outline}", box-shadow "${focused.style.boxShadow}", border "${focused.style.border}" — identical unfocused`,
          expected: 'a change in outline, box-shadow, border or background on focus',
        });
        if (changed.length) t.note(`${focused.testid || selector}: focus changes ${changed.join(', ')}`);
      }
    },
  },

  {
    id: 'D2',
    group: 'D',
    title: 'The profile form can be completed and submitted with the keyboard alone',
    async run(t) {
      const session = await t.session({ profile: null, events: [], waitlist: [] });
      await t.open(session, ROUTES.landing);
      const page = session.page;

      t.require(await exists(page, TESTID.profileForm), 'selector not found', { selector: tid(TESTID.profileForm) });

      const state = { city: false, sector: false, citizenship: false, submitted: false };
      const touched = [];

      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      for (let i = 0; i < MAX_TABS && !state.submitted; i += 1) {
        await page.keyboard.press('Tab');
        const info = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          return {
            tag: el.tagName.toLowerCase(),
            type: (el.getAttribute('type') || '').toLowerCase(),
            testid: el.getAttribute('data-testid') || '',
            value: 'value' in el ? String(el.value) : '',
            checked: 'checked' in el ? !!el.checked : null,
            selectedIndex: el.tagName === 'SELECT' ? el.selectedIndex : null,
            optionCount: el.tagName === 'SELECT' ? el.options.length : null,
            path: window.__verify.cssPath(el),
          };
        });
        if (!info) break;
        touched.push(info.testid || info.path);

        if (info.testid === TESTID.profileSubmit) {
          await page.keyboard.press('Enter');
          state.submitted = true;
          break;
        }

        if (info.tag === 'select') {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            const current = await page.evaluate(() => String(document.activeElement.value || ''));
            if (current) break;
            await page.keyboard.press('ArrowDown');
          }
          continue;
        }

        if (info.type === 'checkbox') {
          const isCity = info.testid.startsWith('field-city-');
          const isSector = info.testid.startsWith('field-sector-');
          if ((isCity && !state.city) || (isSector && !state.sector)) {
            await page.keyboard.press('Space');
            if (isCity) state.city = true;
            if (isSector) state.sector = true;
          }
          continue;
        }

        if (info.type === 'radio') {
          if (info.testid.startsWith('field-citizenship-') && !state.citizenship) {
            if (!info.checked) await page.keyboard.press('Space');
            state.citizenship = true;
          }
          continue;
        }

        if (info.testid === TESTID.fieldCgpa) {
          await page.keyboard.type('3.60');
          continue;
        }

        if (info.tag === 'input' && (info.type === 'text' || info.type === 'number' || info.type === '')) {
          if (!info.value) await page.keyboard.type('3.60');
        }
      }

      t.note('tab order walked:', touched.slice(0, 25));
      t.expect(state.submitted, 'the submit button was never reached by Tab', {
        selector: tid(TESTID.profileSubmit),
        observed: `focused ${touched.length} controls without reaching it`,
        expected: 'the submit button in the tab order',
      });

      if (state.submitted) {
        let landed = false;
        try {
          await page.waitForURL(/\/shortlist\/?(\?|#|$)/, { timeout: 6000 });
          landed = true;
        } catch {
          landed = false;
        }
        t.expect(landed, 'keyboard-only submission did not reach the shortlist', {
          observed: page.url(),
          expected: `${t.ctx.baseUrl}shortlist/`,
          hint: 'check that Enter on the submit button submits, and that every required control is keyboard-settable',
        });
        if (landed) {
          const rows = await countOf(page, TESTID.shortlistRow);
          t.expect(rows >= 1, 'keyboard-only submission produced an empty shortlist', {
            selector: tid(TESTID.shortlistRow),
            observed: `${rows} rows`,
            expected: '>= 1',
          });
        }
      }
    },
  },

  {
    id: 'D3',
    group: 'D',
    title: 'The fit toggle is tabbable, works with Enter and Space, and wires aria correctly',
    async run(t) {
      const session = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(session, ROUTES.shortlist);
      const page = session.page;

      t.require((await countOf(page, TESTID.fitToggle)) >= 1, 'selector not found', {
        selector: tid(TESTID.fitToggle),
      });

      const visited = await tabThrough(page, MAX_TABS, (entry) => entry.testid === TESTID.fitToggle);
      const reached = visited.some((entry) => entry.testid === TESTID.fitToggle);
      t.expect(reached, 'the fit toggle is not reachable by Tab', {
        selector: tid(TESTID.fitToggle),
        observed: `focused ${visited.length} elements without reaching it: ${JSON.stringify(
          visited.slice(0, 15).map((v) => v.testid || v.tag),
        )}`,
        expected: 'in the tab order',
      });

      const toggle = page.locator(tid(TESTID.fitToggle)).first();
      const aria = await toggle.evaluate((el) => ({
        expanded: el.getAttribute('aria-expanded'),
        controls: el.getAttribute('aria-controls'),
        controlled: el.getAttribute('aria-controls')
          ? (() => {
              const target = document.getElementById(el.getAttribute('aria-controls'));
              return target
                ? { exists: true, testid: target.getAttribute('data-testid'), tag: target.tagName.toLowerCase() }
                : { exists: false };
            })()
          : null,
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role'),
      }));

      t.expect(aria.tag === 'button' || aria.role === 'button', 'the fit toggle is not a button', {
        selector: tid(TESTID.fitToggle),
        observed: `<${aria.tag}> role="${aria.role}"`,
        expected: '<button> or role="button"',
      });
      t.expect(aria.expanded === 'false', 'the fit toggle does not start collapsed', {
        selector: tid(TESTID.fitToggle),
        observed: `aria-expanded="${aria.expanded}"`,
        expected: '"false"',
      });
      if (t.expect(Boolean(aria.controls), 'the fit toggle has no aria-controls', {
        selector: tid(TESTID.fitToggle),
        observed: 'attribute absent',
        expected: 'aria-controls pointing at the breakdown',
      })) {
        t.expect(aria.controlled && aria.controlled.exists, 'aria-controls points at an element that does not exist', {
          selector: tid(TESTID.fitToggle),
          observed: `aria-controls="${aria.controls}" — no element with that id`,
          expected: 'an existing element',
        });
        if (aria.controlled && aria.controlled.exists) {
          t.expect(
            aria.controlled.testid === TESTID.fitBreakdown,
            'aria-controls does not point at the fit breakdown',
            {
              selector: tid(TESTID.fitToggle),
              observed: `points at <${aria.controlled.tag} data-testid="${aria.controlled.testid}">`,
              expected: `an element with data-testid="${TESTID.fitBreakdown}"`,
            },
          );
        }
      }

      for (const key of ['Enter', 'Space']) {
        await toggle.focus();
        const before = await toggle.getAttribute('aria-expanded');
        await page.keyboard.press(key === 'Space' ? ' ' : key);
        await page.waitForTimeout(200);
        const after = await toggle.getAttribute('aria-expanded');
        t.expect(before !== after, `${key} does not operate the fit toggle`, {
          selector: tid(TESTID.fitToggle),
          observed: `aria-expanded stayed "${after}"`,
          expected: `aria-expanded to flip from "${before}"`,
        });
        if (after === 'true') {
          const panel = await readBreakdownFor(page, 0);
          t.expect(panel.found && panel.visible, `${key} expanded the toggle but the breakdown is not visible`, {
            selector: tid(TESTID.fitBreakdown),
            observed: panel.found ? 'present but not visible' : panel.reason,
            expected: 'visible',
          });
        }
      }
    },
  },

  {
    id: 'D4',
    group: 'D',
    title: 'Images have alt text, controls have names, one h1, no skipped heading levels',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({
        profile: PROFILE_MAIN,
        events: SEED_EVENTS,
        waitlist: SEED_WAITLIST,
      });

      for (const { name, route } of routesFor(discovery)) {
        await t.open(session, route);
        const result = await session.page.evaluate(probeSemantics);

        for (const image of result.imagesMissingAlt) {
          t.fail('an image has no alt attribute', {
            route,
            selector: image.selector,
            observed: `src="${image.src}"`,
            expected: 'an alt attribute (empty if decorative)',
          });
        }
        for (const control of result.controlsMissingName) {
          t.fail('a form control has no accessible name', {
            route,
            selector: control.selector,
            observed: `<${control.tag} type="${control.type}" data-testid="${control.testid}"> has no label, aria-label or aria-labelledby`,
            expected: 'a <label for>, a wrapping <label>, aria-label or aria-labelledby',
          });
        }
        t.expect(result.h1Count === 1, 'the page does not have exactly one h1', {
          route,
          selector: 'h1',
          observed: `${result.h1Count} h1 elements; headings: ${JSON.stringify(
            result.headings.map((h) => `h${h.level} ${h.text.slice(0, 30)}`),
          )}`,
          expected: 'exactly 1',
        });
        for (const skip of result.headingSkips) {
          t.fail('the heading order skips a level', {
            route,
            selector: skip.selector,
            observed: `h${skip.from} is followed by h${skip.to} ("${skip.text}")`,
            expected: `h${skip.from + 1} or shallower`,
          });
        }
        t.note(`${name}: ${result.headings.length} headings, ${result.h1Count} h1`);
      }
    },
  },

  {
    id: 'D5',
    group: 'D',
    title: 'Reduced motion actually reduces motion',
    async run(t) {
      const sampled = [tid(TESTID.fitBreakdown), tid(TESTID.fitToggle), tid(TESTID.windowStatus)];

      const normal = await t.session({ profile: PROFILE_MAIN, events: [], waitlist: [] });
      await t.open(normal, ROUTES.shortlist);
      await expandFit(normal.page, 0).catch(() => {});
      await normal.page.waitForTimeout(150);
      const animatedNormally = await normal.page.evaluate(probeMotion, REDUCED_MOTION_MAX_SECONDS);
      const normalSamples = await normal.page.evaluate(probeMotionOf, sampled);
      t.note(`${animatedNormally.length} elements animate with the default motion preference`);
      for (const sample of normalSamples) {
        t.note(
          `normal — ${sample.selector}: transition ${sample.transitionDuration} on ${sample.transitionProperty}, animation ${sample.animationDuration}`,
        );
      }

      const reduced = await t.session({
        profile: PROFILE_MAIN,
        events: [],
        waitlist: [],
        reducedMotion: 'reduce',
      });
      await t.open(reduced, ROUTES.shortlist);
      const prefers = await reduced.page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      );
      t.require(prefers, 'the reduced-motion context did not take effect', {
        observed: 'prefers-reduced-motion does not match',
        expected: 'the media query to match',
      });

      await expandFit(reduced.page, 0).catch(() => {});
      await reduced.page.waitForTimeout(150);
      const stillAnimating = await reduced.page.evaluate(probeMotion, REDUCED_MOTION_MAX_SECONDS);
      const reducedSamples = await reduced.page.evaluate(probeMotionOf, sampled);

      for (const sample of reducedSamples) {
        t.note(
          `reduced — ${sample.selector}: transition ${sample.transitionDuration}, animation ${sample.animationDuration}`,
        );
      }

      for (const offender of stillAnimating) {
        t.fail('an element still animates under prefers-reduced-motion: reduce', {
          route: ROUTES.shortlist,
          selector: offender.selector,
          observed: `${offender.property} ${offender.seconds}s (transition-duration: ${offender.transitionDuration} on ${offender.transitionProperty}; animation: ${offender.animationName} ${offender.animationDuration})`,
          expected: `<= ${REDUCED_MOTION_MAX_SECONDS}s`,
        });
      }
      if (!stillAnimating.length) {
        t.note(
          animatedNormally.length
            ? `all ${animatedNormally.length} normally-animated elements are reduced to <= ${REDUCED_MOTION_MAX_SECONDS}s`
            : 'nothing animates in either mode',
        );
      }
    },
  },

  {
    id: 'D6',
    group: 'D',
    title: 'Every visible text node meets its WCAG contrast minimum',
    async run(t) {
      const discovery = await discover(t.ctx);
      const session = await t.session({
        profile: PROFILE_MAIN,
        events: SEED_EVENTS,
        waitlist: SEED_WAITLIST,
      });

      let totalChecked = 0;
      for (const { name, route } of routesFor(discovery)) {
        await t.open(session, route);
        if (route === ROUTES.shortlist) {
          await expandFit(session.page, 0).catch(() => {});
          await openIneligibleSection(session.page).catch(() => {});
          await session.page.waitForTimeout(150);
        }
        const result = await session.page.evaluate(probeContrast);
        totalChecked += result.checked;

        for (const failure of result.failures.slice(0, 20)) {
          t.fail('text does not meet its contrast minimum', {
            route,
            selector: failure.selector,
            observed: `${failure.ratio}:1 — ${failure.color} on ${failure.background} at ${failure.fontSizePx}px/${
              failure.fontWeight
            }${failure.count > 1 ? ` (${failure.count} text nodes)` : ''} — "${failure.text}"`,
            expected: `>= ${failure.required}:1 (${failure.largeText ? 'large text' : 'normal text'})`,
          });
        }
        if (result.failures.length > 20) {
          t.note(`${name}: ${result.failures.length - 20} further contrast failures not listed`);
        }
        for (const skip of result.skipped) {
          t.note(`${name}: not measured — ${skip.selector}: ${skip.reason}`);
        }
        if (!result.failures.length) t.note(`${name}: ${result.checked} text nodes pass`);
      }
      t.note(`${totalChecked} text nodes measured in total`);
    },
  },
];
