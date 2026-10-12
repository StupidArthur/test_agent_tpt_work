import path from 'node:path';
import fs from 'node:fs';

// Explicit base selection preserves cwd compatibility without silent fallbacks.
export function resolveArgsFile(argsFile,{taskRoot,base='cwd',cwd=process.cwd()}={}) {
 if(!['cwd','task'].includes(base))throw Error('--args-base must be cwd or task');
 if(typeof argsFile!=='string'||!argsFile.trim())throw Error('--args-file requires a path');
 if(base==='task'&&!taskRoot)throw Error('--args-base task requires --task');
 if(process.platform==='win32'&&base==='task'&&(/^[A-Za-z]:(?![\\/])/.test(argsFile)||/^[\\/](?![\\/])/.test(argsFile)))throw Error('Task args path must be fully qualified or relative without a drive/root prefix');
 const baseDirectory=base==='task'?path.resolve(cwd,taskRoot):path.resolve(cwd);
 return {base,baseDirectory,resolvedPath:path.resolve(baseDirectory,argsFile)};
}
export function readArgsFile(argsFile,options={}) {
 const resolved=resolveArgsFile(argsFile,options);
 try{return {value:JSON.parse(fs.readFileSync(resolved.resolvedPath,'utf8').replace(/^\uFEFF/,'')),source:resolved};}
 catch(error){throw new Error(`Arguments file failed (base=${resolved.base}, path=${resolved.resolvedPath}): ${error.message}`,{cause:error});}
}
