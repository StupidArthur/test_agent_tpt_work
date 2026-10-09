# TPT 网关第三轮补测：并发根因 + 长请求 SLO（待审）

来源：`需求单.md`（用户 2026-10-07 下发）。承接前两轮短请求 SLO 边界与 1600 档异常。

## 范围与不变式

- 只评估网关 API；不测 UI/登录/设置。
- 沿用 `flash` / `think_level=low` / Chat Completions 流式 / 无重试 / 档间 30 秒。
- 短请求上限 128 token；长请求输入约 2048、上限 512。

## 剩余检查点队列

| 编号 | 检查点 | 采样/重复 | 执行办法 | 恢复 |
|---|---|---|---|---|
| B-服务端接口 | nginx/管理接口是否可达 | 一次性探测 | 见 `证据/服务端通道探测.json` | 只读，不改配置 |
| B-客户端观测 | 每档“已发未结束”每秒时间序列 + 连接/首字节分离 | 全部档位 | 执行器内建采样 | — |
| B-nopool 加压 | 800→1600 步长 100，首次系统性失败 | 每档 1 次 | `--plan root` | 失败后单请求恢复 |
| B-pool 对照 | 连接池 `limit=200` @800/1600 | 各 2 次 | `--plan root` | — |
| B-资源 | 每秒 CPU/内存/handles/TCP | 全程 | 执行器内建线程 | — |
| C-长请求 | 30/50/75/100/150/200 | 各 3 次 | `--plan longc` | 档间 30s |
| D-短加密 | 110/115/120/245/248 | 各 5 次 | `--plan densify` | 档间 30s |
| 汇总 | 根因判定 + 双 SLO 边界 | — | `python code/build_report.py` | 离线 |

## A 服务端采集判定

- `https://tpt.supcon.com/` 的 `/metrics`、`/status`、`/health`、`/api/metrics`、`/nginx_status` 均返回 SPA 的 HTML（非指标）。
- `/tpt-work-router/actuator/health|metrics|info|prometheus` 带/不带 Bearer 均返回 **403**（存在但被拒），无访问权。
- 结论：**无服务端采集通道**，改用途径 3（客户端侧增强观测）+ 时间窗口。

## 产物

执行器 `code/slo_boundary3.py`；统计/报告 `code/build_report.py`；哈希 `code/evidence_index.py`。
数据：`wave-*-nopool.json`、`wave-*-pool200-*.json`、`long-*.json`、`wave-11x/24x-*.json`、`recovery-*.json`、
`resource-timeseries.json`、`run-log.json`、`analysis.json`、`failure-details.json`、`responses/*.sse.gz`、`报告.md`、`运行日志/`。

状态：待审。

## 本轮结果（待审）

- 请求总数 **14606**，09:46～11:32（UTC，北京 17:46～19:32）分三批完成；失败 1061，其中 1054 集中在非连接池 1100 档。
- **服务端采集（A）**：探测 32 条，`/tpt-work-router/v1/actuator/*` 恒 403、根路径为应用 SPA HTML，**无可用采集通道**；改用客户端侧在途时间序列与连接/首字节分离。
- **1600 根因（B）**：非连接池 800/900/1000 全成功，**1100 档首次系统性失败（46/1100，连接在途峰值仅 851）**；改用连接池 `limit=200` 后 **1600 档 3194/3200（99.81%）**。→ 失败主因是**压测机连接/socket 资源耗尽**。恢复检查 1/1。
- **长请求 SLO（C）**：严格线 P95<10s 无档全轮满足（30 档一轮已达 11.9s）；宽松线 P95<20s 边界 = 75（100 档起突破）。
- **短请求边界加密（D）**：严格线 P95<5s 收窄到 **(120,125)**；宽松线 P95<10s 收窄到 **(248,250)**。110/115/120 各 5 轮全部 100% 完整。
- 压测机资源峰值：CPU 57.5%、RSS 474MB、handles 1319、TCP 1102（出现在非连接池 1100 档）。
- 证据：14606 个 `responses/*.sse.gz` 逐响应解压哈希复核 `issues=[]`。
