import hashlib,json,re
from pathlib import Path
TASK=Path(__file__).resolve().parents[1]
issues=[];idx=[json.loads(s) for s in (TASK/'证据索引.jsonl').read_text(encoding='utf8').splitlines() if s.strip()]
for r in idx:
 p=TASK/'证据'/r['rel_path']
 if not p.exists():issues.append('missing '+r['rel_path']);continue
 if hashlib.sha256(p.read_bytes()).hexdigest().upper()!=r['sha256'].upper():issues.append('sha '+r['rel_path'])
loads=json.loads((TASK/'负载回放.json').read_text(encoding='utf8'))['loads']
if len(loads)!=10:issues.append(f'load samples {len(loads)}')
baseline=json.loads((TASK/'结果/baseline-1user.json').read_text(encoding='utf8'))
if baseline['attempted_turns']!=30 or baseline['actual_requests']!=58:issues.append('baseline counts')
for link in re.findall(r'\]\(([^)]+)\)',(TASK/'报告.md').read_text(encoding='utf8')):
 if '://' not in link and not (TASK/link).exists():issues.append('broken link '+link)
print(json.dumps({'evidence_rows':len(idx),'evidence_sha256_issues':sum(x.startswith('sha ') for x in issues),'missing_evidence':sum(x.startswith('missing ') for x in issues),'samples':len(loads),'baseline_turns':baseline['attempted_turns'],'issues':issues},ensure_ascii=False))
raise SystemExit(bool(issues))
