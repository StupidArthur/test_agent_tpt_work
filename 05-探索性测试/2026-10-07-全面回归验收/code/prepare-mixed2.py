import pathlib,zipfile
root=pathlib.Path(__file__).resolve().parent.parent
with zipfile.ZipFile(root/'夹具/mixed.zip') as zin,zipfile.ZipFile(root/'夹具/mixed2.zip','w') as zout:
 for name in zin.namelist():
  data=zin.read(name)
  if name.startswith('duplicate-'):new=name
  else:new=name.replace('invalid-','invalid2-').replace('valid-','valid2-');data=data.replace(b'audit-20261007',b'audit2-20261007')
  zout.writestr(new,data)
