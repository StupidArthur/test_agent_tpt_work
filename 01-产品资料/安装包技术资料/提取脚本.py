from pathlib import Path
from datetime import datetime
import hashlib,json,struct,re,shutil
from urllib.parse import quote,unquote

root=Path(r'D:\code\electron-ui')
dest=root/'01-产品资料/安装包技术资料'
source=Path(r'C:\Users\Administrator\AppData\Local\Programs\tpt-work\resources\app.asar')
raw=source.read_bytes()
header=json.loads(raw[16:16+struct.unpack_from('<I',raw,12)[0]])
base=8+struct.unpack_from('<I',raw,4)[0]
entries={}
def walk(node,prefix=''):
 for name,entry in node.get('files',{}).items():
  path=prefix+name
  if 'files' in entry:walk(entry,path+'/')
  else:entries[path]=entry
walk(header)
selected=[]
for path,entry in entries.items():
 if (re.search(r'@tpt-work/(dsh-ui-primitives-vendor|llm-tpt)/README[^/]*$',path)
     or re.search(r'@tpt-work/(memory|sandbox|sidebar|automation)/(package\.json|src/[^/]+\.ts)$',path)
     or re.search(r'@deepseek-ai/(dsh-sandbox|dsh-sandbox-local|dsh-sandbox-policy|dsh-sandbox-windows-acl|dsh-fs-sandbox)/README(?:\.zh)?\.md$',path)):
  selected.append(path)
dest.mkdir(parents=True,exist_ok=True)
records=[]
for path in selected:
 e=entries[path]
 if e.get('unpacked'):
  data=Path(str(source)+'.unpacked').joinpath(*path.split('/')).read_bytes()
 else:
  start=base+int(e['offset']);data=raw[start:start+int(e['size'])]
 assert len(data)==int(e['size'])
 relative='原始提取/'+path
 output=dest/relative;output.parent.mkdir(parents=True,exist_ok=True)
 if output.exists():assert output.read_bytes()==data,'Existing copy differs: '+relative
 else:output.write_bytes(data)
 assert hashlib.sha256(output.read_bytes()).digest()==hashlib.sha256(data).digest()
 records.append({'archive_path':path,'saved_path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'unpacked':bool(e.get('unpacked'))})
manifest={'inspection_date':'2026-10-05','source_archive':str(source),'archive_bytes':len(raw),'archive_sha256':hashlib.sha256(raw).hexdigest(),'archive_last_write_local':datetime.fromtimestamp(source.stat().st_mtime).isoformat(),'archive_file_count':len(entries),'extracted_file_count':len(records),'files':records}
(dest/'来源清单.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(dest/'全部Markdown路径.txt').write_text('\n'.join(p for p in entries if p.endswith('.md'))+'\n',encoding='utf-8')
shutil.copyfile('outputs/tpt-installed-inspection/检查结论.md',dest/'检查结论.md')
def link(label,path):return f'[{label}]({quote(path,safe="/.-_")})'
readme='''# 安装包技术资料

本目录是产品知识的独立来源层，来自本机实际安装的 TPT Work。它提供组件技术说明、实现意图和已知边界；不直接等同于产品需求，也不代表运行验证通过。

## 阅读顺序

1. [检查结论](检查结论.md)：先了解找到了什么，以及未确认的内容。
2. [获取与来源说明](获取与来源说明.md)：了解安装定位、包身份、提取方式和选取范围。
3. 按下面的资料地图阅读原始提取；需要逐文件追溯时查 [来源清单](来源清单.json)。

## 资料地图

'''
for label,path in [
 ('TPT 模型服务说明','dsh/node_modules/@tpt-work/llm-tpt/README.md'),
 ('TPT 沙箱模块说明与源码','dsh/node_modules/@tpt-work/sandbox/src/index.ts'),
 ('TPT 记忆包描述','dsh/node_modules/@tpt-work/memory/package.json'),
 ('TPT 任务侧栏包描述','dsh/node_modules/@tpt-work/sidebar/package.json'),
 ('TPT 自动化包描述','dsh/node_modules/@tpt-work/automation/package.json'),
 ('UI 原子组件说明（内容为上游组件）','dsh/node_modules/@tpt-work/dsh-ui-primitives-vendor/README.zh.md'),
 ('上游 Windows ACL 沙箱约定','dsh/node_modules/@deepseek-ai/dsh-sandbox-windows-acl/README.zh.md'),
 ('上游沙箱服务约定','dsh/node_modules/@deepseek-ai/dsh-sandbox/README.zh.md'),
 ('上游工作区权限策略','dsh/node_modules/@deepseek-ai/dsh-sandbox-policy/README.zh.md'),
 ('上游内置文件工具边界','dsh/node_modules/@deepseek-ai/dsh-fs-sandbox/README.zh.md')]:readme+='- '+link(label,'原始提取/'+path)+'\n'
readme+='''
## 使用边界

- 原始提取保持包内目录层级和字节；只提取部分文件，原文引用的其他源码、图片或链接可能没有收录。
- 包名为 @tpt-work 不代表文档全是 TPT 独有要求；UI vendor 文档实际描述上游组件。
- 组件描述与源码注释可能和外部设计或实测不同，应分别记录来源，不自动裁定谁正确。
- 本目录不包含用户聊天、配置密钥、运行日志或完整 app.asar；不修改安装文件。
'''
(dest/'README.md').write_text(readme,encoding='utf-8')
(dest/'获取与来源说明.md').write_text(f'''# 获取与来源说明

## 从哪里获得

2026-10-05 在本机开始菜单发现 TPT Work.lnk，读取其 TargetPath，定位到 `C:\\Users\\Administrator\\AppData\\Local\\Programs\\tpt-work\\tpt-work.exe`。随后只读检查同目录的 resources，发现 app.asar 与 desktop/runtime 等资源目录。本目录原始提取的来源仅为该 app.asar（若某条目标为 unpacked，则读取旁边 app.asar.unpacked 的对应文件）。

## 被检查包的身份

- 绝对路径：`{source}`
- 字节数：{len(raw)}
- SHA-256：`{manifest['archive_sha256']}`
- 本地文件修改时间：{manifest['archive_last_write_local']}
- 归档文件数：{len(entries)}

大小和修改时间与历史报告记录一致；历史报告没有对应包哈希，因此不能证明两个包字节完全一致。这里的包哈希只标识本次实际读取的文件，不能补写为历史测试包哈希。

## 如何提取

使用 Python 标准库读取 ASAR 文件头：偏移 12 的小端整数为文件表 JSON 长度，JSON 从偏移 16 开始；数据区起点为 8 加偏移 4 的小端整数。递归解析 files 树，按每个条目的 offset 和 size 复制字节。unpacked 文件使用旁置目录。未执行包内脚本或应用。

本次提取 {len(records)} 个文件，每个文件在写入后与来源字节重新做 SHA-256 核对。来源清单记录包内路径、保存路径、大小、哈希及 unpacked 标记。全部Markdown路径.txt 是文件表索引，不意味着其中所有文档都已提取或阅读。

复现脚本保存在本目录的 `提取脚本.py`。它提供提取规则和校验逻辑；复现需按目标机器修改 source、root 和本地检查结论副本路径。脚本面向本次目录，不是已经封装好的通用 CLI。再次提取到不同包时应使用新目录，保留包身份，避免混合版本。

## 为什么选择这些文件

选取 TPT 模型服务 README、UI vendor README、记忆/侧栏/自动化/沙箱 package.json、沙箱直接 src/*.ts，以及五个上游沙箱组件的中英文 README。其余第三方依赖 README、许可、二进制及整个安装包不复制；也不把组件存在当成需求或通过结论。

检查结论来自此前本机安装检查；本次入库新增了上述上游沙箱文档副本。检查结论中“未逐篇新增解读”仍有效，这些副本提供追溯材料而不是新的测试结论。外部 desktop/runtime 仅做文档抽查，不在本目录伪装成已完整扫描。

## 没有取得什么

未识别出完整产品 PRD，也未在包内文件路径中找到《tpt-memory 产品设计文档.md》。这不能证明所有代码内容里都不存在设计片段。外部设计文档作者与权威性仍待确认；本次没有使用聊天、密钥或私人资料来补充知识。
''',encoding='utf-8')
# Save script as a reproducible record, without changing extracted originals.
shutil.copyfile(__file__,dest/'提取脚本.py')
idx=root/'01-产品资料/README.md'
text=idx.read_text(encoding='utf-8')
text=text.replace('[记忆设计原文]','[已有记忆设计文档（作者与来源待确认）]')
item='- '+link('安装包技术资料（独立来源，含获取过程）','安装包技术资料/README.md')
if item not in text:text+='\n'+item+'\n'
idx.write_text(text,encoding='utf-8')
overview=root/'01-产品资料/产品概览.md'
text=overview.read_text(encoding='utf-8')
note='\n## 安装包技术资料来源\n\n'+link('安装包技术资料','安装包技术资料/README.md')+'独立保存本机安装包的提取文件、获取过程和逐文件来源清单。它们属于技术说明与实现资料，不直接等同于产品需求。已有《tpt-memory 产品设计文档.md》的作者及原始来源仍未确认。\n'
if '## 安装包技术资料来源' not in text:overview.write_text(text+note,encoding='utf-8')
original=json.loads((root/'00-导航与整理记录/迁移清单.json').read_text(encoding='utf-8-sig'))
for row in original['files']:
 assert hashlib.sha256((root/row['new_path']).read_bytes()).hexdigest()==row['sha256_before'],row['new_path']
for p in [dest/'README.md',idx,overview]:
 for url in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
  assert (p.parent/unquote(url)).exists(),(str(p),url)
print(json.dumps({'directory':str(dest),'extracted':len(records),'original_files_verified':len(original['files']),'source_sha256':manifest['archive_sha256']},ensure_ascii=False))
