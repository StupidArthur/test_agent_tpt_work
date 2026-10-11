// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
// Import immutable agent sources; working implementations are separate from the archive.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const sources=[{machine:'PC-G',commit:'7aff430',dir:'C:/Users/Administrator/AppData/Local/Temp/tpt-review-pcg-20261006/探索性测试/2026-10-06-业务函数复用回归',code:'code'}, {machine:'PC-88',commit:'490e6ee',dir:'C:/Users/Administrator/AppData/Local/Temp/tpt-review-pc88-20261006/探索性测试/2026-10-06-冒烟测试/运行/pc88-20261006-smoke01',code:'code'}];
const manifest=[];
function copyTree(src,dest,source){for(const ent of fs.readdirSync(src,{withFileTypes:true})){const p=path.join(src,ent.name),o=path.join(dest,ent.name);if(ent.isDirectory())copyTree(p,o,source);else {fs.mkdirSync(path.dirname(o),{recursive:true});fs.copyFileSync(p,o);manifest.push({machine:source.machine,commit:source.commit,source_path:path.relative(source.dir,p).replaceAll('\\','/'),archive_path:path.relative(root,o).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});}}}
for(const s of sources)copyTree(path.join(s.dir,s.code),path.join(root,'sources',s.machine,'code'),s);
const g=sources[0];
for(const part of ['automation','business'])copyTree(path.join(g.dir,'code',part),path.join(root,part),g);
for(const part of ['扩展','skill-template','expert-template','expert-missing-agent','expert-bad-json'])if(fs.existsSync(path.join(g.dir,'夹具',part)))copyTree(path.join(g.dir,'夹具',part),path.join(root,'fixtures/templates',part),g);
fs.mkdirSync(path.join(root,'maintenance'),{recursive:true});
fs.copyFileSync(path.join(g.dir,'04-测试工具/prepare-fixtures.py'),path.join(root,'maintenance/prepare-fixtures.py'));
fs.copyFileSync(path.join(g.dir,'04-测试工具/link_fixture.py'),path.join(root,'automation/link_fixture.py'));
fs.writeFileSync(path.join(root,'sources/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({source_files:manifest.filter(x=>x.archive_path.startsWith('sources/')).length}));
