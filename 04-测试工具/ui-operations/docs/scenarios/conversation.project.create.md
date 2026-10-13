# 创建项目并读取项目选项

[返回对话、任务、会话与权限](../modules/conversation.md)

先登记读取表单字段和菜单选项，排除同名项目，再调用createProject。单次提交，失败先核对实际资产，不盲目重试。精确菜单项不证明持久化。 新组合仅静态检查，待现场验收。参数和恢复见[项目业务组合](../项目业务组合.md)。

| 候选函数 | 用途 |
|---|---|
| `conversation.createProject` | 创建项目：填写表单、选择源目录、单次提交、读取精确项目菜单项；持久化另验 |
| `conversation.readProjectSurface` | 读取当前项目入口、表单字段、会话身份与项目按钮，不打开菜单或选择器 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.project.create`；场景内检索：`--find "关键词" --route conversation.project.create --limit 3`。
