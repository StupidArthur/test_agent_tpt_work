"""Regression checks for the observed interruption/capacity failures. No HTTP."""
import hashlib
import json
from pathlib import Path
import tempfile
import time
import unittest

from llm_probe.evidence import EvidenceStore
from llm_probe.window_evidence import WindowAttempt, PressureSampler, capacity_lines, failure_category


def window(users, limited=False, latency=2, success=.999):
    return dict(users=users, complete=True, drained=True, elapsed_s=601,
                min_seconds=600, attempted=200, min_attempts=100,
                client_limited=limited, resources_complete=True,
                load_isolation='declared_exclusive', success_rate=success, e2e_p95=latency)


class EvidenceTests(unittest.TestCase):
    def test_partial_attempt_preserved_and_strict_resume(self):
        with tempfile.TemporaryDirectory() as tmp:
            store=EvidenceStore(tmp); config={'min_seconds':600,'min_attempts':100,'model':'fake'}
            a=WindowAttempt(store,'u200/w1',config)
            partial=a.finish(dict(complete=False,drained=False,elapsed_s=482,attempted=6000))
            p=Path(tmp)/partial['rel_path']; original=p.read_bytes()
            b=WindowAttempt(store,'u200/w1',config)
            self.assertNotEqual(a.prefix,b.prefix)
            self.assertEqual(p.read_bytes(),original)
            self.assertFalse(a.can_resume(p,partial['sha256'],config))
            full=b.finish(dict(complete=True,drained=True,elapsed_s=601,attempted=101))
            p=Path(tmp)/full['rel_path']
            self.assertTrue(b.can_resume(p,full['sha256'],config))
            self.assertFalse(b.can_resume(p,'0'*64,config))
            self.assertFalse(b.can_resume(p,full['sha256'],config|{'model':'different'}))
            short=b.finish(dict(complete=True,drained=True,elapsed_s=482,attempted=101))
            self.assertFalse(b.can_resume(Path(tmp)/short['rel_path'],short['sha256'],config))

    def test_invalid_clients_do_not_define_failure_boundary(self):
        ws=[window(100,latency=5.5),window(100,latency=5.9),
            window(200,limited=True),window(200,success=.988),window(200,limited=True)]
        lines=capacity_lines(ws)
        self.assertEqual(lines['10']['verified_users'],100)
        self.assertIsNone(lines['10']['first_valid_failing_tier'])
        self.assertEqual(lines['10']['tiers'][200],'unconfirmed')

    def test_failing_window_not_hidden_by_pooled_success(self):
        lines=capacity_lines([window(60),window(60),window(70,latency=3.5),window(70,latency=2)])
        self.assertEqual(lines['3']['verified_users'],60)
        self.assertEqual(lines['3']['first_valid_failing_tier'],70)
        self.assertEqual(lines['3']['planning_users'],300)

    def test_unknown_shared_load_cannot_verify_capacity(self):
        w=window(60);w['load_isolation']='unknown'
        self.assertIsNone(capacity_lines([w,w])['3']['verified_users'])

    def test_primary_categories_do_not_double_count(self):
        self.assertEqual(failure_category(dict(error_kind='connect',http_status=None)),'connection')
        self.assertEqual(failure_category(dict(terminal='incomplete',empty_text=True)),'incomplete')
        self.assertEqual(failure_category(dict(gateway_service_success=True,model_quality_mismatch=True)),'success')

    def test_samples_during_work_are_flushed_and_indexed(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'pressure.jsonl'
            with PressureSampler(p,interval=.005,reader=lambda:{'threads':210}) as s:
                time.sleep(.025)
                self.assertTrue(p.read_text())
            self.assertTrue(s.summary()['complete'])
            self.assertGreaterEqual(s.summary()['sample_count'],2)
            store=EvidenceStore(tmp)
            rec=store.index_existing('pressure.jsonl',instances=['offline'],kind='pressure')
            self.assertEqual(rec['sha256'].lower(),hashlib.sha256(p.read_bytes()).hexdigest())

    def test_sampling_failure_is_not_zero_resource_success(self):
        def denied(): raise OSError('resource access denied')
        with tempfile.TemporaryDirectory() as tmp:
            with PressureSampler(Path(tmp)/'pressure.jsonl',interval=.005,reader=denied) as s:
                time.sleep(.01)
            self.assertFalse(s.summary()['complete'])
            self.assertIn('resource access denied',s.summary()['errors'])


if __name__=='__main__': unittest.main()
