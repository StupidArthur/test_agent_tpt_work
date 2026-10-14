# 外部文件、元数据与坏配置反馈

[返回专家](../modules/experts.md)

文件读取用于独立核验；配置反馈须来自当前专家列表。

| 候选函数 | 用途 |
|---|---|
| `experts.readInstalledFileHashes` | 读取本机已安装文件的 SHA256（channel=file） |
| `experts.readFileContent` | 读取本机已安装文件内容（channel=file） |
| `experts.readMetadataField` | 读取安装 metadata.json 的指定字段 |
| `experts.readValidationFeedback` | 打开专家列表读取本轮对象的坏配置校验反馈 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse experts.files`；场景内检索：`--find "关键词" --route experts.files --limit 3`。
