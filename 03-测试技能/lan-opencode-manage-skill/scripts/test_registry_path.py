"""Project boundary regression checks; no network or real credentials."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('occtl_registry_test',Path(__file__).with_name('occtl.py'))
occtl=importlib.util.module_from_spec(spec)
spec.loader.exec_module(occtl)

class RegistryBoundaryTests(unittest.TestCase):
 def test_root_beats_shadow_child(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'.git').mkdir();child=root/'nested';child.mkdir()
   (root/'.lan-opencodes.json').write_text('{}');(child/'.lan-opencodes.json').write_text('{}')
   with patch.object(Path,'cwd',return_value=child),patch.dict(os.environ,{},clear=True):
    self.assertEqual(occtl.default_servers_path(),root/'.lan-opencodes.json')
 def test_missing_root_never_uses_parent_or_child(self):
  with tempfile.TemporaryDirectory() as tmp:
   parent=Path(tmp);(parent/'.lan-opencodes.json').write_text('{}')
   root=parent/'repo';root.mkdir();(root/'.git').write_text('gitdir: fixture')
   child=root/'nested';child.mkdir();(child/'.lan-opencodes.json').write_text('{}')
   with patch.object(Path,'cwd',return_value=child),patch.dict(os.environ,{},clear=True):
    expected=root/'.lan-opencodes.json';self.assertEqual(occtl.default_servers_path(),expected)
    with self.assertRaises(occtl.CtlError):occtl.load_registry(expected)
 def test_explicit_environment_override(self):
  with patch.dict(os.environ,{'OCCTL_SERVERS':'explicit.json'},clear=True):
   self.assertEqual(occtl.default_servers_path(),Path('explicit.json'))
 def test_unversioned_project_manifest(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'.lan-opencodes.json').write_text('{}');child=root/'nested';child.mkdir()
   with patch.object(Path,'cwd',return_value=child),patch.dict(os.environ,{},clear=True):
    self.assertEqual(occtl.default_servers_path(),root/'.lan-opencodes.json')

if __name__=='__main__':unittest.main()
