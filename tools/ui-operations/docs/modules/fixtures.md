# 夹具、备份、文件与服务

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node tools/ui-operations/call.mjs --describe fixtures.removeCreatedFile
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

**选用提醒**：服务 URL/端口/日志路径使用本次函数返回值。文件先备份，最后恢复并核验。夹具身份和各字段搜索词应本轮唯一。

## 夹具 → 恢复 → 本轮新增文件

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.removeCreatedFile` | 恢复本轮新增文件为不存在：需事前不存在的读取引用和当前SHA；拒绝核心记忆文件、目录及链接 | path, expectedSha256, absentReadRef |

## fixtures → backupFile

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.backupFile` | backupFile（本轮样本/文件准备与恢复） | path |

## fixtures → identityDelta

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.identityDelta` | identityDelta（本轮样本/文件准备与恢复） | before, after |

## fixtures → prepareFixtures

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.prepareFixtures` | prepareFixtures（本轮样本/文件准备与恢复） | run |

## fixtures → prepareProjectFiles

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.prepareProjectFiles` | prepareProjectFiles（本轮样本/文件准备与恢复） | projectRoot, run |

## fixtures → prepareSmokeFixtures

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.prepareSmokeFixtures` | 生成冒烟专用唯一身份及答复标记 | run |

## fixtures → readFile

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.readFile` | readFile（本轮样本/文件准备与恢复） | path |

## fixtures → restoreFile

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.restoreFile` | restoreFile（本轮样本/文件准备与恢复） | path, backup, sha256 |

## fixtures → startLinkServer

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.startLinkServer` | 启动本轮loopback链接夹具 | run |

## fixtures → stopLinkServer

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.stopLinkServer` | 核对并停止本轮链接夹具 | state |

## fixtures → writeFile

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `fixtures.writeFile` | writeFile（本轮样本/文件准备与恢复） | path, content |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
