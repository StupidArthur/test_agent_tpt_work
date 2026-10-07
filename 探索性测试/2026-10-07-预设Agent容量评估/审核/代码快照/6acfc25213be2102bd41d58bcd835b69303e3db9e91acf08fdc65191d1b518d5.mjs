import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const target='C:/Users/Administrator/AppData/Local/Programs/tpt-work/resources/app.asar';
const fd=fs.openSync(target,'r'),h=Buffer.alloc(16);fs.readSync(fd,h,0,16,0);
const b=Buffer.alloc(h.readUInt32LE(12));fs.readSync(fd,b,0,b.length,16);const header=JSON.parse(b.toString());
const matches=[];function walk(d,base=''){for(const [k,v] of Object.entries(d.files||{})){const p=base+k;if(v.files)walk(v,p+'/');else if(/llm-tpt\/lib\/index.js|bundle\/presets\/standard\//.test(p))matches.push({path:p,...v});}}
walk(header);console.log(JSON.stringify(matches.map(x=>({path:x.path,size:x.size,unpacked:x.unpacked})),null,2));
const dir=path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))),'适配器快照');fs.mkdirSync(dir,{recursive:true});
for(const m of matches){if(m.unpacked){fs.copyFileSync(target+'.unpacked/'+m.path,path.join(dir,path.basename(m.path)));}else{const data=Buffer.alloc(m.size);fs.readSync(fd,data,0,data.length,8+h.readUInt32LE(4)+Number(m.offset));fs.writeFileSync(path.join(dir,path.basename(m.path)),data);}}
fs.closeSync(fd);
