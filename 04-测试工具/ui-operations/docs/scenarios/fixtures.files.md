# 文件读取、备份、外部写入与恢复

[返回夹具、备份、文件与服务](../modules/fixtures.md)

先读取和备份；新增文件恢复需事前不存在证据及当前哈希，不代替产品 UI 删除。

| 候选函数 | 用途 |
|---|---|
| `fixtures.backupFile` | backupFile（本轮样本/文件准备与恢复） |
| `fixtures.readFile` | readFile（本轮样本/文件准备与恢复） |
| `fixtures.writeFile` | writeFile（本轮样本/文件准备与恢复） |
| `fixtures.restoreFile` | restoreFile（本轮样本/文件准备与恢复） |
| `fixtures.removeCreatedFile` | 恢复本轮新增文件为不存在：需事前不存在的读取引用和当前SHA；拒绝核心记忆文件、目录及链接 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse fixtures.files`；场景内检索：`--find "关键词" --route fixtures.files --limit 3`。
