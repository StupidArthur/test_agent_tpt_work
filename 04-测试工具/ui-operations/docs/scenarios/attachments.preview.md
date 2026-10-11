# 图片加载、预览与附件滚动

[返回附件](../modules/attachments.md)

图片加载和预览可见性分别读取；末项可见不能由列表包含推断。

| 候选函数 | 用途 |
|---|---|
| `attachments.readImageState` | 读取指定附件卡内图像 img.complete && naturalWidth>0 |
| `attachments.togglePreview` | 打开/关闭图片整屏预览并读取预览层状态 |
| `attachments.scrollAttachments` | 读取附件容器可滚动性并滚到末端，返回末附件可见状态 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse attachments.preview`；场景内检索：`--find "关键词" --route attachments.preview --limit 3`。
