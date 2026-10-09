"""Offline only: fake transport, temporary evidence, never invokes a gateway."""
import concurrent.futures
import copy
import json
import tempfile
import time
import unittest
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from types import SimpleNamespace as NS
from unittest.mock import patch

from llm_probe import capacity_suite as C
from llm_probe.capacity import TurnResult, RequestAttempt
from llm_probe.capacity import run_open_arrival
from llm_probe.evidence import EvidenceStore
from llm_probe.stats import SLO
from llm_probe.transport import TransportResult, RawFrame


PLAN = dict(confirmed=True, approval_reference='OFFLINE_TEST_ONLY', workload='tool', model='fake',
    load_isolation='declared_exclusive', credential_id='offline-only',
    client_validation={'confirmed':True,'basis':'offline injected transport and bounded workers only'},
    effort='low', max_requests=100, max_users=2, output_tokens=256, tool_output_tokens=128,
    baseline_turns=10, think_time=0, recovery_tolerance=.5,
    slo=dict(confirmed=True, success_rate=.99, turn_p95_s=10, first_text_p95_s=2),
    stages=[dict(item='CAP-03', users=[1], windows=1, min_seconds=120, min_turns=30, max_seconds=130)])


class Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = EvidenceStore(self.tmp.name + '/evidence')
        self.target = NS(name='offline', key='fake', responses_url=lambda:'offline-only', headers=lambda **kw: {})

    def tearDown(self):
        self.tmp.cleanup()

    def fake_request(self, *args, **kw):
        body = json.loads(kw['body'])
        t = time.monotonic()
        tool_first = body.get('tool_choice') == 'required'
        text = '' if tool_first else '42' if len(body['input']) > 1 else body['input'][0]['content'][0]['text'].split()[-1]
        tc = NS(name='add_numbers', call_id='call_unique', final_arguments='{"a":17,"b":25}',
                arguments='{"a":17,"b":25}')
        return NS(http_status=200, error_kind=None, t0=t,
            ns=NS(terminal='completed', json_errors=[], text=text, t_first_text=t+.001,
                  tool_calls={'one':tc} if tool_first else {}))

    def turn(self, budget=None, plan=None):
        return C.make_turn(self.target, self.store, plan or PLAN, budget or C.Budget(100), 'offline', 'test')

    def transport(self):
        return (patch.object(C.R, 'http_request', side_effect=self.fake_request),
                patch.object(C.P, 'normalize', side_effect=lambda r,p:r.ns),
                patch.object(C.R, '_attempt_record', side_effect=lambda r,n:dict(http=r.http_status,text=n.text)))

    def test_atomic_budget(self):
        b=C.Budget(11)
        with concurrent.futures.ThreadPoolExecutor(8) as p:
            admitted=list(p.map(lambda _:b.reserve(2),range(30)))
        self.assertEqual(sum(admitted),5)
        self.assertEqual(b.reserved,10)

    def test_tool_round_trip_and_evidence(self):
        a,b,c=self.transport()
        with a,b,c:
            t=self.turn()(0,0)
        self.assertTrue(t.ok)
        self.assertEqual(len(t.requests),2)
        self.assertEqual(len(t.evidence),2)

    def test_invalid_args_no_second_request(self):
        def bad(*a,**kw):
            res=self.fake_request(*a,**kw)
            res.ns.tool_calls['one'].arguments=res.ns.tool_calls['one'].final_arguments='{"a":18,"b":25}'
            return res
        a,b,c=self.transport()
        with patch.object(C.R,'http_request',side_effect=bad),b,c:
            t=self.turn()(0,0)
        self.assertFalse(t.ok)
        self.assertEqual(len(t.requests),1)

    def test_wrong_answer_fails(self):
        def bad(*a,**kw):
            res=self.fake_request(*a,**kw)
            if not res.ns.tool_calls: res.ns.text='142'
            return res
        a,b,c=self.transport()
        with patch.object(C.R,'http_request',side_effect=bad),b,c:
            self.assertFalse(self.turn()(0,0).ok)

    def test_budget_denial_is_not_request(self):
        b=C.Budget(1)
        with patch.object(C.R,'http_request',side_effect=AssertionError('must not call')):
            self.assertIsNone(self.turn(b)(0,0))
        self.assertEqual(b.sent,0)

    def test_text_marker_mismatch_does_not_fail_gateway(self):
        p=copy.deepcopy(PLAN);p['workload']='text'
        def mismatch(*a,**kw):
            res=self.fake_request(*a,**kw);res.ns.text='marker with punctuation'
            return res
        a,b,c=self.transport()
        with patch.object(C.R,'http_request',side_effect=mismatch),b,c:
            t=self.turn(plan=p)(0,0)
        self.assertTrue(t.ok)
        self.assertFalse(t.checks['exact_marker'])

    def test_empty_completed_text_is_gateway_failure(self):
        p=copy.deepcopy(PLAN);p['workload']='text'
        def empty(*a,**kw):
            res=self.fake_request(*a,**kw);res.ns.text=''
            return res
        a,b,c=self.transport()
        with patch.object(C.R,'http_request',side_effect=empty),b,c:
            t=self.turn(plan=p)(0,0)
        self.assertFalse(t.ok)
        self.assertFalse(t.requests[0].ok)

    def test_missing_timing_not_pass(self):
        t=TurnResult(True,0,1,[RequestAttempt(1,0,1,True)],None)
        lv=C.level(1,[t],dict(elapsed_s=120,enough_sample=True),SLO(.99,10,2,True))
        self.assertFalse(lv.meets_slo)

    def test_drain_not_sample_window(self):
        # Deterministic admission/drain timing, independent of thread startup latency.
        now=[0.0]
        def slow(u,i):
            start=now[0];now[0]+=.025
            return TurnResult(True,start,now[0])
        got,state=C.window(slow,1,0,.002,1,.01,clock=lambda:now[0])
        self.assertEqual(len(got),1)
        self.assertTrue(state['drained'])
        self.assertFalse(state['enough_sample'])

    def test_preview_and_approval_gate(self):
        p=copy.deepcopy(PLAN);p['confirmed']=False
        self.assertEqual(C.preview(p)['mode'],'preview_no_requests')
        with self.assertRaises(ValueError):C.validate(p,execute=True)
        p=copy.deepcopy(PLAN);p['stages'][0]['item']='CAP-04'
        with self.assertRaises(ValueError):C.validate(p)

    def test_recovery_reserves_budget(self):
        p=copy.deepcopy(PLAN);p['stages'][0]['item']='CAP-06';p['max_requests']=44
        def short_window(turn,*args):
            got=[]
            for i in range(40):
                t=turn(0,i)
                if t is None:break
                got.append(t)
            return got,dict(elapsed_s=120,stopped_by='request_budget',enough_sample=False)
        a,b,c=self.transport()
        with a,b,c,patch.object(C,'window',side_effect=short_window):
            result=C.execute(self.target,self.store,p)
        metric=result['instances'][0]['metrics']
        self.assertEqual(metric['baseline']['successes'],10)
        self.assertEqual(metric['recovery']['successes'],10)
        self.assertEqual(result['requests_sent'],44)
        self.assertEqual(result['instances'][0]['status'],'失败')

    def test_two_windows_both_required(self):
        p=copy.deepcopy(PLAN);p['stages'][0].update(item='CAP-04',windows=2,min_seconds=600,min_turns=100,max_seconds=650)
        count=[0]
        def windows(turn,*args):
            count[0]+=1;t=turn(0,count[0])
            # Second independent window failed; first alone cannot qualify.
            t.ok=count[0]==1
            return [t],dict(elapsed_s=600,stopped_by='sample_met',enough_sample=True)
        a,b,c=self.transport()
        with a,b,c,patch.object(C,'window',side_effect=windows):
            r=C.execute(self.target,self.store,p)
        self.assertEqual(count[0],2)
        self.assertEqual(r['instances'][0]['status'],'失败')
        self.assertIsNone(r['instances'][0]['metrics']['capacity_conclusion']['verified_users'])

    def test_valid_windows_expose_three_thresholds_and_attempt_evidence(self):
        from llm_probe.window_evidence import PressureSampler
        p=copy.deepcopy(PLAN)
        p.update(workload='text',max_requests=300)
        p['stages'][0].update(item='CAP-04',windows=2,min_seconds=600,min_turns=100,max_seconds=650)
        def windows(turn,*args):
            return [turn(0,i) for i in range(100)],dict(elapsed_s=600,stopped_by='sample_met',enough_sample=True,drained=True)
        a,b,c=self.transport()
        with a,b,c,patch.object(C,'window',side_effect=windows),patch.object(C,'PressureSampler',side_effect=lambda path:PressureSampler(path,reader=lambda:{'cpu_percent':1})):
            r=C.execute(self.target,self.store,p)
        metric=r['instances'][0]['metrics']
        self.assertEqual(metric['capacity_3way']['10']['verified_users'],1)
        self.assertEqual(metric['capacity_3way']['3']['verified_users'],1)
        self.assertNotEqual(metric['windows'][0]['attempt_finish']['rel_path'],metric['windows'][1]['attempt_finish']['rel_path'])

    def test_open_arrival_enforces_real_inflight_and_queue(self):
        def slow(i):
            start=time.monotonic();time.sleep(.01)
            return TurnResult(True,start,time.monotonic())
        r=run_open_arrival(slow,arrival_rate=10000,duration=.03,max_in_flight=2,queue_limit=1)
        self.assertLessEqual(r['peak'],2)
        self.assertGreater(r['rejected'],0)
        self.assertEqual(r['scheduled'],r['completed']+r['failed']+r['rejected'])
        self.assertEqual(r['in_flight'],0)
        self.assertGreater(max(r['queue_waits']),.001)

    def test_inner_incomplete_not_completed(self):
        obj={'response':{'status':'incomplete','incomplete_details':{'reason':'max_output_tokens'}}}
        res=TransportResult(True,frames=[RawFrame(1,'response.completed',json.dumps(obj),'',json_ok=True,json_obj=obj)])
        ns=C.P.normalize(res,'responses')
        self.assertEqual(ns.terminal,'incomplete')
        self.assertEqual(ns.terminal_reason,'max_output_tokens')

    def test_real_http_sse_tool_roundtrip_local_only(self):
        class Handler(BaseHTTPRequestHandler):
            def log_message(self,*args):pass
            def do_POST(self):
                body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
                events=[]
                if body.get('tool_choice')=='required':
                    item={'id':'fc','type':'function_call','name':'add_numbers','call_id':'local_call'}
                    events=[('response.output_item.added',{'item':item,'output_index':0}),
                        ('response.function_call_arguments.delta',{'item_id':'fc','delta':'{"a":17,"b":25}'}),
                        ('response.function_call_arguments.done',{'item_id':'fc','arguments':'{"a":17,"b":25}'})]
                else:
                    assert body['input'][-1]['call_id']=='local_call'
                    assert body['input'][-1]['output']=='42'
                    events=[('response.output_text.delta',{'delta':'42'})]
                events.append(('response.completed',{'response':{'status':'completed','usage':{'output_tokens':2}}}))
                data=''.join('event: '+e+'\ndata: '+json.dumps(o)+'\n\n' for e,o in events).encode()
                self.send_response(200);self.send_header('Content-Type','text/event-stream')
                self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        th=threading.Thread(target=server.serve_forever);th.start()
        target=NS(name='local',key='fake',headers=lambda **kw:{'Content-Type':'application/json'},
                  responses_url=lambda:f'http://127.0.0.1:{server.server_port}/responses')
        try:
            t=C.make_turn(target,self.store,PLAN,C.Budget(2),'local-only','test')(0,0)
            self.assertTrue(t.ok);self.assertEqual(len(t.requests),2)
            self.assertGreaterEqual(t.first_text_wait,0)
            wire=json.loads((__import__('pathlib').Path(self.store.root)/t.evidence[-1]).read_text(encoding='utf-8'))
            self.assertEqual(wire['normalized']['usage']['output_tokens'],2)
            self.assertTrue(wire['frames'])
        finally:
            server.shutdown();th.join();server.server_close()


if __name__=='__main__':unittest.main(verbosity=2)
