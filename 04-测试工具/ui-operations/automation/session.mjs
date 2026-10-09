import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export function playwright(){
 if(process.env.TPT_PLAYWRIGHT_PATH)return require(process.env.TPT_PLAYWRIGHT_PATH);
 for(const name of ['playwright-core','playwright'])try{return require(name);}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}
 throw Error('Install playwright-core in 04-测试工具/ui-operations or set TPT_PLAYWRIGHT_PATH');
}

export function cdpBaseFromEnv(env) {
  const ep = env?.cdp_endpoint || process.env.TPT_CDP_URL || (process.env.TPT_CDP_PORT?`http://127.0.0.1:${process.env.TPT_CDP_PORT}`:null);
  if(!ep)throw Error('cdp_endpoint required; do not assume a historical port');
  return ep.replace(/\/$/, '');
}

// 连接本轮实例并返回主界面 page（dsh-app://app/）。
export async function connect(ctx) {
  if(ctx.connection){if(ctx.expectedSession){const actual=await ctx.connection.page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session');if(actual!==ctx.expectedSession)throw Error(`Session mismatch: expected ${ctx.expectedSession}, actual ${actual}`);}return {...ctx.connection,close:async()=>{}};}
  const base = cdpBaseFromEnv(ctx.environment);
  const browser = await playwright().chromium.connectOverCDP(base);
  const pages = browser.contexts().flatMap((c) => c.pages());
  const targets = pages.filter((p) => p.url().startsWith('dsh-app://app/'));
  const page = targets[0];
  if (targets.length !== 1) {
    await browser.close();
    throw new Error(`未找到 TPT Work 主界面 target；实际 targets=${JSON.stringify(pages.map((p) => p.url()))}`);
  }
  page.setDefaultTimeout(ctx.environment.ui_timeout_ms||5000);
  if(ctx.expectedSession){const actual=await page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session');if(actual!==ctx.expectedSession){await browser.close();throw Error(`Session mismatch: expected ${ctx.expectedSession}, actual ${actual}`);}}
  const connection={browser,page,base,close:()=>browser.close()};
  if(ctx.managed){ctx.connection=connection;return {...connection,close:async()=>{}};}
  return connection;
}

export function visible(locator) {
  return locator.first();
}
