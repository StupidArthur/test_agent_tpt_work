"""Recovery must distinguish current activity from a previous turn's outcome."""
import importlib.util
from pathlib import Path
import unittest
import httpx

spec=importlib.util.spec_from_file_location('occtl_recovery_test',Path(__file__).with_name('occtl.py'))
occtl=importlib.util.module_from_spec(spec)
spec.loader.exec_module(occtl)

class RecoveryStateTests(unittest.TestCase):
 def run_case(self,session,active,messages=None,active_status=200):
  requests=[]
  def handle(request):
   requests.append(request.url.path)
   if request.url.path=='/api/session/ses_fixture':return httpx.Response(200,json={'data':session})
   if request.url.path=='/api/session/active':return httpx.Response(active_status,json={'data':active})
   if request.url.path=='/api/session/ses_fixture/message':return httpx.Response(200,json={'data':messages or []})
   raise AssertionError(request.url.path)
  result={'text':'current partial text'}
  with httpx.Client(base_url='http://fixture.invalid',transport=httpx.MockTransport(handle)) as client:
   state=occtl.recover_session(client,'ses_fixture',result)
  return state,result,requests

 def test_active_beats_previous_success(self):
  state,result,requests=self.run_case({'outcome':'succeeded'},{'ses_fixture':{'state':'running'}})
  self.assertEqual(state,'running');self.assertEqual(result['text'],'current partial text')
  self.assertNotIn('/api/session/ses_fixture/message',requests)

 def test_idle_final_calibrates_text(self):
  state,result,_=self.run_case({'outcome':'succeeded','time':{'updated':10,'idle':11}},{},[{'type':'assistant','finish':'stop','content':[{'type':'text','text':'actual final text'}]}])
  self.assertEqual(state,'succeeded');self.assertEqual(result['text'],'actual final text')

 def test_activity_failure_cannot_confirm_success(self):
  state,result,_=self.run_case({'outcome':'succeeded'},None,active_status=503)
  self.assertIsNone(state);self.assertEqual(result['text'],'current partial text')

 def test_malformed_activity_cannot_confirm_success(self):
  state,_,_=self.run_case({'outcome':'succeeded'},[])
  self.assertIsNone(state)

 def test_new_update_after_old_idle_is_unknown(self):
  state,_,requests=self.run_case({'outcome':'succeeded','time':{'updated':30,'idle':20}},{})
  self.assertIsNone(state);self.assertNotIn('/api/session/ses_fixture/message',requests)

 def test_latest_unfinished_assistant_does_not_use_older_final(self):
  state,result,_=self.run_case({'outcome':'succeeded'},{},[{'type':'assistant','finish':'tool-calls','content':[{'type':'text','text':'still working'}]},{'type':'assistant','finish':'stop','content':[{'type':'text','text':'previous turn final'}]}])
  self.assertIsNone(state);self.assertEqual(result['text'],'current partial text')

if __name__=='__main__':unittest.main()
