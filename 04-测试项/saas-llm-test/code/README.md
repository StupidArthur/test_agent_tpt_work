# 可复用执行代码

先按 [核心case入口](../cases/README.md)选场景，再读当前模块；执行器能做的项目不自动成为必跑项。真实运行须已分配探索任务和负载授权，本目录不保存某次运行结果。

|需要的能力|代码入口|边界|
|---|---|---|
|HTTP/SSE/协议和逐实例证据|llm_probe/transport.py、sse.py、protocol.py、evidence.py|保留原始流，协议成功不等于内容成功|
|性能时点与有效内容采样|llm_probe/performance.py：Sampler.measure、aggregate|细分first_event/reasoning/text/tool；expected须覆盖实际业务断言；token/E2E不是解码速度|
|API/TPT/PERF指定编号执行|run.py → runner.py|必须明确items；list中的条件/未实现项不算通过|
|文本/简化工具闭环、持续窗口、恢复|llm_probe/capacity_suite.py，经capacity子命令|单SLO兼容字段及CAP-04三阈值汇总；不内置真实standard Agent|
|基础请求调度/统计|capacity.py、stats.py|核对调度和分母，与新指标定义对齐后才能进正式报告|
|普通自动报告|report.py|不是新的正式模板，也不是完整容量报告|
|独立窗口证据、有效性与三阈值汇总|llm_probe/window_evidence.py，已接入capacity_suite|每次调用新attempt；不自动重跑/跳过历史窗口；无效窗口不算网关首失败档|

## 命令与输出边界

在仓库根执行，必须传任务目录；配置读该任务配置快照。list/report不发请求；run会发请求，capacity默认预览，--execute才发请求。

```powershell
python 04-测试项/saas-llm-test/code/run.py --task-dir "探索性测试/本轮任务" list
python 04-测试项/saas-llm-test/code/run.py --task-dir "探索性测试/本轮任务" report
```

真实执行在任务中写明确 target、module、items或plan-file；不得无选择地全模块遍历。结果/自动报告/证据全部输出task-dir，不覆盖人工报告。容量旧示例 [文本](../templates/容量执行计划-text.example.json)/[工具](../templates/容量执行计划-tool.example.json)仍是单SLO接口样例，非新三阈值方案；confirmed及approval_reference须真实填写。

## 新方案与现有实现的接缝

从原样本离线按 [指标](../docs/06-指标定义.md)分别评3/5/10秒≥99%，不得直接引用旧单SLO自动结论。真实Agent回放来源在 [workload](../docs/07-标准Agent负载.md)，执行任务登记适配驱动、参数/调用、代码SHA；共享样本，不能为三个阈值重发三遍。

默认TTFT须从有效场景内容选取；现有首事件字段不直接当TTFT。现有aggregate/自动报告未承诺完整七指标、任务首反馈或新模板，应由任务驱动对原始记录明确归一。缺失能力或计量如实标未验证，不假称已实现。

2026-10-08持续窗口改进：capacity_suite保留每次窗口的start/finish、请求发起及完成证据，压力期间每0.5秒采进程资源并逐行刷新。采样需安装`psutil`；失败保留错误，容量不判通过。CAP-04须填写非secret `credential_id`；`load_isolation`默认unknown，只有已安排暂停其他同网关流量并声明declared_exclusive时可给本场景容量。资源数据不自动证明客户端没有瓶颈。

`capacity_3way`独立评价3/5/10秒，每档至少两有效窗；旧`capacity_conclusion`仍是单SLO兼容字段。文本成功按可用非空completed，严格marker mismatch仍在checks记录；工具任务仍按完整任务断言。E2E容量使用全部已完成尝试耗时，成功率另约束；历史Task A采用成功请求条件分布，两种统计不可不注明地混用。

客户端有效性默认未确认，不能因为采样成功就认定无限制。运行前在`client_validation`登记`confirmed`与`basis`，引用本机连接/调度能力验证证据；实际运行若出现新瓶颈须另作无效判定。没有依据的confirmed不得填true。此预确认与压力资源记录都必须审核。

恢复任务驱动可使用`WindowAttempt.can_resume(path, expected_sha256, config)`核对证据；本库不会主动扫描旧目录跳过或删除attempt。配置包含负载、授权、端点、credential_id及执行代码SHA。旧探索执行器保留原样，后续优先复用本接口，不把旧覆盖路径脚本直接当标准续跑器。

离线回归：在本code目录运行 `python -B -m unittest test_window_evidence test_capacity_suite`。使用模拟请求及本地HTTP服务，不访问真实网关。版本说明见 [版本说明](版本说明-2026-10-08.md)。

离线测试源：test_capacity_suite.py、test_performance.py、offline_validate.py（本地模拟，不是网关实测）。历史迁移 [来源清单](来源清单.json)、[落盘验收](落盘验收.json)仅作版本溯源；其中日期结果不是当前网关结论。本次资料重构不修改Python源码，不重新跑任何真实请求。
