# 原生 Windows 弹窗：发现、操作与业务回读

[返回接入技能](../SKILL.md) · [UI 操作指南](UI与API操作.md#23-处理弹窗再操作页面)

仅在页面操作超时、主窗口被模态窗口禁用，或明确触发文件/文件夹选择器时读本页。CDP/Playwright 的页面定位器看不到原生窗口，不足以判定该窗口不可自动化。

## 先判断通道和对象

1. 读取页面 DOM 对话框；应用内“新建项目”表单仍由 CDP 操作。点击“选择文件夹”后出现的系统选择器另走原生窗口通道，不隔着它继续点击后台页面。
2. 绑定本轮 TPT Work 的 PID、交互式桌面和任务归属。先获取对应应用窗口，再在其 UIA 子树中查窗口与控件；必要时核对 owner/子窗口关系。只枚举桌面顶层窗口可能漏掉目标，不能据此断言“没有弹窗”。不要递归扫描整个桌面树；限定范围、节点数和超时。
3. 记录窗口标题、ClassName、ProcessId、NativeWindowHandle、可见/可用状态，以及控件的 ControlType、AutomationId、名称和支持的 Pattern。历史样本中的选择器类名是 `#32770`；这只是候选特征，不能单独证明它是文件选择器或阻塞窗口。
4. Electron 的 DOM 对话框也可能在 UIA 中显示为 Window，历史样本的原生句柄为 0。不能把所有 UIA Window 都当作系统弹窗。主窗口 disabled 是排查线索，未知类型仍需保留证据。

## 已识别选择器的操作路径

历史笔记记录了 `powershell.exe` 5.1 加载 .NET Framework 的 `UIAutomationClient` / `UIAutomationTypes`、UIA 定位与 Win32 消息操作的路径。每台新环境先确认组件可加载、桌面可访问；已有有效结果复用。笔记中的 `pwsh` 加载失败只适用于当时环境，不能推广为所有 PowerShell 7 不支持，也不能假定所有机器都无需补依赖。

共享库已提供 `nativeWindow.probe/list/describe/act`，按 [原生窗口工具分类](../../../04-测试工具/ui-operations/docs/modules/nativeWindow.md) 查少量候选和单函数契约。发现和操作不需要 CDP，但仍需本轮环境记录与证据目录；新实现的真实验收状态见下文。

| 意图 | 历史样本 | 执行前条件与回读 |
|---|---|---|
| 写入路径 | Edit，AutomationId `1152`，`WM_SETTEXT` (`0x000C`) | 重新核验控件归属、可编辑性与真实句柄；写后读取路径 |
| 确认选择 | Button，AutomationId `1`，`BM_CLICK` (`0x00F5`) | 核验当前按钮的真实名称与意图；等待窗口消失和页面路径回填 |
| 取消选择 | 取消按钮或对话框 `WM_CLOSE` (`0x0010`) | 仅在任务授权取消时操作；回读窗口消失及原表单状态 |

AutomationId、标题、按钮名都是历史例子，不写死跨版本契约；句柄每次打开都要重新发现，动作前再确认 PID 与窗口身份，拒绝陈旧、无效或归属不符的句柄。Win32 调用应采用 Unicode 和有界等待，记录错误与超时；消息返回不等于操作或业务成功。消息可能受 UIPI 完整性级别限制，拒绝时记录环境条件，不盲目提升权限或反复点击。

本机新验收观察到路径Edit的AutomationId为1148，且没有UIA ValuePattern。工具应优先按当前可用模式读取；缺模式时可对已绑定、非密码的原生Edit使用有界 `WM_GETTEXT` 真正回读，返回 `valueChannel`。不能把缺Pattern解释为空文本，也不能用写入参数反填actual。共享实现识别1148或1152并核验Shell结构，不以编号单独判断选择器。

未知窗口只读取标题、结构、状态，必要时截图，记录阻塞和补测条件交上层。未发现窗口但探测失败时标“未验证”，不能返回“无弹窗”。不得广播消息或发送未限定焦点的按键。

## 接回业务流程

新建项目的顺序是：读取并填写 DOM 表单 → 打开选择器 → 动态识别并选择授权目录 → 回读源文件夹 → 点击创建 → 读取项目列表中的本轮项目。选择器消失只证明窗口步骤结束，不能代替项目创建断言。`setInputFiles` 仅用于实际存在且适用的文件 input，不替代目录选择业务。

历史笔记还记录了“移除项目”入口需先 hover 对应项目行，再打开操作菜单和二次确认；界面文案说明文件夹与会话记录保留。复用前核验当前版本的真实文案，并分别验证列表移除与文件保留。不要将移除项目等同于删除目录，也不因没有项目就默认创建用户未授权的样本。

## 实现与证据状态

本页吸收 `local-notes/20261011-006-主控-原生Windows弹窗可用UIA加Win32驱动.md` 的历史方案，来源文件 SHA-256：`B8910E54BA0BB7B991BB1D427AC9C2343B91F6264600AFDB16172AF7D5A55A36`。笔记记录的环境为 Windows 10 Pro build 19045、交互式桌面、PowerShell 5.1；文件夹选择和项目创建由笔记作者报告通过。当前仓库未保留笔记所指的旧任务源码和调用证据，不将旧记录当作当前版本通过证据。Windows 11、其他 PowerShell 宿主、保存对话框及其他系统提示尚未由该笔记覆盖；新实现以下方本轮证据为准。

2026-10-12主控按用户授权重新实现并注册了 `nativeWindow.probe/list/describe/act`，PowerShell源文件纳入调用快照与哈希。原笔记的源码未直接迁入；首次尝试与后续修正分别留在原生窗口验收任务01至05，以以下本轮结果为准。业务组合另提供 `conversation.openProject/createProject/readProjectSurface`，仅静态检查、待现场验收；`removeProject` 尚未实现。按[项目业务场景](../../../04-测试工具/ui-operations/docs/项目业务组合.md)选择首次打开或创建，不要求执行者手工重写原生层。

03轮固定编排在真实setPath回读失败，已记录共享工具问题与Cancel/进程退出恢复；主控修复回读机制后安排04新会话完整复验。原失败保留在 `05-探索性测试/2026-10-12-原生窗口工具验收-03`，不能以静态检查或修复后的重试覆盖。

05轮修正任务夹具关闭定位后25/25通过，涵盖真实文件OK/精确路径、Cancel、未知模态阻塞与拒绝、失败和空观察区分、快照哈希及进程恢复。随后 `05-探索性测试/2026-10-12-TPT原生文件夹集成` 在原用户PID46528上观察到真实文件夹选择器Edit1152，取消并回读表单不变、关闭本轮表单后DOM与初值一致。此Cancel轮未验证目录确认和项目创建；后续确认回填的结果单独记录，不覆盖本轮范围。

窗口没有可访问UIA根时可按 [显示状态与恢复](../../../04-测试工具/ui-operations/docs/scenarios/nativeWindow.visibility.md) 使用Win32结构化状态查隐藏窗口；不要把通道失败当无窗口。恢复只绑定当前授权对象，仍需独立回读。

`05-探索性测试/2026-10-12-窗口状态验收-02` 的23项登记断言通过：非模态窗口隐藏/最小化后仍枚举到，restore 后独立回读正常状态；错误身份拒绝；文件路径 drive-relative/root-relative 拒绝，完全限定样本实际选中。首轮模态夹具因隐藏而结束的失败保留，不能用它判断工具漏窗。前台请求true、真实TPT隐藏恢复、Win10及其他PowerShell版本仍未覆盖。visible、foreground和DOM visibilityState都不证明无遮挡。

调用顺序：`probe` 或 `list` 输入目标 `processId` → `describe` 输入动态 `dialogHwnd` → `act` 显式传最新的 `expectedTitle`、`expectedProcessStartTimeUtc` 与动作 `setPath/confirm/cancel`。`setPath` 另传已有绝对路径 `pathValue`。未知结构拒绝操作，窗口步骤返回 `businessVerified:false`，必须继续读取页面或夹具实际业务结果。

工具默认使用宿主执行策略；如任务获准需要进程级执行参数，可在本轮 `环境记录.json` 显式配置 `native_execution_policy` 为 `Bypass` 或 `RemoteSigned`。默认不改策略，绝不修改全局/用户策略。脚本不可执行时保留首次错误，不能解释为原生窗口不存在。

Windows的 `D:文件`、`\文件` 虽会被 `IsPathRooted` 接受，仍不是完全限定路径。setPath须使用驱动器加根分隔符的完整路径或完整UNC路径，不能依赖探测宿主的当前驱动器/目录。实现兼容Windows PowerShell 5.1，不临时假定新版.NET方法可用。依据：[Microsoft Path.IsPathRooted说明](https://learn.microsoft.com/en-us/dotnet/api/system.io.path.ispathrooted)。

官方依据：[UIA 属性条件查找与搜索范围](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/find-a-ui-automation-element-based-on-a-property-condition)、[SendMessage 的阻塞行为和 UIPI 限制](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendmessagew)。这些文档说明机制，不证明本产品已验收。


补充验收：最小化模态阻塞第03轮12/12通过。真实WinForms未知模态窗口的UIA IsModal=true；Shell选择器IsModal=false但ownerEnabled=false，两者均阻塞。不能强求所有提供者IsModal一致；阻塞按当前窗口模式或owner禁用综合判断。本轮Win32 minimized=true时UIA offscreen仍为false，未验证offscreen=true的阻塞路径。

稳定恢复第02轮14/14通过：restore在有界等待内取得连续两次相同正常矩形，保留stateSamples，并与独立回读/初始正常矩形一致；仅flags先变不能认定窗口动画已稳定。真实TPT文件夹确认第01轮Edit1152实际值回读、confirm后DOM精确路径回填通过，但关闭表单的立即读取命中动画，原5/6结果保留；第02轮以最多5秒登记读取轮询复验相同恢复断言，并显式断开runner自有CDP连接。最终结论查[该轮报告](../../../05-探索性测试/2026-10-12-TPT文件夹确认回填-02/验收报告.md)。目录选择不证明项目创建/持久化，未创建任何产品资产。
