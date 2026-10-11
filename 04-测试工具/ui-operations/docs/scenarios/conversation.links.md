# 回复链接、侧面板与帮助入口

[返回对话、任务、会话与权限](../modules/conversation.md)

链接请求日志依赖本轮夹具；请求发生不能替代目标面板可见断言。

| 候选函数 | 用途 |
|---|---|
| `conversation.openLinkInReply` | 点击助手回复中 href 含指定片段的真实锚点 |
| `conversation.readSidePanelVisible` | 读取应用内侧边栏/浏览器面板是否可见 |
| `conversation.readLinkLog` | 读取链接夹具请求日志（路径串或 UA 判定） |
| `conversation.openHelpFeedback` | 点击更多→帮助/反馈并读取帮助目标是否打开 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.links`；场景内检索：`--find "关键词" --route conversation.links --limit 3`。
