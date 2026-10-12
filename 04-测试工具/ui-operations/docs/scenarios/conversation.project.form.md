# 读取并填写新建项目表单

[返回对话、任务、会话与权限](../modules/conversation.md)

只操作当前唯一表单；源目录选择复用nativeWindow场景。创建整体流程另见project.create，不能把步骤成功当创建完成。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.readProjectForm` | 读取可见的“新建项目”表单：输入框/标签/按钮。只读。 |
| `conversation.fillProjectForm` | 在“新建项目”表单中填写项目名称，返回改前/改后与可见按钮。 |
| `conversation.clickDialogButton` | 点击当前可见弹窗中指定名称的按钮，并回读侧栏项目行列表。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.project.form`；场景内检索：`--find "关键词" --route conversation.project.form --limit 3`。
