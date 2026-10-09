# 附件

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node 04-测试工具/ui-operations/call.mjs --describe attachments.addLocalFiles
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

## 对话与任务 → 附件

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `attachments.addLocalFiles` | 经 添加本地文件 一次选择多个附件并读取草稿附件名 | paths |
| `attachments.clearAttachments` | 在附件区域查找清空入口（可选点击）并读取数量 | 无 |
| `attachments.readCardIcon` | 读取指定附件卡内文件图标是否存在 | name |
| `attachments.readCardText` | 读取指定附件卡完整文本并判断是否含肯定解析声明 | name |
| `attachments.readCardTitle` | 悬停指定附件卡并读取 title/tooltip 完整名称 | name |
| `attachments.readComposerText` | 读取编辑器纯文本 | 无 |
| `attachments.readDraftState` | 读取当前草稿附件名列表/数量/数量提示 | 无 |
| `attachments.readFeedback` | 读取附件相关的可见提示/反馈（超额、拒绝等） | 无 |
| `attachments.readImageState` | 读取指定附件卡内图像 img.complete && naturalWidth>0 | name |
| `attachments.readSentBubble` | 读取最后一条用户气泡内某附件存在状态与删除按钮数量 | name |
| `attachments.readSingleName` | 读取当前草稿第一个附件的完整文件名（字符串） | 无 |
| `attachments.removeAttachment` | 移除指定附件并读取剩余名列表 | name |
| `attachments.scrollAttachments` | 读取附件容器可滚动性并滚到末端，返回末附件可见状态 | lastName |
| `attachments.togglePreview` | 打开/关闭图片整屏预览并读取预览层状态 | name |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
