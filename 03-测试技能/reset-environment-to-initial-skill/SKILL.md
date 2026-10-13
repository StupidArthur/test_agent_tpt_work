---
name: reset-environment-to-initial-skill
description: 把 TPT Work 的状态恢复到初始（首次安装）环境：清除用户数据与登录态、保留可恢复备份并重开核验，供要求"全新环境"的用例使用；含状态落点、重置步骤、验证判据与恢复边界。当前说明为本机 Windows 实测。
---

# 把 TPT Work 状态恢复到初始环境（首次安装起点）

依赖"全新环境"的用例（登录页、无项目、无会话）在保留历史数据的机器上**前置不成立**，不能判通过。本技能给出**已实测有效**的重置方法：清除真正的持久化状态后重开，回到初始环境。

（命名说明：这里的"初始环境"指应用状态回到刚装好、尚未使用的样子；不是"跑完测试后清理环境"。）

需要先安装/升级到目标版本时，用 [silent-install-skill](../silent-install-skill/SKILL.md)；接入与登录用 [tpt-work-access](../tpt-work-access/SKILL.md)。本技能只负责把应用状态清到"首次安装"起点。

## 先判断：要恢复到初始状态该动哪里（关键）

- 实测：只清 `<数据根>\tasks` 与 `<数据根>\projects` **无效**——重开后项目/会话仍在（状态不在这里）。
- 真正的持久化状态：
  - **数据根** `C:\Users\<user>\.tpt-work\`，重点是 `dsh\`：`sessions\`、`storages\tpt.sqlite`(+`-shm`/`-wal`)、`workspace.json`、`.credentials.enc`（登录态）、`agents\`、`connectors\`、`skills\`、`tpt-memory\`、`profiles\`、`tpt-supcon-im\`；另有 `tasks\`、`projects\`、`sandbox\`。
  - **Electron userData** `C:\Users\<user>\AppData\Roaming\tpt-work\`：`Network\`(cookie)、`Local Storage`、`Session Storage`、`Preferences` 等。
- 安装目录 `%LOCALAPPDATA%\Programs\tpt-work\` **不是**用户状态；静默安装只覆盖它、不动上面两处——这就是"覆盖升级后数据仍在"的原因。

## 步骤（实测有效）

> 可直接执行的 Windows 命令与回滚方式见 [TPT Work（Windows）实测命令](references/tpt-work-windows.md)。

1. **记录并退出**：按本轮授权退出TPT Work，确认无残留进程；记录两个实际状态目录和本轮版本。
2. **移走保留**：使用参考页的小脚本整体改名为 `*.bak-<时间戳>`；原目录就是备份，不额外复制、不删除。已有目标拒绝，移动失败补偿移回已移动的目录。
3. **保存恢复位置**：保留返回的From/To和后缀，核对本轮移走范围。
4. **重启**：以调试端口启动（TPT Work：`tpt-work.exe --remote-debugging-port=9234`）。
5. **核验起点**（下列**全部满足**才算回到初始环境）：
   - CDP `/json/list` 只有 `welcome.html`（登录页）与 `dsh-app://app/`；
   - 登录页 用户名/密码**为空**（无预填、无"记住密码"）；
   - 左侧：项目 = `暂无项目`、最近 = `暂无任务`。
6. **记录结果与恢复位置**。若第 5 步不满足，说明仍有未清状态（或存在服务端回流）；按实测继续定位并保留证据，不假定已干净。

## 边界

- **状态重置**：移走会话/项目/记忆/连接器/凭据等状态目录，应用重开将视为初始状态；旧数据保留。只在获授权时执行，记录原目录、备份和恢复方式。
- 不改动安装目录本体；本技能可与静默安装组合，但**安装器不清用户数据**，恢复到初始状态仍按本技能。
- 产品名、路径、进程名、命令与界面文案**按本轮实机核验**，不照搬示例。
- 重置后仍未回到初始环境的，记录为"疑似存在服务端同步或未覆盖状态"，标**未验证**。
- 不得用后端改值或手工造数冒充"初始环境"；这属于绕过用例的操作方式，按根 [AGENTS](../../AGENTS.md) 的「严格按用例的操作位置与方式」标记并处理。

## 证据与来源

- 本方法在 TPT Work `0.1.4-nightly.202610121943` 本机实测有效（`~/.tpt-work` + `%APPDATA%\tpt-work` 移走后重开 → 登录页/无项目/无任务）。
- "只清 `tasks`/`projects` 无效"与版本变化的原 attempt 保留在任务 `05-探索性测试/2026-10-13-smoketest-clean-2x/`（`执行结果.md`）及 `05-探索性测试/smoketest-1012/`。

补充：本技能的目录移动/恢复小脚本已于2026-10-13完成6项隔离实测，见Windows参考页；本次未重置真实产品。
