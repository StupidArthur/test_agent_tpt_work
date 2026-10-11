# 名称、图标、解析声明与拒绝反馈

[返回附件](../modules/attachments.md)

按卡片身份限定读取；完整名称用悬停标题，解析声明用卡片正文。

| 候选函数 | 用途 |
|---|---|
| `attachments.readFeedback` | 读取附件相关的可见提示/反馈（超额、拒绝等） |
| `attachments.readCardIcon` | 读取指定附件卡内文件图标是否存在 |
| `attachments.readCardText` | 读取指定附件卡完整文本并判断是否含肯定解析声明 |
| `attachments.readCardTitle` | 悬停指定附件卡并读取 title/tooltip 完整名称 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse attachments.card`；场景内检索：`--find "关键词" --route attachments.card --limit 3`。
