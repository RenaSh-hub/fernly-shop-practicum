import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenario = process.argv[2];

if (!scenario || !['smoke', 'load'].includes(scenario)) {
  console.error('Usage: node scripts/perf-run.mjs <smoke|load> [extra k6 args...]');
  process.exit(1);
}

mkdirSync(path.join(root, 'reports', 'k6'), { recursive: true });

const script = path.join(root, 'tests', 'performance', 'catalog.js');
const k6Args = ['run', `--env`, `SCENARIO=${scenario}`, script, ...process.argv.slice(3)];
const result = spawnSync('k6', k6Args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);