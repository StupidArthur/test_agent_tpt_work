# 观察当前控件与侧栏结构

[返回对话、任务、会话与权限](../modules/conversation.md)

仅定位失败、结构未知时读此场景，不作为所有业务的前置。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.probeControls` | 探测主界面当前可见按钮(aria-label/文本)、composer、会话身份与正文片段。只读，供定位用。 |
| `conversation.probeSidebar` | 探测左侧列表结构：所有 data-row-key、role 行、侧栏文本与侧栏 HTML。只读。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.inspect`；场景内检索：`--find "关键词" --route conversation.inspect --limit 3`。
