# 技能

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node tools/ui-operations/call.mjs --describe skills.listInstalledFiles
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

**选用提醒**：入口自身是否新建会话用 `useSkillDirect`；`useSkill` 会准备新任务。开关 `toggleSwitchNoDetail` 包含恢复动作。

## 技能 → 安装目录

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.listInstalledFiles` | 递归列出本机技能安装目录文件（channel=file） | base |

## 技能 → 创建入口

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.startCreate` | 点击新建技能并读取创建技能模式标识与面板可见 | 无 |

## 技能 → 导入与卡片

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.importPackage` | 导入单个技能包（SKILL.md 或 .zip）并读取校验反馈与卡片存在 | filePath |
| `skills.importSingleFile` | 选择单个 SKILL.md 提交导入；返回文件input数量、卡片是否存在、弹窗是否关闭 | filePath, displayName |
| `skills.readImportDialog` | 打开技能导入弹窗并读取文件 input 数量 | 无 |
| `skills.readListIdentity` | 读取技能列表全部卡片标题（排序）作为内部身份集合 | 无 |
| `skills.readSkillCard` | 读取指定展示名技能卡片的标题、来源、版本与开关状态 | displayName |

## 技能 → 卡片详情

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.openCardDetail` | 点击技能卡片主体打开详情并读取身份 | matchText, internalName |

## 技能 → 列表

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.readSkillCount` | 读取我的技能列表卡片数 | 无 |
| `skills.readSkillNames` | 读取注册表中的实际内部名，按本轮 query 筛选；不从期望标题推断身份 | query |

## 技能 → 列表开关

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.toggleSwitchNoDetail` | 技能列表切换开关且不进入详情，回读改前/改后/恢复 | matchText |

## 技能 → 目录与预览

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.clickTreeNode` | 展开路径文件夹并选择文件，读取预览正文/可编辑控件数/图片加载 | displayName, path |
| `skills.readDetailTree` | 打开技能详情读取目录树选中节点与默认预览正文 | displayName |
| `skills.readSkillDetail` | 打开指定技能详情并读取 SKILL.md 正文 | displayName |
| `skills.readTreeNodeVisible` | 读取指定目录树节点可见状态 | displayName, label |
| `skills.toggleTreeFolder` | 收起/展开目录树中的某个文件夹节点 | displayName, label |

## 技能 → 启用与筛选

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.filterSkills` | 切换 全部/已启用/未启用 筛选并读取本轮样本匹配卡片数 | filter, displayName |
| `skills.readSkillsListState` | 读取技能页搜索框值、本轮样本存在状态与最终开关 | displayName |
| `skills.setSkillEnabled` | 切换指定技能的启停开关并返回改前/改后 aria-checked | displayName, value |

## 技能 → 实际调用

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.quickUse` | 仅经快捷使用入口把技能引用注入当前会话 | displayName |
| `skills.readTraceSkillContent` | 读取本轮技能调用轨迹中的 skill_content 资源标识（限定轨迹表格） | internalName |
| `skills.useSkill` | 新建会话后经快捷使用引入本轮技能引用；返回改前/改后会话身份与引用内部名 | displayName |
| `skills.useSkillDirect` | 仅经快捷使用入口（不手动新建任务），观察入口是否自行新建会话 | displayName |
| `skills.useSkillRequest` | 发送技能固定回复规则请求并等待终态；返回助手正文与用户请求是否含输出串 | text, answer |

## 技能 → 搜索

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.searchSkill` | 技能页搜索并读取指定内部名命中数 | query, matchText |
| `skills.searchSkills` | 在技能页填入搜索词并读取匹配卡片数量与标题 | term |

## 技能 → 图标

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.importPackageMonitored` | 导入技能包并监听与该 icon URL 匹配的网络请求数 | filePath |
| `skills.readIconState` | 读取指定技能卡图标加载状态与资源身份、默认图标可见性 | title |

## 技能 → 外部文件更新

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.installedSkillFile` | 读写本轮实际安装的技能文件（外部修改，channel=file） | path |
| `skills.readValidationFeedback` | 打开技能列表读取本轮技能的外部修改校验反馈 | displayName |

## 技能 → 详情

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.readFirstCardIdentity` | 读取技能详情/首卡身份是否为本轮内部名 | internalName |

## 技能 → 页签

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.readTabs` | 读取技能页双页签均可见可点击 | 无 |

## 技能 → ZIP导入

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `skills.confirmImport` | 提交并确认 ZIP 导入并读取结果 | filePath |
| `skills.countDelta` | 基于两个读取事件计算计数增量（derived） | beforeEvent, afterEvent |
| `skills.readImportCandidates` | 选择 ZIP 读候选与列表（不确认），随后取消 | filePath |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
