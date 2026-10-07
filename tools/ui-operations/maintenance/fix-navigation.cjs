// MIGRATION_HISTORY_ONLY: not a runtime entry point.
if(!process.argv.includes('--rebuild-migration'))throw Error('Historical migration script; do not run against the reviewed library. Use maintenance/verify.mjs.');
const fs=require('fs'),path=require('path');for(const [domain,label,connector]of [['skills','技能','connectSkills'],['experts','专家','connectExperts']]){
 const p=path.join(__dirname,'../business',domain,'manage.mjs');let s=fs.readFileSync(p,'utf8');
 s=s.replaceAll(`await page.locator('button[aria-label="${label}"]').first().click();`,`await ${connector}({...ctx,connection:conn});`);
 fs.writeFileSync(p,s);
}
