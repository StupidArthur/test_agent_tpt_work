"""Full-wire, bounded follow-up for the two unresolved protocol observations."""
import json,uuid
from run_performance import TARGETS,SAMPLER,TASK,STORE,body,save_group,P
from llm_probe.runner import Target
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
real_output=json.loads(first['body_text']).get('output',[]) if first['ok'] else []
if real_output:
    b=P.responses_body('flash',input_items=first['request']['input']+real_output+
        [{'role':'user','content':'刚才的标记是什么？仅输出标记。'}],stream=False,max_output_tokens=1024,reasoning_effort='low')
    row=SAMPLER.measure(t,b,cases=['TPT-07','DIFF-04'],group='history-real-items',expected={'exact_text':marker})
    row['real_reasoning_items_present']=any(x.get('type')=='reasoning' for x in real_output)
    save_group('history-real-items',[row])
tool_body=P.responses_body('flash',text='调用 add_numbers，参数 a=17 b=25。',stream=False,max_output_tokens=2048,
    reasoning_effort='low',tools=[P.add_numbers_tool()],tool_choice='required')
tool_first=SAMPLER.measure(t,tool_body,cases=['TPT-07'],group='tool-real-output',expected={'terminal_allowed':['completed']})
tool_items=json.loads(tool_first['body_text']).get('output',[]) if tool_first['ok'] else []
calls=[x for x in tool_items if x.get('type')=='function_call']
tool_rows=[tool_first]
if len(calls)==1 and calls[0].get('name')=='add_numbers' and json.loads(calls[0]['arguments'])=={'a':17,'b':25}:
    follow=P.responses_body('flash',input_items=tool_body['input']+tool_items+
        [{'type':'function_call_output','call_id':calls[0]['call_id'],'output':str(17+25)}],
        stream=False,max_output_tokens=1024,reasoning_effort='low',tools=[P.add_numbers_tool()],instructions='只输出工具计算结果。')
    second=SAMPLER.measure(t,follow,cases=['TPT-07'],group='tool-real-output-follow',expected={'exact_text':'42'})
    second['real_reasoning_items_present']=any(x.get('type')=='reasoning' for x in tool_items)
    tool_rows.append(second)
save_group('tool-real-output',tool_rows)
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
negative=[]
for label,key in [('missing',None),('invalid','invalid-test-'+uuid.uuid4().hex)]:
    rejected=Target(dict(name='auth-'+label,base_url=t.base_url,api_key_env='AUTH_TEST',protocol='responses',models=['flash']),
        env={} if key is None else {'AUTH_TEST':key})
    row=SAMPLER.measure(rejected,body(t,'只输出 AUTH_OK'),cases=['API-07'],group='auth-'+label)
    negative.append({'label':label,'response':row,'expected_rejection':row['http'] in [401,403]})
    control=SAMPLER.measure(t,body(t,'只输出 AUTH_OK'),cases=['API-07'],group='auth-control-'+label,expected={'exact_text':'AUTH_OK'})
    negative.append({'label':label+'-health','response':control,'expected_health':control['ok']})
for label,change in [('unknown-model',{'model':'nonexistent-'+uuid.uuid4().hex}),('bad-input',{'input':19}),('empty-model',{'model':''})]:
    b=body(t,'只输出 ERROR_OK');b.update(change)
    row=SAMPLER.measure(t,b,cases=['API-08'],group='invalid-'+label)
    negative.append({'label':label,'response':row,'expected_rejection':row['http'] in [400,404,422]})
    control=SAMPLER.measure(t,body(t,'只输出 ERROR_OK'),cases=['API-08','TPT-09'],group='invalid-health-'+label,expected={'exact_text':'ERROR_OK'})
    negative.append({'label':label+'-health','response':control,'expected_health':control['ok']})
(TASK/'结果'/'negative-controls.json').write_text(json.dumps(negative,ensure_ascii=False,indent=2),encoding='utf-8')
direct_recheck=[]
for i in range(2):
    direct=TARGETS['direct-chat']
    direct_recheck.append(SAMPLER.measure(direct,body(direct,'用一句话介绍你自己',1024,False),
        cases=['PERF-01','PERF-07'],group='direct-short-budget-recheck',expected={'nonempty':True,'terminal_allowed':['completed']}))
save_group('direct-short-budget-recheck',direct_recheck)
pro_body=body(t,'只输出 PRO_OK',512,False);pro_body['model']='pro'
pro=SAMPLER.measure(t,pro_body,cases=['TPT-05'],group='pro-availability',expected={'exact_text':'PRO_OK'})
save_group('pro-availability',[pro])
if pro['ok']:
    import base64,struct,zlib
    def chunk(name,data):return struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data)&0xffffffff)
    raster=b''.join(b'\x00'+b''.join(b'\xff\x00\x00' if 4<=y<10 and any(a<=x<a+6 for a in [4,20,36]) else b'\xff\xff\xff' for x in range(48)) for y in range(16))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',48,16,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raster))+chunk(b'IEND',b'')
    STORE.write('pro-image/fixture.png',png,instances=['TPT-05'],kind='fixture',binary=True)
    image=P.responses_body('pro',input_items=[{'role':'user','content':[{'type':'input_text','text':'图中多少个红色方块？只输出数字。'},
        {'type':'input_image','image_url':'data:image/png;base64,'+base64.b64encode(png).decode()}]}],stream=False,max_output_tokens=1024,reasoning_effort='low')
    save_group('pro-image',[SAMPLER.measure(t,image,cases=['TPT-05'],group='pro-image',expected={'exact_text':'3'})])
