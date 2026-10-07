# 可复用执行代码

先按 [核心case入口](../cases/README.md)选场景，再读当前模块；执行器能做的项目不自动成为必跑项。真实运行须已分配探索任务和负载授权，本目录不保存某次运行结果。

|需要的能力|代码入口|边界|
|---|---|---|
|HTTP/SSE/协议和逐实例证据|llm_probe/transport.py、sse.py、protocol.py、evidence.py|保留原始流，协议成功不等于内容成功|
|性能时点与有效内容采样|llm_probe/performance.py：Sampler.measure、aggregate|细分first_event/reasoning/text/tool；expected须覆盖实际业务断言；token/E2E不是解码速度|
|API/TPT/PERF指定编号执行|run.py → runner.py|必须明确items；list中的条件/未实现项不算通过|
|文本/简化工具闭环、持续窗口、恢复|llm_probe/capacity_suite.py，经capacity子命令|只评一套SLO；不自动汇总3/5/10，不内置真实standard Agent|
|基础请求调度/统计|capacity.py、stats.py|核对调度和分母，与新指标定义对齐后才能进正式报告|
|普通自动报告|report.py|不是新的正式模板，也不是完整容量报告|

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

离线测试源：test_capacity_suite.py、test_performance.py、offline_validate.py（本地模拟，不是网关实测）。历史迁移 [来源清单](来源清单.json)、[落盘验收](落盘验收.json)仅作版本溯源；其中日期结果不是当前网关结论。本次资料重构不修改Python源码，不重新跑任何真实请求。
