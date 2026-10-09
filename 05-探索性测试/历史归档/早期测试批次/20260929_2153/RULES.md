# 玩法规则（本轮）· 2026-09-29 21:53 轮次

> 本轮目录：`F:\electron-ui\tpt-work-notes\20260929_2153\`
> 上一轮目录：`F:\electron-ui\tpt-work-notes\`（历史记录，可查阅）
> 本轮目标（操作者原话）：**「把所有的测试都跑一跑…尽可能多地完成测试，不要停下来。另外注意，你测试不是为了通过，而是为了发现问题。」**

## 1. 本轮特殊约定

| 项 | 约定 |
| --- | --- |
| 操作模式 | **操作者睡觉，Agent 全程自主**：不询问、不停顿，能测就测 |
| 判定口径 | **找问题优先** —— 不以"通过"为目标；任何"和预期/规格/常识不符"都要落缺陷单 |
| 记录 | 全部写入本轮目录，**不改动历史目录** |
| 失败也要记 | 阻塞项、测不了的项、需人工的项，都要如实记录，不许留白 |
| 证据 | 截图 → `evidence/shots/`；结构化数据 → `evidence/data/` |

## 2. 红线（仍生效）

- **不开启**"桌面操作 / 浏览器操作"等**高危能力**。
- **不点 `退出登录`**（会让后续拿不到 key）。
- **不碰 Windows 原生弹窗**（`更换头像` 等）：一旦弹出，CDP 全通道挂起 → 立即停手，改用系统级截屏，标注"需人工代操作"，**不重试 CDP**。
- **不改系统配置、不动其它进程**。
- 敏感值（凭据/密钥）**只记形态**（如 `sk-gw-…`），不记原文。
- 破坏性操作（归档 / 删除 / 改名）**只对自己创建的测试会话**做，并在最后还原；不得动操作者的会话 `hi` / `Arthur` 相关项。

## 3. 判定标记

| 标记 | 含义 |
| --- | --- |
| ✅ 通过 | 与预期一致 |
| ⚠️ 缺陷 | 与预期/规格/常识不符 → 进 `03-缺陷报告.md` |
| ❓ 存疑 | 证据不足，需二次验证 |
| ⛔ 阻塞 | 环境/权限/人为限制导致测不了 |
| 🖐 需人工 | 必须操作者代操作 |

## 4. 环境口径

- 启动（两行，缺一不可）：
  ```powershell
  $env:ARK_API_KEY = [Environment]::GetEnvironmentVariable('ARK_API_KEY','User')
  Start-Process -FilePath "$env:LOCALAPPDATA\Programs\tpt-work\tpt-work.exe" -WorkingDirectory (Split-Path -Parent $exe) -ArgumentList "--remote-debugging-port=9234"
  ```
- 主进程识别：命令行**既不含 `--type=` 也不含 `--expose-internals`**。
- 工具：`F:\electron-ui\.tpt-agent\cdp.mjs`
  命令：`list/text/html/shot/eval/evalfile/clicktext/clickat/clickaria/probe-aria/focus/type/key/send/wait/move/clear`
- **坐标每次都先探测**（换包后窗口为 1280×820，行高约 32px，会随分组折叠漂移）。
