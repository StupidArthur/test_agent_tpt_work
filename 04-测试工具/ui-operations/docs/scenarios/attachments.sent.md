# 验证发送后的附件气泡

[返回附件](../modules/attachments.md)

读取真实用户气泡，不拿草稿附件状态代替发送后断言。

| 候选函数 | 用途 |
|---|---|
| `attachments.readSentBubble` | 读取最后一条用户气泡内某附件存在状态与删除按钮数量 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse attachments.sent`；场景内检索：`--find "关键词" --route attachments.sent --limit 3`。
