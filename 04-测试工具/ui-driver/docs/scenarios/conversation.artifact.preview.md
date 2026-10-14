# 读取产物链接和侧栏预览

[返回对话、任务、会话与权限](../modules/conversation.md)

按准确文件名打开产物并回读预览。iframe外壳不等于内部正文已读取。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.readArtifactLinks` | 探测会话中的产物链接/卡片/文件元素，用于依次点击并验证右侧显示页渲染。只读。 |
| `conversation.openArtifactLink` | 点击会话中的产物文件链接(button._fileLink_)，读取随后右侧显示页的真实状态(iframe/面板/右侧文本)。 |
| `conversation.readSidePanel` | 只读当前右侧显示页状态(iframe/面板)。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.artifact.preview`；场景内检索：`--find "关键词" --route conversation.artifact.preview --limit 3`。
