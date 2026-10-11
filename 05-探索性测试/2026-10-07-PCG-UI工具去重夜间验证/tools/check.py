from pathlib import Path
import json,sys
task=Path(__file__).resolve().parents[1]
queue=json.loads((task/'用例/队列.json').read_text(encoding='utf-8'))
issues=[]; remaining=[]; complete=0
for c in queue:
 p=task/'结果'/f"{c['id']}.json"
 if not p.exists(): remaining.append(c['id']);continue
 try: r=json.loads(p.read_text(encoding='utf-8'))
 except Exception as e: issues.append({'case':c['id'],'error':str(e)});continue
 for key in ['case_id','status','attempted','assertions','call_refs','restore','elapsed_seconds']:
  if key not in r: issues.append({'case':c['id'],'missing':key})
 if r.get('case_id')!=c['id']:issues.append({'case':c['id'],'error':'identity mismatch'})
 if not r.get('attempted'):issues.append({'case':c['id'],'error':'not actually attempted'})
 if not r.get('call_refs'):issues.append({'case':c['id'],'error':'no current call refs'})
 if not r.get('assertions'):issues.append({'case':c['id'],'error':'no assertions'})
 expected_ids={a['id'] for a in c.get('assertions',[]) if isinstance(a,dict)}
 actual_ids={a.get('id') for a in r.get('assertions',[])}
 if expected_ids and expected_ids-actual_ids:issues.append({'case':c['id'],'error':'missing original assertion IDs','missing':sorted(expected_ids-actual_ids)})
 for a in r.get('assertions',[]):
  if not all(k in a for k in ['id','expected','actual','event_refs','reason']):issues.append({'case':c['id'],'error':'assertion fields missing'})
  if a.get('actual') is None and not a.get('reason'):issues.append({'case':c['id'],'error':'null without reason'})
 complete+=1
out={'total':len(queue),'recorded':complete,'remaining':remaining,'issues':issues,'note':'结构检查不等于业务验收；原始调用和哈希另行审核'}
print(json.dumps(out,ensure_ascii=False,indent=2))
sys.exit(1 if issues else 0)
