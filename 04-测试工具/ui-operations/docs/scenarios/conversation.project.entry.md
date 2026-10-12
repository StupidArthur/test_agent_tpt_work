# 打开项目选择入口及菜单

[返回对话、任务、会话与权限](../modules/conversation.md)

无项目时入口可能直接打开系统选择器；已有项目时可能显示菜单。按实际观察选择下一步，不强设路径。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.clickSelectProject` | 点击 composer 旁的“选择项目”，读取点击后 DOM 是否出现菜单/对话框（原生窗口另行探测）。 |
| `conversation.clickMenuItem` | 点击当前可见菜单中指定文本的菜单项，并回读项目按钮文本。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.project.entry`；场景内检索：`--find "关键词" --route conversation.project.entry --limit 3`。
