# 当前对话首次打开本地项目

[返回对话、任务、会话与权限](../modules/conversation.md)

先登记读取当前会话、项目按钮及菜单入口，再调用openProject。已有项目走已有项目场景，不重复添加。入口role/name不能猜。 新组合仅静态检查，待现场验收。参数和恢复见[项目业务组合](../项目业务组合.md)。

| 候选函数 | 用途 |
|---|---|
| `conversation.openProject` | 当前对话首次打开本地目录：项目菜单→原生选择器→实际项目按钮回读，不新建会话 |
| `conversation.readProjectSurface` | 读取当前项目入口、表单字段、会话身份与项目按钮，不打开菜单或选择器 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.project.open`；场景内检索：`--find "关键词" --route conversation.project.open --limit 3`。
