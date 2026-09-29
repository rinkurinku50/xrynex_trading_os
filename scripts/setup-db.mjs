// Creates the Prisma schema in Postgres and optionally loads sample rows.
//   node scripts/setup-db.mjs           → sync schema only
//   node scripts/setup-db.mjs --seed    → sync schema + sample data
import { execSync } from 'node:child_process';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const run = (command) => execSync(command, { stdio: 'inherit', shell: true });

run('npx prisma db push');
console.log('Prisma schema synced.');

if (process.argv.includes('--seed')) {
  run('node scripts/seed-prisma.mjs');
  console.log('Sample data loaded.');
}
