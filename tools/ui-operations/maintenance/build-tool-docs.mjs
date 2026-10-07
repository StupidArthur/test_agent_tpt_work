import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {orderedFunctions,discovery} from '../automation/discovery.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'business/catalog.json'),'utf8'));
const docs=path.join(root,'docs');fs.mkdirSync(path.join(docs,'modules'),{recursive:true});
const groups=new Map();for(const f of orderedFunctions(catalog.functions)){const key=f.name.split('.')[0];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f);}
const titles=Object.fromEntries(discovery.modules.map(m=>[m.name,m.title]));
const esc=s=>String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
const index=['# 按功能找工具','','没有 case 编号时，从本页选一个功能模块。只读需要的模块，再对候选函数执行 `--describe`；不需要读全库源码。','',`本页由 business/catalog.json 生成，当前 ${catalog.functions.length} 个函数。登记数量不是实机验证数量。`,'','| 功能 | 函数数 | 阅读入口 |','|---|---:|---|'];
for(const [key,functions]of groups){const title=titles[key]||key;index.push(`| ${title} | ${functions.length} | [${key}](modules/${key}.md) |`);
 const lines=[`# ${title}`,'','[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)','','本页用于选函数。选中后只读一个函数的参数契约：','','```powershell',`node tools/ui-operations/call.mjs --describe ${functions[0].name}`,'```','','参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。'];
 if(key==='skills')lines.push('','**选用提醒**：入口自身是否新建会话用 `useSkillDirect`；`useSkill` 会准备新任务。开关 `toggleSwitchNoDetail` 包含恢复动作。');
 if(key==='conversation')lines.push('','**选用提醒**：当前任务权限用 `readTaskPermissionOptions/setTaskPermission`，默认权限属于 settings。CDP 合成快捷键无响应不能直接推断原生快捷键坏。');
 if(key==='experts')lines.push('','**选用提醒**：末尾真实可见使用 `scrollPromptToEnd`；不要仅检查整段文字包含末尾标记。编辑要独立验证确认前不写入、确认后实际写入和文件恢复。');
 if(key==='settings')lines.push('','**选用提醒**：插件使用 `listPluginCards/setPluginExpanded`。设置按初值→改动→效果→重开→恢复取证；checkbox 保存失败反馈应在关闭前读取。');
 if(key==='memory')lines.push('','**选用提醒**：先读 [记忆与进化](../记忆与进化.md)。本机环境提供 memory_root；编辑必需文件身份和初始哈希；写前备份、写后独立回读并恢复。MEM 操作计划标记 partial，不代表完整测试项覆盖。');
 if(key==='fixtures')lines.push('','**选用提醒**：服务 URL/端口/日志路径使用本次函数返回值。文件先备份，最后恢复并核验。夹具身份和各字段搜索词应本轮唯一。');
 const features=new Map();for(const f of functions){const feature=(f.feature_path||[title]).join(' → ');if(!features.has(feature))features.set(feature,[]);features.get(feature).push(f);}
 for(const [feature,items]of features){lines.push('',`## ${feature}`,'','| 函数 | 用途 | 必填参数 |','|---|---|---|');for(const f of items)lines.push(`| \`${f.name}\` | ${esc(f.description)} | ${esc((f.parameters?.required||[]).join(', ')||'无')} |`);}
 lines.push('','## 找不到需要的操作','','先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。','');
 fs.writeFileSync(path.join(docs,'modules',key+'.md'),lines.join('\n'));
}
index.push('','## 有 case 编号时','','优先 `node tools/ui-operations/call.mjs --plan G10-07`，它返回该 case 的操作与取值候选。映射是选用提示，最终判据仍由本轮 case 决定；历史路径、session、call/event 不能直接复用。','','## 阅读到哪里就可以开始','','拿到正确函数、明确参数来源、知道读取哪些实际值和如何恢复，就可以调用。出现异常再读 [补测规则](../../../skills/exploratory-testing/references/retest.md)。','');
fs.writeFileSync(path.join(docs,'功能索引.md'),index.join('\n'));
fs.writeFileSync(path.join(root,'README.md'),`# 软件 UI 操作工具入口

按下面顺序渐进阅读。每次只查当前任务需要的部分，不要求通读全部函数和源码。

## 第一步：会接入、会调用

首次使用读 [快速开始](docs/快速开始.md)，完成一次连接核验；已经接入的 Agent 可以跳过。任务规则来自本轮 README、根 AGENTS 和 [探索性测试技能](../../skills/exploratory-testing/SKILL.md)。

## 第二步：找到当前操作的函数

有 case 编号，先查单条映射：

~~~powershell
node tools/ui-operations/call.mjs --plan G10-07
~~~

没有编号，先检索少量候选；功能不明确时查 --modules。也可从 [功能索引](docs/功能索引.md) 进入模块：

~~~powershell
node tools/ui-operations/call.mjs --find "技能 快捷使用" --module skills --limit 3
~~~

索引按功能分级列出用途和必填参数，不必读其他模块。搜索只是关键词候选，不能保证适用。映射是选用提示，不能替代本轮 case 的判据。存放和排序原则见 [工具发现与组织](docs/工具发现与组织.md)。

## 第三步：只查选中函数的契约

~~~powershell
node tools/ui-operations/call.mjs --describe skills.useSkillRequest
~~~

核对参数来源、对象、是否含准备或恢复，以及真正要读取的结果。按 [调用与记录](docs/调用与记录.md) 执行、比较实际值、恢复并引用本轮证据。

status=returned 不表示 case 通过。优先调用现成函数；缺能力时读 [扩展与边界](docs/扩展与边界.md)，保留新增任务函数及实际调用，供收尾审核。

## 需要时再查

| 遇到的情况 | 阅读入口 |
|---|---|
| 找功能、选函数 | [功能索引](docs/功能索引.md) |
| 批量操作、返回结构、记录与恢复 | [调用与记录](docs/调用与记录.md) |
| 异常、读值矛盾、前置失败 | [补测规则](../../skills/exploratory-testing/references/retest.md) |
| 没有合适函数、需留存新函数 | [扩展与边界](docs/扩展与边界.md) |
| 查看用例候选映射 | [用例映射](coverage/README.md)，通常优先单条 --plan |
| 实际验证和已知缺口 | [全面回归验收](../../探索性测试/2026-10-07-全面回归验收/验收报告.md) |
| 当前覆盖与效率评估 | [当前评估](docs/当前评估.md) |
| 记忆面板、文件取证与添加/编辑 | [记忆与进化](docs/记忆与进化.md) |

目录：tools/ui-operations 是唯一实现位置。旧 tools/tpt-work 只保留历史脚本转发入口；新任务统一使用新目录。

代码职责：automation/ 管接入、定位、控件与记录；business/ 提供业务函数；coverage/ 建立用例映射；fixtures/ 提供夹具；sources/ 保存来源。LLM 根据 case 安排调用顺序和判定，不需要为每条 case 编写新脚本。
`);
console.log(JSON.stringify({functions:catalog.functions.length,modules:groups.size}));
