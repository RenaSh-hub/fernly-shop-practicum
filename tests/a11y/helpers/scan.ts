import { AxeBuilder } from '@axe-core/playwright';
import type { Page, TestInfo } from '@playwright/test';
import type { AxeResults, Result } from 'axe-core';
import {
  classifyAxeViolations,
  filterBlocking,
  getBaseline,
  type ClassifiedViolationNode,
} from '../baseline.js';

export type ScanPageOptions = {
  name: string;
};

export interface AxeResultsAttachment {
  page: string;
  url: string;
  scannedAt: string;
  violations: Result[];
  passes: AxeResults['passes'];
  incomplete: AxeResults['incomplete'];
}

export interface ScanPageResult {
  classified: ClassifiedViolationNode[];
  blocking: ClassifiedViolationNode[];
}

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

function pickScreenshotNodes(rule: Result): Result['nodes'] {
  return rule.nodes.slice(0, 3);
}

async function screenshotViolationNodes(
  page: Page,
  testInfo: TestInfo,
  pageName: string,
  violations: Result[],
): Promise<void> {
  for (const rule of violations) {
    const nodes = pickScreenshotNodes(rule);
    let index = 0;
    for (const node of nodes) {
      const selector = node.target.join(' >> ');
      try {
        const locator = page.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout: 5_000 });
        const buffer = await locator.screenshot({ type: 'png' });
        await testInfo.attach(`axe-shot:${pageName}:${rule.id}:${index}`, {
          body: buffer,
          contentType: 'image/png',
        });
      } catch {
        // Element may be off-screen or not locatable; still keep JSON attachment.
      }
      index += 1;
    }
  }
}

export async function scanPage(page: Page, testInfo: TestInfo, options: ScanPageOptions): Promise<ScanPageResult> {
  const pageName = options.name;
  const axe = new AxeBuilder({ page }).withTags([...AXE_TAGS]);
  const raw = await axe.analyze();

  const attachment: AxeResultsAttachment = {
    page: pageName,
    url: page.url(),
    scannedAt: new Date().toISOString(),
    violations: raw.violations,
    passes: raw.passes,
    incomplete: raw.incomplete,
  };

  await testInfo.attach('axe-results', {
    body: Buffer.from(JSON.stringify(attachment)),
    contentType: 'application/json',
  });

  await screenshotViolationNodes(page, testInfo, pageName, raw.violations);

  const baseline = getBaseline();
  const classified = classifyAxeViolations(pageName, raw.violations, baseline);
  const blocking = filterBlocking(classified);

  return { classified, blocking };
}
