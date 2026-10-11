const fs=require('fs'),crypto=require('crypto');
const base='探索性测试/2026-10-05-需求用例全量探索/证据/SETTINGS-NIGHT-20261006';
const specs=[
 ['inventory.json','Settings category baseline inventory with UI labels and control states.'],
 ['theme-cycle.json','Theme option and panel style changed, then restored.'],
 ['permission-default-cycle.json','Default permission changed; empty round session confirmed the new-session label; restored.'],
 ['general-settings-cycles.json','General settings controls, option lists, change and restoration observations.'],
 ['preset-default-cycle.json','Default preset moved to PTC and back to Standard.'],
 ['feature-switch-cycles.json','Developer mode and experimental feature toggled and restored.'],
 ['memory-settings-ui-observation.json','Memory setting visible-click transient state and settled state.'],
 ['language-cycle.json','English UI selection observed and Chinese restored.'],
 ['restoration-verification.json','Final post-navigation values across settings categories.'],
 ['01.png','Partial initial settings capture; not used as a primary claim.']
];
const items=specs.map(([file,proves])=>{const path=base+'/'+file;if(!fs.existsSync(path))throw Error('missing '+path);return {path,sha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),proves};});
fs.writeFileSync(base+'/settings-evidence-hashes.json',JSON.stringify({captured_at:new Date().toISOString(),scope:'Supplemental settings evidence index; kept separate from 355-case index because these are independent setting inventory observations.',items},null,2),'utf8');console.log(JSON.stringify(items,null,2));
