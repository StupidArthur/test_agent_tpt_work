# 新环境：检测执行工具

[返回工具入口](../README.md)

进入新环境时调用一次。必需项：当前 PowerShell、CMD、Node.js、Python，以及指定工具项目中的 Node.js Playwright（支持 playwright-core 或 playwright）。每项核对存在性、版本和最小执行能力；不安装软件、不启动浏览器、不操作产品。

## 一次调用

在仓库根目录，通过当前环境正常允许的 PowerShell 执行方式运行：

```powershell
powershell.exe -NoProfile -NonInteractive -File 04-测试工具/environment-check/check.ps1 -EnvironmentId "本机本轮环境ID" -OutputDirectory "05-探索性测试/本轮任务/环境检测"
```

不依赖 Node/Python 引导检测。首版执行入口为 Windows PowerShell 5.1 或 Windows 上的 PowerShell 7；尚未实测其他系统。找不到 PowerShell 或脚本被执行策略拦截时，记录宿主限制，使用环境正常授权的执行方式，不把未运行当作其他工具缺失。

默认从 `ui-driver` 项目解析 Playwright；其他项目用 `-ModuleRoot "项目绝对路径"`。`-IncludeOptional` 加查 Git 和 ripgrep，非必需项缺失不阻塞默认环境就绪。额外能力按任务需要添加，不把所有工具都变成默认前置。

## 结果与复用

终端只输出摘要、使用指南和证据路径；完整 JSON 保留实际路径、版本、命令输出、退出码和分项错误。每次生成新记录与 SHA-256 清单和代码快照，不覆盖原结果。

大型任务开始、编写系统命令前，读取返回的 `usage_guide`。指南包含当前宿主的实际能力探测：`&&/||`、三元表达式，以及shell选择、编码与模块解析范围。区分实际检测结果与通用建议，未知能力不默认为支持；失败后保留原尝试，只补查受影响能力，避免不断换 shell 和重复全量核验。

时间对齐与耗时分析由主控负责，执行端不做UTC能力检测或单独取时。报告自动附带采集时间作为证据元数据，不作为环境就绪条件，也不证明机器时钟同步。

含中文的 PowerShell 源码采用带 BOM 的 UTF-8，以兼容 Windows PowerShell 5.1 的源码读取；生成的 JSON/Markdown 明确使用 UTF-8。首次增加中文指南时曾发现编码解析失败，修正后本机验证通过；当日探索记录已按用户要求清理，清理前证据保留在Git历史提交 `13f095f1`。

| 状态 | 含义 |
|---|---|
| ok | 找到并完成最小执行探测，版本可识别 |
| missing | 指定查找范围未找到可执行文件或项目模块 |
| execution_error / timeout | 找到但执行失败或超时，不能当作不存在 |
| unrecognized_output | 执行完成但输出不符合契约，版本未知 |
| dependency_unavailable | 上游 Node 不可用，Playwright 未验证 |

退出码0表示必需项探测全部成功；2表示至少一项未就绪；参数/宿主错误可能退出1。这里的 ready 不代表产品或业务测试通过，也不规定最低版本；任务有版本要求时另行比较实际值。

同一主机、用户、执行宿主与项目依赖范围内，后续步骤直接引用已有结果。新环境或工具安装/删除/升级、PATH、权限、宿主、项目依赖变化，以及异常执行后，更新相关核验。每次显式调用都实时采集，没有隐式缓存或自动沿用旧结果；无需每个业务动作重跑。

Playwright 探测证明项目模块能导入且具有 CDP 接口，浏览器可执行文件存在性单独报告；连接已安装的 Electron/CDP 不要求下载 Playwright 浏览器。启动独立浏览器的任务仍需额外验证对应运行时和启动能力。

系统工具检测与产品接入分开：产品EXE、进程/端口归属、CDP目标、账号/项目、当前业务对象仍按任务阶段核验。

## Windows 与 PowerShell 兼容范围

按能力选用，不能把 Win10 当作 PowerShell5、Win11 当作 PowerShell7。分别记录系统构建、实际宿主路径/版本/edition、.NET运行时与能力；`powershell.exe` 和 `pwsh.exe` 的结果不能互相替代。

实现以Windows PowerShell5.1公共语法为基线，目标兼容Win10/Win11上的5.1与7.x；目标范围不等于完成实测。源码带BOM，文件输出显式UTF-8；Node输出按UTF-8读取，CMD使用`/u`并按UTF-16读取，避免依赖不同系统的默认编码。低于5.1或非Windows明确拒绝，不把检测未运行解释成工具缺失。执行策略和权限按所在环境处理，不自动绕过。

在每台目标机验证所有已安装宿主：

```powershell
powershell.exe -NoProfile -NonInteractive -File 04-测试工具/environment-check/compatibility.ps1 -OutputDirectory "05-探索性测试/本轮任务/兼容验证"
```

分别用powershell.exe和pwsh.exe运行真实工具。缺少某宿主记录not_available，不能记通过；每台保留系统与宿主版本及原始结果。当前已实测本机5.1，PowerShell7.x和Win10现场待补；没有安装它们来伪造覆盖。验证入口本身是PowerShell脚本，无须先装Python或Node。
