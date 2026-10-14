import {playwright,cdpBaseFromEnv} from '../../../../04-测试工具/ui-driver/automation/session.mjs';

// 连接本轮 CDP 实例，返回登录页(welcome.html)与主界面(dsh-app://app/)两个 page。
export async function connectLogin(ctx){
  const base=cdpBaseFromEnv(ctx.environment);
  const browser=await playwright().chromium.connectOverCDP(base);
  const pages=browser.contexts().flatMap(c=>c.pages());
  const login=pages.find(p=>/^file:\/\//i.test(p.url())&&/welcome\.html/i.test(p.url()))||null;
  const main=pages.find(p=>p.url().startsWith('dsh-app://app/'))||null;
  return {browser,base,pages,login,main,close:()=>browser.close()};
}
