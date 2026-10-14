# 项目行菜单与移除项目

[返回对话、任务、会话与权限](../modules/conversation.md)

先观察准确项目行；移除只移出产品列表，不代表删除磁盘目录。 来源smoketest-1012，迁库版本仅静态复核；需要时查看单函数契约。

| 候选函数 | 用途 |
|---|---|
| `conversation.readProjectRow` | hover 侧栏项目行并列出其按钮与结构，用于定位移除入口。只读。 |
| `conversation.readProjectMenu` | 打开项目行操作菜单并读取菜单项，随后 Escape 关闭。只读。 |
| `conversation.removeProject` | 移除项目：hover 项目行→操作菜单→点击「移除项目」→处理确认弹窗，并回读项目行列表。 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse conversation.project.manage`；场景内检索：`--find "关键词" --route conversation.project.manage --limit 3`。
