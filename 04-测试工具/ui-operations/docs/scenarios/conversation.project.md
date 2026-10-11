# 发现项目控件与已有选项

[返回对话、任务、会话与权限](../modules/conversation.md)

只发现当前已有项目，不创建项目；先核对真实控件和选项身份。

| 候选函数 | 用途 |
|---|---|
| `conversation.readProjectControls` | 读取可见项目控件的实际标签，保留HTML，不能拿隐藏的侧栏新建按钮当选择项目 |
| `conversation.readProjectOptions` | 读取当前已有项目菜单与身份属性，关闭菜单，不添加项目 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.project`；场景内检索：`--find "关键词" --route conversation.project --limit 3`。
