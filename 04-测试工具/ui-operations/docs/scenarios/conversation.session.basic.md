# 只新建任务或按标题切换

[返回对话、任务、会话与权限](../modules/conversation.md)

只需空白任务用newTaskOnly，配置项目/模型仍查newTask；按标题切换须回读会话身份。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.newTaskOnly` | 点击左上角“新建任务”，读取切换前后会话身份与 composer 状态。 |
| `conversation.switchSessionByTitle` | 在左侧列表中按会话名切换到指定会话，读取切换前后会话身份。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.session.basic`；场景内检索：`--find "关键词" --route conversation.session.basic --limit 3`。
