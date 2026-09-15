#!/usr/bin/env node
/**
 * Langkah verification harness.
 *
 *   node verify.mjs --base-url http://127.0.0.1:PORT --out /abs/path/to/output-dir
 *
 * Exits 0 when every check passes, 1 when any check fails, 2 when the harness
 * could not start at all. Writes report.json and screenshots into --out.
 *
 * Checks are independent: a missing route or a missing testid fails that check
 * with a "selector not found" line and the run carries on, so a partially built
 * app still gets a complete picture back.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { Ctx, runChecks, writeReport } from './lib/harness.mjs';
import { acceptanceChecks } from './checks/acceptance.mjs';
import { stateChecks } from './checks/state.mjs';
import { mobileChecks } from './checks/mobile.mjs';
import { a11yChecks } from './checks/a11y.mjs';

const ALL_CHECKS = [...acceptanceChecks, ...stateChecks, ...mobileChecks, ...a11yChecks];

const USAGE = `
Langkah verification harness

  node verify.mjs --base-url <url> --out <dir> [options]

Required
  --base-url <url>    where the built app is being served, e.g. http://127.0.0.1:4173
  --out <dir>         directory for report.json and screenshots (created if missing)

Options
  --only <prefix>     run only checks whose id starts with this, e.g. --only C or --only A3
                      repeatable, or comma-separated: --only A2,A3,D6
  --quiet             skip screenshots (faster iteration)
  --timeout <ms>      per-action timeout, default 10000
  --list              print the check list and exit
  --help              this text

Check groups
  A   the ten acceptance criteria
  B   state and edge behaviour
  C   mobile at 375x812
  D   accessibility, motion and contrast
`;

function parseArgs(argv) {
  const args = { only: [], quiet: false, timeout: 10000 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[(i += 1)];
    switch (arg) {
      case '--base-url':
        args.baseUrl = next();
        break;
      case '--out':
        args.out = next();
        break;
      case '--only':
        args.only.push(
          ...String(next())
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
        );
        break;
      case '--quiet':
        args.quiet = true;
        break;
      case '--timeout':
        args.timeout = Number(next());
        break;
      case '--list':
        args.list = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default: {
        if (arg.startsWith('--') && arg.includes('=')) {
          const index = arg.indexOf('=');
          argv.splice(i, 1, arg.slice(0, index), arg.slice(index + 1));
          i -= 1;
          break;
        }
        throw new Error(`unknown option ${arg}`);
      }
    }
  }
  return args;
}

const ESC = String.fromCharCode(27);
const wrap = (code) => (text) => `${ESC}[${code}m${text}${ESC}[0m`;
const colour = process.stdout.isTTY
  ? { green: wrap(32), red: wrap(31), dim: wrap(2), bold: wrap(1) }
  : { green: (s) => s, red: (s) => s, dim: (s) => s, bold: (s) => s };

function pad(text, width) {
  const value = String(text);
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

function printTable(results) {
  const idWidth = Math.max(5, ...results.map((result) => result.id.length + 1));
  const line = `${'-'.repeat(idWidth)}  ------  ------  ${'-'.repeat(60)}`;
  console.log('');
  console.log(colour.bold(`${pad('ID', idWidth)}  ${pad('RESULT', 6)}  ${pad('TIME', 6)}  CHECK`));
  console.log(colour.dim(line));
  for (const result of results) {
    const status = result.status === 'PASS' ? colour.green('PASS  ') : colour.red('FAIL  ');
    const time = `${(result.durationMs / 1000).toFixed(1)}s`;
    console.log(`${pad(result.id, idWidth)}  ${status}  ${pad(time, 6)}  ${result.title}`);
  }
  console.log(colour.dim(line));
}

function printFailures(results) {
  const failed = results.filter((result) => result.status === 'FAIL');
  if (!failed.length) return;
  console.log('');
  console.log(colour.bold('Failures'));
  for (const result of failed) {
    console.log('');
    console.log(colour.red(`${result.id}  ${result.title}`));
    result.failures.forEach((failure, index) => {
      console.log(`  ${index + 1}. ${failure.message}`);
      if (failure.route) console.log(`     route:    ${failure.route}`);
      if (failure.selector) console.log(`     selector: ${failure.selector}`);
      if (failure.observed) console.log(`     observed: ${failure.observed}`);
      if (failure.expected) console.log(`     expected: ${failure.expected}`);
      if (failure.hint) console.log(`     hint:     ${failure.hint}`);
    });
  }
}

function printNotes(results) {
  const withNotes = results.filter((result) => result.notes.length);
  if (!withNotes.length) return;
  console.log('');
  console.log(colour.bold('Notes'));
  for (const result of withNotes) {
    console.log(colour.dim(`  ${result.id}`));
    for (const note of result.notes) console.log(colour.dim(`    ${note}`));
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`verify: ${error.message}`);
    console.error(USAGE);
    return 2;
  }

  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  if (args.list) {
    for (const check of ALL_CHECKS) console.log(`${pad(check.id, 5)} ${check.title}`);
    return 0;
  }

  if (!args.baseUrl || !args.out) {
    console.error('verify: --base-url and --out are both required');
    console.error(USAGE);
    return 2;
  }

  const outDir = path.resolve(args.out);
  await mkdir(outDir, { recursive: true });

  const selected = args.only.length
    ? ALL_CHECKS.filter((check) =>
        args.only.some((prefix) => check.id.toUpperCase().startsWith(prefix.toUpperCase())),
      )
    : ALL_CHECKS;

  if (!selected.length) {
    console.error(`verify: --only ${args.only.join(',')} matched no checks. Try --list.`);
    return 2;
  }

  console.log(colour.bold('Langkah verification harness'));
  console.log(`  base url : ${args.baseUrl}`);
  console.log(`  output   : ${outDir}`);
  console.log(
    `  checks   : ${selected.length} of ${ALL_CHECKS.length}${args.only.length ? ` (--only ${args.only.join(',')})` : ''}`,
  );
  if (args.quiet) console.log('  quiet    : screenshots disabled');
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const startedAt = new Date();
  let results = [];
  try {
    const ctx = new Ctx({
      browser,
      baseUrl: args.baseUrl,
      outDir,
      quiet: args.quiet,
      log: {
        line: (result) => {
          const status = result.status === 'PASS' ? colour.green('PASS') : colour.red('FAIL');
          console.log(`  ${status}  ${pad(result.id, 4)} ${result.title}`);
          if (result.status === 'FAIL') {
            for (const failure of result.failures.slice(0, 3)) {
              console.log(colour.dim(`          ${failure.message}`));
            }
            if (result.failures.length > 3) {
              console.log(colour.dim(`          (+${result.failures.length - 3} more)`));
            }
          }
        },
      },
    });
    ctx.defaultTimeout = args.timeout;
    results = await runChecks(selected, ctx);
    await ctx.closeAll();
  } finally {
    await browser.close();
  }

  const finishedAt = new Date();
  const passed = results.filter((result) => result.status === 'PASS').length;
  const failed = results.length - passed;

  printTable(results);
  printNotes(results);
  printFailures(results);

  console.log('');
  console.log(
    failed === 0
      ? colour.green(colour.bold(`All ${passed} checks passed.`))
      : colour.red(colour.bold(`${failed} of ${results.length} checks failed.`)),
  );

  const report = {
    tool: 'langkah-verify',
    baseUrl: args.baseUrl,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt - startedAt,
    only: args.only,
    quiet: args.quiet,
    summary: {
      total: results.length,
      passed,
      failed,
      failedIds: results.filter((result) => result.status === 'FAIL').map((result) => result.id),
    },
    checks: results,
  };
  const reportFile = await writeReport(outDir, report);
  console.log(colour.dim(`Report: ${reportFile}`));

  return failed === 0 ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error('verify: the harness could not run');
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 2;
  });
