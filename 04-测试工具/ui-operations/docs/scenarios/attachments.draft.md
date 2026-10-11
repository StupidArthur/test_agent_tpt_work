# 添加、移除与清空草稿附件

[返回附件](../modules/attachments.md)

操作草稿附件；发送后气泡验证转 sent，图片预览转 preview。

| 候选函数 | 用途 |
|---|---|
| `attachments.addLocalFiles` | 经 添加本地文件 一次选择多个附件并读取草稿附件名 |
| `attachments.readDraftState` | 读取当前草稿附件名列表/数量/数量提示 |
| `attachments.removeAttachment` | 移除指定附件并读取剩余名列表 |
| `attachments.clearAttachments` | 在附件区域查找清空入口（可选点击）并读取数量 |
| `attachments.readSingleName` | 读取当前草稿第一个附件的完整文件名（字符串） |
| `attachments.readComposerText` | 读取编辑器纯文本 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse attachments.draft`；场景内检索：`--find "关键词" --route attachments.draft --limit 3`。
