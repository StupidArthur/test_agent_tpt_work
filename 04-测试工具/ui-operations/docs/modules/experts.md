# 专家

[返回目标索引](../功能索引.md)

选择当前操作意图，只读一个场景。此页不展开函数参数或实现。

| 要做什么 | 意图 | 下一份资料 |
|---|---|---|
| 导入入口、提交与来源卡片 | 创建/观察 | [候选与指导](../scenarios/experts.import.md) |
| 同名冲突、异常包与安装完整性 | 创建/观察 | [候选与指导](../scenarios/experts.conflict.md) |
| 阅读详情与验证提示词末尾可见 | 观察 | [候选与指导](../scenarios/experts.detail.md) |
| 进入创建或对话编辑并发送 | 创建/修改 | [候选与指导](../scenarios/experts.edit.md) |
| 引入专家、实际调用与轨迹 | 执行/观察 | [候选与指导](../scenarios/experts.use.md) |
| 外部文件、元数据与坏配置反馈 | 观察 | [候选与指导](../scenarios/experts.files.md) |

命令行：`node 04-测试工具/ui-operations/call.mjs --browse experts`。

场景不匹配时返回目标索引，或 `--find "业务词" --module experts --limit 3`。找不到再按 [扩展与边界](../扩展与边界.md) 核对缺口。
