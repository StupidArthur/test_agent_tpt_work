"""Full-wire, bounded follow-up for the two unresolved protocol observations."""
import json,uuid
from run_performance import TARGETS,SAMPLER,TASK,body,save_group,P
t=TARGETS['gateway-responses']
rows=[]
marker='HISTORY_'+uuid.uuid4().hex
first=SAMPLER.measure(t,body(t,'记住 '+marker+'，仅回答 OK',512,False),cases=['API-04','TPT-07','DIFF-04'],group='history-first',expected={'exact_text':'OK'})
rows.append(first)
if first['ok']:
    for shape in ['string','output_text']:
        content=first['normalized']['text'] if shape=='string' else [{'type':'output_text','text':first['normalized']['text']}]
        b=P.responses_body('flash',input_items=[{'role':'user','content':'记住 '+marker+'，仅回答 OK'},
            {'role':'assistant','content':content},{'role':'user','content':'刚才的标记是什么？仅输出标记。'}],
            stream=False,max_output_tokens=512,reasoning_effort='low')
        row=SAMPLER.measure(t,b,cases=['API-04','TPT-07','DIFF-04'],group='history-'+shape,expected={'exact_text':marker})
        rows.append(row)
save_group('history-wire',rows)
rows=[]
for cap in [16,32,512]:
    for stream in [False,True]:
        for repeat in range(2):
            row=SAMPLER.measure(t,body(t,'请写一篇很长的文章论述时间序列预测，越详细越好。',cap,stream),
                cases=['API-09','TPT-08','DIFF-07'],group=f'terminal-wire-{cap}-{stream}',
                expected={'terminal_allowed':['completed','incomplete'],'output_cap':cap})
            rows.append(row)
            save_group('terminal-wire',rows)
for stream in [False,True]:
    rows.append(SAMPLER.measure(t,body(t,'只输出 NORMAL_END_7f91',256,stream),
        cases=['TPT-08','DIFF-07','CAP-06'],group='terminal-normal',expected={'exact_text':'NORMAL_END_7f91'}))
save_group('terminal-wire',rows)
