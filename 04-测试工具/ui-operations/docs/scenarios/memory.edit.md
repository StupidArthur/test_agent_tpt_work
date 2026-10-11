# 添加记忆或编辑分层文件

[返回记忆与进化](../modules/memory.md)

先备份，本机 memory_root 与文件身份须核对，写后独立回读并恢复；不覆盖原生删除确认场景。

| 候选函数 | 用途 |
|---|---|
| `memory.addEntry` | 在记忆库按类型添加自定义记忆条目并回读 |
| `memory.editLayerFile` | 编辑分层记忆文件（SOUL/AGENTS/USER/MEMORY）并保存 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse memory.edit`；场景内检索：`--find "关键词" --route memory.edit --limit 3`。

涉及本机记忆文件或写入时再读 [记忆与进化](../记忆与进化.md)。
