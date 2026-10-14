# 阅读详情与验证提示词末尾可见

[返回专家](../modules/experts.md)

全文包含末尾标记不证明可视范围；末尾断言用 scrollPromptToEnd。

| 候选函数 | 用途 |
|---|---|
| `experts.readDetail` | 打开专家详情并读取提示词正文、可编辑元素数、推荐问题、目录入口按钮数 |
| `experts.scrollPromptToEnd` | 滚动指定专家提示词并验证末尾标记处于可视裁剪区 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse experts.detail`；场景内检索：`--find "关键词" --route experts.detail --limit 3`。
