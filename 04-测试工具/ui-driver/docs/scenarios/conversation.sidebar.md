# 侧栏排序、未读与提醒

[返回对话、任务、会话与权限](../modules/conversation.md)

排序和未读只作用于指定会话或当前列表；排序修改需要恢复。

| 候选函数 | 用途 |
|---|---|
| `conversation.markUnread` | 通过会话行菜单标记为未读 |
| `conversation.readUnreadBadge` | 读取会话行的未读标记数量 |
| `conversation.readSortMenu` | 打开侧栏排序菜单读取文本 |
| `conversation.setSort` | 设置侧栏排序值并回读，可选恢复 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.sidebar`；场景内检索：`--find "关键词" --route conversation.sidebar --limit 3`。
