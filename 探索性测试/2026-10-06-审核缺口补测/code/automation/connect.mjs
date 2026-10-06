// Shared CDP connection + frame discovery for TPT Work (this task's runtime support).
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));

export async function connect(port = Number(process.env.TPT_CDP_PORT ?? 9234)) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  return browser;
}

export function allPages(browser) {
  return browser.contexts().flatMap((context) => context.pages());
}

export function findMainPage(browser) {
  const pages = allPages(browser);
  return pages.find((p) => p.url().startsWith('dsh-app://')) ?? pages.find((p) => p.url().includes('renderer/')) ?? null;
}

export async function frameInfos(page) {
  return page.frames().map((f) => ({ name: f.name(), url: f.url() }));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
