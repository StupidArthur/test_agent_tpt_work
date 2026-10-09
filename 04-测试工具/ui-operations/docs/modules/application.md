# 接入与环境

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node 04-测试工具/ui-operations/call.mjs --describe application.inspectConnection
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

## application → inspectConnection

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `application.inspectConnection` | 核对CDP目标、主页面及安装包哈希 | 无 |

## application → readDetailIdentity

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `application.readDetailIdentity` | 读取当前详情的技术name、版本与来源 | kind |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
