# 应用崩溃与恢复记录（2026-10-06）

## 事件

- 时间：2026-10-06 约 12:5x（本地时间，Asia/Shanghai）。
- 触发时正在执行：G5（专家导入/调用/同名副本/坏包拒绝）脚本 `tools/run/g5.mjs`。
- 现象：
  1. 操作专家 iframe（`dsh-app://app/api/supcon-agents/ui?lang=zh`）时出现 `frame.evaluate: Target crashed`。
  2. 随后 `chromium.connectOverCDP` 连接 9234 超时（浏览器级 CDP 握手后无法枚举页面）。
  3. 主窗口标题显示“TPT Work 无法使用”（未响应）。
  4. 最终 `tpt-work.exe` 全部进程退出，9234 端口无监听，`/json/version` 不可达。

## 崩溃前已产生的记录（未丢失）

- `运行日志/CTX.jsonl`：环境/设置初值读取。
- `运行日志/G1.jsonl`、`G2.jsonl`、`G3.jsonl`、`G4.jsonl`：G1–G4 全部动作/读取。
- `结果/G1-*.json` … `结果/G4-*.json`：G1–G4 共 32 条结果，校验器无 issue、无失败。
- G5 的首次与第二次尝试因脚本问题/目标崩溃未形成有效结果；G5 日志已在最后一次重跑前删除。

## 进度快照（崩溃时）

- 必跑 140 条中已形成有效记录：G1(8) + G2(8) + G3(8) + G4(8) = 32 条，全部“通过”，`issues=[]`。
- G5 未完成（专家调用、同名副本、坏包拒绝需要重跑）。
- G6 及扩展 G7–G14 未执行。

## 环境事实

- exe：`C:\Users\Administrator\AppData\Local\Programs\tpt-work\tpt-work.exe`（SHA256 见 `环境记录.json`）。
- 崩溃前实例：PID 28428（`--remote-debugging-port=9234`），其父 PID 22496。
- 用户配置目录：`C:\Users\Administrator\AppData\Roaming\@deepseek-ai/dsh-desktop`。
- 项目：`tpt-workspace` → `D:\code\tpt-workspace`。
- 本轮工作目录：`D:\code\tpt-workspace\.fast-assert-20261006-oc1`。

## 恢复动作（执行者）

- 由执行 Agent 以 `--remote-debugging-port=9234` 重新启动同一 exe，并重新核验 `/json/version`、`/json/list` 与可见界面后再继续。
- 崩溃属运行时环境事件，已如实记录，不据此判定产品功能通过或失败。
