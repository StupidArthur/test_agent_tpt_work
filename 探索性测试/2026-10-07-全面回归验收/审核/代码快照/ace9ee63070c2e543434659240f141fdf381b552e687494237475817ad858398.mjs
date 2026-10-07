import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url))),q=[],add=(name,args,save)=>q.push({name,args,save}),fixture=n=>path.join(root,'夹具',n);
add('audit.closeFrameDialogs',{},'imports-clean');add('experts.readImportDialog',{},'expert-dialog-fixed');
add('skills.importSingleFile',{filePath:fixture('SKILL.md'),displayName:'验收回归技能-audit-20261007',internalName:'fast-assert-skill-audit-20261007'},'unique-import');
add('skills.readSkillCard',{displayName:'验收回归技能-audit-20261007',internalName:'fast-assert-skill-audit-20261007'},'default-enabled');
for(const [key,term]of [['english','FastRegressionSkillUnique-audit-20261007'],['description','regression-description-unique-token-audit-20261007']])add('skills.searchSkills',{term},'search-'+key);
add('skills.readListIdentity',{},'zip-before');add('skills.readImportCandidates',{filePath:fixture('root.zip')},'zip-candidates');add('skills.readListIdentity',{},'zip-after-cancel');
for(const n of ['root','collection','trash','mixed','missing-name','missing-description','rich']){
 add('audit.closeFrameDialogs',{},n+'-preclose');add('skills.readListIdentity',{},n+'-before');add('skills.confirmImport',{filePath:fixture(n+'.zip')},n+'-import');add('skills.readListIdentity',{},n+'-after');
}
add('audit.closeFrameDialogs',{},'zip-final-close');add('skills.readIconState',{title:'fast-assert-rich-audit-20261007',internalName:'fast-assert-rich-audit-20261007'},'icon-fresh');add('skills.listInstalledFiles',{base:'C:/Users/Administrator/.tpt-work/dsh/skills/fast-assert-trash-audit-20261007'},'trash-files');
add('skills.setEnabled',{displayName:'验收回归技能-audit-20261007',internalName:'fast-assert-skill-audit-20261007',enabled:false},'unique-disabled');
fs.writeFileSync(path.join(root,'code/queue.json'),JSON.stringify(q,null,2));
