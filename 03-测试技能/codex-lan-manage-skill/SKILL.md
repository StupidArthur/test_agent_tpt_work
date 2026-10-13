---
name: codex-lan-manage
description: 通过 Codex CLI App Server 的 WebSocket/JSON-RPC 管理局域网内多台 Codex 工作机；探活、派工、续接、线程和事件、审批、打断以及完整原生协议透传。默认继承目标机 Codex 的模型与 Provider 配置。
---

# Codex LAN

使用 `scripts/codexctl.py` 管理已启动 `codex app-server` 的局域网 Windows/Linux/macOS 机器。此 Skill 是主控 Agent 的管理规程；CLI 封装 WebSocket/JSON-RPC，不负责配置工作机模型，也不自动修改 Git 或执行验收决策。

## 三层设计

| 层 | 入口 | 约定 |
|---|---|---|
| 原生协议层 | `rpc METHOD --params-file FILE` | 支持**任意方法、完整参数对象**；不会对字段设白名单或改写配置 |
| 原生双向协议层 | `bridge` | stdin JSONL → WebSocket；WebSocket → stdout JSONL，**包括通知和服务器主动发起的带 id 请求** |
| 便捷管理层 | `servers / info / ps / ls / run / messages / events / interrupt` | 高频命令；主控处理任务分配、状态、Git 审核 |

**完整封装不等于把每个方法写成独立 CLI 快捷命令。** 原生 RPC/bridge 保证新增方法、选填字段和实验字段可以不经过本 Skill 的白名单直接送达工作机；实际是否合法由该机 Codex 版本决定。

## 默认 Provider/Model 策略（强约定）

1. 工作机**已经**以自身用户账号配置并验证 Codex CLI（`config.toml`、`CODEX_HOME`、Provider、Model、认证及推理参数）。
2. 管理客户端 **默认完全不传** `model`、`modelProvider`、`config`、推理强度等覆盖字段；从工作机当前有效 Codex 配置获取默认值。
3. 模型/Provider **不得写死在 Skill 和机器清单**，也不对用户现有第三方模型接入作协议探测或强制修复。
4. 调用方主动指定时，接口必须允许完整传参：`--thread-params-file`、`--turn-params-file`、`rpc` 及 `bridge`。缺省、显式 `null`、空数组不能偷偷归一化。
5. 续接既有线程默认沿用该线程的配置；修改默认模型后通常应新开线程。启动 app-server 的系统用户须与已验证的 Codex 环境一致。
6. 机器连接用的 Bearer token **不是模型供应商 API key**，Skill 仅读取主控环境变量，不存明文凭据。

## 安全启动和连接

Codex App Server WebSocket 目前仍是**实验性**能力。优先使用 SSH 端口转发；**不能把无认证的 ws 直接暴露给整个局域网**。本客户端拒绝对非回环地址的明文 `ws://` 连接；远端直连要求 **TLS `wss://` + Bearer token**。

目标 Windows PC 用原有 Codex 用户身份在 CMD/PowerShell：

```powershell
codex --version
codex app-server --listen ws://127.0.0.1:4500
```

主控侧转发 PC88（示例）：

```powershell
ssh -N -L 127.0.0.1:4588:127.0.0.1:4500 user@PC88
```

如必须非本机监听，应先核实 Codex 版本支持的认证参数，并通过 TLS 反向代理发布 wss 服务：

```powershell
# 服务端 token 文件只能存在工作机私密位置，不提交 Git
codex app-server --listen ws://0.0.0.0:4500 --ws-auth capability-token --ws-token-file C:\secure\codex-app-server-token
```

上例仅为 **TLS 代理后端**，其 `ws://0.0.0.0` 监听必须额外通过防火墙限定代理来源；不能直接在 LAN 公开。认证凭据由客户端 `Authorization: Bearer TOKEN` 传递。推荐在高安全环境仅使用回环+SSH。

参考：[Codex App Server 官方文档](https://developers.openai.com/codex/app-server/)。

## 安装与机器清单

主控 Python 3.11+：

```powershell
py -3.11 -m pip install "websockets>=14,<17"
Copy-Item '03-测试技能/codex-lan-manage-skill/references/servers.example.json' '.lan-codex.json'
```

`.lan-codex.json` 是管理项目根目录的局域网连接清单（自动向上查找）；可通过 `--servers`、`CODEXCTL_SERVERS` 指定。建议将文件加入**实际管理项目根**的 `.gitignore`；不要存密码明文。样例：`PC88.url = ws://127.0.0.1:4588`、`PC88.token_env = CODEX_PC88_TOKEN`。支持 `--server PC88`、URL 和 `CODEXCTL_SERVER`；Bearer 的环境变量名由 `--token-env` > 清单 `token_env` > `CODEXCTL_TOKEN` 决定。

## 常用命令（主控 PowerShell）

```powershell
$ctl = '03-测试技能/codex-lan-manage-skill/scripts/codexctl.py'
py -3.11 $ctl servers
py -3.11 $ctl ps                    # 不写 --server，汇总全机队
py -3.11 $ctl --server PC88 info
py -3.11 $ctl --server PC88 ls --limit 50
py -3.11 $ctl --server PC88 ps
py -3.11 $ctl --server PC88 --json run --cwd 'D:/work/project-a' '调查冒烟测试结果'
py -3.11 $ctl --server PC88 --json run --detach --require-idle --cwd 'D:/work/project-a' '在 PC88 分支工作并回报证据'
py -3.11 $ctl --server PC88 run --thread 'THREAD_ID' '追加检查并生成报告'
py -3.11 $ctl --server PC88 messages 'THREAD_ID'
py -3.11 $ctl --server PC88 events --thread 'THREAD_ID' --timeout 60
py -3.11 $ctl --server PC88 interrupt 'THREAD_ID' 'TURN_ID'
```

- `run` 返回 `threadId`、`turnId` 和 turn 状态，等待模式会包含拼接的增量文本。事件流文本不是成功断言；以 `turn/completed` 状态、`thread/read` 和实际工作机结果复核。
- `--detach` **仅表示服务端接收了 turn**；断开后运行能否持续取决于 app-server/审批等条件。不能据此宣称任务完成。后续使用 `ps/messages/events` 对账。
- `--require-idle` 检查 `thread/list` 中 active 状态，属于**非原子尽力检查**，不能替代管理台账中的一机一任务及验收闸门。
- `run` 超时默认**不自动打断**，退出码 3，避免网络波动后重复执行有副作用的任务。手动确认后用 `interrupt`。
- 默认服务端审批策略 `--approvals deny`：已知命令/文件批准请求明确拒绝，未知反向请求返回错误；`--approvals manual` 允许有真实人工交互的终端提交原生 JSON 审批答复。绝不为无人值守方便自动选择“全部允许”。

## 完整 RPC / 双向接口

```powershell
# 提交任意 method 和完整请求 params；调用方负责内容合法性
py -3.11 $ctl --server PC88 rpc 'model/list' --params-json '{"includeHidden":true}'
py -3.11 $ctl --server PC88 rpc 'thread/start' --params-file '.local-thread.json'

# 高级任务完整覆盖（包括显式模型字段），默认任务不需要这两个参数
py -3.11 $ctl --server PC88 run --cwd 'D:/work/project-a' --thread-params-file '.local-thread.json' --turn-params-file '.local-turn.json' '审查项目'

# 已启用实验字段的客户端能力；远端不支持时以远端的 RPC 错误为准
py -3.11 $ctl --server PC88 --experimental rpc 'thread/turns/list' --params-file '.local-request.json'

# 原生双向 JSONL bridge；必须由调用者自行处理 id、服务器反向请求及审批
py -3.11 $ctl --server PC88 bridge
```

`bridge` 建立连接后自动完成 `initialize / initialized`；之后 stdin 的每个完整 JSON 对象都原样发送到服务器，stdout 输出服务器完整帧（请求、响应、通知），不自动帮调用者做反向请求决策。为避免多并发 ID 冲突，桥接程序需自行管理 request ID。它是本 Skill 的**完整协议逃生口**，例如原生 `thread/fork`、`turn/steer`、`thread/delete`、沙箱/审批/配置的最新可选字段，以及新 RPC 方法，都无需增加快捷命令。

**协议版本**：先在目标工作机运行 `codex app-server generate-json-schema --out DIR`，必要时加该版本支持的 `--experimental`。不同 Codex 版本 Schema 会不同；禁止硬编码一份旧 Schema 然后删除新字段。对于 `thread/shellCommand`、`command/exec`、`thread/delete` 等敏感 RPC 方法，必须单独确认授权。拥有接口透传能力不等于默认具有执行许可。

## 主控多机 Git 规程（继承 OpenCode LAN）

1. 机器名采用 `PC88`、`PC89` 等，每台机器在**每个项目仓库**长期只使用同名 Git 分支：`PC88` 只提交、推送 `origin/PC88`；不许擅自合并或推送 `main`、他机分支。
2. 每轮派单包含 `jobId, pc, cwd, repo origin, baseSha, branch, prompt`；新 turn 之后记录 `threadId, turnId`；验收后补充 `commitSha, tests, evidence, accepted/rejected/merged`。
3. 台账建议存在**主控项目根**的 `.codexmanage/tasks.jsonl`（项目自行加入 `.gitignore`），此仓库不保存外部项目的运行态/机密信息。
4. 同一 PC 同时只分配一个业务任务；`ps` 显示空闲不等于主控验收完成。必须检查代码 diff、测试和证据，决定合并/返修/放弃后才可派下一项。
5. 工作机遇到脏工作区、非快进、origin 不匹配应停止上报；禁止未经确认 `reset --hard`、`clean -fd`、强推。
6. 主控独占主分支合并权；合并后工作机在干净状态 `git fetch origin`、`git merge --ff-only origin/main`、`git push origin PC88`，同步成功再收新任务。建议 Git 服务器侧配置保护规则和最小权限机器凭据。

## 本地自检与结果边界

```powershell
py -3.11 -m unittest discover -s '03-测试技能/codex-lan-manage-skill/scripts' -p 'test_*.py' -v
```

测试使用模拟 app-server，可以验证握手、请求、全量透传、安全默认值及任务状态；**不等于真实局域网 Windows Codex 的集成测试**。真正验收时在工作机中按相同用户、相同配置运行只读任务，并审查终态和生成证据。连接异常、工具错误与产品/模型输出差异应分别记录。退出码：0=已完成命令（detach 仅是接单），1=参数/连接/RPC 错误，2=turn 未成功完成，3=超时。
