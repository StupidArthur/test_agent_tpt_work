import json, pathlib, sqlite3, zstandard, io, datetime, hashlib
home = pathlib.Path('C:/Users/Administrator/.tpt-work/dsh')
for db in [home/'storages/tpt.sqlite']:
    c=sqlite3.connect(db.as_uri()+'?mode=ro',uri=True)
    print('DB',db.name)
    for name,sql in c.execute("select name,sql from sqlite_master where type='table'"):
        print(name,sql[:700])
    c.close()
base=home/'sessions/--D-code-tpt-workspace--'
summary=[]
for p in base.glob('*/session.v4.jsonl.zstd'):
    if '20261006' not in p.parent.name and p.stat().st_mtime < 1791259200: continue
    with zstandard.ZstdDecompressor().stream_reader(io.BytesIO(p.read_bytes()),read_across_frames=True) as reader:
        text=reader.read().decode('utf8')
    if 'FAST_EXPERT_EXEC_OK' not in text: continue
    rows=[json.loads(x) for x in text.splitlines() if x.strip()]
    created=rows[0].get('createdAt',0)
    if not (1791262200000 <= created <= 1791262620000): continue
    events=[]
    for x in rows:
        stamp=x.get('timestamp') or x.get('createdAt') or x.get('time')
        entry={'type':x.get('type'),'time':datetime.datetime.fromtimestamp(stamp/1000,datetime.timezone(datetime.timedelta(hours=8))).isoformat() if isinstance(stamp,(int,float)) else stamp}
        if x.get('type') in ['step/end','turn/end']:
            entry['data']=x.get('data')
        if x.get('type')=='assistant/message':
            entry['contains_fixed_reply']='FAST_EXPERT_EXEC_OK' in json.dumps(x.get('data'))
        events.append(entry)
    item={'source':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'records':len(rows),'decompressed_bytes':len(text.encode()),'events':events}
    summary.append(item)
    print(json.dumps(item,ensure_ascii=False))
out=pathlib.Path(__file__).parent/'证据/会话事件摘要.json'
out.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
