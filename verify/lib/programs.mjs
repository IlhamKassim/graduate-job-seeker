/**
 * Best-effort read of the seed programme data.
 *
 * Three sources, in order of trust: data attributes the calendar rows expose,
 * then `data/programs.ts` parsed off disk, then nothing. A check that cannot get
 * the data says so and fails with an actionable message rather than guessing —
 * the harness never invents a programme window.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Candidate locations for the seed data, relative to verify/lib. */
const CANDIDATES = [
  path.resolve(here, '../../data/programs.ts'),
  path.resolve(here, '../../data/programmes.ts'),
  path.resolve(here, '../../data/seed.ts'),
];

/**
 * Turns a TypeScript data module into plain evaluable JavaScript: drop the
 * imports and the type-only declarations, drop the annotations on the exported
 * consts, and hand back every exported binding.
 */
function transpileDataModule(source) {
  let code = source
    .replace(/^\s*import\s[^;]*;\s*$/gm, '')
    .replace(/^\s*export\s+type\s[^;]*;\s*$/gm, '')
    .replace(/^\s*export\s+interface\s+\w+\s*\{[\s\S]*?\n\}\s*$/gm, '')
    .replace(/^\s*type\s+\w+[^;]*;\s*$/gm, '')
    .replace(/\bsatisfies\s+[A-Za-z_$][\w$<>[\],\s|'"]*/g, '')
    .replace(/\bas\s+const\b/g, '')
    .replace(/\bas\s+[A-Za-z_$][\w$<>[\],\s|'"]*(?=[,;)\]}])/g, '');

  const names = [];
  code = code.replace(
    /export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+?)?=/g,
    (_match, name) => {
      names.push(name);
      return `const ${name} =`;
    },
  );
  code = code.replace(/export\s+(function|class)\s+/g, '$1 ');
  code = code.replace(/export\s*\{[^}]*\}\s*;?/g, '');

  if (!names.length) return null;
  return `${code}\n;return { ${names.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : null`).join(', ')} };`;
}

function looksLikeProgram(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.opensMonth === 'number' &&
    typeof value.closesMonth === 'number'
  );
}

/** @returns {Promise<{ programs: object[]|null, source: string, error: string|null }>} */
export async function loadProgramsFromDisk() {
  for (const file of CANDIDATES) {
    let source;
    try {
      source = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    const code = transpileDataModule(source);
    if (!code) {
      return { programs: null, source: file, error: 'no exported const found after transpiling' };
    }
    try {
      // eslint-disable-next-line no-new-func
      const exported = new Function(code)();
      for (const value of Object.values(exported)) {
        if (Array.isArray(value) && value.length && value.every(looksLikeProgram)) {
          return { programs: value, source: file, error: null };
        }
      }
      return { programs: null, source: file, error: 'no exported array of Program-shaped objects' };
    } catch (error) {
      return { programs: null, source: file, error: `could not evaluate: ${error.message}` };
    }
  }
  return { programs: null, source: CANDIDATES[0], error: 'file does not exist yet' };
}

/** Programmes whose application window runs across the year boundary. */
export function wrappingPrograms(programs) {
  return programs.filter((program) => program.opensMonth > program.closesMonth);
}

/** Degree fields no seeded programme names — a guaranteed eligibility-gate failure. */
export function uncoveredFields(programs, allFields) {
  const covered = new Set();
  for (const program of programs) {
    for (const field of program.degreeFields || []) covered.add(field);
  }
  return allFields.filter((field) => !covered.has(field));
}
