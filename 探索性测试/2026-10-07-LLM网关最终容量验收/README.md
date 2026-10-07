# 2026-10-07 LLM 网关最终容量验收

## 任务性质

本任务只执行**仍然需要真实发请求才能确认的容量验收**。

不要重新跑完整 LLM 网关测试，不要重写长期测试方案，不要修改历史报告或历史证据。

长期方案与当前结论只读：

- `../../04-测试项/saas-llm-test/README.md`
- `../../04-测试项/saas-llm-test/docs/03-指标与容量.md`
- `../../04-测试项/saas-llm-test/docs/06-指标定义.md`
- `../../04-测试项/saas-llm-test/docs/07-标准Agent负载.md`
- `../2026-10-07-LLM网关服务评估/最终测试报告.md`
- `../2026-10-07-LLM网关服务评估/补测/todo_2-容量延迟曲线/`

本任务完成后只提交本目录产物。最终总报告由上层离线整合，不由本任务修改。

---

# 一、只做两件事

## A. Responses 简单请求关键边界持续复核

现有初筛结果：

|体验线|候选通过档|候选首失败档|
|---|---:|---:|
|E2E p95 ≤3s|55|60|
|E2E p95 ≤5s|80|85|
|E2E p95 ≤10s|200|210|

目标：

> 验证这些边界在持续窗口中是否仍成立，决定它们能否从“初筛容量”升级为“持续验证容量”。

## B. TPT Work standard Agent 真实负载容量确认

使用：

`04-测试项/saas-llm-test/docs/07-标准Agent负载.md`

目标：

> 先确认单用户真实 standard Agent 的稳定基线，再判断 3/5/10 秒体验线是否有可用容量；如果单用户已经不满足某条体验线，直接记录“1 用户已不满足”，不要为了得到更高数字修改 workload。

---

# 二、统一环境

除非现网配置已经发生明确变化，否则冻结：

```text
endpoint = https://tpt.supcon.com/tpt-work-router/v1
model = flash
reasoning = low
credential_mode = single key
```

记录：

```text
UTC开始/结束
北京时间开始/结束
客户端主机
Python/Node版本
测试代码commit/SHA-256
网关endpoint
model
reasoning
credential identifier（不得保存secret）
网络出口信息（可记录IP/区域，不记录敏感凭据）
```

禁止把不同模型、不同 reasoning、不同协议混进同一容量结论。

---

# 三、成功口径必须分层

每个样本至少输出：

```text
protocol_success
gateway_service_success
agent_task_success
model_or_task_quality
```

定义以 `docs/06-指标定义.md` 为准。

特别注意：

### 简单文本

如果：

- HTTP/传输正常；
- Responses 可解析；
- 终态 completed；
- 有正常非空正文；

但模型只是：

- marker 多了标点；
- 多了少量解释；
- 没有严格逐字符回显；

则：

```text
gateway_service_success = true
model_or_task_quality = fail / mismatch
```

不要因此把网关容量成功率降为失败。

但：

```text
incomplete
空正文
传输失败
连接失败
HTTP错误
协议解析失败
非法终态
```

仍属于 gateway service failure。

### standard Agent

完整工具调用、回填、最终业务断言不通过：

```text
agent_task_success = false
```

但同时单独记录该任务中的每个 LLM 请求是否 gateway_service_success。

---

# 四、任务 A：Responses 简单请求持续边界复核

## 4.1 负载必须复用 todo_2

不要换题。

继续使用 todo_2 的：

- Responses API；
- flash；
- reasoning.effort=low；
- 简单唯一 marker 文本；
- streaming；
- max_output_tokens 与现有 todo_2 保持一致；
- 单 key。

如果复用现有代码，保存代码 SHA。

如果必须修代码，只允许修：

- 统计口径；
- 证据落盘；
- 客户端资源采集；
- 明确的执行 bug。

不得改变业务负载来改善结果。

---

## 4.2 只测 6 个档位

```text
55
60
80
85
200
210
```

不要重新扫描 1/5/10/20/50/100/300/500 等全部档位。

---

## 4.3 持续窗口

每个档位执行：

```text
2 个独立正式窗口
每个窗口 >= 10 分钟
每窗 >= 100 个实际尝试
```

建议执行模型：

```text
U个虚拟用户组成一波
→ 同步发起U个请求
→ 等该波全部完成/失败
→ think time 5秒
→ 下一波
→ 持续到窗口时间和最小样本都满足
```

每一波记录：

```text
planned_concurrency
actual_peak_in_flight
launch_spread
attempted
gateway_service_success
model_quality_mismatch
incomplete
429
5xx
timeout
connection_error
protocol_error
TTFT
E2E
```

窗口之间至少：

```text
排空
低负载健康检查
30秒冷却
```

不要多个档位同时跑。

---

## 4.4 持续窗口判据

一档对某条体验线“通过”，必须两个独立窗口都满足：

```text
Gateway Service Success Rate >= 99%
AND
E2E p95 <= 对应阈值
```

其中：

```text
55 / 60 -> 3秒线
80 / 85 -> 5秒线
200 / 210 -> 10秒线
```

如果候选通过档反而失败：

- 不自动扩大测试；
- 允许对该档再补 1 个复核窗口；
- 保留原结果；
- 最终报告“初筛与持续窗口不一致”。

如果候选失败档反而两个窗口都通过：

- 在该阈值下边界未确认；
- 不擅自继续无限加压；
- 最多增加 **一个中间/相邻档位**，用于判断是否只是随机波动；
- 仍无法确认则报告“边界待后续专项确认”。

---

## 4.5 客户端有效性

每个窗口必须采集：

```text
CPU
RSS
线程/句柄
TCP连接数
actual_peak_in_flight
launch_spread
```

如果：

```text
actual_peak_in_flight < planned * 0.90
```

或明显出现客户端 socket/连接能力瓶颈：

该窗口不能用于网关容量结论。

标记：

```text
client_limited = true
```

不要把客户端连接错误直接定性成网关内部失败。

---

# 五、任务 B：standard Agent 真实负载

## 5.1 workload 不得自行简化

严格复用：

`04-测试项/saas-llm-test/docs/07-标准Agent负载.md`

包括：

- standard preset 来源画像；
- flash / low；
- Responses；
- 约 22.5K～23.1K input token；
- 典型 2 次 LLM 请求；
- 1 次 pwsh 工具；
- 工具等待约 0.9～1.2s；
- 固定收入/成本计算业务；
- 最终月度表格、趋势、两条建议；
- 收入 21000、成本 14700、利润 6300、利润率 30%；
- 本轮唯一 marker。

不要：

- 缩短 system prompt；
- 删除工具定义；
- 改成 add_numbers；
- 降低正文长度要求；
- 去掉必须调用工具的要求；
- 修改业务断言；
- 为提高成功率重写 prompt。

---

## 5.2 先做单用户基线

先执行：

```text
concurrency = 1
正式任务 >= 30
```

输出：

```text
Agent Task Success Rate
Gateway Service Success Rate（按所有LLM请求）
首有效反馈 p50/p95
Agent Task E2E p50/p95
每任务LLM请求数
Requests/s
Agent turns/s
工具调用成功率
最终业务断言失败分类
```

历史结果仅作对照，不覆盖：

```text
27/30 Agent task success
58/58 网关请求 HTTP200 + completed
task p95 28.781s
首有效内容 p95 8.312s
```

---

## 5.3 根据单用户结果决定是否继续加压

### 情况 A：单用户已经不满足 3/5/10 秒

如果：

```text
Agent Task Success Rate < 99%
OR
Agent Task E2E p95 > 10s
```

则对于 3/5/10 秒容量：

```text
1用户已不满足
```

不要为了“测出人数”继续大规模加压。

但为了确认并发退化趋势，最多继续：

```text
2
5
10
```

三个轻量档，每档至少 30 个任务或安全预算允许的最接近样本。

这些档位只用于：

> 观察真实 Agent 随并发增加后的 E2E/TTFT/任务成功率变化。

不能把它们写成“3/5/10秒容量通过档”。

### 情况 B：单用户满足至少一条体验线

才继续寻找对应阈值的容量边界。

优先档位：

```text
1
2
5
10
20
40
```

逐档执行，不要直接跳高。

达到任一条件停止提高：

```text
Agent Task Success Rate < 95%
连续两个档位 task p95 > 10s
客户端受限
出现明显服务异常
达到40仍通过
```

如果 40 仍通过：

报告：

```text
已验证下界 >=40，更高未测
```

不要自行继续到 100/200。

---

# 六、standard Agent 的归因要求

每个失败任务必须区分至少：

```text
transport/http
responses_protocol
incomplete
tool_not_called
tool_args_invalid
tool_result_link_error
final_business_assertion
format_or_quality
client_error
unknown
```

最终至少给两条成功率：

```text
Gateway Service Success Rate
Agent Task Success Rate
```

禁止出现：

> Agent任务失败，所以网关请求失败

这种混写。

---

# 七、安全停止条件

满足任一条件立即停止继续升档，但保存当前证据并执行恢复检查：

```text
1. 某档 HTTP/传输失败率 > 5%
2. 连续两个档位 E2E p95 > 当前最高关注阈值
3. 客户端连接/socket/线程成为瓶颈
4. 出现持续 429 / 5xx
5. 环境异常、凭据异常、CDP/网络不稳定
6. 用户明确要求暂停
```

恢复检查：

```text
至少10个低负载简单请求
记录成功率与E2E
确认没有遗留压测进程
```

---

# 八、禁止事项

本任务不要：

1. 修改 `04-测试项/saas-llm-test/` 长期方案；
2. 修改 `最终测试报告.md`；
3. 修改任何历史原始证据；
4. 重跑完整 API/TPT/PERF/CAP 套件；
5. 做图片、JSON mode、reasoning全档、多模型等无关专项；
6. 为了得到更高容量调整 SLO；
7. 为了得到更高 Agent 成功率改变标准 workload；
8. 把客户端错误直接归因成服务端根因；
9. 把短请求容量外推成 standard Agent 容量；
10. 删除失败样本或用成功重跑覆盖失败样本。

---

# 九、目录与交付

在本目录创建：

```text
2026-10-07-LLM网关最终容量验收/
├── README.md
├── 环境.json
├── 结果汇总.json
├── 验收报告.md
├── code/
├── results/
│   ├── responses-boundary/
│   └── standard-agent/
├── evidence/
├── evidence-index.jsonl
└── run-log.json
```

## 结果汇总.json 至少包含

```json
{
  "responses_boundary": {},
  "standard_agent": {},
  "client_limits": {},
  "recovery": {},
  "issues": []
}
```

---

# 十、最终报告只回答这些问题

## Responses 简单请求

|体验线|持续验证通过档|持续验证首失败档|结论|
|---|---:|---:|---|
|3s| | | |
|5s| | | |
|10s| | | |

并给：

```text
×5规划总用户
```

## standard Agent

|项目|结果|
|---|---|
|单用户 Agent Task Success Rate| |
|单用户 Gateway Service Success Rate| |
|单用户首有效反馈 p95| |
|单用户任务 E2E p95| |
|3秒容量| |
|5秒容量| |
|10秒容量| |
|并发退化趋势| |

如果单用户已经不满足 3/5/10 秒，不要填 0。

写：

```text
已测1个活跃Agent即不满足该体验线，因此该阈值下没有已验证的正整数容量。
```

---

# 十一、完成标准

任务完成时必须能让上层直接回答：

1. Responses 55/60、80/85、200/210 的持续窗口是否支持原初筛边界？
2. 这些数字是否可以升级为“持续验证容量”？
3. 真实 standard Agent 单用户当前到底是网关问题、模型/任务质量问题，还是主要是任务本身耗时？
4. 真实 standard Agent 在 3/5/10 秒体验线下是否存在正整数容量？
5. 如果不存在，随 1/2/5/10 用户增长时体验如何退化？
6. 有没有任何结论被客户端资源限制污染？

回答完这些问题后停止，不继续扩展测试范围。
