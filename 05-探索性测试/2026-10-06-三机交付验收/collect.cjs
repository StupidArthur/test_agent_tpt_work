const fs=require('fs'),path=require('path'),crypto=require('crypto');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const targets=[['PC-G','7aff430','C:/Users/Administrator/AppData/Local/Temp/tpt-review-pcg-20261006/探索性测试/2026-10-06-业务函数复用回归'],['本机','working-tree','D:/code/electron-ui/探索性测试/2026-10-06-审核缺口补测'],['PC-88','490e6ee','C:/Users/Administrator/AppData/Local/Temp/tpt-review-pc88-20261006/探索性测试/2026-10-06-冒烟测试/运行/pc88-20261006-smoke01']];
function walk(p){return fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);}
const all=[];
for(const [machine,commit,root] of targets){
 const files=walk(root),records=[];
 for(const file of files.filter(f=>f.includes(path.sep+'结果'+path.sep)&&!f.includes(path.sep+'历史'+path.sep)&&f.endsWith('.json'))){
  const r=JSON.parse(fs.readFileSync(file,'utf8'));
  const checks=(r.evidence||[]).map(e=>{const p=path.resolve(root,e.path);return {path:e.path,exists:fs.existsSync(p),hash_matches:fs.existsSync(p)&&hash(p).toLowerCase()===e.sha256?.toLowerCase()};});
  records.push({file:path.relative(root,file),sha256:hash(file),record:r,evidence_checks:checks});
 }
 const counts={};for(const {record:r} of records)counts[r.status||'未声明status']=(counts[r.status||'未声明status']||0)+1;
 all.push({machine,commit,root,counts,records,file_count:files.length});
 fs.writeFileSync(path.join(__dirname,machine+'-审查包.json'),JSON.stringify(all.at(-1),null,2));
 console.log(JSON.stringify({machine,counts,records:records.length,evidence_errors:records.flatMap(r=>r.evidence_checks.filter(e=>!e.hash_matches).map(e=>({case:r.record.case_id,...e})))}));
}
fs.writeFileSync(path.join(__dirname,'来源索引.json'),JSON.stringify(all.map(({records,...x})=>x),null,2));
