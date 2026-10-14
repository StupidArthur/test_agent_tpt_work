# 在已有项目下创建会话

[返回对话、任务、会话与权限](../modules/conversation.md)

绑定本轮唯一项目，回读项目按钮和会话身份。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.newSessionInProject` | hover 项目行→点击「在“<项目>”中新建会话」图标，在该项目下创建新任务；回读会话身份与项目按钮。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.project.session`；场景内检索：`--find "关键词" --route conversation.project.session --limit 3`。
