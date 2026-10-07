from pathlib import Path
import json
R=Path(__file__).resolve().parents[3]
p=R/'tools/ui-operations/business/catalog.json'; d=json.loads(p.read_text(encoding='utf-8'))
name='fixtures.removeCreatedFile'
entry={'name':name,'file':'business/fixtures/cleanup.mjs','export':'removeCreatedFile','feature_path':['夹具','恢复','本轮新增文件'],'description':'恢复本轮新增文件为不存在：需事前不存在的读取引用和当前SHA；拒绝核心记忆文件、目录及链接','version':'portable-1.0','status':'本机文件能力验证见PCG与PC88交付回收','origin':{'machine':'PC88任务能力经管理者重写','task':'2026-10-07-PCG与PC88交付回收'},'parameters':{'type':'object','additionalProperties':False,'properties':{'path':{'type':'string'},'expectedSha256':{'type':'string'},'absentReadRef':{'type':'string'}},'required':['path','expectedSha256','absentReadRef']},'channel':'file','preconditions':['文件创建前先用fixtures.readFile取得本轮不存在证据','当前文件仅属于本轮夹具，根目录在任务或环境声明范围内'],'returns':'删除后真实exists、动作与读取引用；不判case','cleanup':'本函数执行恢复；没有不存在基线时不可用于补删','modules':[]}
d['functions']=[x for x in d['functions'] if x['name']!=name]+[entry];p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
p=R/'tools/ui-operations/business/discovery.json';d=json.loads(p.read_text(encoding='utf-8'))
d['contracts'][name]={'keywords':['删除','清理','恢复','新增文件','不存在','remove'],'effects':['只恢复已记录原本不存在的本轮文件；不递归删除'],'evidence':['当前SHA、创建前读取引用、删除后exists'],'limits':['不是产品记忆删除入口；不能替代MEM-17原生确认','无本轮不存在证据不能使用']}
for name,keywords,effects,limits in [
 ('settings.listPluginCards',['插件','卡片','列表','展开','收起'],['进入设置/内置插件，读取卡片；结束用settings.closeSettings关闭'],['与左侧插件市场不同；readPluginCard不能替代此读取']),
 ('settings.setPluginExpanded',['插件','详情','展开','收起'],['按label设置expanded，返回before/after；调用者恢复初值'],['不用于左侧插件市场']),
 ('conversation.searchSessions',['会话','搜索','查找','任务'],['打开搜索并读取匹配计数，结束Escape'],['计数不证明指定session命中；用唯一标题并核对列表原文']),
 ('memory.editLayerFile',['记忆','编辑','修改','分层','文件'],['概览分层文件编辑；用fixtures备份并恢复'],['条目行内没有编辑时可用此入口；不能当成行内编辑已实现']),
 ('fixtures.readFile',['文件','不存在','读取','哈希','删除前'],['记录内容与哈希；不存在时记录value=null、raw.exists=false'],['删除恢复前须在创建文件之前保留此读取'])]:
 old=d['contracts'].get(name,{})
 old.update(keywords=sorted(set(old.get('keywords',[])+keywords)),effects=effects,limits=limits)
 old.setdefault('evidence',['真实读取和原始字段'])
 d['contracts'][name]=old
p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
