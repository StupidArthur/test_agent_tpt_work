import fs from 'node:fs';
export const discovery=JSON.parse(fs.readFileSync(new URL('../business/discovery.json',import.meta.url),'utf8'));
const normal=s=>String(s||'').toLocaleLowerCase();
export function browse(functions,id){
 const known=new Map(functions.map(f=>[f.name,f]));
 if(!id)return {categories:discovery.modules.map(m=>({id:m.name,title:m.title,next:`--browse ${m.name}`})),next:'选择目标对象，再选场景；已知函数名直接 --describe。'};
 const module=discovery.modules.find(m=>m.name===id);
 if(module)return {id,title:module.title,scenarios:discovery.routes.filter(r=>r.module===id).map(r=>({id:r.id,title:r.title,intent:r.intent,next:`--browse ${r.id}`}))};
 const route=discovery.routes.find(r=>r.id===id);if(!route)throw Error('Unknown discovery route '+id);
 return {id,title:route.title,intent:route.intent,guide:route.guide,candidates:route.functions.filter(n=>known.has(n)).map(n=>({name:n,description:known.get(n).description,next:`--describe ${n}`}))};
}
export function orderedFunctions(functions){const order=new Map(discovery.modules.map((m,i)=>[m.name,i]));return [...functions].sort((a,b)=>(order.get(a.name.split('.')[0])??99)-(order.get(b.name.split('.')[0])??99)||(a.feature_path||[]).join('/').localeCompare((b.feature_path||[]).join('/'),'zh-CN')||a.name.localeCompare(b.name));}
export function discover(functions,query,{module,route,limit=5}={}){
 const scope=route&&discovery.routes.find(r=>r.id===route);if(route&&!scope)throw Error('Unknown discovery route '+route);
 if(!query.trim())throw Error('Search query required');if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('limit must be 1..20');
 const terms=[...new Set(normal(query).split(/\s+/).filter(Boolean))];
 const ranked=orderedFunctions(functions).filter(f=>(!module||f.name.split('.')[0]===module)&&(!scope||scope.functions.includes(f.name))).map(f=>{
  const contract=discovery.contracts[f.name],group=discovery.modules.find(m=>m.name===f.name.split('.')[0]);
  const fields=[[f.name,8],[(contract?.keywords||[]).join(' '),6],[(f.feature_path||[]).join(' '),4],[f.description,3],[(group?.keywords||[]).join(' '),1]];
  let score=0;const matches=[];for(const term of terms){let best=0;for(const [value,weight]of fields)if(normal(value).includes(term))best=Math.max(best,weight);if(best){score+=best;matches.push(term);}}
  return {f,contract,score,matches};
 }).filter(x=>x.score>0).sort((a,b)=>b.matches.length-a.matches.length||b.score-a.score);
 return {query,module:module||null,route:route||null,matched:ranked.length,limit,method:'关键词匹配；按命中词数与字段权重排序，不代表业务适用性',candidates:ranked.slice(0,limit).map(({f,contract,matches})=>({name:f.name,feature_path:f.feature_path,description:f.description,matched_terms:matches,...(contract?{effects:contract.effects,evidence:contract.evidence,limits:contract.limits}:{}),next:`--describe ${f.name}`})),next:ranked.length?'只读取候选函数契约，核对当前对象与前置后调用。':'用 --browse 选择目标对象与场景；任务新增函数用 --find <词> --task <目录>，再确认是否缺函数。'};
}
