from pathlib import Path
import json, sys

task = Path(__file__).resolve().parents[1]
queue = json.loads((task/'用例/发现队列.json').read_text(encoding='utf-8'))
issues, remaining = [], []
for case in queue:
    p = task/'结果'/f"{case['id']}.json"
    if not p.exists():
        remaining.append(case['id'])
        continue
    try:
        r = json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        issues.append({'case':case['id'], 'error':str(e)})
        continue
    for key in ['case_id','queries','first_choice','choice_reason','corrected_choice','call_refs','event_refs','actual_evidence','business_status','discovery_status','gap_type','restore','elapsed_seconds']:
        if key not in r:
            issues.append({'case':case['id'], 'missing':key})
    if r.get('case_id') != case['id']:
        issues.append({'case':case['id'], 'error':'identity mismatch'})
    if len(r.get('queries',[])) < 2:
        issues.append({'case':case['id'], 'error':'missing search attempts'})
    if not r.get('call_refs') and r.get('gap_type') != '环境限制':
        issues.append({'case':case['id'], 'error':'no actual calls or environment limitation'})
print(json.dumps({'total':len(queue),'remaining':remaining,'issues':issues,'note':'仅结构检查，检索原文、真实调用与业务判断由管理者复核'},ensure_ascii=False,indent=2))
sys.exit(1 if issues else 0)
