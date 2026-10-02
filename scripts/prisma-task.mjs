import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

for (const file of ['.env', '.env.local']) {
  if (!existsSync(file)) continue;
  process.loadEnvFile(file);
}

process.env.SQLITE_DATABASE_URL ||= 'file:./dev.db';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function generateClients() {
  run('npx', ['prisma', 'generate', '--schema=prisma/schema.prisma']);
  run('npx', ['prisma', 'generate', '--schema=prisma/schema.sqlite.prisma']);
}

const [task, ...args] = process.argv.slice(2);

switch (task) {
  case 'dev':
    generateClients();
    run('npx', ['next', 'dev']);
    break;
  case 'build':
    generateClients();
    run('npx', ['next', 'build']);
    break;
  case 'generate':
    generateClients();
    break;
  case 'setup':
    generateClients();
    run('npx', ['prisma', 'db', 'push', '--schema=prisma/schema.sqlite.prisma']);
    if (args.includes('--seed')) run('node', ['scripts/seed-prisma.mjs']);
    break;
  case 'push:sqlite':
    run('npx', ['prisma', 'db', 'push', '--schema=prisma/schema.sqlite.prisma']);
    break;
  case 'push:postgres':
    run('npx', ['prisma', 'db', 'push', '--schema=prisma/schema.prisma']);
    break;
  case 'migrate':
    generateClients();
    run('npx', ['prisma', 'db', 'push', '--schema=prisma/schema.sqlite.prisma']);
    run('node', ['scripts/migrate-postgres-to-sqlite.mjs']);
    break;
  default:
    console.error('Choose dev, build, generate, setup, push:sqlite, push:postgres, or migrate.');
    process.exit(1);
}