"""Freeze only this run's complete standard-agent sessions and their request headers."""
import json,hashlib,collections
from pathlib import Path
import zstandard
TASK=Path(__file__).resolve().parents[1]
root=Path('C:/Users/Administrator/.tpt-work/dsh/sessions')
out=[]
for p in sorted(root.rglob('*.zstd'),key=lambda p:p.stat().st_mtime,reverse=True):
 if p.stat().st_mtime<1791350400:continue
 try:
  with p.open('rb') as f,zstandard.ZstdDecompressor().stream_reader(f,read_across_frames=True) as r:raw=r.read()
  rows=[json.loads(s) for s in raw.decode().splitlines() if s.strip()]
 except Exception:continue
 markers=[f'PRESET_CAP_20261007_{i:02}' for i in range(1,11) if f'PRESET_CAP_20261007_{i:02}'.encode() in raw]
 if not markers:continue
 end=[x['data'] for x in rows if x['type']=='turn/end']
 if not end:continue
 marker=markers[0];d=TASK/'负载采样'/marker;d.mkdir(parents=True,exist_ok=True)
 dest=d/'session.jsonl';dest.write_bytes(raw)
 (d/'session.v4.jsonl.zstd').write_bytes(p.read_bytes())
 model=[x['data'] for x in rows if x['type']=='request/header']
 assistants=[x for x in rows if x['type']=='assistant/message']
 tools=[x for x in rows if x['type']=='tool/call']
 summary={'marker':marker,'preset':rows[0].get('agentPreset'),'session':rows[0]['id'],'source':str(p),'source_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'rows':len(rows),'model_calls':len(assistants),'usage':[a['data'].get('usage') for a in assistants],'tool_names':[x['data']['name'] for x in tools],'turn_end':end,'header_config':[m['header']['config'] for m in model]}
 (d/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf8')
 out.append(summary)
(TASK/'负载采样'/'汇总.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(out,ensure_ascii=False))
