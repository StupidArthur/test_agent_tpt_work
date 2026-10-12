import {playwright,cdpBaseFromEnv} from './session.mjs';

// 连接本轮 CDP 实例，返回登录页(welcome.html)与主界面(dsh-app://app/)两个 page。
export async function connectLogin(ctx){
  const base=cdpBaseFromEnv(ctx.environment);
  const browser=await playwright().chromium.connectOverCDP(base);
  const pages=browser.contexts().flatMap(c=>c.pages());
  const loginTargets=pages.filter(p=>/^file:\/\//i.test(p.url())&&/welcome\.html/i.test(p.url()));
  const mainTargets=pages.filter(p=>p.url().startsWith('dsh-app://app/'));
  if(loginTargets.length>1||mainTargets.length>1){await browser.close();throw Error('Ambiguous login/main target');}
  const login=pages.find(p=>/^file:\/\//i.test(p.url())&&/welcome\.html/i.test(p.url()))||null;
  const main=pages.find(p=>p.url().startsWith('dsh-app://app/'))||null;
  if(ctx.expectedSession&&main){const actual=await main.locator('[data-conversation-session]').getAttribute('data-conversation-session');if(actual!==ctx.expectedSession){await browser.close();throw Error('Session identity mismatch');}}
  return {browser,base,pages,login,main,close:()=>browser.close()};
}
