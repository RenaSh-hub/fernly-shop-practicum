import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface FeatureExample {
  scenario: string;
  when: string;
  thens: string[];
  row: Record<string, string>;
}

function fillPlaceholders(text: string, row: Record<string, string>): string {
  return text.replace(/<([^>]+)>/g, (_, key: string) => row[key] ?? `<${key}>`);
}

function parsePipeTable(lines: string[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  let headers: string[] | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed
      .slice(1, trimmed.endsWith('|') ? -1 : undefined)
      .split('|')
      .map((cell) => cell.trim());
    if (!headers) {
      headers = cells;
      continue;
    }
    if (cells.every((cell) => /^-+$/.test(cell))) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

/** Turn helper.feature into expanded examples (Scenario + Outline rows). */
export function readFeature(featurePath?: string): FeatureExample[] {
  const file = featurePath ?? path.join(__dirname, 'helper.feature');
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/);

  const examples: FeatureExample[] = [];
  let scenario = '';
  let whenTemplate = '';
  let thenTemplates: string[] = [];
  let tableLines: string[] = [];
  let inExamples = false;

  function flushScenario() {
    if (!scenario || !whenTemplate) return;
    const rows = tableLines.length > 0 ? parsePipeTable(tableLines) : [{}];
    for (const row of rows) {
      examples.push({
        scenario,
        when: fillPlaceholders(whenTemplate, row),
        thens: thenTemplates.map((then) => fillPlaceholders(then, row)),
        row,
      });
    }
    whenTemplate = '';
    thenTemplates = [];
    tableLines = [];
    inExamples = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('@')) continue;
    if (trimmed.startsWith('Feature:')) continue;
    if (trimmed.startsWith('Background:')) continue;
    if (trimmed.startsWith('Given ') || trimmed.startsWith('And my cart')) continue;

    if (trimmed.startsWith('Scenario') || trimmed.startsWith('Scenario Outline:')) {
      flushScenario();
      scenario = trimmed.replace(/^Scenario( Outline)?:\s*/, '');
      continue;
    }

    if (trimmed.startsWith('Examples:')) {
      inExamples = true;
      tableLines = [];
      continue;
    }

    if (inExamples) {
      if (trimmed.startsWith('|')) {
        tableLines.push(line);
        continue;
      }
      inExamples = false;
    }

    if (trimmed.startsWith('When ')) {
      whenTemplate = trimmed.replace(/^When\s+/, '');
      continue;
    }
    if (trimmed.startsWith('Then ')) {
      thenTemplates.push(trimmed.replace(/^Then\s+/, ''));
      continue;
    }
    if (trimmed.startsWith('And ')) {
      thenTemplates.push(trimmed.replace(/^And\s+/, ''));
    }
  }
  flushScenario();
  return examples;
}