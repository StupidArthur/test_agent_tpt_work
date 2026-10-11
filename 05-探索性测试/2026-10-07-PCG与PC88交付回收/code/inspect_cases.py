from pathlib import Path
import json,sys
T=Path(__file__).resolve().parents[1]; B=T.parent/'2026-10-06-业务函数复用回归'
cases={x['id']:x for x in json.loads((B/'用例/cases.json').read_text(encoding='utf-8'))}
events={x['event_id']:x for x in (json.loads(s) for s in (B/'运行日志/business.jsonl').read_text(encoding='utf-8').splitlines())}
for cid in sys.argv[1:]:
 d=json.loads((B/'结果'/f'{cid}.json').read_text(encoding='utf-8'));print('\nCASE',cid,cases[cid]['title'],d['status'])
 for a in d['assertions']:
  spec=next(x for x in cases[cid]['assertions'] if x['id']==a['id']); print('EXPECT',json.dumps(spec,ensure_ascii=False))
  for ref in a['read_refs']:print('EVENT',json.dumps(events[ref],ensure_ascii=False)[:5000])
