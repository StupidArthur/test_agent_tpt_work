# 2026-10-07 LLM 网关服务评估（执行任务）

本轮目标、队列与恢复指令。测试项定义与方法是只读输入，见
`../../04-测试项/saas-llm-test/`（本目录不放测试项定义）。

## 范围

- 只评估**网关 API 服务**（测试机 → 网关 → 上游 这条路径的客户端可观测表现）。
- 不测试 TPT Work 软件 UI、登录、设置、安装。
- 区分 **Chat API** 与 **TPT Work 原生 Responses API**；契约通过 ≠ 软件端到端通过。

## 本轮队列（按 test-item 设计）

1. 通用基础：API-01 模型发现 → API-02/03 文本 → API-07/08/09 鉴权/错误/计量
2. Responses 契约：TPT-01/02/03/04/06/07/08/09
3. 条件项（隔离环境缺失则登记未验证）：API-11/12、TPT-10
4. 性能：PERF-01～08
5. 容量：CAP-01～06

## 当前状态

- 代码：执行器 + 本地可控 HTTP/SSE 验证服务（`code/`），见 `code/README.md`。
- 离线验证：`code/offline_validate.py`（test-item 04 要求的 8 项执行器验证）。
- 真实网关：**前置不成立**。见 `环境与负载.md` 与 `运行日志/`，状态详见 `报告.md`。
- 恢复状态：无遗留负载进程（未对真实网关发起负载）。

## 恢复指令

1. 读本文件与 `../../04-测试项/saas-llm-test/执行交接.md`。
2. 读 `环境与负载.md`：补齐 URL / 路径 / 凭据引用 / 模型 / 思考档 / SLO / 负载档。
3. `python code/offline_validate.py` 复核执行器（本地，不发真实网关）。
4. 拿到有效 `TPT_API_KEY` 与可达 base URL 后，设环境变量再跑真实项：
   `python -m llm_probe list` → `python -m llm_probe run --module api --target <name>`。
5. 未完成队列、当前步骤、恢复与限制见 `运行日志/` 末尾条目；中断未完成不得标为完成。
