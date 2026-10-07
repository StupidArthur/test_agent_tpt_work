# 给 Agent 的 TPT Work 启动与测试实操指南

这份文档可单独复制到另一台 Windows 机器。它说明如何找到并启动 `tpt-work.exe`，如何操作真实 UI，如何启动 `--test` 网关做 API 测试，以及如何把探索变成可复跑的 case。运行文中的现有脚本和 case 还需同时复制本测试仓库。安装路径、端口、项目目录和模型配置都以目标机器的实际情况为准。

**本仓库的使用顺序：**先读任务与 [测试方法入口](README.md)。已接入时调用 [软件 UI 操作工具](../tools/ui-operations/README.md)；本指南按需查启动、登录和API细节。文中 tests/ui、Playwright Test 与 npm run test:* 示例需要另有配套工程，不能仅复制本文就运行。本仓库现成函数的依赖在 tools/ui-operations/package.json。

## 先记住两条入口

| 要测什么 | 启动参数 | 连接方式 | 证明连接成功 |
| --- | --- | --- | --- |
| 真实 UI / E2E | `--remote-debugging-port=9234` | Playwright 连接 Electron 的 CDP | `/json/version` 可访问，`/json/list` 有 TPT 页面，实际界面可见 |
| API / wire | `--test --port=18471 --token=<token>` | HTTP Bearer + wire 消息 | 带 token 的 `/__verbs` 返回 200，网关进程仍存活 |

两个模式可以先后使用。产品可能只支持单实例；切换模式前先确认旧实例及其归属，避免把请求发给上一轮残留进程。端口号只是示例，可换，但启动参数、环境变量和探测地址必须一致。

## Agent 默认执行路线（先读）

**操作和测试真实界面时，默认使用 Playwright 连接 TPT Work 自身开放的 CDP 端口。** 不要把普通浏览器中的页面当作产品界面，也不要仅凭窗口出现就认定调试连接成功。按以下顺序执行：

1. 定位本机 exe、记录包身份，并检查已有 TPT Work 实例和端口。已有可用 CDP 实例就复用；没有时，先处理旧实例的归属，再带 `--remote-debugging-port` 启动。关闭窗口可能只隐藏窗口，后台进程仍会占用单实例锁；如果新启动后端口未监听，重新检查进程，不要反复启动。
2. 同时验证 `/json/version` 和 `/json/list`。后者必须有属于 TPT Work 的 `page` 或 `webview`；记录目标 URL。登录页可能是 `file:///.../renderer/welcome.html`，主界面是 `dsh-app://app/`，同一进程可同时暴露两者。按当前可见界面选择目标，不能只找 `dsh-app://` 然后误报“无页面”。
3. 用现成业务函数连接和操作；它们内部通过 Playwright `chromium.connectOverCDP()` 接入。按**观察 → 一组已确认的操作 → 等待结果 → 再观察与判定**执行。稳定表单填写可顺序合并；发生页面或流程状态变化后重新发现控件。缺能力才写留存的任务函数，定位限定对象与frame，不跨状态复用截图坐标。关闭 Playwright 连接不表示退出 TPT Work。
4. 按本轮任务保存实际输入、读取、调用、代码快照、结果与恢复。通过默认不截图，失败仅在图片有解释价值时留图。另有配套工程时才使用本文 fixture/test:* 示例，本仓库默认从 tools/ui-operations/call.mjs 调用业务函数。

桌面窗口工具适合处理 Playwright 看不到的原生 Windows 弹窗，或已运行但未开放 CDP 的实例；它不是这份指南的默认 UI 测试入口。测试网关是另一条 **API / wire** 入口，不等同于 CDP，也不能代替真实界面的可见状态验证。

## 第 1 层：定位 exe 与准备环境

在 PowerShell 中进入本测试仓库。**不要把仓库路径或 exe 安装路径写死到 case 里。**

```powershell
Set-Location '<测试仓库路径>'
Test-Path -LiteralPath '.\tools\ui-operations\package.json'
node --version
npm.cmd --version
# 使用本仓库的软件UI操作工具时，在仓库根目录执行：
if (Test-Path -LiteralPath '.\tools\ui-operations\package.json') {
  npm.cmd ci --prefix '.\tools\ui-operations'
}
# 使用独立配套测试工程时，另按该工程的package.json安装依赖。
```

优先使用操作者提供的安装路径。如果没有提供，可先检查当前用户的常见安装位置；仍找不到就请操作者给出路径，不要对整个磁盘盲目搜索：

```powershell
# 若操作者已提供真实路径，先设置：$env:TPT_EXE = '<真实绝对路径>\tpt-work.exe'
# 否则尝试当前用户的常见安装位置。
if (-not $env:TPT_EXE) {
  $candidateExe = Join-Path $env:LOCALAPPDATA 'Programs\tpt-work\tpt-work.exe'
  if (Test-Path -LiteralPath $candidateExe) { $env:TPT_EXE = $candidateExe }
  else { throw '找不到 tpt-work.exe，请操作者提供真实安装路径' }
}
$env:TPT_EXE = (Resolve-Path -LiteralPath $env:TPT_EXE -ErrorAction Stop).Path
Get-Item -LiteralPath $env:TPT_EXE | Select-Object FullName, Length, LastWriteTime
```

检查是否已有实例及端口占用：

```powershell
Get-CimInstance Win32_Process -Filter "Name='tpt-work.exe'" |
  Select-Object ProcessId, ParentProcessId, ExecutablePath, CommandLine
Get-NetTCPConnection -LocalPort 9234,18471 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalPort, OwningProcess
```

如果实例已由用户或别的 Agent 打开，先确认它的模式和端口。不要默认结束它，也不要在已有实例上叠加不同启动参数。使用当前机器上的真实项目目录；项目选择、项目文件以及任务归属都要从产品界面核对。

## 第 2 层：启动并操作 UI

### 2.1 启动 CDP 实例

确保没有冲突的旧实例后：

```powershell
$env:TPT_CDP_PORT = '9234'
$tptUiProcess = Start-Process -FilePath $env:TPT_EXE `
  -WorkingDirectory (Split-Path -Parent $env:TPT_EXE) `
  -ArgumentList "--remote-debugging-port=$env:TPT_CDP_PORT" `
  -PassThru
$tptUiProcess.Id
```

若用户已经以同样的 CDP 端口启动了软件，直接复用，不要再次启动。若用户手动打开的实例没有 CDP 端口，现有 Playwright 连接方式无法接管它；需要在确认可关闭后按上面的参数重启，或使用具备桌面窗口操作能力的工具。

启动后立刻查新进程是否仍存活，并执行下一节的两个 HTTP 探测。某些隔离执行环境会在命令结束时回收它启动的子进程；此时 `Start-Process` 返回 PID 也不代表应用持续运行。若端口不可达，先核对进程、单实例锁、端口占用及执行环境，再决定如何启动，不要直接将其解释为产品不支持 CDP。

### 2.2 验证是可操作的 TPT 页面

```powershell
$cdpBase = "http://127.0.0.1:$env:TPT_CDP_PORT"
$version = Invoke-RestMethod "$cdpBase/json/version" -TimeoutSec 3
$targets = Invoke-RestMethod "$cdpBase/json/list" -TimeoutSec 3
$version | Select-Object Browser, webSocketDebuggerUrl
$targets | Select-Object type, title, url
```

只有 CDP 可达还不够。必须有 `page` 或 `webview` target，且标题/URL 对应 TPT Work；然后读取当前页面、截图或可见文字，确认没有挡住操作的弹窗。登录前可能同时有 `file:///.../renderer/welcome.html` 登录页和 `dsh-app://app/` 主界面 target；选当前要操作的可见页面。若 `/json/list` 为空、是另一个程序、或只有启动画面，先定位启动问题。

仓库的 UI fixture 在 `tests/ui/fixtures/app.ts`。默认 CDP 端口是 **9223**，所以复用上述 9234 实例时必须设置 `TPT_CDP_PORT=9234`。`TPT_EXE` 是 exe 路径。`TPT_REUSE_CDP` 默认允许复用；找不到可用 CDP 时 fixture 会尝试自己启动 exe。首次接触新环境，建议先手动启动并探测，再让 fixture 复用。

### 2.3 处理弹窗，再操作页面

启动或新建任务时可能出现“配置 TPT API 密钥”。先读取所有可见 `[role="dialog"]` 的文字：

- 已知的 API Key 弹窗：可按当前环境要求点“稍后”；如果操作者提供测试用占位 key，也可在设置中保存。保存后需新建任务复查弹窗是否消失。
- 其他弹窗：记录标题、正文、按钮和截图，再按用例要求处理。
- 原生 Windows 文件选择器不属于页面 DOM。Playwright 页面定位器看不到它。可让操作者先创建项目，或在可控的 `<input type="file">` 上使用 Playwright `setInputFiles`；不要隔着弹窗继续点后台页面。

弹窗关闭后重新读取页面状态，确认目标项目、任务和模型。之前在一台机器上保存占位 key 后，新建任务不再弹窗且界面仍显示 MiniMax；这**只证明界面行为**，不能据此断言实际请求路由。

### 2.4 用 Playwright/CDP 观察并分组操作

在配套测试仓库根目录创建临时 `.mjs` 探索脚本时，可从这个最小代码开始（用 `apply_patch` 写文件，运行后按需删除）：

```js
import { chromium } from 'playwright';

const port = Number(process.env.TPT_CDP_PORT ?? 9234);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
try {
  const pages = browser.contexts().flatMap(context => context.pages());
  console.log('targets:', await Promise.all(pages.map(async p => ({
    title: await p.title(), url: p.url(),
  }))));
  const loginPage = pages.find(p => p.url().includes('/renderer/welcome.html'));
  const appPage = pages.find(p => p.url().startsWith('dsh-app://'));
  const loginVisible = loginPage && await loginPage.locator('#login-heading').isVisible();
  const page = loginVisible ? loginPage : (appPage ?? loginPage);
  if (!page) throw new Error('没有找到 TPT Work 的登录页或主界面');
  console.log('selected:', await page.title(), page.url());
  console.log((await page.locator('body').innerText()).slice(0, 2000));
  console.log('dialogs:', await page.locator('[role="dialog"]:visible').count());
  // 看完输出后，另写一步操作当前可见控件，再重新读取状态和业务结果。
} finally {
  await browser.close(); // 断开 CDP；不要把此处理解为关闭用户的软件
}
```

如果只有本资料目录、没有配套测试仓库，可临时安装轻量的 `playwright-core` 做接入探测，无需安装浏览器（CDP 连接的是已启动的 Electron）：

```powershell
$probeRoot = Join-Path $env:TEMP 'tpt-cdp'
$npmCache = Join-Path $env:TEMP 'tpt-npm-cache'
npm.cmd install --prefix $probeRoot --cache $npmCache --no-audit --no-fund playwright-core
```

在临时 `.mjs` 脚本中将上例第一行替换为以下代码，其余连接代码相同：

```js
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.TEMP, 'tpt-cdp', 'node_modules', 'playwright-core'));
```

这只验证 CDP 和少量 UI 行为，不会自动获得测试仓库的 fixture、case 或业务断言。若包安装失败，先记录依赖或网络问题；CDP 的 `/json/version`、`/json/list` 探测仍可独立完成。

无账号数据的登录页操作示例（放在上例 `try` 中、读取状态之后执行）：

```js
if (loginVisible) {
  await loginPage.locator('#login-tab-phone').click();
  if (!await loginPage.locator('#login-panel-phone').isVisible()) throw new Error('手机号面板未出现');
  await loginPage.locator('#login-tab-password').click();
  if (!await loginPage.locator('#login-panel-password').isVisible()) throw new Error('账号密码面板未出现');
}
```

这个示例只证明页面可操作及选项卡切换，不证明登录、后端或业务流程通过。登录和后续敏感操作按实际任务与授权执行。

#### 操作如何分组

**工具调用次数与界面动作次数不必一一对应。** 在一次观察已确认相关控件和操作条件后，可以在一次 Playwright 工具调用中按顺序执行多个动作；每个动作仍使用 `await`，不并行点击或填写同一页面。

满足以下条件时可以合并：后续目标控件已被观察和定位；前面的动作不会替换、隐藏、重新加载后续控件，也不会改变其含义；后续步骤不需要根据新出现的内容作判断。例如同一登录表单中的用户名、密码、用户类型和协议勾选，可以连续填写。按钮因填写完整而启用属于可预期变化，可在同一次调用中检查其可用性后提交。

提交、导航、切换功能区域、打开弹窗或触发异步业务后，将它作为本组操作的结束点。等待明确的完成条件，再读取新的 URL、页面文字、可见弹窗或控件状态，判定结果；下一组操作必须依据这次新观察。即使跳转已经发生，也不要在同一段探索脚本中盲目追加尚未观察过的主界面操作。页面变化不只指 URL 改变：弹窗、选项卡内容替换、任务状态更新或控件重建也可能形成这样的边界。

登录示例：先观察登录表单 → 一次调用内顺序填写全部信息、核对按钮可用并点击登录 → 等待并读取登录结果 → 根据新观察操作主界面。凭据来自用户授权或运行时输入，不将具体密钥写入文档、日志或测试源码。

如果某一步失败、出现意外弹窗或结果不确定，立即结束这一组并重新观察；不要继续后续动作或整组重试，以免重复提交。已建立明确页面契约、等待条件和结果断言的回归用例可以跨页面连续运行；首次探索未知界面时按上述状态边界分组。

聊天每轮都要核对用户消息、助手回复以及“进行中/探索中...”状态已结束，才发下一轮。本仓库使用 `conversation.sendMessage/readTaskState` 等业务函数，端口来自本轮环境。原配套工程的 `scripts/ui-manual-turn.mjs` 不在本目录，不能假定它可执行。正式case仍要检查业务闭环。

比较模型或推理等级时，每个组合使用独立新会话，避免前一组合的上下文影响结果。若某轮出现提供方或网关错误，不要在原会话直接切换模型后把下一条回复当成独立验证：本机探索中，失败消息之后切换配置，后续回复仍混入此前失败请求的标记。先保存失败证据，再在新会话重测。

探索过程中出现的用例外异常也要记录为缺陷候选。按“前置状态、操作、实际结果、合理预期、复现情况、证据”描述，不因它超出当前用例范围就略过；先区分已知配置限制与产品恢复行为，并排查自动化和环境问题。根因未明时记录现象，不猜测实现原因。记录与审核按[测试技能](../skills/exploratory-testing/SKILL.md#记录与审核)执行。

### 2.5 运行 UI case

下面是独立配套测试工程的命令，非本仓库根目录命令。当前任务优先按 tools/ui-operations 的工具调用与本轮结果契约执行；未携带对应package/scripts时不要运行下面示例。

```powershell
# 保留第 1 层解析得到的 $env:TPT_EXE
$env:TPT_CDP_PORT = '9234'
npm.cmd run preflight
npm.cmd run test:smoke
npm.cmd run test:e2e:chat
# 定位问题时：npx.cmd playwright test tests/ui/<具体文件>.spec.ts
```

`preflight` 只证明配置可解析；用例出现 `skipped` 不是通过。UI Smoke 当前部分断言绑定了旧包的界面文字（例如 `tmp`），新包红灯时先对照实际产品和用例契约，不能直接判为产品缺陷，也不能删断言求绿。Playwright 的失败 trace 和截图在 `test-results/playwright/`，启动诊断在 `test-results/diagnostics/`。

## 第 3 层：启动并操作 API test 网关

### 3.1 确认包支持 `--test`

先关闭或避开冲突的普通 UI 实例。为网关准备独立目录；下面的目录建在测试仓库里，避免污染用户的真实配置：

```powershell
$env:TPT_API_PORT = '18471'
$env:TPT_API_TOKEN = 'api-test-local'
$apiRunDir = Join-Path (Get-Location).Path 'test-results\portable-gateway'
$apiHomeDir = Join-Path $apiRunDir 'home'
$apiProfileDir = Join-Path $apiRunDir 'profile'
New-Item -ItemType Directory -Force -Path $apiHomeDir, $apiProfileDir | Out-Null

$tptApiProcess = Start-Process -FilePath $env:TPT_EXE `
  -WorkingDirectory (Split-Path -Parent $env:TPT_EXE) `
  -ArgumentList @('--test', "--port=$env:TPT_API_PORT", "--token=$env:TPT_API_TOKEN", "`"--home=$apiHomeDir`"", "`"--user-data-dir=$apiProfileDir`"") `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $apiRunDir 'gateway.stdout.log') `
  -RedirectStandardError (Join-Path $apiRunDir 'gateway.stderr.log')
$tptApiProcess.Id
```

等待冷启动后，用**相同端口和 token** 做独立验证：

```powershell
$env:TPT_API_BASE_URL = "http://127.0.0.1:$env:TPT_API_PORT"
$auth = @{ Authorization = "Bearer $env:TPT_API_TOKEN" }
$verbs = Invoke-RestMethod "$env:TPT_API_BASE_URL/__verbs" -Headers $auth -TimeoutSec 5
$verbs.verbs | Select-Object -First 10 endpoint, mode, args
Get-Process -Id $tptApiProcess.Id -ErrorAction SilentlyContinue |
  Select-Object Id, ProcessName, HasExited
```

`/__verbs` 带正确 Bearer token 返回 200，才算网关就绪。无 token 返回 401 只能证明端口上有服务，不能证明鉴权和业务可用。若端口没有监听，检查上面的 stdout/stderr、进程是否退出、exe 是否支持本版本的 `--test`，并确认没有旧单实例抢占。不要把启动脚本的退出码 0 当作网关持续存活的证据。

原配套工程有 `node scripts/start-test-gateway.mjs <port> <token>` 启动辅助脚本，本目录未包含。原说明中它探测到 `/__verbs` 的 200 **或 401** 就打印 ready；即使另有该脚本，也必须单独执行带 token 的200验证和进程检查。默认路径只适用于原测试机器。

### 3.2 列接口、发一个只读 RPC

`/__verbs` 返回当前包注册的接口名、`unary`/`stream` 类型及部分参数名。**以当前包实际返回值为准**；旧文档记录的接口总数不一定适用于新包。

下面使用注册表中常见的只读接口 `settings/describe`。先确认当前包确实包含它：

```powershell
$verbs.verbs | Where-Object endpoint -eq 'settings/describe'
```

然后发送 wire 请求：

```powershell
$method = 'settings/describe'
$rpcId = "probe-$([guid]::NewGuid().ToString('N'))"
$requestBody = @{
  type = 'client-request'
  rpcId = $rpcId
  method = $method
  payload = @{ args = @{} }
} | ConvertTo-Json -Depth 20 -Compress

$response = Invoke-RestMethod "$env:TPT_API_BASE_URL/api/$method" `
  -Method Post -Headers $auth -ContentType 'application/json' `
  -Body $requestBody -TimeoutSec 15
$response.rpcId
$response.result.ok
```

必须核对 `rpcId`、HTTP 状态、`result.ok` 和返回数据。很多业务错误仍会通过 HTTP 200 返回，错误信息在 `result.error`。参数要按 `api/openapi.json`、`api/blackbox-wire.md` 和现有 case 核对，不能把 `__verbs` 中的参数名当作完整 schema。

流式接口走 `POST /.dsh/remote-stream`，body 形状为 `{"endpoint":"session/control","payload":{"args":{}}}`，响应是 NDJSON。验证真实帧、顺序、完成/关闭状态；只收到 HTTP 200 或第一帧，不足以证明业务完成。

### 3.3 运行 API case

下面依赖独立配套API测试工程；本仓库未包含这些npm scripts。测试网关的启动与HTTP验证可按前文执行，业务case需按实际可用接口和本轮任务另行安排。

测试进程与网关进程必须读取同一组地址和 token：

```powershell
$env:TPT_API_BASE_URL = "http://127.0.0.1:$env:TPT_API_PORT"
# TPT_API_TOKEN 已在网关启动前设置
npm.cmd run test:api:smoke
npm.cmd run test:api:data-flow
npm.cmd run test:api:stream
```

`test:api:smoke` 包含多轮真实模型对话、文件写入和生命周期，可能产生数据、耗时和模型费用；首次接入新环境，先跑网关鉴权/只读 RPC，再运行单条 case。不同 API spec 的**默认 token 不相同**，因此始终显式设置 `TPT_API_TOKEN`。部分旧 case 固定断言接口数量或依赖旧包行为；失败时按当前注册表与业务要求复核。报告写在 `test-results/` 对应套件目录。

## 第 4 层：怎样写一条真正可用的 case

先写人能读懂的用例，再写代码。每条 case 至少说明：目的、前置条件、输入数据、步骤、预期结果、证据、清理。`tests/api/cases/*/case_for_human.md` 有示例；业务数据流设计见 `tests/api/api_test_data_design.md`。

UI case 放在 `tests/ui/`，从 `tests/ui/fixtures/app.ts` 导入 `test` 和 `expect`，按页面真实状态选择定位器。一个聊天 case 至少核对：项目归属、用户消息发出、助手完整回复、多轮上下文、任务最终状态；文件 case 还要回读磁盘文件。UI 目标行为必须经由 UI 完成，不能偷偷用 API 代替用户点击。

例如新增 `tests/ui/my-chat.spec.ts` 时，从一个可执行的小 case 开始：

```ts
import { test, expect, skipIfUnavailable, dismissExpectedStartupDialog } from './fixtures/app.js';

test.setTimeout(180_000);

test('UI：新任务可以得到完整回复', async ({ app }) => {
  await skipIfUnavailable(app);
  const page = app.page!;
  await page.getByRole('button', { name: '新建任务' }).click({ noWaitAfter: true });
  await dismissExpectedStartupDialog(page, 5_000);
  expect(await page.locator('[role="dialog"]:visible').count()).toBe(0);

  const token = `UI_ACK_${Date.now()}`;
  const composer = page.locator('[data-composer-input="true"], [contenteditable="true"]').first();
  await composer.fill(`请只回复 ${token}`);
  await page.getByRole('button', { name: '发送消息', exact: true }).click();
  const reply = page.locator('[class*="hWmORq_body"]').filter({ hasText: token }).last();
  await expect(reply).toBeVisible({ timeout: 120_000 });
  await expect(page.getByText('进行中', { exact: true })).toHaveCount(0, { timeout: 120_000 });
  await expect(page.getByText('探索中...', { exact: true })).toHaveCount(0, { timeout: 120_000 });
});
```

这是最小聊天探针，不等于完整的“项目 + 文件”业务 case。后者还要先选择指定项目，读取或写入真实文件，并独立核对路径、内容和任务归属。界面文字与 CSS class 可能随包变化，定位器必须从当前页面重新验证。

API case 放在 `tests/api/`。一个会话数据流通常是：

```text
创建 session → 发送第 1 轮 → 等待完成并读取结果
→ 发送第 2 轮验证上下文 → 读 session/page 或历史
→ 核对轮次/顺序/内容 → 清理本 case 创建的数据
```

先写一条只读的接口探针也可以。例如在 `tests/api/my-settings.spec.ts` 中核对配置与模型目录的一致性：

```ts
import { test, expect } from '@playwright/test';

const base = process.env.TPT_API_BASE_URL!;
const token = process.env.TPT_API_TOKEN!;

async function call(method: string) {
  const rpcId = `probe-${Date.now()}-${Math.random()}`;
  const response = await fetch(`${base}/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload: { args: {} } }),
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.rpcId).toBe(rpcId);
  expect(body.result.ok).toBe(true);
  return body.result.value;
}

test('API：默认模型存在于模型目录', async () => {
  const settings = await call('settings/describe');
  const catalog = await call('session/modelCatalog');
  const configured = settings.namespaces.find((item: any) => item.ns === 'agent-default-model')?.value;
  expect(configured).toBeTruthy();
  expect(catalog.default).toEqual(expect.objectContaining(configured));
});
```

这条探针只覆盖只读配置关系。正式业务 case 可以从 `tests/api/api-smoke.spec.ts` 和 `tests/api/data-flow-business.spec.ts` 复制**流程结构**，再替换为当前包实际存在的 verb 和数据；不要复制旧包的接口数量断言。

API 可以辅助准备数据或交叉核对 UI，但 API 通过不代表 UI 通过。对创建/修改/删除类操作，必须再次独立读取状态；对文件写入，必须核对实际文件路径与内容；对流式任务，必须核对最终状态。一个绿色的脚本若只检查按钮、toast 或 HTTP 200，仍不是完成的业务 case。

初次调试只跑一条 case：

```powershell
npx.cmd playwright test tests/ui/<case>.spec.ts --workers=1
npx.cmd playwright test tests/api/<case>.spec.ts --workers=1
```

遇到失败先保存截图、trace、响应体、stdout/stderr 和应用日志，再判断是产品缺陷、自动化缺陷、时序问题、环境问题，还是新包的契约变化。产品崩溃时记录**正在做的动作**、进程退出码和日志，停止该动作链；不要让自动重试掩盖崩溃。

## 第 5 层：结束与交接

只结束本轮启动且 PID 已核实的实例。先读取进程命令行，确认对应 `--test --port=...` 或 `--remote-debugging-port=...`：

```powershell
Get-CimInstance Win32_Process -Filter "ProcessId=$($tptApiProcess.Id)" |
  Select-Object ProcessId, Name, ExecutablePath, CommandLine
# 确认是本轮进程后，再执行：Stop-Process -Id $tptApiProcess.Id
```

不要批量结束所有 `electron.exe` 或 `tpt-work.exe`。保留本轮日志和测试报告。交接给下一个 Agent 时至少写明：exe 真实路径及版本、谁启动了哪个 PID、UI/CDP 或 API 端口、项目路径、当前弹窗、已跑 case、失败证据和下一步。

## 常见卡点速查

| 现象 | 先查什么 | 接下来怎么做 |
| --- | --- | --- |
| `Start-Process` 找不到 exe | `TPT_EXE` 是否为当前机器真实绝对路径，文件是否存在 | 请操作者提供安装路径；不要套用原机器路径 |
| exe 进程出现后立刻退出 | 工作目录、启动参数、stdout/stderr、产品日志 | 记录退出码；不要把进程曾出现当作启动成功 |
| `/json/version` 通，但 `/json/list` 无 TPT 页面 | renderer 尚未就绪、已有单实例、窗口被弹窗阻塞 | 等待并重新取 targets；检查当前进程归属与实际界面 |
| Playwright 点击超时 | 当前可见弹窗、遮挡层、目标 locator 数量 | 重新观察当前页面；确认已知弹窗关闭后再操作 |
| `/__verbs` 无 token 返回 401 | 只是鉴权门槛正常工作 | 用启动时相同的 Bearer token 再请求，必须得到 200 |
| `/__verbs` 带 token 仍连接失败 | 端口、PID、网关日志、包是否支持 `--test` | 停在网关启动问题，不运行 API case |
| API 返回 HTTP 200 但 case 失败 | `result.ok`、`result.error`、RPC 参数形状 | 按当前包的 schema 与业务状态定位 |
| 新包出现大量 case 失败 | 硬编码文字/接口数量、模型配置、项目数据 | 对照人类用例和当前产品，分别判断产品与测试代码变化 |
| Agent 内的 `pwsh` 连 `echo` 都无法执行 | 宿主执行通道的退出码、stderr | 记录为执行环境阻塞；不要归因于 Python 或业务功能 |

## 可直接发给执行 Agent 的任务指令

> 先读根AGENTS、本轮任务README与适用测试技能。已接入就查 tools/ui-operations/README.md，按case用 --plan 或 --find 找工具、--describe 查契约。未接入才按本指南确认真实exe、实例与CDP端口。通过现成业务函数执行，缺能力时保留任务函数；稳定操作可顺序合并，遇未知页面变化重新观察。API测试另用 --test 网关验证鉴权与接口。记录本轮真实动作、取值、恢复和剩余项；通过默认不截图，失败按需取图。持续完成已分配队列，不把checkpoint当暂停；只处理本轮已核实归属的进程和数据。
