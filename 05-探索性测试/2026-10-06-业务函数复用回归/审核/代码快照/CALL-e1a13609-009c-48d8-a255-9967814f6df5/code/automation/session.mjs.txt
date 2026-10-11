// 软件操作支撑层：CDP 连接与实例身份。
// 本机 Playwright 实际安装位置：F:/tpt-work-test/ui-by-agent/node_modules/playwright（1.63.0）。
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const PW_PATH = process.env.TPT_PLAYWRIGHT_PATH || 'F:/tpt-work-test/ui-by-agent/node_modules/playwright';
const { chromium } = require(PW_PATH);

export function cdpBaseFromEnv(env) {
  const ep = env?.cdp_endpoint || process.env.TPT_CDP_URL || 'http://127.0.0.1:9234';
  return ep.replace(/\/$/, '');
}

// 连接本轮实例并返回主界面 page（dsh-app://app/）。
export async function connect(ctx) {
  const base = cdpBaseFromEnv(ctx.environment);
  const browser = await chromium.connectOverCDP(base);
  const pages = browser.contexts().flatMap((c) => c.pages());
  const page = pages.find((p) => p.url().startsWith('dsh-app://'));
  if (!page) {
    await browser.close();
    throw new Error(`未找到 TPT Work 主界面 target；实际 targets=${JSON.stringify(pages.map((p) => p.url()))}`);
  }
  return { browser, page, base, close: () => browser.close() };
}

export function visible(locator) {
  return locator.first();
}
