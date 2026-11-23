// GuestGallery - automated database test (DESIGN.md section 11, level 2).
// Run from the repo root: npm run test:db
//
// Starts an empty, in-memory Postgres (PGlite = Postgres compiled to WASM; no Docker,
// no network, never the hosted Supabase project), then runs, in order:
//   1. supabase/tests/supabase_shim.sql   - stand-in for Supabase's auth/storage/roles
//   2. supabase/migrations/*.sql          - the real migrations, sorted by file name
//   3. supabase/tests/rls_checks*.sql     - the RLS / RPC checks, EVERY file, sorted by name
//                                           (the same files the user can paste into the
//                                           Supabase SQL editor)
// It prints one line per check and exits with code 1 if any check fails or a
// script stops with an error.

import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const supabaseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(supabaseDir, ...parts), 'utf8');
const sqlFiles = (dir, pattern) =>
  readdirSync(join(supabaseDir, dir))
    .filter((f) => pattern.test(f))
    .sort();

const migrations = sqlFiles('migrations', /\.sql$/);
const checkFiles = sqlFiles('tests', /^rls_checks.*\.sql$/);
if (checkFiles.length === 0) {
  console.error('No supabase/tests/rls_checks*.sql files found.');
  process.exit(1);
}

const setupSteps = [
  { name: 'tests/supabase_shim.sql', sql: read('tests', 'supabase_shim.sql') },
  ...migrations.map((f) => ({ name: `migrations/${f}`, sql: read('migrations', f) })),
];

async function main() {
  const db = await PGlite.create();
  let total = 0;
  let failedCount = 0;
  try {
    for (const step of setupSteps) {
      try {
        await db.exec(step.sql);
      } catch (err) {
        console.error(`\nFAILED while running ${step.name}:\n  ${err.message}`);
        if (err.where) console.error(`  where: ${err.where}`);
        return 1;
      }
      console.log(`ok   ${step.name}`);
    }

    for (const file of checkFiles) {
      const name = `tests/${file}`;
      let results;
      try {
        results = await db.exec(read('tests', file));
      } catch (err) {
        console.error(`\nFAILED while running ${name}:\n  ${err.message}`);
        if (err.where) console.error(`  where: ${err.where}`);
        return 1;
      }
      console.log(`ok   ${name}`);

      // the last statement of each check file selects the result table
      const rows = results.at(-1)?.rows ?? [];
      if (rows.length === 0) {
        console.error(`\n${file} returned no checks.`);
        return 1;
      }
      console.log(`\n${file}`);
      for (const r of rows) {
        const mark = r.pass === true ? 'PASS' : 'FAIL';
        console.log(`${mark} ${String(r.n).padStart(3)}  ${r.check_name}`);
        if (r.pass !== true) {
          console.log(`           expected: ${r.expected}\n           got:      ${r.got}`);
          failedCount += 1;
        }
      }
      total += rows.length;
      console.log('');
    }
  } finally {
    await db.close();
  }

  console.log(`${total - failedCount}/${total} database checks passed (${checkFiles.length} check files).`);
  return failedCount === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
