# TPT Work 本地宿主接口工具（tptapi）

[返回工具入口](../README.md)

不经 UI，直接调用**正在运行的 TPT Work 实例**的本地宿主接口（Typert Gateway）。用于：任务对话与结果回收、命令/权限切换、项目增删、审批应答，以及排查"某功能能否用接口完成"。

## 前置与边界

- 需要本机已运行的 TPT Work 实例（默认 CDP `127.0.0.1:9234`，宿主 `127.0.0.1:21029`）。
- 鉴权用**实例自身的 cookie 会话**：工具从实例的 CDP 读取它自己的 `dsh-auth-*` cookie，因此不需要启动 token，也不重启实例。
- **只对本机回环宿主使用**：`--host`/`--cdp` 仅接受 **http** 回环地址（非 `127.0.0.0/8`、`::1`、`localhost` 或 https/wss 一律拒绝）；URL 不允许携带凭据、路径或 query/hash；HTTP 重定向不跟随（凭据不离开已绑定宿主）。CDP 返回的 `webSocketDebuggerUrl` 也必须是 ws: 回环地址，否则不发起连接。
- **实例身份由调用方提供并每次重申**：`--instance "<pid>:<processStartTimeUtc>"` 取自 `ui-driver` 的 `application.open` 结果（`processInfo.processId` 与 `processInfo.processStartTimeUtc`；该函数核验 CDP 端口归属，不核验 API 宿主端口）。
- **cookie 缓存绑定来源与身份**：缓存为 JSON（`.cache/cookie.txt`，v3），记录规范化 `host`/`cdp`、`instance`、`savedAt`。使用缓存时必须满足 host/cdp 一致**且**当次 `--instance` 与缓存记录一致（可识别同端口重启/换实例）；旧格式或身份不一致一律拒绝，修改请求数为 0。缓存**不进入 Git**。
- **显式 `--cookie`/`--cookie-file` 的保证范围**：只提供凭据，**不证明实例身份**，不做任何绑定校验；调用方须自行确保该凭据与目标实例匹配（此路径无法识别同端口重启）。
- 本工具直接操作产品的数据根，会**真实创建/修改会话、项目与设置**，只应在**授权实例**上使用；它不替代 UI 断言，也不负责实例绑定/进程核验（那属于 `ui-driver` 的 `application.*`）。
- 实例的宿主端口若不是 21029，用 `--host`；CDP 端口若不是 9234，用 `--cdp`。可用 `TPT_DESKTOP_PORT` 指定宿主端口（启动时）。

## 快速开始

```powershell
# 0) 先用 ui-driver 取得实例身份（pid + 进程启动时间；核验 CDP 端口归属；宿主端口归属需另行确认）
#    $id = "<processInfo.processId>:<processInfo.processStartTimeUtc>"

# 1) 取一次鉴权 cookie（从 9234 的实例渲染进程；绑定实例身份）
node 04-测试工具/api-client/tptapi.mjs cookie --instance $id

# 2) 只读探活（使用缓存时须再次重申同一个 --instance）
node 04-测试工具/api-client/tptapi.mjs call settings/describe --instance $id --pretty
node 04-测试工具/api-client/tptapi.mjs session list --instance $id --pretty

# 3) 发一条任务对话并回收结果
$sent = node 04-测试工具/api-client/tptapi.mjs session prompt $sid "请只回复四个字：接口可用" --instance $id --pretty | ConvertFrom-Json
$rid  = $sent._request.requestId        # 本轮请求身份（客户端字段）
node 04-测试工具/api-client/tptapi.mjs session projections $sid --instance $id --pretty  # title/turnOutline/tptTurnOutcome/asOfSeq
node 04-测试工具/api-client/tptapi.mjs session page $sid --instance $id --pretty          # 一页历史 + _page.status/nextBeforeSeq

# 4) 切换任务访问模式（纯一元）
node 04-测试工具/api-client/tptapi.mjs permission $sid read-only --instance $id

# 5) 应答审批（非一元：$events WS + $events/result）
#    决定必须显式给出；不加 --any（本版仅支持指定 session 的审批）
node 04-测试工具/api-client/tptapi.mjs approve $sid allowed-once --instance $id --timeout 60000
```

### 结果回收：需调用方编排（本工具只提供原始查询）

`session prompt` 返回 `accepted` 只表示**已接收**；`session projections` 是一次**快照**；`session page` 是**一页历史**。三者都不等于“任务已完成”。完整回收由调用方按以下步骤编排：

1. **提交请求**：`session prompt ... --requestId <rid>`（或让工具生成），从输出 `_request.requestId` 取本轮请求身份，并记录 `_request.sessionId`。
2. **识别对应回合**：轮询 `session/projections`，用 `turnOutline[].turn/seq` 与 `tptTurnOutcome{turn,kind,code}` 定位**本轮**对应的回合（不要取旧回合的 response）。
3. **等待终态**：直到该回合 `tptTurnOutcome.kind` 离开 `running`（成功/失败/取消分别处理）。
4. **固定快照**：取该次 projections 的 `asOfSeq` 作为 `throughSeq`，之后**每一页都显式传同一个 `--throughSeq`**。
5. **翻页取全**：`session page --throughSeq <asOfSeq> [--beforeSeq <n>]`，读取 `_page.status`；
   - `status=complete` → 已取全；
   - `status=partial` 且 `stopReason=has-more` → 用**相同的 `--throughSeq`** 与 `--beforeSeq <_page.nextBeforeSeq>` 继续；
   - `status=partial` 且 `stopReason` 为 `has-more-without-usable-cursor` / `cursor-not-advancing`，或 `status=failed` → **停止并标未取全**，不得宣布完成。
6. 期间产生的新事件不影响本轮快照（因为 `throughSeq` 固定）；如游标不推进或页面重复，同样停止并报告。

不要把一次空 `response` 当作“模型无回复”，也不要把旧回合结果当作本轮结果。

## 命令一览

| 命令 | 说明 |
|---|---|
| `cookie [--timeout ms] --instance <id>` | 从实例 CDP 读取唯一产品 target 的 `dsh-auth-*` cookie 并缓存（记录 host/cdp/实例身份）；默认总期限 8s |
| `verbs [--filter <s>]` | 列出静态导出的可调用端点（`endpoints.json`） |
| `call <endpoint> [--args <json>\|--args-file <f>]` | 一元调用 `POST /api/<endpoint>` |
| `raw <endpoint> <args-json>` | 同上，参数作为位置参数 |
| `session list\|create\|prompt\|page\|projections\|cancel` | 会话对话与结果回收 |
| `session prompt <sid> <text> [--mode queue\|steer] [--requestId <id>]` | 输出 `_request.requestId`（客户端字段）与 `accepted` |
| `command <sessionId> <line>` | `commands/execute`（身份参数 `agentId=sessionId`） |
| `permission <sessionId> <preset>` | 等价 `command <sid> "/permission <preset>"`；preset 限于文档支持集合 |
| `workspace create <path>\|delete <workspaceId>` | 建/删项目 |
| `session page <sid> [--throughSeq n] [--beforeSeq n] [--max n]` | 未传 `--throughSeq` 时先取 `projections.asOfSeq`；输出 `_page.status/stopReason/nextBeforeSeq` |
| `approve <sessionId> <allowed-once\|rejected\|cancelled> [--timeout ms] [--count n]` | 订阅 `$events` 并应答审批；**决定必须显式给出**，本版已移除 `--any` |

全局选项：`--host`、`--cdp`（都必须为 http 回环）、`--cookie`、`--cookie-file`、`--instance <pid:startTime>`、`--pretty`。
退出码：`0` 成功；`1` 用法/HTTP/协议/传输错误；`2` 调用返回 `ok:false`；`3` `approve` 未达 `--count`。

错误输出为结构化 JSON：`{"error":{"kind":"usage|http|protocol|transport|timeout|business|cdp","message":...,"stage":...,"eventId/endpoint/httpStatus":...}}`，便于调用方定位失败阶段。

## 协议要点（详见 [docs/网关协议.md](docs/网关协议.md)）

- 一元：`POST /api/<endpoint>`，体 `{"type":"client-request","rpcId":...,"method":"<endpoint>","payload":{"args":{...}}}`；返回 `{"type":"server-response","rpcId":...,"result":{"ok":true,"value":...}}`。业务错误常以 HTTP 200 返回，需查 `result.ok`。
- 流式/审批：WebSocket `/api/remote.mux`，发 `{type:'open',streamId,endpoint:'$events',payload:{args:{}}}`；收到 `{type:'item',value:{type:'ready',clientId,...}}`，随后 `waterfall`（`approval/request`）帧；回送 `POST /api/$events/result`，体 `{clientId,eventId,outcome:{kind:'result',value:'allowed-once'|'rejected'|'cancelled'}}`。
- **身份参数**：需要 `agent` 的端点（`commands/execute`、`userQuestions/answer` 等）在 wire 上是 `agentId`，**值即 `sessionId`**。
- 已知坑：外部原始 `$events` 订阅对**连接时已挂起**的审批会补投；连接期间新产生的审批补投不完全稳定，可靠做法是"重连订阅 + 处理积压"。
- 审批可靠性（本工具实现约定）：事件**串行**处理（同一时刻最多 1 个在途回送）；额度按**全局** `--count` 计算并覆盖在途请求；按 `eventId` **去重**（含跨重连）；只有服务端明确确认 `result.ok=true` 才计入 `answered`；结束时对连接做**有界销毁**（对端不协助关闭也会在总期限内退出）。

## 文件

- `tptapi.mjs`：命令行实现（零第三方依赖，Node ≥ 18；WebSocket 用 Node ≥ 22 的全局 WebSocket + 内置 http 手动升级）。
- `endpoints.json`：从安装包静态导出的可调用端点清单（144 条；随版本变化，用 `verbs` 查看）。
- `docs/网关协议.md`：协议与字段参考。
- `.cache/`：cookie 缓存（不入库）。

## 来源与验证

本工具的方法与端点来自对 `0.1.4-nightly.202610121943` 安装包的静态解析与本机实测（一元调用、`commands/execute` 档位切换、`$events` 审批应答两条路径）。原始探索与证据见 `05-探索性测试/2026-10-14-API端点清单与UI验证/`。端点集合随产品版本变化，不保证长期有效；以运行实例实际返回为准。

### 变更说明（2026-10-14 修复轮，见 `05-探索性测试/2026-10-14-tpt-work-api专项验收/复测-P1P5/`）

按专项验收的 38 项候选问题做了最小必要修复（离线模拟回归全通过，真实集成仍未验证）：

- 一元响应统一判定：保留真实 HTTP 状态（响应体 `httpStatus` 不能覆盖）、校验 `type`/`rpcId`/`result.ok`；非 JSON、错 rpcId、HTTP 错误分别以 `protocol`/`http` 结构化错误退出非 0（原先会静默退出 0）。
- 审批：回送失败不计成功、异步异常结构化、事件串行 + 全局额度 + `eventId` 去重；未达 `--count` 一律非 0，并输出 `requested/answered/remaining/terminationReason`。
- 连接：`--timeout` 为整条命令总期限（握手/订阅/回送/重连/CDP 共用剩余时间）；非 101 升级、伪 `Sec-WebSocket-Accept` 明确失败；处理 upgrade `head`、continuation、ping/pong、close；结束时清理并销毁句柄。
- 实例边界：`--host/--cdp` 仅回环；cookie 缓存绑定 host/cdp 来源并拒绝旧无来源缓存；CDP 只接受**唯一**产品 target（无匹配或多义即失败）。
- 契约收紧：**移除 `--any`**（仅支持指定 session 的审批；传 `--any`/`--any false` 明确拒绝）；`--count/--timeout/--max/--throughSeq` 等改为严格整数校验；缺失选项值、未知参数在发请求前拒绝；`permission` preset 限于文档支持集合。
- 查询契约：`session page` 未传 `--throughSeq` 时先取 `projections.asOfSeq`，并输出 `_page.hasMore/nextBeforeSeq`；README 明确“完整结果回收需调用方编排”，不把接口读取等同于 UI 切换。

### P7 定向补修（2026-10-14 追加）

- **实例绑定（P7.1）**：新增 `--instance "<pid>:<startTime>"`（取自 `ui-driver application.open`）；缓存（v3）记录并校验该身份，使用缓存时必须重申，地址一致但身份不同/同端口重启一律拒绝（0 请求）。**剩余缺口**：tptapi 不能独立证明宿主端口与 CDP 属于同一进程——调用方需另行确认宿主端口归属，传入身份仅作缓存一致性检查，故 F-33 仅判部分修复。
- **请求身份与固定快照分页（P7.2）**：`session prompt` 输出 `_request.requestId/sessionId/accepted`（客户端字段，命名不与服务端确认混淆）；`session page` 的 `_page` 增加 `status`（complete/partial/failed）与 `stopReason`（has-more / has-more-without-usable-cursor / cursor-not-advancing / business-error），游标不可用或业务失败时明确提示停止并标未取全。
- **协议一致（P7.3）**：`--host/--cdp` 统一只接受 **http** 回环（https/wss 在发请求前结构化拒绝）；审批把 http 显式映射为 `ws:`；CDP 返回的 `webSocketDebuggerUrl` 必须是 **ws: 回环**，否则不发起连接。

### 实例身份的能力边界（明确记录，非“已结清”）

`tptapi` 能证明的：请求确实发往「本机回环 + 与缓存记录一致 host/cdp + 调用方当次重申的 instance 身份」。
`tptapi` **不能**证明的：该身份确实属于当前监听 host/cdp 端口的那一个进程（端口归属与进程启动时间由 `ui-driver` 的 `application.*` 核验）。调用方必须独立核验实例归属，不能仅依赖 `tptapi` 的缓存校验；真实实例上的核验仍未验证。

## 当前交付范围

供测试工程师试用：已执行离线模拟样本通过，真实集成仍待验证。实例归属与 requestId 到真实回合的关联尚未完成实测。后续分页检测当前 beforeSeq 是否推进。UI smoke 底层整理仅经静态检查，相关现场验收待执行。
