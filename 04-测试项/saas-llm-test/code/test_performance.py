"""Offline assertions for performance sampler, no real HTTP."""
import json
import tempfile
import unittest
from unittest.mock import patch
from llm_probe import performance as M
from llm_probe.evidence import EvidenceStore
from llm_probe.runner import Target,_nonstream_normalize
from llm_probe.transport import TransportResult


class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.s=M.Sampler(EvidenceStore(self.tmp.name+'/evidence'),max_requests=3)
        self.t=Target({'name':'mock','base_url':'https://invalid.example','protocol':'chat'})
    def tearDown(self):self.tmp.cleanup()
    def response(self,reason='stop',text='OK'):
        return TransportResult(True,http_status=200,t0=10,t_end=11,
            body_text=json.dumps({'choices':[{'message':{'content':text},'finish_reason':reason}],
                                 'usage':{'prompt_tokens':3,'completion_tokens':2}}))
    def sample(self,res,expected=None,warmup=False):
        with patch.object(M,'http_request',return_value=res):
            return self.s.measure(self.t,{'stream':False},cases=['PERF-01'],group='mock',expected=expected,warmup=warmup)
    def test_exact_answer(self):
        a=self.sample(self.response(),{'exact_text':'OK'})
        self.assertTrue(a['ok']);self.assertEqual(a['metrics']['output_tokens_per_e2e'],2)
        self.assertFalse(self.sample(self.response(text='not OK'),{'exact_text':'OK'})['ok'])
    def test_chat_length_is_incomplete(self):
        a=self.sample(self.response('length'))
        self.assertFalse(a['ok']);self.assertFalse(a['fully_completed'])
    def test_shared_nonstream_parser_does_not_complete_length_or_unknown(self):
        self.assertEqual(_nonstream_normalize(self.response('length'),'chat').terminal,'incomplete')
        self.assertEqual(_nonstream_normalize(self.response('stop'),'chat').terminal,'completed')
        self.assertIsNone(_nonstream_normalize(self.response('undocumented'),'chat').terminal)
    def test_missing_usage_null_not_zero(self):
        r=self.response();r.body_text=json.dumps({'choices':[{'message':{'content':'OK'},'finish_reason':'stop'}]})
        a=self.sample(r,{'output_cap':10})
        self.assertIsNone(a['metrics']['output_tokens']);self.assertIsNone(a['checks']['output_cap'])
        self.assertFalse(a['ok'])
    def test_invalid_json_fails(self):
        r=self.response();r.body_text='{'
        self.assertFalse(self.sample(r)['ok'])
    def test_warmup_and_failure_kept(self):
        rows=[self.sample(self.response(),warmup=True),self.sample(self.response()),self.sample(self.response('length'))]
        agg=M.aggregate(rows)
        self.assertEqual(agg['attempted'],2);self.assertEqual(agg['succeeded'],1)
        self.assertEqual(agg['all_attempt_metrics']['e2e']['n'],2)


if __name__=='__main__':unittest.main(verbosity=2)
