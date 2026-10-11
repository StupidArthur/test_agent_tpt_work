# 引入专家、实际调用与轨迹

[返回专家](../modules/experts.md)

引入引用不证明规则生效；结合请求终态和正文注入轨迹。

| 候选函数 | 用途 |
|---|---|
| `experts.useExpert` | 新建会话后经 使用 引入本轮专家引用；返回改前/改后会话身份与引用名 |
| `experts.useExpertRequest` | 发送专家固定回复规则请求并读取终态与用户请求 |
| `experts.readTraceExpertContent` | 读取本轮专家调用轨迹中的专家正文注入记录（限定轨迹表格） |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse experts.use`；场景内检索：`--find "关键词" --route experts.use --limit 3`。
