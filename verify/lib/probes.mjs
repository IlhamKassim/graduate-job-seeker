/**
 * Everything that runs inside the page.
 *
 * `installHelpers` is handed to `page.addInitScript`, so `window.__verify` exists
 * on every document before the app boots. The probes below are passed to
 * `page.evaluate`, which serialises their source — they may therefore reference
 * `window.__verify` but nothing else from this module's scope.
 */

export function installHelpers() {
  const V = {};

  /** A short, pasteable CSS path. Stops at an id, or after five levels. */
  V.cssPath = (el) => {
    if (!el || el.nodeType !== 1) return '(not an element)';
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 5) {
      let part = node.tagName.toLowerCase();
      const testid = node.getAttribute && node.getAttribute('data-testid');
      if (testid) part += `[data-testid="${testid}"]`;
      if (node.id) {
        parts.unshift(`${part}#${node.id}`);
        break;
      }
      if (!testid && node.classList && node.classList.length) {
        part += `.${Array.from(node.classList).slice(0, 2).join('.')}`;
      }
      const parent = node.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
      if (node && (node.tagName === 'BODY' || node.tagName === 'HTML')) break;
    }
    return parts.join(' > ');
  };

  V.isVisible = (el) => {
    if (!el || el.nodeType !== 1) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
      if (parseFloat(cs.opacity) === 0) return false;
      if (node.hasAttribute('hidden')) return false;
      node = node.parentElement;
    }
    return true;
  };

  /** Product of every ancestor opacity, which is what actually reaches the eye. */
  V.effectiveOpacity = (el) => {
    let alpha = 1;
    let node = el;
    while (node && node.nodeType === 1) {
      const o = parseFloat(getComputedStyle(node).opacity);
      if (!Number.isNaN(o)) alpha *= o;
      node = node.parentElement;
    }
    return alpha;
  };

  /** Accepts rgb(), rgba(), `transparent` and Chromium's color(srgb ...) form. */
  V.parseColor = (value) => {
    if (!value) return null;
    const text = String(value).trim();
    if (text === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    let m = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/i);
    if (m) {
      let a = m[4] === undefined ? 1 : parseFloat(m[4]);
      if (typeof m[4] === 'string' && m[4].endsWith('%')) a = parseFloat(m[4]) / 100;
      return { r: +m[1], g: +m[2], b: +m[3], a: Number.isNaN(a) ? 1 : a };
    }
    m = text.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
    if (m) {
      return {
        r: Math.round(+m[1] * 255),
        g: Math.round(+m[2] * 255),
        b: Math.round(+m[3] * 255),
        a: m[4] === undefined ? 1 : parseFloat(m[4]),
      };
    }
    return null;
  };

  V.formatColor = (c) =>
    c ? (c.a >= 1 ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${+c.a.toFixed(3)})`) : 'unknown';

  /** Source-over compositing of `fg` onto an opaque `bg`. */
  V.over = (fg, bg) => {
    const a = fg.a;
    return {
      r: fg.r * a + bg.r * (1 - a),
      g: fg.g * a + bg.g * (1 - a),
      b: fg.b * a + bg.b * (1 - a),
      a: 1,
    };
  };

  /**
   * Walk up until an opaque background colour is found, then composite every
   * translucent layer back down onto it. Reports when a background image sits in
   * the chain, because then no computed colour is the truth.
   */
  V.effectiveBackground = (el) => {
    const layers = [];
    let hasImage = false;
    let imageOwner = null;
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        hasImage = true;
        if (!imageOwner) imageOwner = V.cssPath(node);
      }
      const color = V.parseColor(cs.backgroundColor);
      if (color && color.a > 0) {
        const opacity = parseFloat(cs.opacity);
        const layer = { ...color, a: color.a * (Number.isNaN(opacity) ? 1 : opacity) };
        layers.push(layer);
        if (layer.a >= 0.999) break;
      }
      node = node.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i -= 1) base = V.over(layers[i], base);
    return { color: base, hasImage, imageOwner, opaqueFound: layers.some((l) => l.a >= 0.999) };
  };

  V.luminance = (c) => {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  };

  V.contrastRatio = (a, b) => {
    const la = V.luminance(a);
    const lb = V.luminance(b);
    const light = Math.max(la, lb);
    const dark = Math.min(la, lb);
    return (light + 0.05) / (dark + 0.05);
  };

  /** WCAG 1.4.3: 18.66px bold or 24px regular counts as large text. */
  V.isLargeText = (fontSizePx, fontWeight) => {
    const weight = parseInt(fontWeight, 10) || 400;
    const bold = weight >= 700;
    return fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
  };

  /** Every text node with ink in it, paired with the element that paints it. */
  V.visibleTextNodes = () => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TITLE') {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let current = walker.nextNode();
    while (current) {
      const parent = current.parentElement;
      const range = document.createRange();
      range.selectNodeContents(current);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && V.isVisible(parent)) {
        out.push({ node: current, parent, text: current.nodeValue.trim(), rect });
      }
      current = walker.nextNode();
    }
    return out;
  };

  V.interactiveElements = () =>
    Array.from(
      document.querySelectorAll(
        'button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="tab"]',
      ),
    ).filter((el) => {
      if (el.tagName === 'INPUT' && el.type === 'hidden') return false;
      if (el.tagName === 'A' && !el.hasAttribute('href')) return false;
      if (el.disabled) return false;
      return V.isVisible(el);
    });

  /** label / aria-label / aria-labelledby / title / wrapping label, in that order. */
  V.accessibleName = (el) => {
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const text = labelledby
        .split(/\s+/)
        .map((id) => {
          const target = document.getElementById(id);
          return target ? target.textContent.trim() : '';
        })
        .join(' ')
        .trim();
      if (text) return { name: text, from: 'aria-labelledby' };
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return { name: ariaLabel.trim(), from: 'aria-label' };
    if (el.id) {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label && label.textContent.trim()) return { name: label.textContent.trim(), from: 'label[for]' };
    }
    const wrapping = el.closest('label');
    if (wrapping && wrapping.textContent.trim()) {
      return { name: wrapping.textContent.trim(), from: 'wrapping label' };
    }
    const title = el.getAttribute('title');
    if (title && title.trim()) return { name: title.trim(), from: 'title' };
    if (el.tagName === 'BUTTON' && el.textContent.trim()) {
      return { name: el.textContent.trim(), from: 'text content' };
    }
    if (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button') && el.value) {
      return { name: el.value, from: 'value' };
    }
    return { name: '', from: null };
  };

  V.boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      width: Math.round(r.width * 10) / 10,
      height: Math.round(r.height * 10) / 10,
    };
  };

  window.__verify = V;
}

// ---------------------------------------------------------------------------
// Probes. Each is passed to page.evaluate.
// ---------------------------------------------------------------------------

/** C1 — document-level horizontal overflow, plus which element actually scrolls. */
export function probeOverflow() {
  const V = window.__verify;
  const doc = document.documentElement;
  const clientWidth = doc.clientWidth;
  const scrollWidth = doc.scrollWidth;

  const offenders = [];
  const scrollers = [];
  for (const el of Array.from(document.querySelectorAll('*'))) {
    if (!V.isVisible(el)) continue;
    const cs = getComputedStyle(el);
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) {
      scrollers.push({
        selector: V.cssPath(el),
        tag: el.tagName.toLowerCase(),
        overflowX: cs.overflowX,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    }
    const rect = el.getBoundingClientRect();
    const overhang = Math.max(rect.right - clientWidth, -rect.left);
    if (overhang > 1) {
      // An element inside a legitimate `overflow-x: auto` region is clipped by
      // it and cannot widen the document, so it is not the offender.
      let clipped = false;
      let parent = el.parentElement;
      while (parent && parent !== doc) {
        const px = getComputedStyle(parent).overflowX;
        if (px === 'auto' || px === 'scroll' || px === 'hidden') {
          clipped = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!clipped) {
        offenders.push({
          selector: V.cssPath(el),
          tag: el.tagName.toLowerCase(),
          classes: Array.from(el.classList).join(' '),
          box: V.boxOf(el),
          overhangPx: Math.round(overhang * 10) / 10,
        });
      }
    }
  }
  offenders.sort((a, b) => b.overhangPx - a.overhangPx);
  return {
    scrollWidth,
    clientWidth,
    overflows: scrollWidth > clientWidth + 1,
    offenders: offenders.slice(0, 10),
    scrollers,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
    htmlOverflowX: getComputedStyle(doc).overflowX,
  };
}

/** C2 — text rendered below a minimum computed font size. */
export function probeFontSizes(minPx) {
  const V = window.__verify;
  const seen = new Map();
  for (const entry of V.visibleTextNodes()) {
    const size = parseFloat(getComputedStyle(entry.parent).fontSize);
    if (Number.isNaN(size) || size >= minPx - 0.01) continue;
    const selector = V.cssPath(entry.parent);
    const key = `${selector}|${size}`;
    if (!seen.has(key)) {
      seen.set(key, {
        selector,
        fontSizePx: Math.round(size * 100) / 100,
        text: entry.text.slice(0, 60),
        count: 0,
      });
    }
    seen.get(key).count += 1;
  }
  return Array.from(seen.values()).sort((a, b) => a.fontSizePx - b.fontSizePx);
}

/** C3 — touch target size, with the 24px + 8px-spacing escape hatch. */
export function probeTouchTargets(opts) {
  const V = window.__verify;
  const { minBox, minSmall, minGap } = opts;
  const elements = V.interactiveElements();
  const boxes = elements.map((el) => el.getBoundingClientRect());

  const gapBetween = (a, b) => {
    const dx = Math.max(a.left - b.right, b.left - a.right, 0);
    const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
    if (dx === 0 && dy === 0) return 0;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const failures = [];
  elements.forEach((el, i) => {
    const rect = boxes[i];
    if (rect.width >= minBox && rect.height >= minBox) return;
    const smaller = Math.min(rect.width, rect.height);
    let nearestGap = Infinity;
    let nearest = null;
    elements.forEach((other, j) => {
      if (i === j) return;
      if (el.contains(other) || other.contains(el)) return;
      const gap = gapBetween(rect, boxes[j]);
      if (gap < nearestGap) {
        nearestGap = gap;
        nearest = other;
      }
    });
    if (smaller >= minSmall && nearestGap >= minGap) return;
    failures.push({
      selector: V.cssPath(el),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || el.value || '').trim().slice(0, 40),
      box: V.boxOf(el),
      smallerDimensionPx: Math.round(smaller * 10) / 10,
      nearestNeighbourGapPx: nearestGap === Infinity ? null : Math.round(nearestGap * 10) / 10,
      nearestNeighbour: nearest ? V.cssPath(nearest) : null,
      inlineInText: el.tagName === 'A' && !!el.closest('p, li, span'),
    });
  });
  return failures;
}

/** D6 — WCAG 2.x contrast for every visible text node. */
export function probeContrast() {
  const V = window.__verify;
  const failures = new Map();
  const skipped = [];
  let checked = 0;

  for (const entry of V.visibleTextNodes()) {
    const el = entry.parent;
    const cs = getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize);
    const textColor = V.parseColor(cs.color);
    if (!textColor) {
      skipped.push({ selector: V.cssPath(el), reason: `unparseable color: ${cs.color}` });
      continue;
    }
    const background = V.effectiveBackground(el);
    if (background.hasImage) {
      skipped.push({
        selector: V.cssPath(el),
        reason: `background-image on ${background.imageOwner} — no single colour to compare against`,
        text: entry.text.slice(0, 40),
      });
      continue;
    }
    const opacity = V.effectiveOpacity(el);
    const fg = V.over({ ...textColor, a: textColor.a * opacity }, background.color);
    const ratio = V.contrastRatio(fg, background.color);
    const large = V.isLargeText(fontSize, cs.fontWeight);
    const required = large ? 3 : 4.5;
    checked += 1;
    if (ratio + 0.005 < required) {
      const selector = V.cssPath(el);
      const key = `${selector}|${V.formatColor(fg)}|${V.formatColor(background.color)}|${fontSize}`;
      if (!failures.has(key)) {
        failures.set(key, {
          selector,
          text: entry.text.slice(0, 60),
          color: V.formatColor(fg),
          background: V.formatColor(background.color),
          ratio: Math.round(ratio * 100) / 100,
          required,
          fontSizePx: Math.round(fontSize * 100) / 100,
          fontWeight: cs.fontWeight,
          largeText: large,
          count: 0,
        });
      }
      failures.get(key).count += 1;
    }
  }
  return {
    checked,
    failures: Array.from(failures.values()).sort((a, b) => a.ratio - b.ratio),
    skipped: skipped.slice(0, 10),
  };
}

/** D4 — images, form-control names, one h1, no skipped heading levels. */
export function probeSemantics() {
  const V = window.__verify;
  const imagesMissingAlt = Array.from(document.querySelectorAll('img'))
    .filter((img) => !img.hasAttribute('alt'))
    .map((img) => ({ selector: V.cssPath(img), src: (img.getAttribute('src') || '').slice(0, 80) }));

  const controlsMissingName = [];
  for (const el of Array.from(document.querySelectorAll('input, select, textarea'))) {
    if (el.type === 'hidden') continue;
    if (!V.isVisible(el)) continue;
    const { name } = V.accessibleName(el);
    if (!name) {
      controlsMissingName.push({
        selector: V.cssPath(el),
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        testid: el.getAttribute('data-testid'),
      });
    }
  }

  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter((h) => V.isVisible(h))
    .map((h) => ({ level: Number(h.tagName.slice(1)), text: h.textContent.trim().slice(0, 60), selector: V.cssPath(h) }));

  const skips = [];
  let previous = 0;
  for (const heading of headings) {
    if (previous && heading.level > previous + 1) {
      skips.push({ from: previous, to: heading.level, text: heading.text, selector: heading.selector });
    }
    previous = heading.level;
  }

  return {
    imagesMissingAlt,
    controlsMissingName,
    headings,
    h1Count: headings.filter((h) => h.level === 1).length,
    headingSkips: skips,
  };
}

/** D5 — anything still animating once the user has asked for reduced motion. */
export function probeMotion(maxSeconds) {
  const V = window.__verify;
  const toSeconds = (value) =>
    String(value)
      .split(',')
      .map((part) => {
        const text = part.trim();
        if (text.endsWith('ms')) return parseFloat(text) / 1000;
        return parseFloat(text) || 0;
      });

  const offenders = [];
  for (const el of Array.from(document.querySelectorAll('*'))) {
    if (!V.isVisible(el)) continue;
    const cs = getComputedStyle(el);
    const durations = [
      ...toSeconds(cs.transitionDuration).map((d) => ['transition-duration', d]),
      ...toSeconds(cs.animationDuration).map((d) => ['animation-duration', d]),
    ];
    const worst = durations.filter(([, d]) => d > maxSeconds).sort((a, b) => b[1] - a[1])[0];
    if (worst) {
      offenders.push({
        selector: V.cssPath(el),
        property: worst[0],
        seconds: worst[1],
        transitionDuration: cs.transitionDuration,
        animationDuration: cs.animationDuration,
        transitionProperty: cs.transitionProperty,
        animationName: cs.animationName,
      });
    }
  }
  return offenders.sort((a, b) => b.seconds - a.seconds).slice(0, 20);
}

/** D5 sampling — the computed motion values of a specific set of selectors. */
export function probeMotionOf(selectors) {
  const V = window.__verify;
  const out = [];
  for (const selector of selectors) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const cs = getComputedStyle(el);
      out.push({
        selector,
        path: V.cssPath(el),
        transitionDuration: cs.transitionDuration,
        animationDuration: cs.animationDuration,
        transitionProperty: cs.transitionProperty,
      });
    }
  }
  return out;
}

/** D1 — the visual difference focus makes, for the currently focused element. */
export function probeFocusStyle() {
  const V = window.__verify;
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const cs = getComputedStyle(el);
  return {
    selector: V.cssPath(el),
    tag: el.tagName.toLowerCase(),
    testid: el.getAttribute('data-testid'),
    style: {
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      outlineOffset: cs.outlineOffset,
      boxShadow: cs.boxShadow,
      border: `${cs.borderTopStyle} ${cs.borderTopWidth} ${cs.borderTopColor}`,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      textDecoration: cs.textDecorationLine,
    },
  };
}

/** D1 — the same values with nothing focused, keyed by css path. */
export function probeRestingStyles(paths) {
  const V = window.__verify;
  const out = {};
  const all = Array.from(document.querySelectorAll('*'));
  for (const path of paths) {
    const el = all.find((candidate) => V.cssPath(candidate) === path);
    if (!el) continue;
    const cs = getComputedStyle(el);
    out[path] = {
      outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
      outlineOffset: cs.outlineOffset,
      boxShadow: cs.boxShadow,
      border: `${cs.borderTopStyle} ${cs.borderTopWidth} ${cs.borderTopColor}`,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      textDecoration: cs.textDecorationLine,
    };
  }
  return out;
}

/** A3 — every fit total, and whether its own row offers a way to expand it. */
export function probeFitTotals(ids) {
  const V = window.__verify;
  const rowSelector = `[data-testid="${ids.shortlistRow}"], [data-testid="${ids.ineligibleRow}"]`;
  return Array.from(document.querySelectorAll(`[data-testid="${ids.fitTotal}"]`)).map((total) => {
    const row = total.closest(rowSelector);
    const toggle = row ? row.querySelector(`[data-testid="${ids.fitToggle}"]`) : null;
    return {
      selector: V.cssPath(total),
      text: total.textContent.trim().slice(0, 40),
      hasRow: !!row,
      rowTestid: row ? row.getAttribute('data-testid') : null,
      hasToggle: !!toggle,
      toggleVisible: toggle ? V.isVisible(toggle) : false,
      toggleDisabled: toggle ? !!toggle.disabled : false,
    };
  });
}

/** B9 / A6 — geometry of every window bar, grouped by calendar row. */
export function probeCalendarGeometry(ids) {
  const V = window.__verify;
  const axis = document.querySelector(`[data-testid="${ids.calendarAxis}"]`);
  const marker = document.querySelector(`[data-testid="${ids.graduationMarker}"]`);
  const rows = Array.from(document.querySelectorAll(`[data-testid="${ids.calendarRow}"]`));
  return {
    axis: axis ? V.boxOf(axis) : null,
    axisMonths: axis
      ? Array.from(axis.querySelectorAll(`[data-testid="${ids.axisMonth}"]`)).map((m) => ({
          text: m.textContent.trim(),
          box: V.boxOf(m),
        }))
      : [],
    marker: marker ? { box: V.boxOf(marker), visible: V.isVisible(marker) } : null,
    rows: rows.map((row) => ({
      selector: V.cssPath(row),
      programId:
        row.getAttribute('data-program-id') || row.getAttribute('data-program') || row.getAttribute('data-id'),
      opensMonth: row.getAttribute('data-opens-month') || row.getAttribute('data-opens'),
      closesMonth: row.getAttribute('data-closes-month') || row.getAttribute('data-closes'),
      wraps: row.getAttribute('data-wraps'),
      text: row.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
      bars: Array.from(row.querySelectorAll(`[data-testid="${ids.windowBar}"]`)).map((bar) => ({
        selector: V.cssPath(bar),
        box: V.boxOf(bar),
        wraps: bar.getAttribute('data-wraps'),
        label: (bar.getAttribute('aria-label') || bar.textContent || '').trim().slice(0, 60),
      })),
    })),
    allBars: Array.from(document.querySelectorAll(`[data-testid="${ids.windowBar}"]`)).map((bar) => ({
      selector: V.cssPath(bar),
      box: V.boxOf(bar),
    })),
  };
}

/** A10 — the page's visible text, exactly as a reader would see it. */
export function probeVisibleText() {
  return document.body ? document.body.innerText : '';
}

/** Reads a localStorage key back as parsed JSON. */
export function probeStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return { raw, parsed: raw ? JSON.parse(raw) : null, error: null };
  } catch (error) {
    return { raw: null, parsed: null, error: String(error) };
  }
}
