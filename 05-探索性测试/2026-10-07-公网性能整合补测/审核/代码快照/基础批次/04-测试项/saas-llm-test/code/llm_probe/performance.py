"""Reusable performance samples: full wire, scoped metrics, independent expectations."""
from __future__ import annotations
import hashlib
import json
import os
import threading
import time
import uuid
from . import protocol as P
from .runner import _nonstream_normalize
from .stats import summarise
from .transport import http_request


class Sampler:
    def __init__(self, store, max_requests=1000):
        self.store, self.max_requests = store, max_requests
        self.lock = threading.Lock()
        self.sent = 0

    def measure(self, target, body, *, cases, group, expected=None, warmup=False):
        with self.lock:
            if self.sent >= self.max_requests:
                raise RuntimeError('planned request budget reached; preserve queue, do not claim completion')
            self.sent += 1
            index = self.sent
        stream = bool(body.get('stream'))
        proto = target.protocol
        res = http_request(target.chat_url() if proto=='chat' else target.responses_url(),
            method='POST', headers=target.headers(stream=stream), body=json.dumps(body).encode(),
            stream=stream, connect_timeout=10, idle_timeout=60, total_timeout=180)
        ns = P.normalize(res,proto) if stream else _nonstream_normalize(res,proto)
        try: obj=json.loads(res.body_text) if not stream else None
        except ValueError: obj=None; ns.json_errors.append({'error':'invalid nonstream JSON'})
        if not stream and proto=='chat' and ns.terminal_reason=='length':
            ns.terminal='incomplete'
        if not stream and proto=='responses' and obj:
            ns.terminal_reason=(obj.get('incomplete_details') or {}).get('reason') or obj.get('status')
            ns.reasoning=''.join(c.get('text','') for it in obj.get('output',[]) if it.get('type')=='reasoning'
                for c in it.get('content',[]))
        usage=ns.usage
        output=None if usage is None else usage.get('output_tokens',usage.get('completion_tokens'))
        input_tokens=None if usage is None else usage.get('input_tokens',usage.get('prompt_tokens'))
        expected=expected or {'nonempty':True,'terminal_allowed':['completed']}
        checks={'http200':res.http_status==200,'no_transport_error':res.error_kind is None,
                'valid_json':not ns.json_errors,
                'terminal':ns.terminal in expected.get('terminal_allowed',['completed'])}
        if expected.get('nonempty'): checks['nonempty']=bool(ns.text.strip())
        if 'exact_text' in expected: checks['exact_text']=ns.text.strip()==expected['exact_text']
        if 'contains' in expected: checks['contains']=all(x in ns.text for x in expected['contains'])
        if 'output_cap' in expected:
            checks['output_cap']=None if output is None else output<=expected['output_cap']
        stamps=[]
        for fr in res.frames:
            o=fr.json_obj if isinstance(fr.json_obj,dict) else {}
            is_text=fr.event=='response.output_text.delta' and bool(o.get('delta'))
            if proto=='chat':
                is_text=any(bool((x.get('delta') or {}).get('content')) for x in o.get('choices',[]))
            if is_text: stamps.append(fr.t-res.t0)
        intervals=[b-a for a,b in zip(stamps,stamps[1:])]
        middle=stamps[int(len(stamps)*.1):int(len(stamps)*.9)]
        mid_rate=None if len(middle)<2 or middle[-1]<=middle[0] else (len(middle)-1)/(middle[-1]-middle[0])
        e2e=res.rel(res.t_end)
        identity=uuid.uuid4().hex
        row=dict(sample_id=identity,request_index=index,cases=cases,group=group,warmup=warmup,
            target=target.name,protocol=proto,request=body,expected=expected,checks=checks,
            ok=all(x is True for x in checks.values()),fully_completed=ns.terminal=='completed',
            request_sha256=hashlib.sha256(json.dumps(body,sort_keys=True,ensure_ascii=False).encode()).hexdigest(),
            utc=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
            http=res.http_status,error_kind=res.error_kind,error=res.error,body_text=res.body_text,
            normalized=ns.to_dict(),raw_frames=[dict(t=fr.t-res.t0,event=fr.event,data=fr.data,raw=fr.raw,json_ok=fr.json_ok) for fr in res.frames],
            metrics=dict(e2e=e2e,first_event=res.rel(ns.t_first_event),first_reasoning=res.rel(ns.t_first_reasoning),
                first_text=res.rel(ns.t_first_text),first_tool=res.rel(ns.t_first_tool),input_tokens=input_tokens,
                output_tokens=output,output_tokens_per_e2e=None if output is None or not e2e else output/e2e,
                text_chars=len(ns.text),text_delta_count=len(stamps),text_span=None if not stamps else stamps[-1]-stamps[0],
                text_intervals_s=intervals,middle_text_chunks_per_s=mid_rate,
                stream_batch_observation=None if len(stamps)<2 else stamps[-1]-stamps[0]<=.05))
        rec=self.store.write_json(f'performance/{group}/{index:05d}-{identity}.json',row,
                                  instances=cases,kind='performance_wire')
        row['evidence']=rec
        return row


def aggregate(samples):
    formal=[s for s in samples if not s.get('warmup')]
    success=[s for s in formal if s['ok']]
    metrics=['e2e','first_event','first_reasoning','first_text','first_tool','input_tokens','output_tokens',
             'output_tokens_per_e2e','text_span','middle_text_chunks_per_s']
    return dict(attempted=len(formal),succeeded=len(success),failed=len(formal)-len(success),
        complete=sum(s['fully_completed'] for s in formal),
        success_rate=None if not formal else len(success)/len(formal),
        all_attempt_metrics={k:summarise([s['metrics'].get(k) for s in formal]).to_dict() for k in metrics},
        success_metrics={k:summarise([s['metrics'].get(k) for s in success]).to_dict() for k in metrics},
        terminations={k:sum(s['normalized']['terminal']==k for s in formal) for k in ['completed','incomplete','failed','error',None]},
        evidence=[s['evidence'] for s in formal],slo='unconfirmed; measurement only')
