import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export interface ResultEntry {
  tier: 'a' | 'b' | 'c';
  scenario: string;
  example: string;
  then: string;
  result: 'pass' | 'fail' | 'judge' | 'skip';
  passRate?: number;
  evidence: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function writeEntries(tier: 'a' | 'b' | 'c', testTitle: string, entries: ResultEntry[]): void {
  const dir = path.join(repoRoot, 'helper-results', `tier-${tier}`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slugify(testTitle)}.json`);
  fs.writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
}