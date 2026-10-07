# LLM 网关测试执行器

复用代码的正式位置。来源为探索任务，管理者已修订并完成离线验证；原任务源码与调用证据保留作历史版本。只测 API，不操作软件 UI。

## 先准备本轮任务

在 `探索性测试/<任务>/` 放入口、配置快照、有效凭据环境变量引用和已分配队列。参考 [配置模板](../templates/配置快照.example.json)；模板地址/模型/负载/SLO不是已确认参数。真实请求仍须遵守任务范围及负载授权。

命令在仓库根执行，**必须传 --task-dir**；配置默认读取本轮 `配置快照.json`，也可在子命令前传 `--config <文件>`。输出限制在探索任务内，测试项和源码目录不存放执行结果。

```powershell
python 04-测试项/saas-llm-test/code/run.py --task-dir "探索性测试/本轮任务" list
python 04-测试项/saas-llm-test/code/run.py --task-dir "探索性测试/本轮任务" run --module api --target <配置中的目标> --items API-01,API-02
python 04-测试项/saas-llm-test/code/run.py --task-dir "探索性测试/本轮任务" report
```

run 会真实调用网关；list/report不会。报告输出 `报告_自动.md`，不覆盖人工验收报告。结果、日志、证据和索引全部写到 task-dir。容量结果在 `结果/容量复核/`，单独验收，不能把普通自动报告当作完整容量结论。

## 按需选择模块

| 操作 | 入口 | 当前边界 |
|---|---|---|
| 普通契约、性能及历史容量实例 | run --module api/tpt/perf/cap --items ... | list显示已内置与条件项；未实现编号不能算通过 |
| 文本/工具用户、独立持续窗口、压后恢复 | capacity --plan-file ... | CAP-02/03/04/06统一走此入口；不要用旧run调用CAP-03/04/06 |
| 验证解析与调度 | 下述离线命令 | 本地模拟服务/假传输；不是网关实测 |

容量从 [指标与容量](../docs/03-指标与容量.md) 阅读，再复制 [文本计划](../templates/容量执行计划-text.example.json) 或 [工具计划](../templates/容量执行计划-tool.example.json) 到本轮任务。两份模板均未确认，复制不代表获得授权。冻结SLO/模型/思考档/最高负载/时间窗/预算/凭据模式，并根据任务事实填写 approval_reference。

```powershell
# 默认仅预览，不发请求
python 04-测试项/saas-llm-test/code/run.py --task-dir "探索性测试/本轮任务" capacity --target <目标> --plan-file "探索性测试/本轮任务/容量计划.json"
# 只有计划和SLO真实确认后才执行
python 04-测试项/saas-llm-test/code/run.py --task-dir "探索性测试/本轮任务" capacity --target <目标> --plan-file "探索性测试/本轮任务/容量计划.json" --execute
```

预算按实际速率/用户/窗口估算，最低样本数不是请求上限。整批硬请求预留预算不足时停止发起并排空，工具轮两请求预留，恢复阶段保留健康检查预算；样本不足不构成服务失败边界。单key、固定历史、本地近零耗时工具有适用范围，客户端资源与费用限制另需冻结。尚无新入口真实网关容量验证，不承诺最大用户数。

## 离线验证

```powershell
python 04-测试项/saas-llm-test/code/test_capacity_suite.py
python 04-测试项/saas-llm-test/code/offline_validate.py --task-dir "探索性测试/本轮任务"
```

前者13项，临时证据；后者8项，模拟HTTP/SSE证据写到指定任务。调用后核验实际输出，不把历史通过次数当新结果。

## 需要改代码时再读

`llm_probe/transport.py`和`sse.py`管HTTP/帧；`protocol.py`管请求与归一化；`capacity.py`管基础调度；`capacity_suite.py`管容量计划/工具业务链/独立窗口/恢复；`runner.py`管实例；`evidence.py`管原始记录和索引；`stats.py`管指标；`cli.py`管任务路径；`report.py`管普通交付汇总。只读当前模块。

来源和迁移前SHA见 [来源清单](来源清单.json)；迁移版本/离线验证见 [落盘验收](落盘验收.json)。本轮特定补测探针、一次性修订脚本及产品结果留在原探索任务。后续补能力在任务里留源码/真实调用，经审核再并入本目录；入库代码不等于所有36测试项已实现或当前网关通过。
