"""Offline reference migration; directory moves are performed separately in PowerShell."""
from pathlib import Path
import hashlib, json, os, posixpath, re, subprocess, sys

ROOT = Path(__file__).resolve().parent.parent
MAP = {
    '02-测试方法与技术参考/README.md': '03-测试技能/接入参考.md',
    '02-测试方法与技术参考/下一轮测试代码分层设计.md': '04-测试工具/ui-operations/docs/下一轮测试代码分层设计.md',
    '02-测试方法与技术参考/测试接入与执行指南.md': '03-测试技能/exploratory-testing/references/测试接入与执行指南.md',
    '02-测试方法与技术参考/portable-agent-exe-ui-api-guide.md': '03-测试技能/exploratory-testing/references/portable-agent-exe-ui-api-guide.md',
    '03-测试批次': '05-探索性测试/历史归档/早期测试批次',
    '04-测试项': '02-测试项',
    '05-测试结果': '06-正式测试报告',
    'skills': '03-测试技能',
    'tools': '04-测试工具',
    '探索性测试': '05-探索性测试',
    '证据': '05-探索性测试/历史归档/根目录散落证据',
    'DIALOG048-table-temp.png': '05-探索性测试/历史归档/根目录散落截图/DIALOG048-table-temp.png',
}
STATE = ROOT/'00-导航与整理记录/2026-10-09-路径迁移.json'

def mapped(p):
    for a,b in MAP.items():
        if p == a or p.startswith(a+'/'): return b+p[len(a):]
    return p

def selected(p):
    if p in ['README.md','AGENTS.md','.gitattributes','探索性测试/README.md']: return True
    if p.startswith('探索性测试/_模板-通用测试任务/'): return True
    if p.startswith(('skills/','02-测试方法与技术参考/','05-测试结果/')): return True
    if p.startswith('01-产品资料/'): return p.endswith('/README.md')
    if p.startswith(('04-测试项/','tools/')):
        parts=p.split('/')
        return not any(x in parts for x in ['archive','sources','node_modules','__pycache__','fixtures']) and not p.endswith('report-3way.md')
    return False

if sys.argv[1]=='prepare':
    names=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=ROOT).decode('utf-8').split('\0')
    files=[]
    for n in sorted(set(names)):
        p=ROOT/n
        if selected(n) and p.is_file() and (p.suffix in ['.md','.json','.mjs','.cjs','.py','.ps1'] or n=='.gitattributes'):
            files.append(n)
    protected=[p for p in names if p.endswith('/AGENTS.md') and p.startswith('03-测试批次/')]
    hashes={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in protected}
    STATE.write_text(json.dumps({'mapping':MAP,'reference_files':files,'protected_sha256':hashes},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Reference files:',len(files),'protected:',len(hashes))
elif sys.argv[1]=='rewrite':
    state=json.loads(STATE.read_text(encoding='utf-8')); changed=[]; link_issues=[]
    for old in state['reference_files']:
        new=mapped(old); p=ROOT/new
        data=p.read_bytes()
        try: s=data.decode('utf-8-sig')
        except UnicodeDecodeError: continue
        links={}
        if p.suffix=='.md':
            def link(m):
                target=m.group(1)
                if '://' in target or target.startswith('#'): return m.group(0)
                base,sep,anchor=target.partition('#')
                resolved=posixpath.normpath(posixpath.join(posixpath.dirname(old),base))
                dest=mapped(resolved)
                updated=posixpath.relpath(dest,posixpath.dirname(new) or '.')+(sep+anchor if sep else '')
                key='MIGRATIONLINK'+str(len(links))+'TOKEN'
                links[key]=']('+updated+')'
                if (ROOT/dest).exists() is False and (ROOT/resolved).exists() is False: link_issues.append([new,updated])
                return key
            s=re.sub(r'\]\(([^)]+)\)',link,s)
        # Replace root path tokens, not module names such as business/skills or JSON tools fields.
        pairs=sorted(MAP.items(),key=lambda x:len(x[0]),reverse=True)
        pattern=r'(?<![\w/\\-])((?:\.\./)*)('+ '|'.join(re.escape(a) for a,b in pairs)+r')(?=/|[\\`\s\"\']|$)'
        def token(m):
            if m[2] in ['skills','tools','证据'] and s[m.end():m.end()+1]!='/': return m[0]
            return m[1]+MAP[m[2]]
        s=re.sub(pattern,token,s)
        # Repository-relative Windows paths in commands.
        for a,b in pairs:
            if a not in ['skills','tools','证据']:
                s=s.replace(a+'\\',b.replace('/','\\')+'\\')
        for key,val in links.items(): s=s.replace(key,val)
        if s!=data.decode('utf-8-sig'):
            p.write_bytes((b'\xef\xbb\xbf' if data.startswith(b'\xef\xbb\xbf') else b'')+s.encode('utf-8')); changed.append(new)
    for old,digest in state['protected_sha256'].items():
        assert hashlib.sha256((ROOT/mapped(old)).read_bytes()).hexdigest()==digest,old
    state['changed_references']=changed; state['unresolved_links']=link_issues
    STATE.write_bytes((json.dumps(state,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
    print('Changed:',len(changed),'Unresolved links:',len(link_issues),'Protected hashes: OK')
