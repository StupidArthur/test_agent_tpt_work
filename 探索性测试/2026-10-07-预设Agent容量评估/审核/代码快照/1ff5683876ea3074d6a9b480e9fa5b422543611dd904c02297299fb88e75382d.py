"""Read-only session schema inventory; do not print conversation bodies or credentials."""
import json, collections
from pathlib import Path
import zstandard

root=Path('C:/Users/Administrator/.tpt-work/dsh/sessions')
paths=sorted(root.rglob('*.zstd'),key=lambda p:p.stat().st_size,reverse=True)
out=[]
for p in paths[:5]:
 with p.open('rb') as f, zstandard.ZstdDecompressor().stream_reader(f,read_across_frames=True) as r:
  rows=[json.loads(s) for s in r.read().decode().splitlines() if s.strip()]
 types=collections.Counter(str(x.get('type')) for x in rows)
 examples={}
 for x in rows:
  k=str(x.get('type'))
  if k not in examples:examples[k]={a:({'keys':list(v.keys())} if isinstance(v,dict) else {'count':len(v)} if isinstance(v,list) else v if a in ('type','agentPreset') else type(v).__name__) for a,v in x.items()}
 out.append({'path':str(p),'rows':len(rows),'types':dict(types),'schema':examples})
print(json.dumps(out,ensure_ascii=False,indent=2))
