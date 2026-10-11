export function parseBoolean(value){if(value==='true'||value===true)return true;if(value==='false'||value===false)return false;throw Error('Invalid boolean state: '+String(value));}
export async function exactCard(frame, selector, titleSelector, title){
 if(typeof title!=='string'||!title.trim())throw Error('Exact displayName required');
 const cards=frame.locator(selector).filter({has:frame.locator(titleSelector).filter({hasText:new RegExp('^'+title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')})});
 const n=await cards.count();if(n!==1)throw Error(`Expected one exact card ${title}; found ${n}`);return cards.first();
}
export async function readComposerRequest(page,selector){
 const c=page.locator(selector).first(),text=await c.innerText();
 const session=await page.locator('[data-conversation-session]').first().getAttribute('data-conversation-session');
 return {text:text.trim(),session};
}
