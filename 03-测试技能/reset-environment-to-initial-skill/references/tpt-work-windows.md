# TPT Work（Windows）恢复到初始环境——实测命令

本轮实测：Windows、用户 `<USER>`、安装目录 `%LOCALAPPDATA%\Programs\tpt-work\tpt-work.exe`、调试端口 `9234`。命令在产品/路径/端口上按本轮实机核验替换。

## 状态落点（必须清这两处）

- `%USERPROFILE%\.tpt-work`（数据根）。重点是 `dsh\`：`sessions\`、`storages\tpt.sqlite`(+`-shm`/`-wal`)、`workspace.json`、`.credentials.enc`（登录态）、`agents\`、`connectors\`、`skills\`、`tpt-memory\`、`profiles\`、`tpt-supcon-im\`；另有 `tasks\`、`projects\`、`sandbox\`。
- `%APPDATA%\tpt-work`（Electron userData）：`Network\`、`Local Storage`、`Session Storage`、`Preferences` 等。

> 实测：只清 `.tpt-work\tasks` 与 `.tpt-work\projects` **无效**，重开后项目/会话仍在。

## 重置（Windows PowerShell）

先按本轮授权调用 [退出应用进程](../../../04-测试工具/ui-driver/docs/scenarios/application.quit.md) 的 `application.quit`，传准确exe/PID/启动时间，检查 `exited=true`。该工具明确终止绑定进程树，先确认没有未完成任务或需保存的内容。WM_CLOSE可能只进托盘，CDP客户端断开也不等于退出；不得据此移动数据。未知身份先登记读取，不临时猜PID或重复实现关闭。

无需额外复制：退出后把原目录改名保留，原目录本身就是完整备份。复用[move-state.ps1](../scripts/move-state.ps1)，两个目录中的任何一个移动失败，会把本次已移动的目录移回；已有备份不会覆盖。使用Windows PowerShell 5.1，执行策略遵循本环境约定，不修改全局策略。

```powershell
$ErrorActionPreference = 'Stop'
# 退出后做停止门控；不在此示例中强杀用户进程。
if (Get-Process -Name tpt-work -ErrorAction SilentlyContinue) { throw 'TPT Work still running; stop before reset' }
$statePaths = @("$env:USERPROFILE\.tpt-work", "$env:APPDATA\tpt-work")
$backupSuffix = Get-Date -Format 'yyyyMMdd-HHmmss'
$resetScript = '03-测试技能/reset-environment-to-initial-skill/scripts/move-state.ps1'
$resetMoves = @(& $resetScript -Paths $statePaths -Suffix $backupSuffix)
$restorePaths = @($resetMoves | ForEach-Object { $_.From })
```

保存返回的From/To和backupSuffix，随后按TPT Work接入技能用本轮安装路径与CDP端口重新打开并读取起点。脚本不删除数据、不启动或结束应用。目录原本不存在时Reset跳过该目录；Restore只传本次实际移走的目录。

## 核验起点（全部满足才复现初始环境）

- `http://127.0.0.1:9234/json/list` 只有 `welcome.html`（登录页）与 `dsh-app://app/`；
- 登录页 用户名/密码为空、无"记住密码"；
- 左侧 项目 = `暂无项目`、最近 = `暂无任务`。

可用工具库读取（示例）：`application.readLoginPage`、`conversation.probeSidebar`、`application.inspectConnection`（见 [软件 UI 操作工具](../../../04-测试工具/ui-driver/README.md)）。

## 恢复旧状态

先退出本轮TPT Work并确认无进程。若重开已产生新状态目录，用不同后缀再次Reset移走保留（不要覆盖或删除），再用原backupSuffix恢复；Restore遇到原位置仍有目录会拒绝，不覆盖新数据。仅恢复本次实际移走的路径，沿用记录的绝对路径。

```powershell
if (Get-Process -Name tpt-work -ErrorAction SilentlyContinue) { throw 'TPT Work still running; stop before restore' }
# 原位置已有新状态时，先保留新状态；使用新后缀。
& $resetScript -Paths $statePaths -Suffix ('after-test-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
& $resetScript -Paths $restorePaths -Suffix $backupSuffix -Mode Restore
```

恢复完成后按接入技能重新打开并读取旧账号/项目/会话。若补偿移动也失败，脚本报错停止，依据已保留的From/To检查两处目录，不自动重试。

## 本次小脚本验证

2026-10-13在工作区临时目录实际运行：双目录移动、备份内容哈希、双目录恢复、已有备份拒绝、第二目录文件占用时第一目录回滚、恢复拒绝覆盖新状态，6/6通过。未操作用户TPT实例或真实数据。这只证明文件移动及恢复逻辑，不把历史产品重置观察改记为本次实测。
