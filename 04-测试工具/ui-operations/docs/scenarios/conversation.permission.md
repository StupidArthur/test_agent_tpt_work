# 读取或修改当前任务权限

[返回对话、任务、会话与权限](../modules/conversation.md)

仅当前任务composer访问模式；默认权限属于设置模块，不以改全局默认代替本操作。value来自当前选项实际读值，不凭旧名称推断映射。完全权限和全部允许均需confirmFullPermission=true，处理对应风险复选框和启用按钮；disabled或原有弹窗拒绝。改前保留初值，改后回读并恢复。

| 候选函数 | 用途 |
|---|---|
| `conversation.readTaskPermissionOptions` | 读取当前任务访问模式与可见菜单选项；不修改默认权限 |
| `conversation.setTaskPermission` | 仅在当前任务访问模式控件修改权限，兼容完全权限/全部允许风险确认，记录前后实际值与会话身份 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.permission`；场景内检索：`--find "关键词" --route conversation.permission --limit 3`。
