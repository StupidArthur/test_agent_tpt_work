# 准备唯一样本、项目文件与比较身份

[返回夹具、备份、文件与服务](../modules/fixtures.md)

用于本轮样本准备；夹具成功不表示产品验证通过。

| 候选函数 | 用途 |
|---|---|
| `fixtures.prepareFixtures` | prepareFixtures（本轮样本/文件准备与恢复） |
| `fixtures.prepareProjectFiles` | prepareProjectFiles（本轮样本/文件准备与恢复） |
| `fixtures.prepareSmokeFixtures` | 生成冒烟专用唯一身份及答复标记 |
| `fixtures.identityDelta` | identityDelta（本轮样本/文件准备与恢复） |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse fixtures.prepare`；场景内检索：`--find "关键词" --route fixtures.prepare --limit 3`。
