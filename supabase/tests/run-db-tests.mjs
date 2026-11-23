// GuestGallery - automated database test (DESIGN.md section 11, level 2).
// Run from the repo root: npm run test:db
//
// Starts an empty, in-memory Postgres (PGlite = Postgres compiled to WASM; no Docker,
// no network, never the hosted Supabase project), then runs, in order:
//   1. supabase/tests/supabase_shim.sql   - stand-in for Supabase's auth/storage/roles
//   2. supabase/migrations/*.sql          - the real migrations, sorted by file name
//   3. supabase/tests/rls_checks.sql      - the RLS / RPC checks (same file the user
//                                           can paste into the Supabase SQL editor)
// It prints one line per check and exits with code 1 if any check fails or a
// script stops with an error.

import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const supabaseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(supabaseDir, ...parts), 'utf8');

const migrationsDir = join(supabaseDir, 'migrations');
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const steps = [
  { name: 'tests/supabase_shim.sql', sql: read('tests', 'supabase_shim.sql') },
  ...migrations.map((f) => ({ name: `migrations/${f}`, sql: read('migrations', f) })),
  { name: 'tests/rls_checks.sql', sql: read('tests', 'rls_checks.sql') },
];

async function main() {
  const db = await PGlite.create();
  let lastResults = [];
  try {
    for (const step of steps) {
      try {
        lastResults = await db.exec(step.sql);
      } catch (err) {
        console.error(`\nFAILED while running ${step.name}:\n  ${err.message}`);
        if (err.where) console.error(`  where: ${err.where}`);
        return 1;
      }
      console.log(`ok   ${step.name}`);
    }
  } finally {
    await db.close();
  }

  // the last statement of rls_checks.sql selects the result table
  const rows = lastResults.at(-1)?.rows ?? [];
  if (rows.length === 0) {
    console.error('\nrls_checks.sql returned no checks.');
    return 1;
  }

  console.log('');
  const failed = rows.filter((r) => r.pass !== true);
  for (const r of rows) {
    const mark = r.pass === true ? 'PASS' : 'FAIL';
    console.log(`${mark} ${String(r.n).padStart(3)}  ${r.check_name}`);
    if (r.pass !== true) console.log(`           expected: ${r.expected}\n           got:      ${r.got}`);
  }
  console.log(`\n${rows.length - failed.length}/${rows.length} database checks passed.`);
  return failed.length === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
