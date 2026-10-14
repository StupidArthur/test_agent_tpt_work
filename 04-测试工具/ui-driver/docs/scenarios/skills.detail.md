# 详情身份、目录树与文件预览

[返回技能](../modules/skills.md)

按详情身份和树节点绑定对象；选择文件与展开目录分别调用。

| 候选函数 | 用途 |
|---|---|
| `skills.readSkillDetail` | 打开指定技能详情并读取 SKILL.md 正文 |
| `skills.readDetailTree` | 打开技能详情读取目录树选中节点与默认预览正文 |
| `skills.clickTreeNode` | 展开路径文件夹并选择文件，读取预览正文/可编辑控件数/图片加载 |
| `skills.toggleTreeFolder` | 收起/展开目录树中的某个文件夹节点 |
| `skills.readTreeNodeVisible` | 读取指定目录树节点可见状态 |
| `skills.readFirstCardIdentity` | 读取技能详情/首卡身份是否为本轮内部名 |
| `skills.openCardDetail` | 点击技能卡片主体打开详情并读取身份 |

只对选中函数执行 `--describe <函数名>`；核对对象、参数来源、准备/恢复动作及实际取值后，按 [调用与记录](../调用与记录.md) 调用。候选不是业务通过判据。

命令行同一路径：`--browse skills.detail`；场景内检索：`--find "关键词" --route skills.detail --limit 3`。
