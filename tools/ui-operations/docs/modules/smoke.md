# 冒烟辅助

[返回功能索引](../功能索引.md) · [调用与记录](../调用与记录.md)

本页用于选函数。选中后只读一个函数的参数契约：

```powershell
node tools/ui-operations/call.mjs --describe smoke.conversation.isCompleted
```

参数必须以 `--describe` 返回的 schema 为准；本页“必填”只用于快速筛选。`--list` 的输出包含描述，适合关键词搜索。

## 冒烟 → conversation → isCompleted

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.isCompleted` | PC-88 conversation.isCompleted（共用接入与记录） | 无 |

## 冒烟 → conversation → readAssistantMessages

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.readAssistantMessages` | PC-88 conversation.readAssistantMessages（共用接入与记录） | 无 |

## 冒烟 → conversation → readComposerState

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.readComposerState` | PC-88 conversation.readComposerState（共用接入与记录） | 无 |

## 冒烟 → conversation → selectProject

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.selectProject` | PC-88 conversation.selectProject（共用接入与记录） | name |

## 冒烟 → conversation → send

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.send` | PC-88 conversation.send（共用接入与记录） | 无 |

## 冒烟 → conversation → setReasoning

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.setReasoning` | PC-88 conversation.setReasoning（共用接入与记录） | level |

## 冒烟 → conversation → typeDraft

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.typeDraft` | PC-88 conversation.typeDraft（共用接入与记录） | text |

## 冒烟 → conversation → waitForIdle

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.conversation.waitForIdle` | PC-88 conversation.waitForIdle（共用接入与记录） | 无 |

## 冒烟 → navigation → closeDialogs

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.closeDialogs` | PC-88 navigation.closeDialogs（共用接入与记录） | 无 |

## 冒烟 → navigation → closeSidebarPanels

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.closeSidebarPanels` | PC-88 navigation.closeSidebarPanels（共用接入与记录） | 无 |

## 冒烟 → navigation → ensureMoreMenu

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.ensureMoreMenu` | PC-88 navigation.ensureMoreMenu（共用接入与记录） | 无 |

## 冒烟 → navigation → expertsFrame

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.expertsFrame` | PC-88 navigation.expertsFrame（共用接入与记录） | 无 |

## 冒烟 → navigation → goHome

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.goHome` | PC-88 navigation.goHome（共用接入与记录） | 无 |

## 冒烟 → navigation → openExperts

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.openExperts` | PC-88 navigation.openExperts（共用接入与记录） | 无 |

## 冒烟 → navigation → openSkills

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.openSkills` | PC-88 navigation.openSkills（共用接入与记录） | 无 |

## 冒烟 → navigation → skillsFrame

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.navigation.skillsFrame` | PC-88 navigation.skillsFrame（共用接入与记录） | 无 |

## 冒烟 → skills → closeSkills

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.closeSkills` | PC-88 skills.closeSkills（共用接入与记录） | 无 |

## 冒烟 → skills → ensureMenu

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.ensureMenu` | PC-88 skills.ensureMenu（共用接入与记录） | 无 |

## 冒烟 → skills → importSkill

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.importSkill` | PC-88 skills.importSkill（共用接入与记录） | filePath |

## 冒烟 → skills → listCards

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.listCards` | PC-88 skills.listCards（共用接入与记录） | 无 |

## 冒烟 → skills → openAndReadDetail

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.openAndReadDetail` | PC-88 skills.openAndReadDetail（共用接入与记录） | term |

## 冒烟 → skills → openSkills

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.openSkills` | PC-88 skills.openSkills（共用接入与记录） | 无 |

## 冒烟 → skills → readSwitch

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.readSwitch` | PC-88 skills.readSwitch（共用接入与记录） | term |

## 冒烟 → skills → search

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.search` | PC-88 skills.search（共用接入与记录） | term |

## 冒烟 → skills → setSwitch

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.setSwitch` | PC-88 skills.setSwitch（共用接入与记录） | term, on |

## 冒烟 → skills → skillsFrame

| 函数 | 用途 | 必填参数 |
|---|---|---|
| `smoke.skills.skillsFrame` | PC-88 skills.skillsFrame（共用接入与记录） | 无 |

## 找不到需要的操作

先用同义关键词执行 `--list` 并检查候选函数是否含准备或恢复动作。确实不足时按 [扩展与边界](../扩展与边界.md) 留存任务函数；不要用近似函数偷偷改变测试目标。
