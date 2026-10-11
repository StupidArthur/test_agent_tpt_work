# 【BUG】极简模式（minimal）下 Agent 终端工具 100% 不可用：`PTY shell exited during startup`

| 项 | 内容 |
| --- | --- |
| **标题** | 极简模式预设下，所有终端命令均失败：`Error: PTY shell exited during startup` |
| **严重级别** | **P0 阻塞**（该模式下 Agent 完全无法工作） |
| **影响范围** | 仅 `极简模式` 预设；同一时刻 `标准模式` 的同一命令可正常执行 |
| **复现率** | **3/3 次复现，失败率 100%** |
| **发现时间** | 2026-09-29 14:36 ~ 14:56 |
| **被测版本** | exe `0.1.3.0` / 应用内 `0.2.0-rc.1`（换包后新版本） |
| **环境** | Windows，模型 `deepseek-v4.1-flash`，权限「工作区内修改」，无项目绑定 |

---

## 1. 最小复现步骤

1. 设置 → 场景预设 → 选择 **极简模式**（卡片变为「新任务默认」）
2. 关闭设置 → 侧栏 **新建任务**
3. 发送：
   > 请在终端执行一条命令：`echo hello-from-bug-repro` 。然后把命令的原始输出逐字返回给我，不要解释。

**预期**：`hello-from-bug-repro`

**实际**：Agent 回复「一行代码都没跑到，我不会把 `hello-from-bug-repro` 当作真实输出回给你」。

## 2. 实际现象

### 2.1 对话层表现

```
助手: 命令未能在终端执行，因此拿不到任何原始输出 ——
      两次调用返回的都是工具错误原文：
      Error: PTY shell exited during startup
```

### 2.2 工具层原始报错（任务 → 轨迹 tab）

```
助手  The tool failed. …
工具  pwsh {"command":"echo hello-from-bug-repro"}     → ⚠️ error
助手  …let me try once more…
工具  pwsh {"command":"echo hello-from-bug-repro"}     → ⚠️ error
助手  Error: PTY shell exited during startup
```

**同一任务内 2/2 调用全部失败，连 `echo` 都执行不了。**

### 2.3 关联的第二处报错（首次发现于一个统计任务）

> 同时运行时依赖加载也失败：
> `EPERM: operation not permitted, rename …\dsh-runtimes\.primary-runtime-XSiWI4 -> …\dsh-primary-runtime`
> 说明运行时的临时目录被占用/权限受限，这很可能就是 shell 起不来的根因。

该任务中 Agent **连续尝试约 18 次**全部失败，耗时 2 分 25 秒，零产出。

## 3. 关键对照：不是全局问题

**同一台机器、同一时刻、同一���命令**，仅切换预设：

| 预设 | `agentPreset` | 结果 |
| --- | --- | --- |
| **极简模式** | `minimal` | ❌ `Error: PTY shell exited during startup`（2/2 失败） |
| **标准模式** | `standard` | ✅ 返回 `hello-from-bug-repro`（1 次调用成功，2 步 / 30.7K tok） |

> 说明：全局 `tool-pwsh` 通道**正常**。故障仅存在于**极简模式专用的「持久化 PTY Shell」**路径。

## 4. 影响

| 维度 | 影响 |
| --- | --- |
| 功能 | 极简模式**完全不可用**。按其设计它"仅提供一个持久化 Shell 工具"，该工具失效即模式失效，**无任何回退** |
| 定位困难 | 故障只在切到该预设后出现，UI 上没有任何提示；用户只会看到 Agent 反复失败 |
| 设计放大 | 同一平台缺陷，在标准模式下只是"少一个工具"，在极简模式下就是**整个模式报废** |
| 历史关联 | 旧版本曾出现「Agent 内 PowerShell 执行失败 `exit code 3221225794`」，**疑似同一根因**（0xC0000142 = DLL 初始化失败） |

## 5. 根因线索（供研发参考，非结论）

观察到的事实链：

1. 进程命令行显示，实际运行时的来源是**安装目录**：
   `…\Programs\tpt-work\resources\runtime\primary-runtime`（标准模式走这条）
2. 但极简模式在运行时还会**额外解包一份**到：
   `%USERPROFILE%\.tpt-work\dsh\dsh-runtimes\` → 重命名为 `dsh-primary-runtime`
3. 该重命名报 `EPERM`；事后检查：
   - `dsh-runtimes\` 目录**存在但为空（0 项）**
   - `dsh-primary-runtime` 在 `.tpt-work` 下**任何位置都不存在**
   - 无残留 `.primary-runtime-*` 临时目录
   - 目录 ACL 正常（当前用户 FullControl）
4. 推测：运行时解包/改名失败 → PTY shell 缺少可执行运行时 → 启动即退出 → 报 `PTY shell exited during startup`

**待研发确认**：是否与 Windows 上的目录改名占用、杀毒软件实时扫描、或并发会话竞争有关。

## 6. 复现记录

| # | 时间 | 预设 | 指令 | 结果 |
| --- | --- | --- | --- | --- |
| 1 | 14:36 | minimal | 统计 28 个 txt 文件数字和 | ❌ 18 次调用全失败，2 分 25 秒，零产出 |
| 2 | 14:54 | minimal | `echo hello-from-bug-repro` | ❌ 2/2 失败 |
| 3 | 14:55 | standard | `echo hello-from-bug-repro` | ✅ 成功（对照组） |
| 4 | 14:56 | minimal | `echo repro-attempt-3` | ❌ 2/2 失败 |

**最小复现失败率：3/3 = 100%**

## 7. 建议

1. **修复**：定位 `dsh-runtimes` 改名 `EPERM` 的原因；或让极简模式复用安装目录运行时，避免依赖运行时解包。
2. **降级**：极简模式在 PTY Shell 不可用时，**不应静默**——建议在切换预设时预检并明确提示"当前环境不可用"，而不是让用户等 2 分半钟看 Agent 反复失败。
3. **兜底**：为极简模式保留至少一个非 shell 的最小读写能力，或明确在文档中标注"该模式要求运行时解包成功"。
4. **回归**：把 `min 模式 + echo` 纳入自动化门禁（本次即由此发现）。

## 8. 附件

| 文件 | 内容 |
| --- | --- |
| `220-bug-echo-fail.png` | 极简模式下 Agent 的回复（诚实报告失败，未伪造输出） |
| `221-bug-trace.png` | 轨迹 tab：两次 `pwsh` 调用均返回 error |
| 轨迹原文 | 见 §2.2 |
