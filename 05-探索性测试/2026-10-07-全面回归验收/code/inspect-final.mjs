import fs from 'node:fs';
const p=new URL('../现场读取/',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n+'.json',p),'utf8'));
console.log('cleanup',read('owned-fixtures-cleanup').observations.observations.read.value.map(x=>({name:x.name,after:x.after,error:x.error?.split('\n')[0]})));
for(const n of ['settings-initial','settings-final','final-dialogs','mixed2-after','direct-use-actual'])console.log(n,JSON.stringify(read(n).observations).slice(0,1900));
console.log('files',fs.readdirSync(p).join(','));
