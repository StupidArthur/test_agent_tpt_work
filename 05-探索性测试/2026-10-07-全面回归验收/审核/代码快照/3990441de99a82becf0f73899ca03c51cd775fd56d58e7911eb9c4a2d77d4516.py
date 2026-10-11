import pathlib,zipfile,json,hashlib
root=pathlib.Path(__file__).resolve().parent.parent
src=root.parent/'2026-10-06-函数体系全面回归'/'夹具'/'本轮'/'agent-oc-20261006-funcfull-01'
out=root/'夹具';out.mkdir(exist_ok=True)
old='agent-oc-20261006-funcfull-01';new='audit-20261007'
for z in ['root','collection','trash','mixed','rich']:
 with zipfile.ZipFile(src/'zips'/f'{z}.zip') as zin,zipfile.ZipFile(out/f'{z}.zip','w') as zout:
  for info in zin.infolist():
   if info.is_dir():continue
   name=info.filename.replace(old,new)
   # Folder names are also product identities: isolate all collection children.
   if z in ['collection','mixed']:
    parts=name.split('/');parts[0]=parts[0]+'-'+new;name='/'.join(parts)
   data=zin.read(info.filename)
   if info.filename.endswith(('.md','.json','.txt')):data=data.decode('utf8').replace(old,new).encode('utf8')
   zout.writestr(name,data)
skill=(src/'skill-src'/'SKILL.md').read_text('utf8').replace(old,new).replace('本轮快速回归技能','验收回归技能-'+new).replace('FastRegressionSkillUnique','FastRegressionSkillUnique-'+new).replace('regression-description-unique-token','regression-description-unique-token-'+new)
(out/'SKILL.md').write_text(skill,encoding='utf8')
for kind in ['missing-description','missing-name']:
 text=(src/'variants'/kind/'SKILL.md').read_text('utf8').replace(old,new)
 with zipfile.ZipFile(out/f'{kind}.zip','w') as z:z.writestr('SKILL.md',text)
manifest=[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in out.iterdir() if p.is_file()]
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{'file':p.name,'entries':zipfile.ZipFile(p).namelist()}for p in out.glob('*.zip')],ensure_ascii=False))
