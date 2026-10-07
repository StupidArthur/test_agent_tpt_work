# code/ 说明

本轮实现：TPT Work 网关 API 测试执行器（Python 3.11，**仅标准库**，无线程池等外部依赖）。

## 运行

在**任务目录**（本目录的上级）执行；`TPT_API_KEY` 从环境变量取，不写进任何文件：

```powershell
$env:TPT_API_KEY = "<有效凭据>"
cd code
python -m llm_probe list                                   # 列用例、实例与预计请求数
python -m llm_probe run --module api --target tpt-gateway-public
python -m llm_probe run --module tpt --target tpt-gateway-public
python -m llm_probe run --module perf --target tpt-gateway-public
python -m llm_probe run --module cap --target tpt-gateway-public --items CAP-01 --burst-levels 1,5,10
python -m llm_probe report                                 # 离线生成报告 + 交付自查
```

离线验证执行器（**不发真实网关**）：

```powershell
python code/offline_validate.py     # docs/04 要求的 8 项
python code/summarize.py            # 汇总 结果/*.json -> 结果/汇总.json
```

## 层次

| 文件 | 职责 |
|---|---|
| `llm_probe/sse.py` | 纯 SSE 帧解析（CRLF、多行 data、注释、跨块 UTF-8） |
| `llm_probe/transport.py` | HTTP/SSE 传输、超时（连接/读空闲/整请求）、时间点、原始帧 |
| `llm_probe/protocol.py` | Responses/Chat 请求构造与事件归一化（正文/推理/工具/usage/终态） |
| `llm_probe/evidence.py` | 证据落盘、SHA-256 索引、凭据脱敏、不覆盖同名 |
| `llm_probe/stats.py` | 最近秩分位、SLO 判定、容量结论守卫 |
| `llm_probe/capacity.py` | 闭环用户曲线、开放到达调度（队列/在途/拒绝可见） |
| `llm_probe/runner.py` | 用例实例执行、断言、台账、证据归属 |
| `llm_probe/report.py` | 报告生成与交付自查（离线） |
| `llm_probe/cli.py` | 命令行 |
| `mock_server.py` | 本地可控 HTTP/SSE 服务（离线验证用） |
| `offline_validate.py` | docs/04 的 8 项执行器离线验证 |
| `probe_api04_history.py` | API-04 历史形态补测探针（保留说明为什么改） |
| `summarize.py` | 汇总最新实例结果 |

## 约定

- 用例只声明场景/参数/断言，复用上述函数；原始观测、断言与统计分离。
- 每个 attempt 记入台账，失败不丢弃；默认不自动重试。
- usage 缺失记 null；并发请求数不改称用户数。
- 证据仅移除凭据；同名证据自动加 `__rN` 序号，保留历史。

## 容量补测新入口

读 [容量补测计划](../补测/todo_1/容量补测计划.md)，按已确认参数准备执行计划。`python -m llm_probe capacity --target tpt-gateway-public --plan-file <JSON>` 默认只预览，**不发请求**；显式 `--execute` 且计划/完整SLO确认后才执行。

`llm_probe/capacity_suite.py` 实现文本/工具闭环、双窗口持续复核、压前基线与压力后恢复；全批共享硬请求预算、逐请求证据和排空。原 `run` 的 CAP-03/04/06 仍不是运行入口，统一使用新命令。历史数据与新代码验证分开。

离线验证新入口：`python code/test_capacity_suite.py`（在任务根目录，假传输，不访问网关）。`code/review_todo1.py` 是管理者一次性资料修订脚本，不是测试执行器，不要重跑覆盖已确认计划。
