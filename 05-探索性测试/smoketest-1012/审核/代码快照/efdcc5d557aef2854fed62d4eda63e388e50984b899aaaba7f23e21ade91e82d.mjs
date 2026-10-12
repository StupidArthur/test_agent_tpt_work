import {withPage, SEL} from '../../automation/conversation.mjs';
import * as native from '../native-window/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

// No implicit new conversation, model call, cancellation, retry, or asset deletion.
function controls(scope, spec) {
  return scope.getByRole(spec.role || 'button', {name:spec.name, exact:true});
}
async function unique(locator) {
  if(await locator.count() !== 1 || !await locator.isVisible()) throw Error('Visible control missing or ambiguous');
  return locator;
}
async function click(ctx, scope, spec, intent) {
  const target=await unique(controls(scope,spec));
  return ctx.recorder.action('project', intent, spec, ()=>target.click({timeout:5000,noWaitAfter:true}));
}
async function surface(ctx,page) {
  const e=await ctx.recorder.read('project surface','current page',{channel:'DOM',scope:'visible project controls and dialogs'},async()=>{
    const value=await page.evaluate(()=>{
      const vis=e=>!!e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
      const attrs=e=>({text:e.innerText||'',label:e.getAttribute('aria-label'),title:e.getAttribute('title'),html:e.outerHTML});
      return {url:location.href,session:document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session')||null,
        controls:[...document.querySelectorAll('button,[role="menuitem"]')].filter(vis).map(e=>({...attrs(e),role:e.getAttribute('role')||'button'})),
        dialogs:[...document.querySelectorAll('[role="dialog"]')].filter(vis).map(e=>({...attrs(e),inputs:[...e.querySelectorAll('input')].filter(x=>vis(x)&&x.type!=='password').map(x=>({label:x.getAttribute('aria-label'),placeholder:x.placeholder,value:x.value}))})),
        selectedProjects:[...document.querySelectorAll('button[class*="_workspace"][aria-haspopup="menu"]')].filter(vis).map(attrs)};
    });return {value,raw:value};
  });return {...e.value,evidence_ref:e.event_id};
}
export const readProjectSurface=(ctx)=>withPage(ctx,page=>surface(ctx,page));
async function until(fn,predicate,timeoutMs) {
  const deadline=Date.now()+timeoutMs;
  do {const value=await fn();if(predicate(value))return value;await new Promise(r=>setTimeout(r,150));}while(Date.now()<deadline);
  throw Error('Project observation timeout; inspect preserved events before retrying');
}
function validateArgs(args) {
  if(!Number.isSafeInteger(args.processId)||args.processId<=0)throw Error('Positive processId required');
  if(!args.expectedProcessStartTimeUtc||!args.expectedPageUrl||!args.expectedSession)throw Error('Current process, page and conversation identity required');
  if(!args.folderPath || !path.win32.isAbsolute(args.folderPath) || !/^(?:[A-Za-z]:[\\/]|\\\\[^\\]+\\[^\\]+[\\/])/.test(args.folderPath)||/[\r\n\0]/.test(args.folderPath))throw Error('Fully qualified Windows folderPath required');
  if(!fs.statSync(args.folderPath).isDirectory())throw Error('Existing directory required');
  if(!args.expectedProjectLabel?.trim())throw Error('Expected project label required');
  if(args.timeoutMs!==undefined&&(!Number.isInteger(args.timeoutMs)||args.timeoutMs<100||args.timeoutMs>60000))throw Error('timeoutMs must be 100..60000');
}
async function chooseFolder(ctx,page,args,trigger,refs) {
  const before=await native.readState(ctx,{processId:args.processId});refs.push(before.evidence_ref);
  if(before.identity.processStartTimeUtc!==args.expectedProcessStartTimeUtc)throw Error('Process identity changed');
  if(before.windows.some(w=>w.className==='#32770'))throw Error('Pre-existing native selector; untouched');
  refs.push((await trigger()).event_id);
  const state=await until(()=>native.readState(ctx,{processId:args.processId}),s=>s.windows.some(w=>w.className==='#32770'&&w.visible),args.timeoutMs||10000);
  refs.push(state.evidence_ref);
  const windows=state.windows.filter(w=>w.className==='#32770'&&w.visible);
  if(windows.length!==1)throw Error('Unique native selector required');
  const d=await native.describe(ctx,{processId:args.processId,dialogHwnd:windows[0].hwnd});refs.push(d.evidence_ref);
  if(!d.knownSelectorStructure||d.identity.processStartTimeUtc!==args.expectedProcessStartTimeUtc)throw Error('Unknown selector or changed process; no native action');
  const binding={processId:args.processId,dialogHwnd:d.window.hwnd,expectedTitle:d.window.name,expectedProcessStartTimeUtc:args.expectedProcessStartTimeUtc};
  const set=await native.act(ctx,{...binding,action:'setPath',pathValue:args.folderPath});refs.push(set.action_ref,set.evidence_ref);
  const edit=set.after.controls.find(c=>c.className==='Edit'&&c.automationId===d.pathAutomationId);
  if(edit?.value!==args.folderPath)throw Error('Actual selector path differs; selector left for reviewed recovery');
  const confirmed=await native.act(ctx,{...binding,action:'confirm'});refs.push(confirmed.action_ref,confirmed.evidence_ref);
  if(!confirmed.dialogGone)throw Error('Selector did not close');
  if(page.url()!==args.expectedPageUrl)throw Error('Page changed during folder selection');
  return binding;
}
async function workflow(ctx,args,create) {
  validateArgs(args);
  return withPage(ctx,async page=>{
    if(page.url()!==args.expectedPageUrl)throw Error('Page identity mismatch');
    const actual=await page.locator('[data-conversation-session]').getAttribute('data-conversation-session');
    if(actual!==args.expectedSession)throw Error('Conversation identity mismatch');
    const initial=await surface(ctx,page),refs=[initial.evidence_ref];
    if(initial.dialogs.length)throw Error('Pre-existing user dialog; untouched');
    if(initial.controls.some(c=>c.role==='menuitem'))throw Error('Pre-existing menu; untouched');
    if(create) {
      // Existing duplicates must be ruled out by the caller's registered project-menu observation.
      if(!args.projectAbsenceEvidenceRef)throw Error('Registered project absence evidence reference required');
      refs.push((await click(ctx,page,args.entry,'open new project form')).event_id);
      const dialog=page.locator('[role="dialog"]:visible');await dialog.waitFor({state:'visible',timeout:args.timeoutMs||10000});
      if(await dialog.count()!==1)throw Error('Unique new-project form required');
      const input=await unique(dialog.getByRole('textbox',{name:args.nameFieldLabel,exact:true}));
      refs.push((await ctx.recorder.action('project name','fill',{name:args.projectName,label:args.nameFieldLabel},()=>input.fill(args.projectName))).event_id);
      await chooseFolder(ctx,page,args,()=>click(ctx,dialog,args.folderControl,'choose project source folder'),refs);
      const filled=await until(()=>surface(ctx,page),s=>s.dialogs.length===1&&(s.dialogs[0].text.includes(args.folderPath)||s.dialogs[0].inputs.some(i=>i.value===args.folderPath)),args.timeoutMs||10000);refs.push(filled.evidence_ref);
      const name=await ctx.recorder.read('project name','new project form',{channel:'DOM',scope:'bound labelled textbox'},async()=>({value:await input.inputValue()}));refs.push(name.event_id);
      if(name.value!==args.projectName)throw Error('Project name readback mismatch');
      refs.push((await click(ctx,dialog,args.submitControl,'create project once')).event_id);
      await dialog.waitFor({state:'hidden',timeout:args.timeoutMs||10000});
    }else {
      refs.push((await click(ctx,page,{role:'button',name:args.projectControlName},'open conversation project menu')).event_id);
      const menu=page.locator('[role="menu"]:visible');await menu.waitFor({state:'visible',timeout:args.timeoutMs||10000});
      if(await menu.count()!==1)throw Error('Unique project menu required');
      await chooseFolder(ctx,page,args,()=>click(ctx,menu,args.entry,'open local project for first use'),refs);
    }
    const final=await until(()=>surface(ctx,page),s=>s.dialogs.length===0&&(create?s.controls.some(c=>c.role==='button'&&[c.text,c.label,c.title].includes(args.expectedProjectLabel)):s.selectedProjects.length===1&&[s.selectedProjects[0].text,s.selectedProjects[0].label,s.selectedProjects[0].title].includes(args.expectedProjectLabel)),args.timeoutMs||10000);
    refs.push(final.evidence_ref);
    if(final.session!==args.expectedSession)throw Error('Conversation changed; inspect created asset before retry');
    return {initial,final,evidence_refs:refs,projectAbsenceEvidenceRef:args.projectAbsenceEvidenceRef||null,
      observedProjectLabel:args.expectedProjectLabel,stage:create?'projectVisibleAfterSubmit':'conversationProjectSelected',
      persistenceVerified:false,businessVerified:false,cleanup:'Caller reviews recorded state; no automatic cancel, deletion or retry'};
  });
}
export const openProject=(ctx,args)=>workflow(ctx,args,false);
export const createProject=(ctx,args)=>workflow(ctx,args,true);
